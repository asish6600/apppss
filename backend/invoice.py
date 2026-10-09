"""PDF invoice generation (reportlab). Pure rendering — no DB, no email, no network.

Compliance note: FSSAI / GSTIN / packer details are rendered from INVOICE_LEGAL
below and deliberately read "To be updated" until the real supplier documents are
supplied. This matches the app's own organic-transparency policy — we would rather
print a placeholder than invent a licence number.
"""
from io import BytesIO
from datetime import datetime, timezone, timedelta

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle, KeepTogether)

IST = timezone(timedelta(hours=5, minutes=30))

FOREST = colors.HexColor("#174A35")
AMBER = colors.HexColor("#D99A22")
CHARCOAL = colors.HexColor("#252A27")
CREAM = colors.HexColor("#F8F5EC")
SAGE = colors.HexColor("#8FAF82")
MUTED = colors.HexColor("#6B7280")

SELLER = {
    "name": "AaharNest",
    "tagline": "Wholesome Food for a Healthier You",
    "sourcing": "Sourced from organic farms in Odisha, India",
    "support": "customercare@aaharnest.com",
}

# Real licence/registration numbers are not yet supplied by the business.
INVOICE_LEGAL = [
    ("FSSAI Licence", "To be updated"),
    ("GSTIN", "To be updated"),
    ("Packed by", "To be updated"),
]

_B = ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=CHARCOAL)
_N = ParagraphStyle("n", fontName="Helvetica", fontSize=9, leading=12, textColor=CHARCOAL)
_S = ParagraphStyle("s", fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED)
_R = ParagraphStyle("r", parent=_N, alignment=TA_RIGHT)
_RB = ParagraphStyle("rb", parent=_B, alignment=TA_RIGHT)
_H = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=colors.white)
_HR = ParagraphStyle("hr", parent=_H, alignment=TA_RIGHT)


def invoice_number(order_number: str) -> str:
    return f"INV-{order_number}"


def _money(n) -> str:
    """Rupee amounts without the glyph — Helvetica has no Rupee sign."""
    return f"Rs. {int(round(float(n or 0))):,}"


def _fmt_date(iso: str | None) -> str:
    if not iso:
        return ""
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if not d.tzinfo:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(IST).strftime("%d %b %Y, %I:%M %p IST")
    except Exception:
        return str(iso)


