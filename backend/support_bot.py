"""AI support chatbot + automated ticketing.

Flow
  POST /api/support/chat/start      -> gate: name + email + phone required, opens a chat
  POST /api/support/chat/{id}/message -> grounded LLM reply; auto-raises a ticket and
                                         emails the support desk for refund / transaction
                                         / product-fault intents
  GET  /api/support/chat/{id}        -> transcript (for reload)
  GET  /api/support/tickets/{number} -> public status lookup, gated on the chat's email
  GET  /api/admin/tickets            -> admin inbox
  PUT  /api/admin/tickets/{number}/status

Every route hangs off the /api router. Ticket emails are built from server-side
templates and sent to a server-configured desk address — the caller never supplies a
recipient or any markup.
"""
import os
import re
import json
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from db import db
from security import verify_csrf, rate_limit, client_ip, get_optional_user, get_admin_user
from emailer import send_email, ticket_admin_email_html, ticket_ack_email_html, ticket_reply_email_html
from support_kb import (
    INTENTS, TICKET_INTENTS, INTENT_LABELS, ORDER_STATUS_COPY,
    build_system_prompt, TICKET_EMAIL,
)
from support_i18n import (
    LANGS, LANG_NAMES, LANG_SCRIPTS, norm as norm_lang, GREETING_NEW, GREETING_WITH_ORDER,
    FALLBACK, TICKET_RAISED, CATEGORY, SUGGESTIONS, STATUS_WORD,
)

logger = logging.getLogger("aaharnest.support_bot")
router = APIRouter(prefix="/api")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
BOT_MODEL = os.environ.get("SUPPORT_BOT_MODEL", "claude-sonnet-5-5")
# The address we publish to customers. Its mailbox may not be live yet, so a
# fallback inbox guarantees a ticket still reaches a human today.
TICKET_FALLBACK_EMAIL = os.environ.get("SUPPORT_TICKET_FALLBACK_EMAIL", "").strip()

MOBILE_RE = re.compile(r"^[6-9][0-9]{9}$")
HISTORY_TURNS = 12


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================= models =============================
class ChatStartIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    lang: str = "en"
    consent: bool = True


class ChatMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    lang: str | None = None


class TicketStatusIn(BaseModel):
    status: str
    note: str | None = None


class TicketReplyIn(BaseModel):
    message: str = Field(min_length=2, max_length=4000)
    status: str = "IN_PROGRESS"


TICKET_STATUSES = ("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED")


# ============================= helpers =============================
def _clean_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if not MOBILE_RE.match(digits):
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit Indian mobile number.")
    return digits


async def _order_context(email: str) -> tuple[str, list[dict]]:
    """Real order data for this email address, or an explicit 'none' marker.

    Orders are keyed by user_id, so resolve the account from the email first. A guest
    who never registered simply has no orders — that is a normal answer, not an error.
    """
    user = await db.users.find_one({"email": email.lower()}, {"_id": 0, "id": 1})
    if not user:
        return "No AaharNest account is registered with this email address, so there are no orders on file.", []
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(5)
    if not orders:
        return "This account exists but has not placed any orders yet.", []
    lines = []
    for o in orders:
        items = ", ".join(f"{i.get('name', '')} x{int(i.get('qty', 1))}" for i in o.get("items", []))
        lines.append(
            f"- Order {o.get('order_number')} placed {str(o.get('created_at', ''))[:10]}: "
            f"status {o.get('status')} ({ORDER_STATUS_COPY.get(o.get('status'), 'in progress')}), "
            f"payment {o.get('payment_method', 'cod').upper()}/{o.get('payment_status', '')}, "
            f"total Rs.{int(o.get('grand_total', 0))}, ETA {o.get('eta', '3-6 business days')}. "
            f"Items: {items}."
        )
    return "\n".join(lines), orders


def _fallback_intent(text: str) -> str:
    """Keyword routing used when the model is unavailable — the ticket must still
    be raised for a refund/payment/fault report even if the LLM call fails."""
    t = (text or "").lower()
    if any(k in t for k in ("refund", "money back", "reimburse", "repay")):
        return "REFUND"
    if any(k in t for k in ("payment", "transaction", "debited", "deducted", "charged", "upi", "card")):
        return "TRANSACTION"
    if any(k in t for k in ("damaged", "broken", "leaking", "spoiled", "expired", "stale", "insect", "fungus", "defect", "faulty", "wrong item")):
        return "PRODUCT_FAULT"
    if any(k in t for k in ("return", "exchange", "replace")):
        return "RETURN"
    if any(k in t for k in ("deliver", "shipping", "courier", "track", "where is my")):
        return "DELIVERY"
    if any(k in t for k in ("order", "cancel")):
        return "ORDER"
    if any(k in t for k in ("account", "login", "password", "sign in", "delete my")):
        return "ACCOUNT"
    if any(k in t for k in ("health", "nutrition", "diet", "tip", "benefit", "protein", "fibre", "fiber")):
        return "HEALTH"
    return "GENERAL"


