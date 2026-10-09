"""Seed categories, organic product catalogue, promotional campaign, recipes/articles, farmer stories, admin user."""
import json
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta

from db import db
from security import hash_password
from catalog import CATEGORIES, IMG, LAUNCH, CAMPAIGN, build_products, EXTRA_RECIPES, RECIPE_IMAGE_OVERRIDES, REMOVED_RECIPES
from odia_recipes import ODIA_RECIPES, ODIA_RECIPE_IMAGES
from catalog_logic import discount_pct

ROOT = Path(__file__).parent


def _now():
    return datetime.now(timezone.utc).isoformat()


FARMERS = [
    {"id": "farmer-ragi", "name": "A millet-growing family in Koraput (illustrative)", "region": "Koraput", "district": "Koraput, Odisha",
     "crop": "Finger millet (mandia) and minor millets",
     "image": "https://static.prod-images.emergentagent.com/jobs/1e4cac8e-6b03-4e8a-9a3c-2e437491018a/images/b54e08b8c9714c9c2e4b15c085dd9b1f6cfd3912445d8e85e97073b3719ad6f6.jpeg",
     "grows": "Rain-fed finger millet and pulses on terraced highland plots",
     "story": "Illustrative story — actual farmer stories coming soon. Koraput's highlands are among India's oldest millet-growing landscapes, and this card shows the relationship AaharNest wants to build there: a steady, season-after-season buyer for mandia grown on rain-fed terraces, so a resilient local crop stays worth planting.",
     "how_we_work": "Wherever practical, we aim to buy directly and commit before the kharif season.", "demo": True},
    {"id": "farmer-spice", "name": "A turmeric grower in Kandhamal (illustrative)", "region": "Kandhamal", "district": "Kandhamal, Odisha",
     "crop": "Turmeric and ginger",
     "image": "https://static.prod-images.emergentagent.com/jobs/1e4cac8e-6b03-4e8a-9a3c-2e437491018a/images/c7ca9cb79ab3db8c4eedb4c41800d91c68e429e2ce69d1e9579d814b66873b2f.jpeg",
     "grows": "Hill turmeric grown under tree shade, plus ginger and pulses",
     "story": "Illustrative story — actual farmer stories coming soon. Kandhamal is known for deeply aromatic hill turmeric. When real, verified stories are available, this is where you will read the grower's name, village and what they plant, in their own words.",
     "how_we_work": "We work to shorten unnecessary supply-chain layers so more value reaches growers.", "demo": True},
    {"id": "farmer-pulse", "name": "A pulse collective in Kalahandi (illustrative)", "region": "Kalahandi", "district": "Kalahandi, Odisha",
     "crop": "Chana, moong and arhar",
     "image": "https://static.prod-images.emergentagent.com/jobs/1e4cac8e-6b03-4e8a-9a3c-2e437491018a/images/c900704c5153de20c9740d930e32184bcdab237ec374b4c21df6f004cae9ffc7.jpeg",
     "grows": "Pulses and oilseeds across smallholder plots",
     "story": "Illustrative story — actual farmer stories coming soon. AaharNest is building the structure to feature Odisha collectives and small farms whose pulses reach your kitchen, with the village and the season named on the pack.",
     "how_we_work": "Better connections between farmers and customers can create stronger local food ecosystems.", "demo": True},
]

SEED_VERSION = "11"  # bump when the catalogue structure changes


async def seed_all():
    cfg = await db.app_config.find_one({"key": "catalog_seed_version"})
    fresh = (not cfg) or cfg.get("value") != SEED_VERSION

    if fresh:
        await db.products.delete_many({})
        await db.categories.delete_many({})

    for slug, name, note, img_key, subs in CATEGORIES:
        await db.categories.update_one(
            {"slug": slug},
            {"$set": {"slug": slug, "name": name, "note": note, "image": IMG[img_key], "subcategories": subs, "status": "PUBLISHED"},
             "$setOnInsert": {"id": slug, "created_at": _now()}}, upsert=True)

    if fresh:
        camp = {**CAMPAIGN, "start_at": _now(), "end_at": (datetime.now(timezone.utc) + timedelta(days=21)).isoformat()}
        await db.campaigns.update_one({"campaign_slug": LAUNCH}, {"$set": camp}, upsert=True)
        for i, doc in enumerate(build_products()):
            created = (datetime.now(timezone.utc) - timedelta(days=(90 - i) if not doc.get("is_new") else (i % 10))).isoformat()
            await db.products.update_one(
                {"slug": doc["slug"]},
                {"$set": {**doc, "discount": discount_pct(doc["mrp"], doc["price"]), "status": "PUBLISHED", "updated_at": _now()},
                 "$setOnInsert": {"id": doc["slug"], "created_at": created}}, upsert=True)

    seed_path = ROOT / "seed_content.json"
    if seed_path.exists():
        data = json.loads(seed_path.read_text())
        # seed_content.json / EXTRA_RECIPES still carry the retired pan-Indian recipe set,
        # so only ARTICLES are taken from there now. Recipes come from odia_recipes.py —
        # the catalogue is Odisha-only on request.
        pieces = [p for p in data.get("pieces", []) if p.get("kind") != "recipe"]
        for piece in pieces:
            img = RECIPE_IMAGE_OVERRIDES.get(piece["slug"], piece.get("image"))
            await db.articles.update_one({"slug": piece["slug"]},
                {"$set": {**piece, "image": img, "id": piece["slug"], "status": "PUBLISHED"}, "$setOnInsert": {"created_at": _now()}}, upsert=True)

    # ---- recipes: authentic Odia only, grouped by meal ----
    for r in ODIA_RECIPES:
        await db.recipes.update_one(
            {"slug": r["slug"]},
            {"$set": {**r, "image": ODIA_RECIPE_IMAGES[r["slug"]], "id": r["slug"], "status": "PUBLISHED"},
             "$setOnInsert": {"created_at": _now(), "date": "9 October 2026"}}, upsert=True)
    # self-healing: drop anything that is not in the Odia set (the old pan-Indian recipes,
    # and whatever REMOVED_RECIPES used to list)
    keep = [r["slug"] for r in ODIA_RECIPES]
    await db.recipes.delete_many({"slug": {"$nin": keep}})

    for f in FARMERS:
        await db.farmer_stories.update_one({"id": f["id"]}, {"$set": f, "$setOnInsert": {"created_at": _now()}}, upsert=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            import uuid
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": admin_email, "password_hash": hash_password(admin_password),
                "display_name": "AaharNest Owner", "role": "admin", "email_verified": True,
                "account_status": "ACTIVE", "language": "en-IN", "created_at": _now(), "updated_at": _now()})

    await db.app_config.update_one({"key": "catalog_seed_version"}, {"$set": {"key": "catalog_seed_version", "value": SEED_VERSION}}, upsert=True)