def _header(canvas, doc):
    canvas.saveState()
    w, h = A4
    # tricolour hairline
    band = h - 14 * mm
    for i, col in enumerate((colors.HexColor("#FF9933"), colors.white, colors.HexColor("#138808"))):
        canvas.setFillColor(col)
        canvas.rect(18 * mm + i * ((w - 36 * mm) / 3), band, (w - 36 * mm) / 3, 1.6 * mm, stroke=0, fill=1)

    canvas.setFillColor(FOREST)
    canvas.setFont("Helvetica-Bold", 20)
    canvas.drawString(18 * mm, h - 24 * mm, "Aahar")
    canvas.setFillColor(AMBER)
    canvas.drawString(18 * mm + canvas.stringWidth("Aahar", "Helvetica-Bold", 20), h - 24 * mm, "Nest")

    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, h - 28.5 * mm, SELLER["tagline"])
    canvas.drawString(18 * mm, h - 32 * mm, SELLER["sourcing"])

    canvas.setFillColor(CHARCOAL)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawRightString(w - 18 * mm, h - 24 * mm, "TAX INVOICE")

    # footer
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 12 * mm, f"{SELLER['name']} · {SELLER['support']} · Made in India")
    canvas.drawRightString(w - 18 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def _kv_table(rows, width):
    t = Table([[Paragraph(k, _S), Paragraph(v, _N)] for k, v in rows], colWidths=[width * 0.38, width * 0.62])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def build_invoice_pdf(order: dict, customer: dict | None = None) -> bytes:
    """Render a single order into invoice PDF bytes."""
    buf = BytesIO()
    page_w, page_h = A4
    content_w = page_w - 36 * mm

    doc = BaseDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                          topMargin=38 * mm, bottomMargin=18 * mm,
                          title=f"AaharNest Invoice {invoice_number(order.get('order_number', ''))}",
                          author="AaharNest")
    frame = Frame(doc.leftMargin, doc.bottomMargin, content_w, page_h - doc.topMargin - doc.bottomMargin, id="f")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_header)])

    addr = order.get("address") or {}
    cust = customer or {}
    story = []

    # --- meta + bill-to ---------------------------------------------------
    meta = _kv_table([
        ("Invoice No.", invoice_number(order.get("order_number", ""))),
        ("Order No.", str(order.get("order_number", ""))),
        ("Invoice Date", _fmt_date(order.get("created_at"))),
        ("Payment", "Cash on Delivery" if order.get("payment_method") == "cod" else str(order.get("payment_method", "")).upper()),
        ("Payment Status", str(order.get("payment_status", "PENDING")).title()),
        ("Order Status", str(order.get("status", "PLACED")).replace("_", " ").title()),
    ], content_w * 0.47)

    bill_lines = [
        f"<b>{_esc(addr.get('full_name') or cust.get('display_name') or 'Customer')}</b>",
        _esc(addr.get("address", "")),
    ]
    if addr.get("apartment"):
        bill_lines.append(_esc(addr["apartment"]))
    if addr.get("landmark"):
        bill_lines.append(_esc(addr["landmark"]))
    bill_lines.append(f"{_esc(addr.get('city',''))}, {_esc(addr.get('state',''))} - {_esc(addr.get('pincode',''))}")
    if addr.get("mobile"):
        bill_lines.append(f"Mobile: {_esc(addr['mobile'])}")
    if cust.get("email"):
        bill_lines.append(f"Email: {_esc(cust['email'])}")

    bill = [Paragraph("BILL TO / SHIP TO", _S)] + [Paragraph(l, _N) for l in bill_lines if l.strip(", -")]
    bill_cell = Table([[b] for b in bill], colWidths=[content_w * 0.47])
    bill_cell.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                   ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))

    top = Table([[meta, bill_cell]], colWidths=[content_w * 0.5, content_w * 0.5])
    top.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (0, 0), 0),
                             ("RIGHTPADDING", (-1, 0), (-1, 0), 0)]))
    story += [top, Spacer(1, 7 * mm)]

    # --- line items -------------------------------------------------------
    head = [Paragraph("#", _H), Paragraph("Item", _H), Paragraph("SKU", _H),
            Paragraph("Qty", _HR), Paragraph("Rate", _HR), Paragraph("Amount", _HR)]
    rows = [head]
    for i, it in enumerate(order.get("items") or [], start=1):
        name = _esc(it.get("name", ""))
        if it.get("pack_size"):
            name += f"<br/><font size=7 color='#6B7280'>{_esc(it['pack_size'])}</font>"
        rows.append([
            Paragraph(str(i), _N), Paragraph(name, _N), Paragraph(_esc(it.get("sku") or "-"), _S),
            Paragraph(str(it.get("qty", 1)), _R), Paragraph(_money(it.get("price")), _R),
            Paragraph(_money(it.get("line_total")), _R),
        ])

    cw = [content_w * c for c in (0.05, 0.40, 0.17, 0.07, 0.145, 0.165)]
    items = Table(rows, colWidths=cw, repeatRows=1)
    items.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), FOREST),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, colors.HexColor("#E5E7EB")),
        ("BOX", (0, 0), (-1, -1), 0.6, SAGE),
    ]))
    story += [items, Spacer(1, 5 * mm)]

    # --- totals -----------------------------------------------------------
    tot_rows = [("Subtotal", order.get("product_subtotal", 0))]
    if order.get("discount"):
        tot_rows.append(("Discount", -abs(order["discount"])))
    ship = order.get("shipping", 0)
    tot_rows.append(("Shipping", ship))
    tot_rows.append(("Tax", order.get("tax", 0)))
    if order.get("donation_amount"):
        tot_rows.append(("Community contribution (voluntary)", order["donation_amount"]))

    body = [[Paragraph(k, _N), Paragraph("Free" if k == "Shipping" and not v else _money(v), _R)] for k, v in tot_rows]
    body.append([Paragraph("<b>Grand Total</b>", _B), Paragraph(f"<b>{_money(order.get('grand_total', 0))}</b>", _RB)])
    tt = Table(body, colWidths=[content_w * 0.26, content_w * 0.17])
    tt.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEABOVE", (0, -1), (-1, -1), 0.8, FOREST),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EEF4F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (-1, 0), (-1, -1), 4),
    ]))
    wrap = Table([["", tt]], colWidths=[content_w * 0.57, content_w * 0.43])
    wrap.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (-1, 0), (-1, 0), 0)]))
    story += [wrap, Spacer(1, 6 * mm)]

    # --- legal + notes ----------------------------------------------------
    legal = _kv_table(INVOICE_LEGAL, content_w * 0.45)
    notes = [
        Paragraph("Notes", _S),
        Paragraph(f"Estimated delivery: {_esc(order.get('eta') or '3-6 business days')}", _N),
        Paragraph("All products are sourced from organic farms in Odisha and packed in India.", _S),
        Paragraph("This is a computer-generated invoice. Prices are inclusive of applicable taxes "
                  "unless shown separately above.", _S),
    ]
    if order.get("donation_amount"):
        notes.append(Paragraph(
            f"Includes a voluntary contribution of {_money(order['donation_amount'])} toward educational "
            "support for children in India. This is optional and never pre-selected.", _S))
    nt = Table([[n] for n in notes], colWidths=[content_w * 0.5])
    nt.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                            ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))

    bottom = Table([[Table([[Paragraph("COMPLIANCE", _S)], [legal]], colWidths=[content_w * 0.45]), nt]],
                   colWidths=[content_w * 0.48, content_w * 0.52])
    bottom.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(KeepTogether(bottom))
    story += [Spacer(1, 6 * mm),
              Paragraph("Thank you for choosing AaharNest - from our farmers to your family.", _B)]

    doc.build(story)
    return buf.getvalue()


def _esc(s) -> str:
    return (str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