_FALLBACK_UNUSED = None  # replaced by support_i18n.FALLBACK (7 languages)


def _strip_json(raw: str) -> dict | None:
    """Models sometimes wrap JSON in a fence or add a sentence around it."""
    if not raw:
        return None
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\s*", "", s)
        s = re.sub(r"\s*```$", "", s).strip()
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    start, end = s.find("{"), s.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(s[start:end + 1])
        except json.JSONDecodeError:
            return None
    return None


async def _ask_llm(chat: dict, history: list[dict], text: str, order_context: str,
                   lang: str = "en") -> dict | None:
    """One grounded call returning {intent, reply, summary}.

    Non-streaming on purpose: the reply drives a server-side side effect (raising and
    emailing a ticket), so the full structured object has to be in hand before anything
    is sent back to the customer.
    """
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY missing — support bot running on keyword fallback")
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:  # pragma: no cover
        logger.error(f"emergentintegrations import failed: {e}")
        return None

    system_message = build_system_prompt(chat["customer"], order_context, lang)
    if history:
        transcript = "\n".join(
            f"{'Customer' if m['role'] == 'user' else 'Nesti'}: {m['text']}"
            for m in history[-HISTORY_TURNS:]
        )
        system_message += f"\n\nCONVERSATION SO FAR\n{transcript}"

    try:
        chat_client = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat["id"],
            system_message=system_message,
        ).with_model("anthropic", BOT_MODEL)
        raw = await chat_client.send_message(UserMessage(text=text))
    except Exception as e:
        logger.error(f"support bot LLM error: {e}")
        return None

    data = _strip_json(raw if isinstance(raw, str) else str(raw))
    if not data or not str(data.get("reply", "")).strip():
        # The model answered in prose instead of JSON — still usable as the reply.
        if isinstance(raw, str) and raw.strip():
            return {"intent": None, "reply": raw.strip()[:2000], "summary": text[:200]}
        return None
    intent = str(data.get("intent", "")).upper().strip()
    return {
        "intent": intent if intent in INTENTS else None,
        "reply": str(data["reply"]).strip()[:2000],
        "summary": str(data.get("summary") or text)[:300],
    }


