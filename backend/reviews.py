"""Product reviews — verified buyers only. Real ratings replace the seeded placeholders."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from db import db
from security import get_current_user, get_admin_user, get_optional_user, verify_csrf

router = APIRouter(prefix="/api")


def _now():
    return datetime.now(timezone.utc).isoformat()


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str | None = ""
    body: str | None = ""


def _breakdown(docs: list[dict]) -> dict:
    out = {str(i): 0 for i in range(1, 6)}
    for d in docs:
        out[str(int(d["rating"]))] += 1
    return out


async def _summary(product_slug: str) -> dict:
    docs = await db.reviews.find({"product_slug": product_slug}, {"_id": 0, "rating": 1}).to_list(2000)
    count = len(docs)
    return {
        "average": round(sum(d["rating"] for d in docs) / count, 1) if count else None,
        "count": count,
        "breakdown": _breakdown(docs),
    }


async def recompute_rating(product_slug: str) -> dict:
    """A product's rating is always the average of its real reviews — never a seeded value."""
    s = await _summary(product_slug)
    await db.products.update_one(
        {"slug": product_slug},
        {"$set": {"rating": s["average"], "rating_count": s["count"]}},
    )
    return s


async def _has_purchased(user_id: str, product_slug: str) -> bool:
    return bool(await db.orders.find_one({"user_id": user_id, "items.slug": product_slug}, {"_id": 1}))


@router.get("/products/{slug}/reviews")
async def list_reviews(slug: str, user=Depends(get_optional_user)):
    reviews = await db.reviews.find({"product_slug": slug}, {"_id": 0}).sort("created_at", -1).to_list(200)
    mine = next((r for r in reviews if user and r.get("user_id") == user["id"]), None)
    can_review = bool(user) and await _has_purchased(user["id"], slug) if user else False
    return {
        "reviews": reviews,
        "summary": await _summary(slug),
        "can_review": can_review,
        "my_review": mine,
        "signed_in": bool(user),
    }


@router.post("/products/{slug}/reviews")
async def upsert_review(slug: str, body: ReviewIn, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    if not await db.products.find_one({"slug": slug}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Product not found")
    if not await _has_purchased(user["id"], slug):
        raise HTTPException(status_code=403, detail="Only customers who have ordered this product can review it.")
    existing = await db.reviews.find_one({"product_slug": slug, "user_id": user["id"]}, {"_id": 0, "id": 1})
    doc = {
        "product_slug": slug, "user_id": user["id"],
        "user_name": user.get("display_name") or (user.get("email") or "").split("@")[0],
        "rating": int(body.rating), "title": (body.title or "").strip()[:120],
        "body": (body.body or "").strip()[:2000],
        "verified_purchase": True, "updated_at": _now(),
    }
    if existing:
        await db.reviews.update_one({"id": existing["id"]}, {"$set": doc})
    else:
        await db.reviews.insert_one({**doc, "id": str(uuid.uuid4()), "created_at": _now()})
    return {"status": "ok", "summary": await recompute_rating(slug)}


@router.delete("/reviews/{review_id}")
async def delete_own_review(review_id: str, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0, "product_slug": 1, "user_id": 1})
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    if r["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own review.")
    await db.reviews.delete_one({"id": review_id})
    return {"status": "ok", "summary": await recompute_rating(r["product_slug"])}


# ---------------- ADMIN MODERATION ----------------
@router.get("/admin/reviews")
async def admin_list_reviews(admin=Depends(get_admin_user)):
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    slugs = list({r["product_slug"] for r in reviews})
    prods = await db.products.find({"slug": {"$in": slugs}}, {"_id": 0, "slug": 1, "name": 1, "image": 1}).to_list(500)
    by_slug = {p["slug"]: p for p in prods}
    for r in reviews:
        p = by_slug.get(r["product_slug"], {})
        r["product_name"] = p.get("name", r["product_slug"])
        r["product_image"] = p.get("image")
    return {"reviews": reviews}


@router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0, "product_slug": 1})
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.delete_one({"id": review_id})
    return {"status": "ok", "summary": await recompute_rating(r["product_slug"])}
