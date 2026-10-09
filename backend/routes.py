"""All API routes for AaharNest."""
import os
import re
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import Response as FileResponse
from pydantic import BaseModel, EmailStr, Field

import storage

from db import db
from security import (
    hash_password, verify_password, generate_otp, hash_otp, verify_otp,
    create_session, revoke_session, revoke_all_sessions, set_auth_cookies,
    clear_auth_cookies, get_current_user, get_optional_user, verify_csrf,
    rate_limit, client_ip, GUEST_COOKIE, ensure_csrf_cookie, get_admin_user,
)
from emailer import send_email, otp_email_html, invoice_customer_email_html, invoice_admin_email_html
from invoice import build_invoice_pdf, invoice_number
from catalog_logic import (present_product, available_stock, live_deal_exclusion, now_utc, SORTS,
                           price_from_mrp, discount_pct, combo_pricing, low_stock,
                           DEFAULT_LOW_STOCK_THRESHOLD)
from admin_routes import resolve_combo_members

logger = logging.getLogger("aaharnest.routes")

router = APIRouter(prefix="/api")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def public_user(u: dict) -> dict:
    return {
        "id": u["id"], "email": u["email"], "display_name": u.get("display_name"),
        # `city` is editable via PUT /me/profile, so it has to be serialised back or the
        # Account form loses it on reload (it saved, but never returned).
        "city": u.get("city"),
        "role": u.get("role", "customer"), "email_verified": u.get("email_verified", False),
        "language": u.get("language", "en-IN"), "account_status": u.get("account_status", "ACTIVE"),
        "deletion_date": u.get("deletion_date"),
    }


# ============================= AUTH =============================
class EmailIn(BaseModel):
    email: EmailStr


class CheckOut(BaseModel):
    exists: bool
    has_password: bool


@router.post("/auth/check")
async def auth_check(body: EmailIn, request: Request):
    rate_limit(f"check:{client_ip(request)}", 30, 60)
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    exists = user is not None and user.get("account_status") != "DELETED"
    has_password = bool(user and user.get("password_hash"))
    return {"exists": exists, "has_password": has_password}


class OtpRequest(BaseModel):
    email: EmailStr


@router.post("/auth/otp/request")
async def otp_request(body: OtpRequest, request: Request):
    email = body.email.lower()
    ip = client_ip(request)
    rate_limit(f"otpreq:{ip}", 10, 60)
    rate_limit(f"otpreq:{email}", 5, 300)

    # resend cooldown
    last = await db.auth_otps.find_one({"email": email}, sort=[("created_at", -1)])
    if last:
        created = last.get("created_at")
        try:
            created_dt = datetime.fromisoformat(created)
        except Exception:
            created_dt = None
        if created_dt and (datetime.now(timezone.utc) - created_dt).total_seconds() < 60:
            raise HTTPException(status_code=429, detail="Please wait a moment before requesting another code.")

    code = generate_otp()
    # invalidate previous
    await db.auth_otps.delete_many({"email": email})
    await db.auth_otps.insert_one({
        "email": email, "otp_hash": hash_otp(code), "attempts": 0,
        "created_at": now_iso(),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
    })
    try:
        await send_email(to=email, subject="Your AaharNest verification code", html=otp_email_html(code))
    except Exception:
        raise HTTPException(status_code=502, detail="We couldn't send the code right now. Please try again shortly.")
    return {"status": "sent", "message": "If this email can receive mail, a 6-digit code is on its way."}


