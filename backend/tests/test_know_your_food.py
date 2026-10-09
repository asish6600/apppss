"""Tests for the AaharNest messaging/UX enhancements (know-your-food-2 iteration).

Covers:
 - product detail now returns full labelling fields (manufacturer, FSSAI, pack size, etc.)
 - fallback keyword matching product -> recipes
 - fallback keyword matching recipe  -> products
 - admin auth still working
 - cart + serviceability guest flow still working
"""
import os
import re
import pytest
import requests

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # fall back to reading /app/frontend/.env (same source of truth)
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


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={
        "email": "asishs@2pirad.com",
        "password": "AaharNest@2026",
    }, timeout=20)
    assert r.status_code == 200, r.text
    return s


# ---------- product detail fields ----------
def test_product_detail_has_label_fields():
    r = requests.get(f"{API}/products/organic-foxtail-millet", timeout=15)
    assert r.status_code == 200, r.text
    p = r.json()["product"]
    # The following keys must exist on the response (values may be None but keys are declared).
    for k in [
        "manufacturer", "fssai_number", "pack_size", "net_quantity",
        "country_of_origin", "origin_region", "shelf_life",
        "certification", "certification_number", "organic_status",
    ]:
        assert k in p, f"Missing field '{k}' in product detail response"


def test_product_origin_no_hardcoded_odisha_appendix():
    r = requests.get(f"{API}/products/organic-foxtail-millet", timeout=15)
    assert r.status_code == 200
    origin_text = r.json()["product"].get("origin") or ""
    assert "For now we source only from organic farms in Odisha" not in origin_text


# ---------- fallback: product -> recipes ----------
def test_product_fallback_related_recipes_populated():
    # organic-moong-dal has recipe_slugs pointing to non-existent recipes per task notes.
    r = requests.get(f"{API}/products/organic-moong-dal", timeout=15)
    if r.status_code == 404:
        pytest.skip("organic-moong-dal not seeded in this environment")
    data = r.json()
    related = data.get("related_recipes") or []
    assert isinstance(related, list)
    # Fallback should surface at least one recipe where the ingredient list mentions "moong" or "dal".
    assert len(related) > 0, "Expected keyword fallback to surface at least one related recipe"
    for rec in related:
        assert "slug" in rec and "title" in rec


# ---------- fallback: recipe -> products (requires auth) ----------
def test_recipe_fallback_products(admin_session):
    # list recipes to find one
    r = admin_session.get(f"{API}/recipes", timeout=20)
    assert r.status_code == 200, r.text
    recipes = r.json().get("recipes") or []
    assert recipes, "No recipes seeded"
    # Pick a recipe and verify we get products (either via explicit link or fallback)
    sample_slug = recipes[0]["slug"]
    r2 = admin_session.get(f"{API}/recipes/{sample_slug}", timeout=20)
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert "products" in body
    assert isinstance(body["products"], list)


def test_recipe_endpoint_requires_auth():
    recipes = requests.get(f"{API}/recipes", timeout=15)
    # Should be 401/403 without auth
    assert recipes.status_code in (401, 403), recipes.status_code


# ---------- cart + serviceability guest flow ----------
def test_serviceability_pin_110001():
    r = requests.post(f"{API}/serviceability", json={"pin": "110001"}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "serviceable" in body


def test_guest_cart_add_and_read():
    s = requests.Session()
    # fetch a product to get a slug
    r = s.get(f"{API}/products/organic-foxtail-millet", timeout=15)
    assert r.status_code == 200
    slug = r.json()["product"]["slug"]
    # bootstrap CSRF + guest cart cookies
    s.get(f"{API}/csrf", timeout=15)
    s.get(f"{API}/cart", timeout=15)
    csrf = s.cookies.get("an_csrf")
    assert csrf, f"CSRF cookie not set: {s.cookies.get_dict()}"
    add = s.post(f"{API}/cart/items", json={"slug": slug, "qty": 1},
                 headers={"X-CSRF-Token": csrf}, timeout=15)
    assert add.status_code in (200, 201), add.text
    get = s.get(f"{API}/cart", timeout=15)
    assert get.status_code == 200
    body = get.json()
    items = body.get("items") or body.get("cart", {}).get("items") or []
    assert any(it.get("slug") == slug for it in items), f"Added product not reflected in cart: {body}"
