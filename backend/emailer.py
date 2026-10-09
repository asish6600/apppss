"""Emergent-managed Resend email (async, non-blocking). Guardrail gate per playbook."""
import os
import re
import base64
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "AaharNest")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


def _attachment_fault(resp) -> bool:
    """True only when a 4xx actually looks like the attachment was the problem.

    An undeliverable recipient or a billing refusal also arrives as 4xx; retrying
    those without the PDF just burns a second send for the same failure.
    """
    try:
        payload = resp.json()
        code = str(payload.get("code", "")).lower()
        blob = f"{payload.get('error', '')} {payload.get('message', '')}".lower()
    except ValueError:
        code, blob = "", resp.text[:500].lower()
    if code in ("undeliverable_recipient", "insufficient_credits",
                "integration_disabled", "daily_limit_reached"):
        return False
    return "attach" in blob or "attach" in code or "too large" in blob or "payload" in blob


async def send_email(*, to: str, subject: str, html: str,
                     attachments: list[dict] | None = None) -> str | None:
    """Send one transactional email.

    `attachments` is a list of {"filename", "content" (raw bytes), "content_type"}.
    Attachment support on the managed proxy is not contractual, so a 4xx that
    mentions the attachment field is retried once as a plain email — the customer
    still gets the message plus the in-app download link, instead of nothing.
    """
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    if attachments:
        payload["attachments"] = [{
            "filename": a["filename"],
            "content": base64.b64encode(a["content"]).decode(),
            "content_type": a.get("content_type", "application/octet-stream"),
        } for a in attachments]

    async def _post(body):
        async with httpx.AsyncClient(timeout=60) as client:
            return await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=body,
            )

    try:
        resp = await _post(payload)
        if attachments and resp.status_code in (400, 404, 413, 415, 422) and _attachment_fault(resp):
            logger.warning(f"Email attachment rejected ({resp.status_code}); retrying without it: {resp.text[:300]}")
            plain = {k: v for k, v in payload.items() if k != "attachments"}
            resp = await _post(plain)
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        try:
            code = e.response.json().get("code", "")
            msg = e.response.json().get("message", "")
        except ValueError:
            code, msg = "", e.response.text[:200]
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            # Billing state on the app owner's Emergent account — not a transient error.
            logger.warning(f"Email paused: {code} ({e.response.status_code}): {msg}")
        else:
            logger.error(f"Email send failed: {e.response.status_code} {msg}")
        raise
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise


