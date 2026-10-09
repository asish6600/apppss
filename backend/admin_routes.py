"""Admin Studio: Today's Deals manager, Combo builder preview, curation flags."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from db import db
from security import get_admin_user, verify_csrf
from catalog_logic import (present_product, price_from_mrp, discount_pct, norm_iso, now_utc, combo_pricing)

router = APIRouter(prefix="/api/admin")


def _now_iso():
    return now_utc().isoformat()


# ---------------- TODAY'S DEALS ----------------
class DealIn(BaseModel):
    slug: str
    deal_discount: int | None = None
    deal_price: int | None = None
    deal_badge: str | None = "Today's Deal"
    deal_start_at: str | None = None
    deal_end_at: str | None = None
    deal_stock: int | None = None


class DealPatch(BaseModel):
    deal_visible: bool | None = None
    deal_discount: int | None = None
    deal_price: int | None = None
    deal_badge: str | None = None
    deal_start_at: str | None = None
    deal_end_at: str | None = None
    deal_stock: int | None = None
    clear_dates: bool = False
    clear_stock: bool = False


class ReorderIn(BaseModel):
    slugs: list[str]


def _deal_price(mrp: int, body) -> tuple[int, int]:
    if body.deal_discount is not None and mrp:
        return price_from_mrp(mrp, body.deal_discount), int(body.deal_discount)
    if body.deal_price is not None:
        return int(body.deal_price), discount_pct(mrp, int(body.deal_price))
    raise HTTPException(status_code=400, detail="Set either a deal discount % or a deal price.")


@router.get("/deals")
async def list_deals(admin=Depends(get_admin_user)):
    now = now_utc()
    deals = await db.products.find({"is_todays_deal": True}, {"_id": 0}).to_list(300)
    deals.sort(key=lambda p: p.get("deal_order", 0))
    deals = [present_product(d, now) for d in deals]
    candidates = await db.products.find(
        {"is_todays_deal": {"$ne": True}, "status": "PUBLISHED", "is_combo": {"$ne": True}},
        {"_id": 0, "slug": 1, "name": 1, "image": 1, "price": 1, "mrp": 1, "stock": 1, "category": 1, "pack_size": 1},
    ).sort("name", 1).to_list(500)
    return {"deals": deals, "candidates": candidates}


@router.post("/deals")
async def add_deal(body: DealIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    p = await db.products.find_one({"slug": body.slug}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    if p.get("is_combo"):
        raise HTTPException(status_code=400, detail="Combo Boxes cannot be added to Today's Deals.")
    price, pct = _deal_price(p.get("mrp") or 0, body)
    if price > (p.get("price") or 0):
        raise HTTPException(status_code=400, detail="A deal price must be lower than the regular selling price.")
    last = await db.products.find({"is_todays_deal": True}, {"_id": 0, "deal_order": 1}).sort("deal_order", -1).to_list(1)
    order = (last[0].get("deal_order", 0) + 1) if last else 1
    await db.products.update_one({"slug": body.slug}, {"$set": {
        "is_todays_deal": True, "deal_visible": True, "deal_order": order,
        "deal_price": price, "deal_discount": pct, "deal_badge": (body.deal_badge or "Today's Deal").strip(),
        "deal_start_at": norm_iso(body.deal_start_at), "deal_end_at": norm_iso(body.deal_end_at),
        "deal_stock": body.deal_stock, "updated_at": _now_iso(),
    }})
    out = await db.products.find_one({"slug": body.slug}, {"_id": 0})
    return {"deal": present_product(out)}


@router.put("/deals/reorder")
async def reorder_deals(body: ReorderIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    for i, slug in enumerate(body.slugs, start=1):
        await db.products.update_one({"slug": slug, "is_todays_deal": True}, {"$set": {"deal_order": i}})
    return {"status": "ok"}


@router.put("/deals/{slug}")
async def update_deal(slug: str, body: DealPatch, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    p = await db.products.find_one({"slug": slug, "is_todays_deal": True}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Deal not found")
    updates: dict = {"updated_at": _now_iso()}
    if body.deal_visible is not None:
        updates["deal_visible"] = body.deal_visible
    if body.deal_discount is not None or body.deal_price is not None:
        price, pct = _deal_price(p.get("mrp") or 0, body)
        if price > (p.get("price") or 0):
            raise HTTPException(status_code=400, detail="A deal price must be lower than the regular selling price.")
        updates["deal_price"], updates["deal_discount"] = price, pct
    if body.deal_badge is not None:
        updates["deal_badge"] = body.deal_badge.strip() or "Today's Deal"
    if body.clear_dates:
        updates["deal_start_at"] = None
        updates["deal_end_at"] = None
    else:
        if body.deal_start_at is not None:
            updates["deal_start_at"] = norm_iso(body.deal_start_at)
        if body.deal_end_at is not None:
            updates["deal_end_at"] = norm_iso(body.deal_end_at)
    if body.clear_stock:
        updates["deal_stock"] = None
    elif body.deal_stock is not None:
        updates["deal_stock"] = body.deal_stock
    await db.products.update_one({"slug": slug}, {"$set": updates})
    out = await db.products.find_one({"slug": slug}, {"_id": 0})
    return {"deal": present_product(out)}


@router.delete("/deals/{slug}")
async def remove_deal(slug: str, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    await db.products.update_one({"slug": slug}, {"$set": {"is_todays_deal": False, "deal_visible": False, "updated_at": _now_iso()}})
    return {"status": "ok"}


# ---------------- COMBO BUILDER ----------------
class ComboItem(BaseModel):
    slug: str
    qty: int = 1


class ComboPreviewIn(BaseModel):
    items: list[ComboItem]
    discount_pct: float = 0


async def resolve_combo_members(items: list[dict]) -> list[dict]:
    members = []
    for it in items:
        p = await db.products.find_one({"slug": it["slug"], "is_combo": {"$ne": True}},
                                       {"_id": 0, "slug": 1, "name": 1, "image": 1, "price": 1, "mrp": 1, "pack_size": 1, "stock": 1})
        if p:
            members.append({**p, "qty": max(1, int(it.get("qty") or 1)), "line_total": p["price"] * max(1, int(it.get("qty") or 1))})
    return members


@router.post("/combos/preview")
async def combo_preview(body: ComboPreviewIn, admin=Depends(get_admin_user)):
    members = await resolve_combo_members([i.model_dump() for i in body.items])
    if not members:
        return {"members": [], "items_total": 0, "combo_price": 0, "savings": 0, "discount_pct": int(body.discount_pct)}
    return {"members": members, **combo_pricing(members, body.discount_pct)}


# ---------------- CURATION FLAGS (Top Sellers / Fresh Picks) ----------------
class FlagsIn(BaseModel):
    featured: bool | None = None
    top_seller_rank: int | None = None
    is_new: bool | None = None
    sales_count: int | None = None
    clear_rank: bool = False


@router.put("/products/{slug}/flags")
async def set_flags(slug: str, body: FlagsIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    if not await db.products.find_one({"slug": slug}):
        raise HTTPException(status_code=404, detail="Product not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None and k != "clear_rank"}
    if body.clear_rank:
        updates["top_seller_rank"] = None
    updates["updated_at"] = _now_iso()
    await db.products.update_one({"slug": slug}, {"$set": updates})
    out = await db.products.find_one({"slug": slug}, {"_id": 0})
    return {"product": present_product(out)}