async def _create_ticket(chat: dict, intent: str, summary: str, transcript: list[dict],
                         lang: str = "en") -> dict:
    seq = await db.support_tickets.count_documents({})
    number = f"ANT{datetime.now(timezone.utc).strftime('%y%m%d')}{seq + 1:04d}"
    cust = chat["customer"]
    ticket = {
        "id": str(uuid.uuid4()),
        "ticket_number": number,
        "chat_id": chat["id"],
        "intent": intent,
        "category": INTENT_LABELS.get(intent, "Support request"),
        "summary": summary,
        "name": cust["name"],
        "email": cust["email"],
        "phone": cust["phone"],
        "lang": lang,
        "user_id": chat.get("user_id"),
        "order_numbers": chat.get("order_numbers", []),
        "status": "OPEN",
        "priority": "HIGH" if intent in ("TRANSACTION", "REFUND") else "NORMAL",
        "source": "AI_CHAT",
        "transcript": [{"role": m["role"], "text": m["text"], "at": m["at"]} for m in transcript[-20:]],
        "notes": [],
        "replies": [],
        "emailed_admin": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.support_tickets.insert_one(dict(ticket))
    ticket.pop("_id", None)

    # Email the desk. A send failure must not break the customer's chat — the ticket
    # is already persisted and visible in Admin Studio. The published desk address may
    # not have a live mailbox yet, so fall back to the configured inbox that does.
    recipients = [TICKET_EMAIL] + ([TICKET_FALLBACK_EMAIL] if TICKET_FALLBACK_EMAIL
                                   and TICKET_FALLBACK_EMAIL != TICKET_EMAIL else [])
    subject, html = ticket_admin_email_html(ticket)
    for to in recipients:
        try:
            await send_email(to=to, subject=subject, html=html)
            await db.support_tickets.update_one(
                {"id": ticket["id"]}, {"$set": {"emailed_admin": True, "emailed_to": to}})
            ticket["emailed_admin"] = True
            ticket["emailed_to"] = to
            break
        except Exception as e:
            logger.error(f"ticket admin email to {to} failed for {number}: {e}")
    try:
        subject, html = ticket_ack_email_html(ticket)
        await send_email(to=cust["email"], subject=subject, html=html)
    except Exception as e:
        logger.error(f"ticket ack email failed for {number}: {e}")
    return ticket


def _public_ticket(t: dict) -> dict:
    return {
        "ticket_number": t["ticket_number"], "category": t["category"], "status": t["status"],
        "summary": t.get("summary", ""), "created_at": t["created_at"],
    }


# ============================= chat =============================
@router.post("/support/chat/start")
async def start_chat(body: ChatStartIn, request: Request, user=Depends(get_optional_user)):
    verify_csrf(request)
    rate_limit(f"botstart:{client_ip(request)}", 10, 600)
    phone = _clean_phone(body.phone)
    name = body.name.strip()
    email = body.email.lower()
    lang = norm_lang(body.lang)

    order_context, orders = await _order_context(email)
    chat = {
        "id": str(uuid.uuid4()),
        "customer": {"name": name, "email": email, "phone": phone},
        "lang": lang,
        "user_id": user["id"] if user else None,
        "order_numbers": [o.get("order_number") for o in orders],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.chat_sessions.insert_one(dict(chat))

    first = name.split()[0]
    if orders:
        latest = orders[0]
        status_key = str(latest.get("status", "")).upper()
        greeting = GREETING_WITH_ORDER[lang].format(
            name=first,
            order=latest.get("order_number"),
            status=STATUS_WORD[lang].get(status_key, STATUS_WORD["en"].get(status_key, status_key)),
        )
    else:
        greeting = GREETING_NEW[lang].format(name=first)
    msg = {"id": str(uuid.uuid4()), "chat_id": chat["id"], "role": "assistant",
           "text": greeting, "intent": "GENERAL", "at": now_iso()}
    await db.chat_messages.insert_one(dict(msg))

    return {
        "chat_id": chat["id"],
        "customer": chat["customer"],
        "lang": lang,
        "messages": [{"role": "assistant", "text": greeting, "at": msg["at"]}],
        "suggestions": SUGGESTIONS[lang],
    }


@router.get("/support/chat/{chat_id}")
async def get_chat(chat_id: str):
    chat = await db.chat_sessions.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found. Please start a new chat.")
    msgs = await db.chat_messages.find({"chat_id": chat_id}, {"_id": 0}).sort("at", 1).to_list(200)
    return {
        "chat_id": chat_id,
        "customer": chat["customer"],
        "lang": norm_lang(chat.get("lang")),
        "messages": [{"role": m["role"], "text": m["text"], "at": m["at"],
                      "ticket_number": m.get("ticket_number")} for m in msgs],
    }


@router.post("/support/chat/{chat_id}/message")
async def send_chat_message(chat_id: str, body: ChatMessageIn, request: Request):
    verify_csrf(request)
    rate_limit(f"botmsg:{chat_id}", 40, 600)
    rate_limit(f"botmsg-ip:{client_ip(request)}", 80, 600)

    chat = await db.chat_sessions.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found. Please start a new chat.")

    text = body.text.strip()
    # The customer can switch language mid-conversation from the chat header.
    lang = norm_lang(body.lang or chat.get("lang") or "en")
    history = await db.chat_messages.find({"chat_id": chat_id}, {"_id": 0}).sort("at", 1).to_list(200)
    user_msg = {"id": str(uuid.uuid4()), "chat_id": chat_id, "role": "user",
                "text": text, "at": now_iso()}
    await db.chat_messages.insert_one(dict(user_msg))

    order_context, orders = await _order_context(chat["customer"]["email"])
    result = await _ask_llm(chat, history, text, order_context, lang)

    keyword_intent = _fallback_intent(text)
    if result:
        reply = result["reply"]
        intent = result["intent"] or keyword_intent
        summary = result["summary"]
        # The business rule wins over the model: if the customer's words report a
        # refund, payment or fault problem, a ticket is raised even when the model
        # classified the turn as something softer.
        if keyword_intent in TICKET_INTENTS:
            intent = keyword_intent
        ai_used = True
    else:
        intent = keyword_intent
        reply = FALLBACK[lang].get(intent) or FALLBACK["en"][intent]
        summary = text[:300]
        ai_used = False

    ticket = None
    if intent in TICKET_INTENTS:
        transcript = history + [user_msg]
        ticket = await _create_ticket(chat, intent, summary, transcript, lang)
        cat = CATEGORY[lang].get(intent) or ticket["category"]
        reply = f"{reply}\n\n" + TICKET_RAISED[lang].format(
            number=ticket["ticket_number"], category=cat)

    bot_msg = {
        "id": str(uuid.uuid4()), "chat_id": chat_id, "role": "assistant", "text": reply,
        "intent": intent, "ticket_number": ticket["ticket_number"] if ticket else None,
        "ai": ai_used, "lang": lang, "at": now_iso(),
    }
    await db.chat_messages.insert_one(dict(bot_msg))
    await db.chat_sessions.update_one(
        {"id": chat_id},
        {"$set": {"updated_at": now_iso(), "last_intent": intent, "lang": lang,
                  "order_numbers": [o.get("order_number") for o in orders]}},
    )

    return {
        "reply": reply,
        "intent": intent,
        "lang": lang,
        "ticket": _public_ticket(ticket) if ticket else None,
        "orders": [{"order_number": o.get("order_number"), "status": o.get("status"),
                    "eta": o.get("eta"), "grand_total": o.get("grand_total")}
                   for o in orders[:3]] if intent in ("ORDER", "DELIVERY") else [],
    }


@router.get("/support/tickets/{ticket_number}")
async def ticket_status(ticket_number: str, chat_id: str):
    """Status lookup, authorised by the chat the ticket was raised from."""
    chat = await db.chat_sessions.find_one({"id": chat_id}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
    t = await db.support_tickets.find_one(
        {"ticket_number": ticket_number.upper(), "email": chat["customer"]["email"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found for this chat.")
    return {"ticket": _public_ticket(t)}


# ============================= admin =============================
@router.post("/admin/tickets/{ticket_number}/reply")
async def admin_ticket_reply(ticket_number: str, body: TicketReplyIn, request: Request,
                             admin=Depends(get_admin_user)):
    """Answer a ticket from Admin Studio: emails the customer and logs the reply.

    The email body is the admin's plain text, escaped and newline-converted server-side —
    the admin never supplies markup. Reply-To is the support desk (EMAIL_REPLY_TO), so the
    customer's answer lands in the team inbox rather than with the bot.
    """
    verify_csrf(request)
    if body.status not in TICKET_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {', '.join(TICKET_STATUSES)}.")
    t = await db.support_tickets.find_one({"ticket_number": ticket_number.upper()}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    message = body.message.strip()
    subject, html = ticket_reply_email_html(t, message)
    try:
        await send_email(to=t["email"], subject=subject, html=html)
    except Exception as e:
        # The guardrail in emailer.py rejects unsafe content (shorteners, credential asks).
        logger.error(f"ticket reply email failed for {ticket_number}: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"The reply could not be emailed to {t['email']}. That mailbox may be "
                   "undeliverable, or the message was blocked — remove any shortened links or "
                   "requests for passwords/card details and try again.",
        )

    reply = {"at": now_iso(), "by": admin.get("email"), "message": message,
             "status": body.status, "channel": "EMAIL", "to": t["email"]}
    await db.support_tickets.update_one(
        {"ticket_number": ticket_number.upper()},
        {"$set": {"status": body.status, "updated_at": now_iso(), "last_reply_at": reply["at"]},
         "$push": {"replies": reply}},
    )
    return {"status": "ok", "ticket_number": ticket_number.upper(),
            "new_status": body.status, "emailed_to": t["email"], "reply": reply}


@router.get("/admin/tickets")
async def admin_tickets(status: str | None = None, admin=Depends(get_admin_user)):
    q = {"status": status} if status in TICKET_STATUSES else {}
    tickets = await db.support_tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(300)
    counts = {s: await db.support_tickets.count_documents({"status": s}) for s in TICKET_STATUSES}
    return {"tickets": tickets, "counts": counts, "desk_email": TICKET_EMAIL,
            "delivery_email": TICKET_FALLBACK_EMAIL or TICKET_EMAIL}


@router.put("/admin/tickets/{ticket_number}/status")
async def admin_ticket_status(ticket_number: str, body: TicketStatusIn, request: Request,
                              admin=Depends(get_admin_user)):
    verify_csrf(request)
    if body.status not in TICKET_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {', '.join(TICKET_STATUSES)}.")
    t = await db.support_tickets.find_one({"ticket_number": ticket_number.upper()}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    note = {"at": now_iso(), "by": admin.get("email"), "status": body.status,
            "note": (body.note or "").strip()[:1000]}
    await db.support_tickets.update_one(
        {"ticket_number": ticket_number.upper()},
        {"$set": {"status": body.status, "updated_at": now_iso()}, "$push": {"notes": note}},
    )
    return {"status": "ok", "ticket_number": ticket_number.upper(), "new_status": body.status}