def otp_email_html(code: str) -> str:
    return (
        '<table role="presentation" width="100%" style="background:#F8F5EC;padding:32px 0">'
        '<tr><td align="center">'
        '<table role="presentation" width="480" style="background:#FFFFFF;border-radius:16px;'
        'padding:32px;font-family:Arial,Helvetica,sans-serif;border:1px solid #e6e0d0">'
        '<tr><td style="font-size:22px;color:#174A35;font-weight:700">Aahar<span style="color:#D99A22">Nest</span></td></tr>'
        '<tr><td style="padding-top:18px;color:#252A27;font-size:16px">Here is your one-time verification code:</td></tr>'
        f'<tr><td style="padding:18px 0"><div style="font-size:36px;letter-spacing:10px;font-weight:700;'
        f'color:#174A35;background:#F8F5EC;border-radius:12px;padding:16px;text-align:center">{escape(code)}</div></td></tr>'
        '<tr><td style="color:#252A27;font-size:14px;line-height:22px">This code expires in 10 minutes and can be used once. '
        'If you did not request it, you can safely ignore this email.</td></tr>'
        '<tr><td style="padding-top:22px;color:#888;font-size:12px">Sent by AaharNest &middot; Healthy Food, Happy Living. '
        'We never ask for your password or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )


WELCOME_BANNER = "https://static.prod-images.emergentagent.com/jobs/7b072687-6bef-4711-b72a-9dbb9da149a1/images/8467009d290ca17acfc7ec6d1a86bb055e3c73117410e55d5455dd5098b6550f.jpeg"

HEALTH_TIPS = [
    ("Start with warm water", "Begin your day with a glass of warm water — it gently wakes up digestion before your first meal."),
    ("Half your plate, plants", "Fill half your plate with vegetables and whole grains like millets for steady, lasting energy."),
    ("Soak your millets", "Soaking millets for a few hours before cooking makes them easier to digest and quicker to cook."),
    ("Spice is medicine", "A pinch of turmeric with a crack of black pepper helps your body absorb its goodness."),
    ("Cold-pressed for everyday", "Switch to cold-pressed oils for everyday cooking — they keep more of their natural nutrients."),
    ("Jaggery over sugar", "Swap refined sugar for a little jaggery — an unrefined, traditional sweetener rich in iron."),
    ("Chew slowly", "Eating slowly and chewing well helps you feel full sooner and digest more comfortably."),
    ("Seeds for a boost", "A spoon of roasted flax or pumpkin seeds adds fibre and crunch to salads and curd."),
    ("Eat with the season", "Choose what's in season and grown close to home — it's fresher, tastier and kinder to the planet."),
    ("Hydrate through the day", "Keep water nearby and sip through the day, especially before meals, to stay naturally energised."),
]


def welcome_email_html(name: str | None) -> tuple[str, str]:
    import random
    hello = escape((name or "").strip() or "there")
    tip_title, tip_body = random.choice(HEALTH_TIPS)
    subject = "Welcome to AaharNest — here's a little wellness tip for you"
    html = (
        '<table role="presentation" width="100%" style="background:#F8F5EC;padding:32px 0"><tr><td align="center">'
        '<table role="presentation" width="560" style="background:#FFFFFF;border-radius:18px;overflow:hidden;'
        'font-family:Arial,Helvetica,sans-serif;border:1px solid #e6e0d0">'
        f'<tr><td style="padding:0"><img src="{WELCOME_BANNER}" width="560" alt="Wholesome Indian wholefoods" '
        'style="display:block;width:100%;max-width:560px;height:auto" /></td></tr>'
        '<tr><td style="padding:28px 32px 8px">'
        '<div style="font-size:22px;color:#174A35;font-weight:700">Aahar<span style="color:#D99A22">Nest</span></div>'
        f'<p style="margin:14px 0 0;color:#1A1A1A;font-size:17px;line-height:26px">Hi {hello}, welcome to the AaharNest family! 🌿</p>'
        '<p style="margin:10px 0 0;color:#4B5563;font-size:15px;line-height:24px">Wholesome Food for a Healthier You. '
        'We bring you authentic, nutritious and traditionally sourced Indian food — straight from our farmers to your kitchen.</p>'
        '</td></tr>'
        '<tr><td style="padding:12px 32px 28px">'
        '<table role="presentation" width="100%" style="background:#F8F5EC;border-radius:14px;border:1px solid #ece6d6">'
        '<tr><td style="padding:20px 22px">'
        '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D99A22;font-weight:700">Your wellness tip</div>'
        f'<div style="margin-top:8px;font-size:18px;color:#174A35;font-weight:700">{escape(tip_title)}</div>'
        f'<div style="margin-top:6px;color:#1A1A1A;font-size:15px;line-height:24px">{escape(tip_body)}</div>'
        '</td></tr></table>'
        '<p style="margin:22px 0 0;color:#888;font-size:12px;line-height:18px">Sent by AaharNest &middot; Wholesome Food for a Healthier You. '
        'We never ask for your password or card details by email.</p>'
        '</td></tr></table></td></tr></table>'
    )
    return subject, html


def _kv_rows(pairs: list[tuple[str, str]]) -> str:
    return "".join(
        f'<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;'
        f'vertical-align:top">{escape(k)}</td>'
        f'<td style="padding:6px 0;color:#1A1A1A;font-size:14px;font-weight:600">{escape(str(v))}</td></tr>'
        for k, v in pairs if v
    )


def ticket_admin_email_html(ticket: dict) -> tuple[str, str]:
    """Internal notification to the AaharNest support desk. Every value is a stored
    ticket field, escaped — nothing here comes from a caller as markup."""
    num = escape(str(ticket.get("ticket_number", "")))
    cat = escape(str(ticket.get("category", "Support request")))
    priority = str(ticket.get("priority", "NORMAL"))
    orders = ", ".join(str(o) for o in (ticket.get("order_numbers") or [])) or "None on file"
    rows = _kv_rows([
        ("Ticket", ticket.get("ticket_number", "")),
        ("Category", cat),
        ("Priority", priority),
        ("Raised by", "AI support chat (Nesti)"),
        ("Customer", ticket.get("name", "")),
        ("Email", ticket.get("email", "")),
        ("Phone", ticket.get("phone", "")),
        ("Orders on file", orders),
        ("Created", str(ticket.get("created_at", ""))[:19].replace("T", " ") + " UTC"),
    ])
    transcript = "".join(
        f'<tr><td style="padding:7px 0;border-bottom:1px solid #f0ece0">'
        f'<span style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;'
        f'color:{"#174A35" if m.get("role") == "user" else "#D99A22"}">'
        f'{"Customer" if m.get("role") == "user" else "Nesti"}</span><br/>'
        f'<span style="color:#1A1A1A;font-size:14px;line-height:21px">{escape(str(m.get("text", "")))}</span>'
        f'</td></tr>'
        for m in (ticket.get("transcript") or [])
    ) or '<tr><td style="color:#6b7280;font-size:13px;padding:7px 0">No transcript captured.</td></tr>'

    subject = f"[{priority}] {cat} — ticket {ticket.get('ticket_number', '')} from {ticket.get('name', 'a customer')}"
    html = (
        '<table role="presentation" width="100%" style="background:#F8F5EC;padding:28px 0"><tr><td align="center">'
        '<table role="presentation" width="620" style="background:#FFFFFF;border-radius:16px;padding:30px;'
        'font-family:Arial,Helvetica,sans-serif;border:1px solid #e6e0d0">'
        '<tr><td style="font-size:20px;color:#174A35;font-weight:700">Aahar<span style="color:#D99A22">Nest</span>'
        '<span style="font-size:12px;color:#6b7280;font-weight:400"> &middot; Support desk</span></td></tr>'
        f'<tr><td style="padding-top:16px;font-size:18px;color:#174A35;font-weight:700">'
        f'New {cat.lower()} &mdash; {num}</td></tr>'
        f'<tr><td style="padding-top:6px;color:#1A1A1A;font-size:15px;line-height:23px">'
        f'{escape(str(ticket.get("summary", "")))}</td></tr>'
        f'<tr><td style="padding-top:18px"><table role="presentation" width="100%">{rows}</table></td></tr>'
        '<tr><td style="padding-top:22px;font-size:11px;letter-spacing:2px;text-transform:uppercase;'
        'color:#D99A22;font-weight:700">Chat transcript</td></tr>'
        f'<tr><td style="padding-top:4px"><table role="presentation" width="100%">{transcript}</table></td></tr>'
        '<tr><td style="padding-top:22px;color:#888;font-size:12px;line-height:18px">'
        'Open Admin Studio &rarr; Support Tickets to action this. '
        'Automated notification from the AaharNest support assistant.</td></tr>'
        '</table></td></tr></table>'
    )
    return subject, html


def ticket_ack_email_html(ticket: dict) -> tuple[str, str]:
    """Acknowledgement to the customer who raised the ticket."""
    num = escape(str(ticket.get("ticket_number", "")))
    cat = escape(str(ticket.get("category", "support request")))
    hello = escape((str(ticket.get("name", "")).strip().split(" ") or ["there"])[0] or "there")
    subject = f"We've logged your {cat.lower()} — AaharNest ticket {ticket.get('ticket_number', '')}"
    html = (
        '<table role="presentation" width="100%" style="background:#F8F5EC;padding:32px 0"><tr><td align="center">'
        '<table role="presentation" width="540" style="background:#FFFFFF;border-radius:16px;padding:32px;'
        'font-family:Arial,Helvetica,sans-serif;border:1px solid #e6e0d0">'
        '<tr><td style="font-size:22px;color:#174A35;font-weight:700">Aahar<span style="color:#D99A22">Nest</span></td></tr>'
        f'<tr><td style="padding-top:16px;font-size:18px;color:#174A35;font-weight:700">'
        f'Hi {hello}, we\'re on it</td></tr>'
        f'<tr><td style="padding-top:10px;color:#1A1A1A;font-size:15px;line-height:23px">'
        f'Thanks for telling us. We\'ve logged your {cat.lower()} as ticket <b>{num}</b> and a member of '
        'our support team will get back to you by email, usually within one business day.</td></tr>'
        f'<tr><td style="padding-top:18px"><table role="presentation" width="100%" '
        'style="background:#F8F5EC;border-radius:12px;border:1px solid #ece6d6"><tr><td style="padding:16px 18px">'
        f'<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D99A22;font-weight:700">'
        f'Your ticket</div>'
        f'<div style="margin-top:6px;font-size:20px;color:#174A35;font-weight:700">{num}</div>'
        f'<div style="margin-top:4px;color:#1A1A1A;font-size:14px">{cat}</div>'
        f'<div style="margin-top:8px;color:#4B5563;font-size:14px;line-height:21px">'
        f'{escape(str(ticket.get("summary", "")))}</div>'
        '</td></tr></table></td></tr>'
        '<tr><td style="padding-top:20px;color:#4B5563;font-size:14px;line-height:22px">'
        'Refunds are initiated within 3 business days of approval and reach your original payment '
        'method in 5&ndash;7 business days. If you need to escalate, our Grievance Officer responds '
        'within 48 hours.</td></tr>'
        '<tr><td style="padding-top:22px;color:#888;font-size:12px;line-height:18px">'
        'Sent by AaharNest &middot; Wholesome Food for a Healthier You. '
        'We never ask for your password, OTP or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )
    return subject, html


def ticket_reply_email_html(ticket: dict, message: str) -> tuple[str, str]:
    """A support agent's answer to a ticket, sent to the customer.

    `message` is the admin's plain text: escaped, then newlines become paragraph breaks.
    No caller-supplied markup ever reaches the template.
    """
    num = escape(str(ticket.get("ticket_number", "")))
    cat = escape(str(ticket.get("category", "support request")))
    hello = escape((str(ticket.get("name", "")).strip().split(" ") or ["there"])[0] or "there")
    body = "".join(
        f'<p style="margin:0 0 12px;color:#1A1A1A;font-size:15px;line-height:23px">{escape(p)}</p>'
        for p in re.split(r"\n\s*\n", message.strip()) if p.strip()
    ).replace("\n", "<br/>")
    subject = f"Re: your AaharNest {cat.lower()} — ticket {ticket.get('ticket_number', '')}"
    html = (
        '<table role="presentation" width="100%" style="background:#F8F5EC;padding:32px 0"><tr><td align="center">'
        '<table role="presentation" width="560" style="background:#FFFFFF;border-radius:16px;padding:32px;'
        'font-family:Arial,Helvetica,sans-serif;border:1px solid #e6e0d0">'
        '<tr><td style="font-size:22px;color:#174A35;font-weight:700">Aahar<span style="color:#D99A22">Nest</span>'
        '<span style="font-size:12px;color:#6b7280;font-weight:400"> &middot; Customer support</span></td></tr>'
        f'<tr><td style="padding-top:18px;font-size:18px;color:#174A35;font-weight:700">Hi {hello},</td></tr>'
        f'<tr><td style="padding-top:12px">{body}</td></tr>'
        '<tr><td style="padding-top:20px"><table role="presentation" width="100%" '
        'style="background:#F8F5EC;border-radius:12px;border:1px solid #ece6d6"><tr><td style="padding:14px 18px">'
        '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D99A22;font-weight:700">'
        'Your ticket</div>'
        f'<div style="margin-top:5px;font-size:17px;color:#174A35;font-weight:700">{num}</div>'
        f'<div style="margin-top:3px;color:#4B5563;font-size:13px">{cat}</div>'
        '</td></tr></table></td></tr>'
        '<tr><td style="padding-top:20px;color:#4B5563;font-size:14px;line-height:22px">'
        'Just reply to this email if you need anything else and it will reach the same team, '
        'with your ticket number already attached.</td></tr>'
        '<tr><td style="padding-top:22px;color:#888;font-size:12px;line-height:18px">'
        'Sent by the AaharNest support team &middot; Wholesome Food for a Healthier You. '
        'We never ask for your password, OTP or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )
    return subject, html


_STATUS_COPY = {
    "CONFIRMED": ("Your order is confirmed", "We've received your order and it's confirmed. We'll start getting it ready."),
    "PROCESSING": ("Your order is being prepared", "Our team is preparing your order with care."),
    "PACKED": ("Your order is packed", "Your order is packed and ready to leave our facility."),
    "SHIPPED": ("Your order has shipped", "Good news — your order is on its way across India."),
    "OUT_FOR_DELIVERY": ("Your order is out for delivery", "Your order is out for delivery and should reach you soon."),
    "DELIVERED": ("Your order has been delivered", "Your order has been delivered. We hope you enjoy it — eat well, live well!"),
    "CANCELLED": ("Your order was cancelled", "Your order has been cancelled. If this wasn't expected, please contact AaharNest Support."),
    "REFUNDED": ("Your refund is being processed", "A refund for your order is being processed."),
}


def order_status_email_html(order: dict, status: str) -> tuple[str, str] | None:
    copy = _STATUS_COPY.get(status)
    if not copy:
        return None
    heading, line = copy
    num = escape(str(order.get("order_number", "")))
    items = "".join(
        f'<tr><td style="padding:4px 0;color:#252A27;font-size:14px">{escape(i.get("name",""))} &times; {int(i.get("qty",1))}</td></tr>'
        for i in order.get("items", [])
    )
    total = f'&#8377;{int(order.get("grand_total", 0)):,}'
    subject = f"{heading} — AaharNest {num}"
    html = (
        '<table role="presentation" width="100%" style="background:#F8F5EC;padding:32px 0"><tr><td align="center">'
        '<table role="presentation" width="520" style="background:#FFFFFF;border-radius:16px;padding:32px;'
        'font-family:Arial,Helvetica,sans-serif;border:1px solid #e6e0d0">'
        '<tr><td style="font-size:22px;color:#174A35;font-weight:700">Aahar<span style="color:#D99A22">Nest</span></td></tr>'
        f'<tr><td style="padding-top:16px;font-size:18px;color:#174A35;font-weight:700">{escape(heading)}</td></tr>'
        f'<tr><td style="padding-top:8px;color:#252A27;font-size:15px;line-height:22px">{escape(line)}</td></tr>'
        f'<tr><td style="padding-top:16px;color:#252A27;font-size:14px">Order <b>{num}</b> &middot; Status: <b>{escape(status.replace("_"," ").title())}</b></td></tr>'
        f'<tr><td style="padding-top:12px"><table role="presentation" width="100%">{items}</table></td></tr>'
        f'<tr><td style="padding-top:8px;color:#174A35;font-size:15px;font-weight:700">Total: {total}</td></tr>'
        '<tr><td style="padding-top:22px;color:#888;font-size:12px">Healthy Food, Happy Living &middot; AaharNest. '
        'We never ask for your password or card details by email.</td></tr>'
        '</table></td></tr></table>'
    )
    return subject, html


# ===================== INVOICE EMAILS =====================
# Bodies are fixed server-side templates; every interpolated value is escaped and
# comes from a stored order document, never from caller input (G4).
APP_URL = (os.environ.get("APP_URL") or "").rstrip("/")


def _invoice_items_rows(order: dict) -> str:
    return "".join(
        f'<tr><td style="padding:7px 0;border-bottom:1px solid #f0ece0;color:#252A27;font-size:14px">'
        f'{escape(str(i.get("name", "")))}'
        + (f'<br/><span style="color:#6b7280;font-size:12px">{escape(str(i.get("pack_size")))}</span>'
           if i.get("pack_size") else "")
        + f'</td>'
        f'<td style="padding:7px 0;border-bottom:1px solid #f0ece0;color:#252A27;font-size:14px;'
        f'text-align:center;white-space:nowrap">&times; {int(i.get("qty", 1))}</td>'
        f'<td style="padding:7px 0;border-bottom:1px solid #f0ece0;color:#252A27;font-size:14px;'
        f'text-align:right;white-space:nowrap">&#8377;{int(i.get("line_total", 0)):,}</td></tr>'
        for i in (order.get("items") or [])
    )


def _totals_rows(order: dict) -> str:
    rows = [("Subtotal", f'&#8377;{int(order.get("product_subtotal", 0)):,}')]
    rows.append(("Shipping", "Free" if not order.get("shipping") else f'&#8377;{int(order["shipping"]):,}'))
    if order.get("donation_amount"):
        rows.append(("Community contribution", f'&#8377;{int(order["donation_amount"]):,}'))
    body = "".join(
        f'<tr><td style="padding:3px 0;color:#6b7280;font-size:13px">{k}</td>'
        f'<td style="padding:3px 0;color:#252A27;font-size:13px;text-align:right">{v}</td></tr>'
        for k, v in rows
    )
    return body + (
        f'<tr><td style="padding:9px 0 0;border-top:2px solid #174A35;color:#174A35;font-size:16px;'
        f'font-weight:700">Grand Total</td>'
        f'<td style="padding:9px 0 0;border-top:2px solid #174A35;color:#174A35;font-size:16px;'
        f'font-weight:700;text-align:right">&#8377;{int(order.get("grand_total", 0)):,}</td></tr>'
    )


def _shell(inner: str, width: int = 560) -> str:
    return (
        '<table role="presentation" width="100%" style="background:#F8F5EC;padding:32px 0">'
        '<tr><td align="center">'
        f'<table role="presentation" width="{width}" style="background:#FFFFFF;border-radius:16px;padding:32px;'
        'font-family:Arial,Helvetica,sans-serif;border:1px solid #e6e0d0">'
        '<tr><td style="height:4px;background:#FF9933"></td></tr>'
        '<tr><td style="font-size:22px;color:#174A35;font-weight:700;padding-top:14px">'
        'Aahar<span style="color:#D99A22">Nest</span></td></tr>'
        f'{inner}'
        '</table></td></tr></table>'
    )


def invoice_customer_email_html(order: dict, invoice_no: str, attached: bool = True) -> tuple[str, str]:
    """Order confirmation + tax invoice for the customer."""
    num = escape(str(order.get("order_number", "")))
    name = escape(str((order.get("address") or {}).get("full_name") or "there"))
    inv = escape(invoice_no)
    attach_line = (
        "Your PDF invoice is attached to this email."
        if attached else
        "You can download your PDF invoice any time from your AaharNest account."
    )
    link = (
        f'<tr><td style="padding-top:20px"><a href="{APP_URL}/en/account/orders" '
        'style="display:inline-block;background:#174A35;color:#F8F5EC;text-decoration:none;'
        'padding:12px 22px;border-radius:999px;font-size:14px;font-weight:700">'
        'View order &amp; download invoice</a></td></tr>'
    ) if APP_URL.startswith("https://") else ""

    inner = (
        '<tr><td style="padding-top:18px;font-size:19px;color:#174A35;font-weight:700">'
        'Order confirmed &mdash; thank you!</td></tr>'
        f'<tr><td style="padding-top:8px;color:#252A27;font-size:15px;line-height:23px">'
        f'Hi {name}, we have received your order and our team is getting it ready.</td></tr>'
        f'<tr><td style="padding-top:14px;color:#252A27;font-size:14px">'
        f'Order <b>{num}</b><br/>Invoice <b>{inv}</b><br/>'
        f'Estimated delivery: <b>{escape(str(order.get("eta") or "3-6 business days"))}</b></td></tr>'
        '<tr><td style="padding-top:20px;font-size:11px;letter-spacing:2px;text-transform:uppercase;'
        'color:#D99A22;font-weight:700">Items</td></tr>'
        f'<tr><td style="padding-top:6px"><table role="presentation" width="100%">'
        f'{_invoice_items_rows(order)}</table></td></tr>'
        f'<tr><td style="padding-top:14px"><table role="presentation" width="100%">'
        f'{_totals_rows(order)}</table></td></tr>'
        f'<tr><td style="padding-top:18px;color:#252A27;font-size:14px;line-height:21px">'
        f'{escape(attach_line)}</td></tr>'
        f'{link}'
        '<tr><td style="padding-top:22px;color:#888;font-size:12px;line-height:18px">'
        'Sourced from organic farms in Odisha &middot; Made in India.<br/>'
        'Sent by AaharNest. We never ask for your password or card details by email.</td></tr>'
    )
    return f"Your AaharNest order {order.get('order_number', '')} is confirmed (invoice {invoice_no})", _shell(inner)


def invoice_admin_email_html(order: dict, invoice_no: str, customer_email: str | None = None,
                             attached: bool = True) -> tuple[str, str]:
    """Internal copy for the AaharNest desk — operational detail, no customer links."""
    addr = order.get("address") or {}
    rows = _kv_rows([
        ("Order", order.get("order_number", "")),
        ("Invoice", invoice_no),
        ("Placed", str(order.get("created_at", ""))[:19].replace("T", " ") + " UTC"),
        ("Customer", addr.get("full_name", "")),
        ("Email", customer_email or ""),
        ("Mobile", addr.get("mobile", "")),
        ("Deliver to", ", ".join(x for x in [addr.get("address"), addr.get("apartment"), addr.get("city"),
                                             addr.get("state"), addr.get("pincode")] if x)),
        ("Payment", "Cash on Delivery" if order.get("payment_method") == "cod" else str(order.get("payment_method", ""))),
        ("Items", str(sum(int(i.get("qty", 1)) for i in (order.get("items") or [])))),
        ("Order value", f'&#8377;{int(order.get("grand_total", 0)):,}'),
        ("Donation", f'&#8377;{int(order["donation_amount"]):,}' if order.get("donation_amount") else ""),
    ])
    inner = (
        '<tr><td style="padding-top:4px;font-size:12px;color:#6b7280">Order desk notification</td></tr>'
        '<tr><td style="padding-top:12px;font-size:19px;color:#174A35;font-weight:700">'
        f'New order {escape(str(order.get("order_number", "")))}</td></tr>'
        f'<tr><td style="padding-top:16px"><table role="presentation" width="100%">{rows}</table></td></tr>'
        '<tr><td style="padding-top:20px;font-size:11px;letter-spacing:2px;text-transform:uppercase;'
        'color:#D99A22;font-weight:700">Line items</td></tr>'
        f'<tr><td style="padding-top:6px"><table role="presentation" width="100%">'
        f'{_invoice_items_rows(order)}</table></td></tr>'
        f'<tr><td style="padding-top:14px"><table role="presentation" width="100%">'
        f'{_totals_rows(order)}</table></td></tr>'
        f'<tr><td style="padding-top:18px;color:#252A27;font-size:14px">'
        f'{"The customer invoice PDF is attached." if attached else "Invoice PDF is available in Admin Studio."}'
        '</td></tr>'
        '<tr><td style="padding-top:20px;color:#888;font-size:12px">Internal copy &middot; AaharNest order desk.</td></tr>'
    )
    return f"[Order] {order.get('order_number', '')} — \u20b9{int(order.get('grand_total', 0)):,} — {addr.get('city', '')}", _shell(inner, 620)