class OtpVerify(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    name: str | None = None


@router.post("/auth/otp/verify")
async def otp_verify(body: OtpVerify, request: Request, response: Response):
    email = body.email.lower()
    rate_limit(f"otpver:{client_ip(request)}", 20, 60)
    rec = await db.auth_otps.find_one({"email": email}, sort=[("created_at", -1)])
    if not rec:
        raise HTTPException(status_code=400, detail="This code has expired. Please request a new one.")
    if rec.get("attempts", 0) >= 5:
        await db.auth_otps.delete_many({"email": email})
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new code.")
    if not verify_otp(rec["otp_hash"], body.code):
        await db.auth_otps.update_one({"_id": rec["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="That code didn't match. Please check and try again.")
    await db.auth_otps.delete_many({"email": email})

    user = await db.users.find_one({"email": email}, {"_id": 0})
    is_new_user = user is None
    if not user:
        user = {
            "id": str(uuid.uuid4()), "email": email, "display_name": (body.name or "").strip() or None,
            "role": "customer", "email_verified": True, "account_status": "ACTIVE",
            "language": "en-IN", "created_at": now_iso(), "updated_at": now_iso(),
        }
        await db.users.insert_one(dict(user))
    else:
        updates = {"email_verified": True, "updated_at": now_iso()}
        if user.get("account_status") == "DELETION_PENDING":
            updates["account_status"] = "ACTIVE"
            updates["deletion_date"] = None
        if body.name and not user.get("display_name"):
            updates["display_name"] = body.name.strip()
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user = await db.users.find_one({"id": user["id"]}, {"_id": 0})

    token = await create_session(user["id"])
    set_auth_cookies(response, token)
    await _merge_guest_cart(request, user["id"])
    if is_new_user:
        try:
            from emailer import welcome_email_html
            subject, html = welcome_email_html(user.get("display_name"))
            await send_email(to=user["email"], subject=subject, html=html)
        except Exception:
            pass
    return {"user": public_user(user)}


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ip = client_ip(request)
    rate_limit(f"login:{ip}:{email}", 8, 300)
    user = await db.users.find_one({"email": email}, {"_id": 0})
    generic = "Incorrect email or password."
    if not user or not user.get("password_hash") or not verify_password(user["password_hash"], body.password):
        raise HTTPException(status_code=401, detail=generic)
    if user.get("account_status") == "DELETION_PENDING":
        await db.users.update_one({"id": user["id"]}, {"$set": {"account_status": "ACTIVE", "deletion_date": None}})
        user["account_status"] = "ACTIVE"
    token = await create_session(user["id"])
    set_auth_cookies(response, token)
    await _merge_guest_cart(request, user["id"])
    return {"user": public_user(user)}


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("an_session")
    if token:
        await revoke_session(token)
    clear_auth_cookies(response)
    return {"status": "ok"}


@router.post("/auth/logout-all")
async def logout_all(request: Request, response: Response, user=Depends(get_current_user)):
    verify_csrf(request)
    await revoke_all_sessions(user["id"])
    clear_auth_cookies(response)
    return {"status": "ok"}


@router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": public_user(user)}


@router.post("/auth/password/forgot")
async def password_forgot(body: EmailIn, request: Request):
    # reuse OTP mechanism as the secure reset channel
    email = body.email.lower()
    rate_limit(f"forgot:{email}", 3, 600)
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        code = generate_otp()
        await db.auth_otps.delete_many({"email": email})
        await db.auth_otps.insert_one({
            "email": email, "otp_hash": hash_otp(code), "attempts": 0, "purpose": "reset",
            "created_at": now_iso(), "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        })
        try:
            await send_email(to=email, subject="Reset your AaharNest password", html=otp_email_html(code))
        except Exception:
            pass
    return {"status": "ok", "message": "If an account exists for this email, we've sent a reset code."}


class ResetIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)


@router.post("/auth/password/reset")
async def password_reset(body: ResetIn, request: Request):
    email = body.email.lower()
    rate_limit(f"reset:{client_ip(request)}", 15, 300)
    rec = await db.auth_otps.find_one({"email": email}, sort=[("created_at", -1)])
    if not rec or not verify_otp(rec["otp_hash"], body.code):
        if rec:
            await db.auth_otps.update_one({"_id": rec["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="That reset code is invalid or has expired.")
    await db.auth_otps.delete_many({"email": email})
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password), "updated_at": now_iso()}})
        await revoke_all_sessions(user["id"])
    return {"status": "ok", "message": "Password updated. Please sign in."}


# ============================= CATALOG =============================
@router.get("/categories")
async def list_categories():
    cats = await db.categories.find({"status": "PUBLISHED"}, {"_id": 0}).to_list(100)
    return {"categories": cats}


def _strip_product(p: dict) -> dict:
    p.pop("_id", None)
    return p


@router.get("/products")
async def list_products(category: str | None = None, subcategory: str | None = None, q: str | None = None,
                        featured: bool | None = None, offers: bool | None = None, sort: str | None = None,
                        combo: bool | None = None, todays_deal: bool | None = None,
                        bestseller: bool | None = None, new_arrival: bool | None = None,
                        min_price: int | None = None, max_price: int | None = None,
                        min_discount: int | None = None, in_stock: bool | None = None,
                        pack_size: str | None = None, brand: str | None = None, min_rating: float | None = None,
                        dietary: str | None = None, organic: bool | None = None, product_type: str | None = None,
                        limit: int | None = None):
    now = now_utc()
    query: dict = {"status": "PUBLISHED"}
    # extra pack sizes are sibling products — only the primary variant is listed
    query["variant_primary"] = {"$ne": False}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = {"$in": subcategory.split(",")}
    if featured or bestseller:
        query["featured"] = True
    if offers:
        query["campaign_slug"] = {"$ne": None}
    # Combo Boxes appear only on the Combo page / combo filter
    query["is_combo"] = True if combo else {"$ne": True}
    if todays_deal:
        query["is_todays_deal"] = True
        query["deal_visible"] = True
    else:
        # Live Today's Deals are exclusive to the Today's Deals page; hidden/ended deals fall back to the Shop at regular price
        query.update(live_deal_exclusion(now))
    if new_arrival:
        query["is_new"] = True
    if in_stock:
        # a manual out-of-stock override counts as out of stock even with units on hand
        query["stock"] = {"$gt": 0}
        query["out_of_stock"] = {"$ne": True}
    if min_price is not None or max_price is not None:
        pr = {}
        if min_price is not None:
            pr["$gte"] = int(min_price)
        if max_price is not None:
            pr["$lte"] = int(max_price)
        query["price"] = pr
    if min_discount is not None:
        query["discount"] = {"$gte": int(min_discount)}
    if pack_size:
        query["pack_size"] = {"$in": pack_size.split(",")}
    if brand:
        query["brand"] = {"$in": brand.split(",")}
    if min_rating is not None:
        query["rating"] = {"$gte": float(min_rating)}
    if dietary:
        query["dietary"] = {"$all": dietary.split(",")}
    if organic:
        query["organic_status"] = True
    if product_type:
        query["product_type"] = {"$in": product_type.split(",")}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"description": rx}, {"category": rx}, {"subcategory": rx}, {"search_keywords": rx}, {"brand": rx}]
    cursor = db.products.find(query, {"_id": 0})
    if sort in SORTS:
        cursor = cursor.sort(SORTS[sort])
    elif not (todays_deal or featured or bestseller):
        cursor = cursor.sort(SORTS["recommended"])
    products = [present_product(p, now) for p in await cursor.to_list(400)]
    if todays_deal:
        products.sort(key=lambda p: p.get("deal_order", 0))
    elif (featured or bestseller) and not sort:
        products.sort(key=lambda p: (p.get("top_seller_rank") or 999, -(p.get("sales_count") or 0)))
    if limit:
        products = products[: int(limit)]
    return {"products": products}


@router.get("/catalog/facets")
async def catalog_facets(category: str | None = None):
    base: dict = {"status": "PUBLISHED", "is_combo": {"$ne": True}}
    if category:
        base["category"] = category

    async def distinct(field):
        vals = await db.products.distinct(field, base)
        return sorted(v for v in vals if v)

    return {
        "subcategories": await distinct("subcategory"), "pack_sizes": await distinct("pack_size"),
        "brands": await distinct("brand"), "dietary": await distinct("dietary"), "product_types": await distinct("product_type"),
    }


@router.get("/recipes/preview")
async def recipes_preview():
    recs = await db.recipes.find({"status": "PUBLISHED"}, {"_id": 0, "title": 1, "slug": 1, "image": 1, "minutes": 1, "category": 1, "difficulty": 1}).to_list(60)
    recs.sort(key=lambda r: r["slug"] not in ("ragi-dosa", "millet-khichdi", "millet-pulao", "sattu-drink"))
    return {"recipes": recs[:4], "count": len(recs)}


class NewsletterIn(BaseModel):
    email: EmailStr


@router.post("/newsletter")
async def newsletter(body: NewsletterIn, request: Request):
    rate_limit(f"news:{client_ip(request)}", 5, 600)
    await db.newsletter.update_one({"email": body.email.lower()}, {"$set": {"email": body.email.lower(), "updated_at": now_iso()}, "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    return {"status": "ok", "message": "You're on the list. Welcome to the AaharNest table."}


@router.get("/campaign/active")
async def active_campaign():
    now = datetime.now(timezone.utc).isoformat()
    c = await db.campaigns.find_one({
        "status": "active",
        "$and": [
            {"$or": [{"start_at": None}, {"start_at": {"$exists": False}}, {"start_at": {"$lte": now}}]},
            {"$or": [{"end_at": None}, {"end_at": {"$exists": False}}, {"end_at": {"$gte": now}}]},
        ],
    }, {"_id": 0})
    return {"campaign": c}


@router.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug, "status": "PUBLISHED"}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    now = now_utc()
    p = present_product(p, now)
    related_recipes = []
    for rs in (p.get("recipe_slugs") or []):
        r = await db.recipes.find_one({"slug": rs}, {"_id": 0, "title": 1, "slug": 1, "image": 1, "minutes": 1, "summary": 1})
        if r:
            related_recipes.append(r)
    # Fallback: if the explicit recipe_slugs on the product do not resolve to recipes in the
    # current catalogue, surface recipes that reference the product name in their ingredient
    # list. This never fabricates a connection — it only matches on real recipe text.
    if not related_recipes:
        import re
        name_tokens = [w for w in re.findall(r"[A-Za-z]+", (p.get("name") or "").lower()) if len(w) > 3 and w not in {"organic", "pure", "whole", "cold", "pressed", "powder", "with", "from"}]
        if name_tokens:
            regex = re.compile("|".join(sorted(set(name_tokens), key=len, reverse=True)[:5]), re.IGNORECASE)
            recs = await db.recipes.find({"status": "PUBLISHED", "ingredients": {"$regex": regex}},
                                         {"_id": 0, "title": 1, "slug": 1, "image": 1, "minutes": 1, "summary": 1}).to_list(4)
            related_recipes = recs
    rel_query = {"category": p["category"], "slug": {"$ne": slug}, "status": "PUBLISHED", "variant_primary": {"$ne": False}, **live_deal_exclusion(now)}
    related = [present_product(x, now) for x in await db.products.find(rel_query, {"_id": 0}).to_list(4)]
    # pack-size siblings, so the product page can switch size without leaving
    group = p.get("variant_group") or slug
    sibs = await db.products.find({"variant_group": group, "status": "PUBLISHED"}, {"_id": 0}).to_list(20)
    variants = sorted(
        ({"slug": s["slug"], "pack_size": s.get("pack_size"), "price": v["price"], "mrp": v.get("mrp"),
          "discount": v.get("discount"), "stock": available_stock(s, now), "sku": s.get("sku"),
          "is_primary": s.get("variant_primary") is not False}
         for s, v in ((s, present_product(dict(s), now)) for s in sibs)),
        key=lambda v: v["price"],
    )
    combo = None
    if p.get("is_combo") and p.get("combo_items"):
        members = await resolve_combo_members(p["combo_items"])
        combo = {"members": members, **combo_pricing(members, p.get("combo_discount_pct") or 0)}
    return {"product": p, "related_recipes": related_recipes, "related_products": related, "combo": combo,
            "variants": variants if len(variants) > 1 else []}


# ============================= CONTENT =============================
@router.get("/articles")
async def list_articles(category: str | None = None):
    query = {"status": "PUBLISHED"}
    if category:
        query["category"] = category
    arts = await db.articles.find(query, {"_id": 0}).to_list(200)
    return {"articles": arts}


@router.get("/articles/{slug}")
async def get_article(slug: str):
    a = await db.articles.find_one({"slug": slug}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")
    related = await db.articles.find({"slug": {"$ne": slug}, "category": a["category"]}, {"_id": 0, "title": 1, "slug": 1, "image": 1, "summary": 1}).to_list(3)
    return {"article": a, "related": related}


@router.get("/recipes")
async def list_recipes(user=Depends(get_current_user)):
    recs = await db.recipes.find({"status": "PUBLISHED"}, {"_id": 0}).to_list(200)
    return {"recipes": recs}


@router.get("/recipes/{slug}")
async def get_recipe(slug: str, user=Depends(get_current_user)):
    r = await db.recipes.find_one({"slug": slug}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    related = await db.recipes.find({"slug": {"$ne": slug}, "category": r["category"]}, {"_id": 0, "title": 1, "slug": 1, "image": 1, "minutes": 1}).to_list(3)
    # products using this recipe (explicitly linked via recipe_slugs on the product)
    products = [present_product(x) for x in await db.products.find({"recipe_slugs": slug, "status": "PUBLISHED"}, {"_id": 0}).to_list(6)]
    # Fallback: if no explicit links, keyword-match the recipe's ingredient list against product
    # names and search_keywords so the "Shop ingredients" block is populated with the staples a
    # cook would actually need. Never invents a product — only surfaces catalogue items that
    # genuinely match an ingredient line.
    if not products and r.get("ingredients"):
        import re
        tokens: set[str] = set()
        skip = {"salt", "water", "oil", "ghee", "sugar", "to", "taste", "optional", "fresh", "a", "an", "the", "of", "and", "or", "tsp", "tbsp", "cup", "cups", "gram", "grams", "g", "kg", "ml", "l", "piece", "pieces", "small", "medium", "large", "chopped", "sliced", "finely", "roughly", "handful", "pinch", "for", "garnish"}
        for line in (r.get("ingredients") or []):
            for w in re.findall(r"[A-Za-z]+", str(line).lower()):
                if len(w) > 2 and w not in skip:
                    tokens.add(w)
        if tokens:
            regex = re.compile("|".join(sorted(tokens, key=len, reverse=True)[:12]), re.IGNORECASE)
            q = {"status": "PUBLISHED", "variant_primary": {"$ne": False},
                 "$or": [{"name": {"$regex": regex}}, {"search_keywords": {"$regex": regex}}]}
            products = [present_product(x) for x in await db.products.find(q, {"_id": 0}).to_list(6)]
    return {"recipe": r, "related": related, "products": products}


@router.get("/recipes-count")
async def recipes_count():
    c = await db.recipes.count_documents({"status": "PUBLISHED"})
    return {"count": c}


@router.get("/farmers")
async def list_farmers():
    fs = await db.farmer_stories.find({}, {"_id": 0}).to_list(50)
    return {"farmers": fs}


@router.get("/search")
async def search(q: str):
    if not q or len(q) < 2:
        return {"products": [], "recipes": [], "articles": []}
    rx = {"$regex": re.escape(q), "$options": "i"}
    now = now_utc()
    products = [present_product(p, now) for p in await db.products.find({"status": "PUBLISHED", "$or": [{"name": rx}, {"description": rx}, {"category": rx}, {"subcategory": rx}, {"search_keywords": rx}]}, {"_id": 0}).to_list(20)]
    articles = await db.articles.find({"$or": [{"title": rx}, {"summary": rx}, {"tags": rx}]}, {"_id": 0, "title": 1, "slug": 1, "image": 1, "summary": 1, "category": 1}).to_list(20)
    recipes = await db.recipes.find({"$or": [{"title": rx}, {"summary": rx}, {"tags": rx}]}, {"_id": 0, "title": 1, "slug": 1, "image": 1, "summary": 1, "minutes": 1}).to_list(20)
    return {"products": products, "recipes": recipes, "articles": articles}


# ============================= CART & COMMERCE =============================
def _cart_key(request: Request, user):
    if user:
        return f"user:{user['id']}"
    guest = request.cookies.get(GUEST_COOKIE)
    return f"guest:{guest}" if guest else None


async def _get_or_create_cart(request: Request, response, user):
    if user:
        key = f"user:{user['id']}"
        cart = await db.carts.find_one({"cart_key": key}, {"_id": 0})
        if not cart:
            cart = {"cart_key": key, "items": [], "created_at": now_iso()}
            await db.carts.insert_one(dict(cart))
        return cart, key
    guest = request.cookies.get(GUEST_COOKIE)
    if not guest:
        guest = str(uuid.uuid4())
        response.set_cookie(GUEST_COOKIE, guest, httponly=True, secure=True, samesite="none", path="/", max_age=60 * 86400)
    key = f"guest:{guest}"
    cart = await db.carts.find_one({"cart_key": key}, {"_id": 0})
    if not cart:
        cart = {"cart_key": key, "items": [], "created_at": now_iso()}
        await db.carts.insert_one(dict(cart))
    return cart, key


async def _merge_guest_cart(request: Request, user_id: str):
    guest = request.cookies.get(GUEST_COOKIE)
    if not guest:
        return
    gkey = f"guest:{guest}"
    gcart = await db.carts.find_one({"cart_key": gkey}, {"_id": 0})
    if not gcart or not gcart.get("items"):
        return
    ukey = f"user:{user_id}"
    ucart = await db.carts.find_one({"cart_key": ukey}, {"_id": 0})
    items = ucart["items"] if ucart else []
    by_slug = {i["slug"]: i for i in items}
    for gi in gcart["items"]:
        if gi["slug"] in by_slug:
            by_slug[gi["slug"]]["qty"] += gi["qty"]
        else:
            by_slug[gi["slug"]] = gi
    await db.carts.update_one({"cart_key": ukey}, {"$set": {"items": list(by_slug.values())}}, upsert=True)
    await db.carts.delete_one({"cart_key": gkey})


async def _price_cart(items: list[dict], donation_amount: int = 0):
    """Server-authoritative pricing. Never trusts client prices. Uses the same effective-price rules as the catalogue."""
    lines = []
    subtotal = 0
    now = now_utc()
    for it in items:
        raw = await db.products.find_one({"slug": it["slug"], "status": "PUBLISHED"}, {"_id": 0})
        if not raw:
            continue
        avail = available_stock(raw, now)
        p = present_product(raw, now)
        qty = max(1, int(it.get("qty", 1)))
        line_total = p["price"] * qty
        subtotal += line_total
        lines.append({
            "slug": p["slug"], "name": p["name"], "price": p["price"], "mrp": p.get("mrp"),
            "sku": p.get("sku") or "", "qty": qty, "image": p.get("image"), "pack_size": p.get("pack_size"),
            "line_total": line_total, "stock": avail, "in_stock": avail >= qty,
            "is_deal": bool(p.get("deal") and p["deal"]["live"]), "is_combo": bool(p.get("is_combo")),
        })
    shipping = 0 if subtotal >= 499 or subtotal == 0 else 49
    tax = 0
    donation = donation_amount if donation_amount in (0, 1, 2) else 0
    grand_total = subtotal + shipping + tax + donation
    return {
        "items": lines, "subtotal": subtotal, "shipping": shipping, "tax": tax,
        "donation_amount": donation, "discount": 0, "grand_total": grand_total,
        "free_shipping_threshold": 499,
    }


@router.get("/csrf")
async def get_csrf(request: Request, response: Response):
    """Issue the double-submit CSRF cookie. Lets the client guarantee it holds a
    token before any mutating call (guest cart adds included), instead of relying
    on an earlier GET /cart having already landed."""
    ensure_csrf_cookie(request, response)
    return {"ok": True}


@router.get("/cart")
async def get_cart(request: Request, response: Response, user=Depends(get_optional_user)):
    ensure_csrf_cookie(request, response)
    cart, _ = await _get_or_create_cart(request, response, user)
    priced = await _price_cart(cart.get("items", []))
    return priced


class CartItemIn(BaseModel):
    slug: str
    qty: int = 1


@router.post("/cart/items")
async def add_cart_item(body: CartItemIn, request: Request, response: Response, user=Depends(get_optional_user)):
    verify_csrf(request)
    p = await db.products.find_one({"slug": body.slug, "status": "PUBLISHED"}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    cart, key = await _get_or_create_cart(request, response, user)
    items = cart.get("items", [])
    found = next((i for i in items if i["slug"] == body.slug), None)
    qty = max(1, body.qty)
    cap = max(0, available_stock(p))
    if cap <= 0:
        raise HTTPException(status_code=409, detail="Sorry, this item is out of stock right now.")
    if found:
        found["qty"] = min(found["qty"] + qty, cap)
    else:
        items.append({"slug": body.slug, "qty": min(qty, cap)})
    await db.carts.update_one({"cart_key": key}, {"$set": {"items": items}})
    return await _price_cart(items)


@router.put("/cart/items/{slug}")
async def update_cart_item(slug: str, body: CartItemIn, request: Request, response: Response, user=Depends(get_optional_user)):
    verify_csrf(request)
    cart, key = await _get_or_create_cart(request, response, user)
    items = cart.get("items", [])
    if body.qty <= 0:
        items = [i for i in items if i["slug"] != slug]
    else:
        for i in items:
            if i["slug"] == slug:
                i["qty"] = body.qty
    await db.carts.update_one({"cart_key": key}, {"$set": {"items": items}})
    return await _price_cart(items)


@router.delete("/cart/items/{slug}")
async def delete_cart_item(slug: str, request: Request, response: Response, user=Depends(get_optional_user)):
    verify_csrf(request)
    cart, key = await _get_or_create_cart(request, response, user)
    items = [i for i in cart.get("items", []) if i["slug"] != slug]
    await db.carts.update_one({"cart_key": key}, {"$set": {"items": items}})
    return await _price_cart(items)


class PinIn(BaseModel):
    pin: str


@router.post("/serviceability")
async def serviceability(body: PinIn):
    pin = (body.pin or "").strip()
    if not re.fullmatch(r"[1-9][0-9]{5}", pin):
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit Indian PIN code.")
    cfg = await db.app_config.find_one({"key": "serviceability"}, {"_id": 0})
    blocked = (cfg or {}).get("blocked_prefixes", [])
    if any(pin.startswith(b) for b in blocked):
        return {"serviceable": False, "cod": False, "message": f"We're not delivering to {pin} yet."}
    return {"serviceable": True, "cod": True, "message": f"Delivery available to {pin}.", "eta_days": "3–6"}


class AddressIn(BaseModel):
    full_name: str
    mobile: str
    address: str
    apartment: str | None = None
    landmark: str | None = None
    city: str
    state: str
    pincode: str


class OrderIn(BaseModel):
    address: AddressIn
    payment_method: str = "cod"
    donation_amount: int = 0
    save_address: bool = True


ORDER_STATUSES = ["PLACED", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"]


@router.post("/orders")
async def create_order(body: OrderIn, request: Request, response: Response, user=Depends(get_current_user)):
    verify_csrf(request)
    if not re.fullmatch(r"[1-9][0-9]{5}", body.address.pincode.strip()):
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit Indian PIN code.")
    if not re.fullmatch(r"[6-9][0-9]{9}", body.address.mobile.strip()):
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit Indian mobile number.")
    if body.payment_method != "cod":
        raise HTTPException(status_code=400, detail="Only Cash on Delivery is available right now.")

    cart = await db.carts.find_one({"cart_key": f"user:{user['id']}"}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Your cart is empty.")

    # revalidate stock (deal quantity caps apply while a deal is live)
    for it in cart["items"]:
        p = await db.products.find_one({"slug": it["slug"], "status": "PUBLISHED"}, {"_id": 0})
        if not p or available_stock(p) < it["qty"]:
            raise HTTPException(status_code=409, detail=f"Sorry, '{(p or {}).get('name', it['slug'])}' is out of stock or has insufficient quantity.")

    priced = await _price_cart(cart["items"], body.donation_amount)
    order_number = "AN" + datetime.now(timezone.utc).strftime("%y%m%d") + str(uuid.uuid4().int)[:6]
    order = {
        "id": str(uuid.uuid4()), "order_number": order_number, "user_id": user["id"],
        "items": priced["items"], "product_subtotal": priced["subtotal"],
        "shipping": priced["shipping"], "tax": priced["tax"], "discount": priced["discount"],
        "donation_amount": priced["donation_amount"], "grand_total": priced["grand_total"],
        "payment_method": "cod", "payment_status": "PENDING",
        "status": "PLACED", "address": body.address.model_dump(),
        "status_history": [{"status": "PLACED", "at": now_iso()}],
        "created_at": now_iso(), "updated_at": now_iso(),
        "eta": "3–6 business days",
    }
    await db.orders.insert_one(dict(order))

    # decrement stock (+ deal quantity while live), bump sales counters used by Customer Favourites
    for line in priced["items"]:
        inc = {"stock": -line["qty"], "sales_count": line["qty"]}
        if line.get("is_deal"):
            inc["deal_stock"] = -line["qty"]
        await db.products.update_one({"slug": line["slug"]}, {"$inc": inc})

    # record donation separately
    if priced["donation_amount"] > 0:
        await db.donation_contributions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "order_number": order_number,
            "amount": priced["donation_amount"], "status": "COLLECTED_PENDING_ALLOCATION",
            "created_at": now_iso(),
        })

    # clear cart
    await db.carts.update_one({"cart_key": f"user:{user['id']}"}, {"$set": {"items": []}})

    # save address
    if body.save_address:
        await db.addresses.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], **body.address.model_dump(), "created_at": now_iso()})

    order.pop("_id", None)

    # Invoice: generated and emailed out of band so a slow or refused mail provider
    # can never fail a paid order. The PDF is always downloadable from /orders/{n}/invoice.
    asyncio.create_task(_dispatch_invoice(dict(order), user))
    return {"order": order}


# ---------------- INVOICE ----------------
INVOICE_ADMIN_EMAILS = [e.strip() for e in (os.environ.get("INVOICE_ADMIN_EMAILS") or "").split(",") if e.strip()]


async def _dispatch_invoice(order: dict, user: dict) -> None:
    """Build the PDF once, email it to the customer and the AaharNest desk, and record
    the outcome on the order. Never raises — the order is already placed."""
    number = order.get("order_number", "")
    inv_no = invoice_number(number)
    result = {"invoice_no": inv_no, "emailed_customer": False, "emailed_admin": [], "failed": [],
              "attempted_at": now_iso()}
    try:
        pdf = build_invoice_pdf(order, {"email": user.get("email"), "display_name": user.get("display_name")})
        attach = [{"filename": f"{inv_no}.pdf", "content": pdf, "content_type": "application/pdf"}]

        if user.get("email"):
            subject, html = invoice_customer_email_html(order, inv_no)
            try:
                await send_email(to=user["email"], subject=subject, html=html, attachments=attach)
                result["emailed_customer"] = True
            except Exception as e:
                result["failed"].append(f"customer:{type(e).__name__}")
                logger.warning(f"Invoice email to customer failed for {number}: {e}")

        for dest in INVOICE_ADMIN_EMAILS:
            subject, html = invoice_admin_email_html(order, inv_no, user.get("email"))
            try:
                await send_email(to=dest, subject=subject, html=html, attachments=attach)
                result["emailed_admin"].append(dest)
            except Exception as e:
                result["failed"].append(f"{dest}:{type(e).__name__}")
                logger.warning(f"Invoice email to admin {dest} failed for {number}: {e}")
    except Exception as e:
        result["failed"].append(f"render:{type(e).__name__}")
        logger.error(f"Invoice generation failed for {number}: {e}")

    try:
        await db.orders.update_one({"order_number": number},
                                   {"$set": {"invoice": result, "invoice_no": inv_no}})
    except Exception as e:
        logger.error(f"Could not record invoice status for {number}: {e}")


def _invoice_response(order: dict, customer: dict | None) -> FileResponse:
    inv_no = order.get("invoice_no") or invoice_number(order.get("order_number", ""))
    pdf = build_invoice_pdf(order, customer)
    return FileResponse(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{inv_no}.pdf"',
                 "Cache-Control": "no-store"},
    )


@router.get("/orders/{order_number}/invoice")
async def download_invoice(order_number: str, user=Depends(get_current_user)):
    """The customer's own invoice. Ownership is enforced by the user_id filter."""
    o = await db.orders.find_one({"order_number": order_number, "user_id": user["id"]}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return _invoice_response(o, {"email": user.get("email"), "display_name": user.get("display_name")})


@router.get("/admin/orders/{order_number}/invoice")
async def admin_download_invoice(order_number: str, admin=Depends(get_admin_user)):
    o = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    cust = await db.users.find_one({"id": o.get("user_id")}, {"_id": 0, "email": 1, "display_name": 1}) or {}
    return _invoice_response(o, cust)


@router.get("/orders")
async def list_orders(user=Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}


@router.get("/orders/{order_number}")
async def get_order(order_number: str, user=Depends(get_current_user)):
    o = await db.orders.find_one({"order_number": order_number, "user_id": user["id"]}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"order": o}


# ============================= ACCOUNT =============================
class ProfileIn(BaseModel):
    display_name: str | None = None
    city: str | None = None
    language: str | None = None


@router.put("/me/profile")
async def update_profile(body: ProfileIn, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"user": public_user(u)}


class PreferencesIn(BaseModel):
    dietary_preference: str | None = None
    cuisine_preferences: list[str] | None = None
    meal_preferences: list[str] | None = None
    allergies: list[str] | None = None
    notification_new_recipe: bool | None = None


@router.get("/me/preferences")
async def get_preferences(user=Depends(get_current_user)):
    pref = await db.user_preferences.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"preferences": pref or {}}


@router.put("/me/preferences")
async def set_preferences(body: PreferencesIn, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.user_preferences.update_one({"user_id": user["id"]}, {"$set": {"user_id": user["id"], **updates, "updated_at": now_iso()}}, upsert=True)
    pref = await db.user_preferences.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"preferences": pref}


@router.get("/me/addresses")
async def list_addresses(user=Depends(get_current_user)):
    a = await db.addresses.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    return {"addresses": a}


@router.post("/me/addresses")
async def add_address(body: AddressIn, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], **body.model_dump(), "created_at": now_iso()}
    await db.addresses.insert_one(dict(doc))
    doc.pop("_id", None)
    return {"address": doc}


@router.delete("/me/addresses/{address_id}")
async def delete_address(address_id: str, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    await db.addresses.delete_one({"id": address_id, "user_id": user["id"]})
    return {"status": "ok"}


@router.get("/me/saved-recipes")
async def get_saved(user=Depends(get_current_user)):
    saved = await db.saved_recipes.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    slugs = [s["recipe_slug"] for s in saved]
    recs = await db.recipes.find({"slug": {"$in": slugs}}, {"_id": 0, "title": 1, "slug": 1, "image": 1, "minutes": 1, "summary": 1}).to_list(200)
    return {"saved": recs}


class SaveIn(BaseModel):
    recipe_slug: str


@router.post("/me/saved-recipes")
async def save_recipe(body: SaveIn, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    await db.saved_recipes.update_one(
        {"user_id": user["id"], "recipe_slug": body.recipe_slug},
        {"$set": {"user_id": user["id"], "recipe_slug": body.recipe_slug, "created_at": now_iso()}}, upsert=True)
    return {"status": "ok"}


@router.delete("/me/saved-recipes/{recipe_slug}")
async def unsave_recipe(recipe_slug: str, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    await db.saved_recipes.delete_one({"user_id": user["id"], "recipe_slug": recipe_slug})
    return {"status": "ok"}


@router.get("/me/wishlist")
async def get_wishlist(user=Depends(get_current_user)):
    w = await db.wishlist.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    slugs = [x["product_slug"] for x in w]
    products = [present_product(p) for p in await db.products.find({"slug": {"$in": slugs}, "status": "PUBLISHED"}, {"_id": 0}).to_list(200)]
    return {"wishlist": products}


class WishIn(BaseModel):
    product_slug: str


@router.post("/me/wishlist")
async def add_wishlist(body: WishIn, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    await db.wishlist.update_one(
        {"user_id": user["id"], "product_slug": body.product_slug},
        {"$set": {"user_id": user["id"], "product_slug": body.product_slug, "created_at": now_iso()}}, upsert=True)
    return {"status": "ok"}


@router.delete("/me/wishlist/{product_slug}")
async def remove_wishlist(product_slug: str, request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    await db.wishlist.delete_one({"user_id": user["id"], "product_slug": product_slug})
    return {"status": "ok"}


def _deletion_date():
    """3 business days from now."""
    d = datetime.now(timezone.utc)
    added = 0
    while added < 3:
        d += timedelta(days=1)
        if d.weekday() < 5:
            added += 1
    return d


@router.post("/me/delete")
async def request_deletion(request: Request, response: Response, user=Depends(get_current_user)):
    verify_csrf(request)
    dt = _deletion_date()
    await db.users.update_one({"id": user["id"]}, {"$set": {"account_status": "DELETION_PENDING", "deletion_date": dt.isoformat(), "updated_at": now_iso()}})
    await revoke_all_sessions(user["id"])
    clear_auth_cookies(response)
    return {"status": "scheduled", "deletion_date": dt.isoformat()}


@router.post("/me/delete/cancel")
async def cancel_deletion(request: Request, user=Depends(get_current_user)):
    verify_csrf(request)
    await db.users.update_one({"id": user["id"]}, {"$set": {"account_status": "ACTIVE", "deletion_date": None, "updated_at": now_iso()}})
    return {"status": "ok"}


# ============================= SUPPORT =============================
class SupportIn(BaseModel):
    name: str
    email: EmailStr
    subject: str
    category: str
    message: str
    website: str | None = None  # honeypot


@router.post("/support")
async def support(body: SupportIn, request: Request):
    rate_limit(f"support:{client_ip(request)}", 5, 600)
    if body.website:  # honeypot filled -> bot
        return {"status": "ok"}
    if len(body.message.strip()) < 5:
        raise HTTPException(status_code=400, detail="Please add a little more detail to your message.")
    await db.support_requests.insert_one({
        "id": str(uuid.uuid4()), "name": body.name.strip(), "email": body.email.lower(),
        "subject": body.subject.strip(), "category": body.category, "message": body.message.strip(),
        "status": "OPEN", "created_at": now_iso(),
    })
    return {"status": "ok", "message": "Thanks for reaching out. AaharNest Support will get back to you soon."}


# ============================= MEDIA (admin upload / public serve) =============================
_ALLOWED_IMG = {"jpg", "jpeg", "png", "webp", "gif"}


@router.post("/admin/upload-image")
async def admin_upload_image(request: Request, file: UploadFile = File(...), admin=Depends(get_admin_user)):
    verify_csrf(request)
    ext = (file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "").lower()
    if ext not in _ALLOWED_IMG:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WEBP or GIF image.")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image is too large. Please keep it under 8 MB.")
    path = f"{storage.APP_NAME}/products/{uuid.uuid4()}.{ext}"
    content_type = storage.MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    try:
        result = storage.put_object(path, data, content_type)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not upload the image right now. Please try again.")
    stored_path = result.get("path", path)
    await db.media.insert_one({
        "id": str(uuid.uuid4()), "storage_path": stored_path, "content_type": content_type,
        "original_filename": file.filename, "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": now_iso(),
    })
    return {"path": stored_path, "url": f"/api/files/{stored_path}"}


@router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = storage.get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(content=data, media_type=content_type, headers={"Cache-Control": "public, max-age=31536000, immutable"})


# ============================= ADMIN STUDIO =============================
def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def _with_discount(doc: dict) -> dict:
    mrp, price = doc.get("mrp") or 0, doc.get("price") or 0
    doc["discount"] = discount_pct(mrp, price)
    return doc


async def _apply_pricing_rules(doc: dict) -> dict:
    """One pricing system: combos derive price from members; discount % input derives price from MRP."""
    pct_in = doc.pop("apply_discount_pct", None)
    if doc.get("is_combo") and doc.get("combo_items"):
        members = await resolve_combo_members(doc["combo_items"])
        if not members:
            raise HTTPException(status_code=400, detail="Add at least one product to the Combo Box.")
        pr = combo_pricing(members, doc.get("combo_discount_pct") or 0)
        doc["mrp"], doc["price"] = pr["items_total"], pr["combo_price"]
        doc["category"] = doc.get("category") or "combos"
        doc["product_type"] = "Combo Box"
    elif pct_in is not None and doc.get("mrp"):
        doc["price"] = price_from_mrp(doc["mrp"], pct_in)
    return _with_discount(doc)


class ComboItemIn(BaseModel):
    slug: str
    qty: int = 1


class AdminProductIn(BaseModel):
    name: str
    slug: str | None = None
    sku: str | None = ""
    category: str
    subcategory: str | None = ""
    brand: str | None = "AaharNest"
    price: int = 0
    mrp: int | None = None
    apply_discount_pct: float | None = None
    stock: int = 0
    out_of_stock: bool = False
    low_stock_threshold: int | None = None
    pack_size: str | None = ""
    net_quantity: str | None = ""
    weight: int | None = 0
    unit: str | None = "g"
    image: str | None = ""
    images: list[str] | None = None
    short_description: str | None = ""
    description: str | None = ""
    ingredients: str | None = ""
    nutrition: list[dict] | None = None
    storage: str | None = ""
    shelf_life: str | None = ""
    country_of_origin: str | None = "India"
    origin: str | None = ""
    origin_region: str | None = None
    organic_status: bool = False
    certification: str | None = ""
    certification_number: str | None = ""
    fssai_number: str | None = ""
    manufacturer: str | None = ""
    farmer_connected: bool = False
    product_type: str | None = ""
    dietary: list[str] | None = None
    rating: float | None = None
    rating_count: int | None = None
    is_new: bool = False
    featured: bool = False
    top_seller_rank: int | None = None
    sales_count: int | None = None
    is_combo: bool = False
    combo_items: list[ComboItemIn] | None = None
    combo_discount_pct: float | None = 0
    badges: list[str] | None = None
    recipe_slugs: list[str] | None = None
    campaign_slug: str | None = None
    seo_title: str | None = ""
    seo_description: str | None = ""
    search_keywords: str | None = ""
    status: str = "PUBLISHED"


@router.get("/admin/stats")
async def admin_stats(admin=Depends(get_admin_user)):
    return {
        "products": await db.products.count_documents({}),
        "categories": await db.categories.count_documents({}),
        "campaigns": await db.campaigns.count_documents({}),
        "orders": await db.orders.count_documents({}),
        "customers": await db.users.count_documents({"role": {"$ne": "admin"}}),
    }


@router.get("/admin/products")
async def admin_list_products(admin=Depends(get_admin_user)):
    now = now_utc()
    products = [present_product(p, now, admin=True) for p in await db.products.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)]
    return {"products": products}


# ---------------- INVENTORY (SKU + stock + out-of-stock) ----------------
class InventoryPatchIn(BaseModel):
    sku: str | None = None
    stock: int | None = None
    out_of_stock: bool | None = None
    low_stock_threshold: int | None = None


@router.get("/admin/inventory")
async def admin_inventory(admin=Depends(get_admin_user), q: str | None = None, filter: str | None = None):
    """Flat inventory view: every variant (including extra pack sizes) with its SKU,
    counted stock and effective availability."""
    now = now_utc()
    query: dict = {}
    if q:
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"name": rx}, {"sku": rx}, {"slug": rx}]
    rows = []
    for p in await db.products.find(query, {"_id": 0}).sort("name", 1).to_list(1000):
        avail = available_stock(p, now)
        rows.append({
            "slug": p.get("slug"), "name": p.get("name"), "image": p.get("image"),
            "sku": p.get("sku") or "", "category": p.get("category"),
            "pack_size": p.get("pack_size") or "", "price": p.get("price"),
            "stock": int(p.get("stock") or 0),
            "available": avail,
            "out_of_stock": bool(p.get("out_of_stock")) or int(p.get("stock") or 0) <= 0,
            "manual_out_of_stock": bool(p.get("out_of_stock")),
            "low_stock": low_stock(p),
            "low_stock_threshold": p.get("low_stock_threshold") if p.get("low_stock_threshold") not in (None, "") else DEFAULT_LOW_STOCK_THRESHOLD,
            "status": p.get("status"), "is_combo": bool(p.get("is_combo")),
            "variant_primary": p.get("variant_primary", True),
            "sales_count": int(p.get("sales_count") or 0),
        })
    if filter == "out":
        rows = [r for r in rows if r["out_of_stock"]]
    elif filter == "low":
        rows = [r for r in rows if r["low_stock"] and not r["out_of_stock"]]
    elif filter == "in":
        rows = [r for r in rows if not r["out_of_stock"]]
    counts = {
        "total": await db.products.count_documents({}),
        "out": await db.products.count_documents({"$or": [{"out_of_stock": True}, {"stock": {"$lte": 0}}]}),
    }
    return {"items": rows, "counts": counts, "default_low_stock_threshold": DEFAULT_LOW_STOCK_THRESHOLD}


@router.patch("/admin/inventory/{slug}")
async def admin_patch_inventory(slug: str, body: InventoryPatchIn, request: Request, admin=Depends(get_admin_user)):
    """Update one product's SKU / stock / out-of-stock override. Partial by design —
    the toggle switch sends only `out_of_stock`."""
    verify_csrf(request)
    existing = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    updates: dict = {}
    if body.sku is not None:
        sku = body.sku.strip()
        if sku:
            clash = await db.products.find_one({"sku": sku, "slug": {"$ne": slug}}, {"_id": 0, "name": 1})
            if clash:
                raise HTTPException(status_code=409, detail=f"SKU '{sku}' is already used by '{clash.get('name')}'.")
        updates["sku"] = sku
    if body.stock is not None:
        if body.stock < 0:
            raise HTTPException(status_code=400, detail="Stock cannot be negative.")
        updates["stock"] = int(body.stock)
    if body.out_of_stock is not None:
        updates["out_of_stock"] = bool(body.out_of_stock)
    if body.low_stock_threshold is not None:
        if body.low_stock_threshold < 0:
            raise HTTPException(status_code=400, detail="Low-stock threshold cannot be negative.")
        updates["low_stock_threshold"] = int(body.low_stock_threshold)

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update.")
    updates["updated_at"] = now_iso()
    await db.products.update_one({"slug": slug}, {"$set": updates})

    doc = await db.products.find_one({"slug": slug}, {"_id": 0})
    now = now_utc()
    return {"product": {
        "slug": doc["slug"], "sku": doc.get("sku") or "", "stock": int(doc.get("stock") or 0),
        "available": available_stock(doc, now),
        "out_of_stock": bool(doc.get("out_of_stock")) or int(doc.get("stock") or 0) <= 0,
        "manual_out_of_stock": bool(doc.get("out_of_stock")),
        "low_stock": low_stock(doc),
        "low_stock_threshold": doc.get("low_stock_threshold") if doc.get("low_stock_threshold") not in (None, "") else DEFAULT_LOW_STOCK_THRESHOLD,
    }}


@router.post("/admin/products")
async def admin_create_product(body: AdminProductIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    doc = body.model_dump()
    doc["slug"] = _slugify(doc.get("slug") or doc["name"])
    if await db.products.find_one({"slug": doc["slug"]}):
        raise HTTPException(status_code=409, detail="A product with this slug already exists.")
    if not doc.get("images"):
        doc["images"] = [doc["image"]] if doc.get("image") else []
    for k in ("badges", "nutrition", "recipe_slugs", "dietary", "combo_items"):
        if doc.get(k) is None:
            doc[k] = []
    if doc.get("rating") is None:
        doc["rating"], doc["rating_count"] = None, 0
    if doc.get("sales_count") is None:
        doc["sales_count"] = 0
    if doc.get("organic_status") and not (doc.get("certification") or "").strip():
        raise HTTPException(status_code=400, detail="Enter the certification body/name before marking a product Organic (verified).")
    doc.update({"is_todays_deal": False, "deal_visible": False, "deal_order": 0, "deal_price": None, "deal_discount": 0,
                "deal_start_at": None, "deal_end_at": None, "deal_badge": "", "deal_stock": None})
    await _apply_pricing_rules(doc)
    doc["id"] = doc["slug"]
    doc["created_at"] = now_iso()
    doc["updated_at"] = now_iso()
    await db.products.insert_one(dict(doc))
    doc.pop("_id", None)
    return {"product": present_product(doc)}


@router.put("/admin/products/{slug}")
async def admin_update_product(slug: str, body: AdminProductIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    existing = await db.products.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = body.model_dump()
    doc["slug"] = slug  # slug is immutable on update to keep links stable
    for k in ("badges", "nutrition", "recipe_slugs", "dietary", "combo_items"):
        if doc.get(k) is None:
            doc[k] = []
    if not doc.get("images"):
        doc["images"] = [doc["image"]] if doc.get("image") else existing.get("images", [])
    if doc.get("rating") is None:
        doc["rating"], doc["rating_count"] = existing.get("rating"), existing.get("rating_count", 0)
    if doc.get("sales_count") is None:
        doc["sales_count"] = existing.get("sales_count", 0)
    if doc.get("organic_status") and not (doc.get("certification") or "").strip():
        raise HTTPException(status_code=400, detail="Enter the certification body/name before marking a product Organic (verified).")
    await _apply_pricing_rules(doc)
    doc["updated_at"] = now_iso()
    await db.products.update_one({"slug": slug}, {"$set": doc})
    out = await db.products.find_one({"slug": slug}, {"_id": 0})
    return {"product": present_product(out)}


@router.delete("/admin/products/{slug}")
async def admin_delete_product(slug: str, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    await db.products.delete_one({"slug": slug})
    return {"status": "ok"}


class AdminCampaignIn(BaseModel):
    campaign_name: str
    campaign_slug: str | None = None
    description: str | None = ""
    discount_type: str = "percentage"
    discount_value: int = 0
    max_discount_label: str | None = ""
    cta_text: str | None = "Shop the Offer"
    banner_image: str | None = ""
    theme: str = "launch"
    emoji: str | None = "🌾"
    greeting: str | None = ""
    status: str = "active"
    start_at: str | None = None
    end_at: str | None = None


@router.get("/admin/campaigns")
async def admin_list_campaigns(admin=Depends(get_admin_user)):
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(100)
    return {"campaigns": campaigns}


@router.post("/admin/campaigns")
async def admin_create_campaign(body: AdminCampaignIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    doc = body.model_dump()
    doc["campaign_slug"] = _slugify(doc.get("campaign_slug") or doc["campaign_name"])
    doc["campaign_id"] = doc["campaign_slug"]
    if await db.campaigns.find_one({"campaign_slug": doc["campaign_slug"]}):
        raise HTTPException(status_code=409, detail="A campaign with this slug already exists.")
    doc["start_at"] = doc.get("start_at") or now_iso()
    await db.campaigns.insert_one(dict(doc))
    doc.pop("_id", None)
    return {"campaign": doc}


@router.put("/admin/campaigns/{slug}")
async def admin_update_campaign(slug: str, body: AdminCampaignIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    if not await db.campaigns.find_one({"campaign_slug": slug}):
        raise HTTPException(status_code=404, detail="Campaign not found")
    doc = body.model_dump()
    doc["campaign_slug"] = slug
    doc["campaign_id"] = slug
    if not doc.get("start_at"):
        existing = await db.campaigns.find_one({"campaign_slug": slug}, {"_id": 0, "start_at": 1})
        doc["start_at"] = (existing or {}).get("start_at") or now_iso()
    await db.campaigns.update_one({"campaign_slug": slug}, {"$set": doc})
    out = await db.campaigns.find_one({"campaign_slug": slug}, {"_id": 0})
    return {"campaign": out}


@router.delete("/admin/campaigns/{slug}")
async def admin_delete_campaign(slug: str, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    await db.campaigns.delete_one({"campaign_slug": slug})
    await db.products.update_many({"campaign_slug": slug}, {"$set": {"campaign_slug": None}})
    return {"status": "ok"}


@router.get("/admin/orders")
async def admin_list_orders(admin=Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"orders": orders}


class OrderStatusIn(BaseModel):
    status: str


@router.put("/admin/orders/{order_number}/status")
async def admin_update_order(order_number: str, body: OrderStatusIn, request: Request, admin=Depends(get_admin_user)):
    verify_csrf(request)
    if body.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    order = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    ts = now_iso()
    await db.orders.update_one(
        {"order_number": order_number},
        {"$set": {"status": body.status, "updated_at": ts},
         "$push": {"status_history": {"status": body.status, "at": ts}}})
    # notify the customer by email (best-effort, non-blocking failure)
    try:
        from emailer import order_status_email_html, send_email
        cust = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "email": 1})
        tmpl = order_status_email_html({**order, "status": body.status}, body.status)
        if cust and cust.get("email") and tmpl:
            subject, html = tmpl
            await send_email(to=cust["email"], subject=subject, html=html)
    except Exception:
        pass
    return {"status": "ok"}
