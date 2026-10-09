"""Central pricing + presentation rules — the single source of truth for MRP / price / discount / deals."""
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

# Units at or below which a product is flagged "low stock" in Admin Studio.
DEFAULT_LOW_STOCK_THRESHOLD = 10


def now_utc():
    return datetime.now(timezone.utc)


def price_from_mrp(mrp: int, pct: float) -> int:
    return int(round((mrp or 0) * (100 - (pct or 0)) / 100))


def discount_pct(mrp, price) -> int:
    if not mrp or price is None or price >= mrp:
        return 0
    return int(round((mrp - price) / mrp * 100))


def parse_iso(iso):
    if not iso:
        return None
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def norm_iso(iso):
    d = parse_iso(iso)
    return d.astimezone(timezone.utc).isoformat() if d else None


def next_midnight_ist(now=None):
    local = (now or now_utc()).astimezone(IST)
    nxt = (local + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return nxt.astimezone(timezone.utc)


def deal_state(p: dict, now=None):
    """(status, ts) — status in none|hidden|scheduled|live|ended."""
    if not p.get("is_todays_deal"):
        return "none", None
    if not p.get("deal_visible", True):
        return "hidden", None
    now = now or now_utc()
    start, end = parse_iso(p.get("deal_start_at")), parse_iso(p.get("deal_end_at"))
    if end and end <= now:
        return "ended", end.isoformat()
    if start and start > now:
        return "scheduled", start.isoformat()
    midnight = next_midnight_ist(now)
    ends = min(end, midnight) if end else midnight
    return "live", ends.isoformat()


def present_product(p: dict, now=None, admin: bool = False) -> dict:
    """Attach effective price/discount and a `deal` block. Mutates and returns p.

    `out_of_stock` is the admin's manual override: a product can be forced off-sale
    while its counted stock is still positive. For storefront payloads the reported
    `stock` is clamped to 0 in that case, so every existing `stock <= 0` check in the
    UI keeps working. Admin payloads (`admin=True`) keep the real count so the
    inventory screen can show what is actually on the shelf.
    """
    p.pop("_id", None)
    now = now or now_utc()
    forced_out = bool(p.get("out_of_stock"))
    real_stock = int(p.get("stock") or 0)
    p["out_of_stock"] = forced_out or real_stock <= 0
    p["manual_out_of_stock"] = forced_out
    p["stock_on_hand"] = real_stock
    if forced_out and not admin:
        p["stock"] = 0
    mrp = p.get("mrp") or 0
    base_price = p.get("price") or 0
    p["regular_price"] = base_price
    p["discount"] = discount_pct(mrp, base_price)
    status, ts = deal_state(p, now)
    if status in ("none", "hidden"):
        p["deal"] = None
        return p
    deal_price = p.get("deal_price") or base_price
    p["deal"] = {
        "status": status, "live": status == "live", "ended": status == "ended",
        "ends_at": ts if status == "live" else None,
        "ended_at": ts if status == "ended" else None,
        "starts_at": ts if status == "scheduled" else None,
        "badge": p.get("deal_badge") or "Today's Deal",
        "price": deal_price, "discount": discount_pct(mrp, deal_price),
        "stock": p.get("deal_stock"), "resets_daily": not p.get("deal_end_at"),
    }
    if status == "live":
        p["price"] = deal_price
        p["discount"] = discount_pct(mrp, deal_price)
    return p


def available_stock(p: dict, now=None) -> int:
    """Sellable units right now. The admin's manual `out_of_stock` override wins over
    the counted stock, so forcing a product off-sale blocks add-to-cart and checkout."""
    if p.get("out_of_stock"):
        return 0
    stock = int(p.get("stock") or 0)
    status, _ = deal_state(p, now)
    if status == "live" and p.get("deal_stock") is not None:
        return min(stock, int(p["deal_stock"]))
    return stock


def low_stock(p: dict) -> bool:
    """True when the counted stock has fallen to or below the product's alert threshold."""
    threshold = p.get("low_stock_threshold")
    if threshold in (None, ""):
        threshold = DEFAULT_LOW_STOCK_THRESHOLD
    stock = int(p.get("stock") or 0)
    return 0 < stock <= int(threshold)


def live_deal_exclusion(now=None) -> dict:
    """Mongo clause matching products that are NOT currently live Today's Deals."""
    now_iso = (now or now_utc()).isoformat()
    return {"$nor": [{
        "is_todays_deal": True, "deal_visible": True,
        "$and": [
            {"$or": [{"deal_end_at": None}, {"deal_end_at": {"$exists": False}}, {"deal_end_at": {"$gt": now_iso}}]},
            {"$or": [{"deal_start_at": None}, {"deal_start_at": {"$exists": False}}, {"deal_start_at": {"$lte": now_iso}}]},
        ],
    }]}


def combo_pricing(members: list[dict], pct: float) -> dict:
    items_total = sum(int(m.get("price") or 0) * int(m.get("qty") or 1) for m in members)
    combo_price = price_from_mrp(items_total, pct)
    return {"items_total": items_total, "combo_price": combo_price,
            "savings": items_total - combo_price, "discount_pct": int(round(pct or 0))}


SORTS = {
    "recommended": [("featured", -1), ("rating", -1), ("sales_count", -1)],
    "popular": [("sales_count", -1), ("rating", -1)],
    "newest": [("created_at", -1)],
    "price_asc": [("price", 1)],
    "price_desc": [("price", -1)],
    "rating": [("rating", -1), ("rating_count", -1)],
    "discount": [("discount", -1)],
    "featured": [("featured", -1), ("rating", -1)],
}
