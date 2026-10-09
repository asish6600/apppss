"""Verifies every product has at least one Odia recipe linked and
that each new recipe (15 added) resolves with real catalog slugs.

Run: pytest backend/tests/test_product_recipe_links.py -o 'addopts=' -v
"""
import os
import pytest
import requests


def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        try:
            with open("/app/frontend/.env") as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    assert url, "REACT_APP_BACKEND_URL not configured"
    return url.rstrip("/")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

NEW_RECIPES = [
    "mandia-manda", "mandia-ambili", "chatua-pana", "til-nadia-ladoo",
    "mudhi-mishrana", "kadali-manja-bara", "podo-pitha", "kodo-khechedi",
    "palli-chatani", "chenchudi", "tulasi-chaha", "nadia-ladoo",
    "moringa-rasa", "amla-chatani", "ashwa-pana",
]
EXISTING_RECIPES = [
    "chakuli-pitha", "ghuguni", "chuda-kadali", "biri-bara", "enduri-pitha",
    "dahi-pakhala", "dalma", "saga-bhaja", "badi-chura", "tomato-khata",
    "santula", "besara", "dahi-baigana", "khechedi", "kanika",
    "chuda-ghasa", "arisa-pitha", "kakara-pitha", "chhena-poda",
]


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={
        "email": "asishs@2pirad.com",
        "password": "AaharNest@2026",
    }, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def all_products():
    r = requests.get(f"{API}/products", params={"limit": 200}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    products = body.get("products") or body.get("items") or []
    assert len(products) >= 79, f"Expected >=79 products, got {len(products)}"
    return products


@pytest.fixture(scope="module")
def all_catalog_slugs(all_products):
    """All catalog slugs including combos and today's deals (which are hidden from /api/products
    main listing but still real published products)."""
    slugs = {p["slug"] for p in all_products}
    # also fetch combos
    for extra in (("combo", True), ("todays_deal", True)):
        rr = requests.get(f"{API}/products", params={extra[0]: "true", "limit": 200}, timeout=20)
        if rr.status_code == 200:
            for p in (rr.json().get("products") or []):
                slugs.add(p["slug"])
    return slugs


@pytest.fixture(scope="module")
def all_recipe_slugs(admin_session):
    r = admin_session.get(f"{API}/recipes", timeout=30)
    assert r.status_code == 200, r.text
    recipes = r.json().get("recipes") or []
    return {rec["slug"] for rec in recipes}


def test_product_count(all_products):
    assert len(all_products) == 79, f"Expected exactly 79 products, got {len(all_products)}"


def test_every_product_has_at_least_one_linked_recipe(all_products, all_recipe_slugs):
    """Every one of the 79 products must have a non-empty related_recipes list
    whose slugs all exist in the live /api/recipes database."""
    failures = []
    for p in all_products:
        slug = p["slug"]
        r = requests.get(f"{API}/products/{slug}", timeout=20)
        if r.status_code != 200:
            failures.append(f"{slug}: product detail {r.status_code}")
            continue
        data = r.json()
        related = data.get("related_recipes") or []
        if not related:
            failures.append(f"{slug}: related_recipes empty")
            continue
        # Verify all referenced slugs exist in the live recipe db
        for rec in related:
            if rec.get("slug") not in all_recipe_slugs:
                failures.append(f"{slug}: references missing recipe {rec.get('slug')}")
    assert not failures, "Products missing/invalid recipes:\n" + "\n".join(failures[:40])


@pytest.mark.parametrize("rslug", NEW_RECIPES)
def test_new_odia_recipes_exist_and_valid(admin_session, rslug, all_catalog_slugs):
    r = admin_session.get(f"{API}/recipes/{rslug}", timeout=20)
    assert r.status_code == 200, f"{rslug}: {r.status_code} {r.text[:200]}"
    body = r.json()
    rec = body.get("recipe") or body
    ingredients = rec.get("ingredients") or []
    steps = rec.get("steps") or []
    nutrition = rec.get("nutrition") or []
    products = body.get("products") or rec.get("products") or []
    assert len(ingredients) >= 5, f"{rslug}: only {len(ingredients)} ingredients"
    assert len(steps) >= 4, f"{rslug}: only {len(steps)} steps"
    assert len(nutrition) >= 1, f"{rslug}: nutrition missing"
    assert len(products) >= 1, f"{rslug}: products list is empty"
    # Validate product slugs are real catalog slugs (incl. combos / today's deals / pack-size variants)
    for prod in products:
        pslug = prod.get("slug")
        if pslug in all_catalog_slugs:
            continue
        # fallback: verify slug resolves individually (covers pack-size variants with variant_primary=False)
        rr = requests.get(f"{API}/products/{pslug}", timeout=15)
        assert rr.status_code == 200, f"{rslug}: product slug '{pslug}' not resolvable (status {rr.status_code})"


@pytest.mark.parametrize("rslug", EXISTING_RECIPES)
def test_existing_odia_recipes_still_work(admin_session, rslug):
    r = admin_session.get(f"{API}/recipes/{rslug}", timeout=20)
    assert r.status_code == 200, f"{rslug}: {r.status_code}"


def test_kodo_khechedi_has_millet_products(admin_session):
    r = admin_session.get(f"{API}/recipes/kodo-khechedi", timeout=20)
    assert r.status_code == 200
    body = r.json()
    products = body.get("products") or (body.get("recipe") or {}).get("products") or []
    slugs = {p.get("slug") for p in products}
    # Should include multiple millet products (moong-dal may not fit the 6-product limit
    # because 6 millets already use this slug — not a bug).
    joined = " ".join(slugs)
    assert "millet" in joined, f"kodo-khechedi products missing any 'millet' product. Got: {slugs}"
    assert len(slugs) >= 3, f"kodo-khechedi products too few: {slugs}"


def test_podo_pitha_has_expected_ingredient_products(admin_session):
    r = admin_session.get(f"{API}/recipes/podo-pitha", timeout=20)
    assert r.status_code == 200
    body = r.json()
    products = body.get("products") or (body.get("recipe") or {}).get("products") or []
    slugs = {p.get("slug") for p in products}
    expected_any = ["red-rice", "urad-dal-whole", "desiccated-coconut", "jaggery"]
    joined = " ".join(slugs)
    hits = [t for t in expected_any if t in joined]
    assert len(hits) >= 2, f"podo-pitha products missing expected ingredients. Got: {slugs}"


def test_total_recipe_count(all_recipe_slugs):
    assert len(all_recipe_slugs) >= 34, f"Expected 34+ recipes, got {len(all_recipe_slugs)}"


def test_new_recipe_slugs_present(all_recipe_slugs):
    missing = [s for s in NEW_RECIPES if s not in all_recipe_slugs]
    assert not missing, f"New recipes missing from /api/recipes list: {missing}"
