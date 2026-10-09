"""Backend test suite for AaharNest (aligned with actual response schemas)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://aaharnest-build.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "asishs@2pirad.com"
ADMIN_PASSWORD = "AaharNest@2026"


@pytest.fixture(scope="session")
def guest_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    csrf = s.cookies.get("an_csrf")
    assert csrf, "Missing an_csrf cookie after login"
    assert s.cookies.get("an_session"), "Missing an_session cookie after login"
    s.headers.update({"X-CSRF-Token": csrf})
    return s


def _clear_cart(auth_session):
    r = auth_session.get(f"{API}/cart")
    if r.status_code == 200:
        for item in r.json().get("items", []):
            slug = item.get("slug")
            if slug:
                auth_session.delete(f"{API}/cart/items/{slug}")


# ===== Catalog =====
class TestCatalog:
    def test_categories_9(self, guest_session):
        r = guest_session.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json().get("categories", [])
        assert len(cats) == 9, f"Expected 9, got {len(cats)}"

    def test_products_list(self, guest_session):
        r = guest_session.get(f"{API}/products")
        assert r.status_code == 200
        products = r.json().get("products", [])
        assert len(products) >= 1

    def test_products_featured(self, guest_session):
        r = guest_session.get(f"{API}/products", params={"featured": "true"})
        assert r.status_code == 200
        products = r.json().get("products", [])
        assert len(products) >= 1
        # All returned should be featured
        for p in products:
            assert p.get("featured") is True

    def test_product_detail_ragi(self, guest_session):
        r = guest_session.get(f"{API}/products/ragi-flour")
        assert r.status_code == 200
        data = r.json()
        assert data["product"]["slug"] == "ragi-flour"
        assert "related_recipes" in data
        assert "related_products" in data


# ===== Auth check =====
class TestAuthCheck:
    def test_check_existing(self, guest_session):
        r = guest_session.post(f"{API}/auth/check", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        data = r.json()
        assert data["exists"] is True
        assert data["has_password"] is True

    def test_check_new(self, guest_session):
        new_email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
        r = guest_session.post(f"{API}/auth/check", json={"email": new_email})
        assert r.status_code == 200
        data = r.json()
        assert data["exists"] is False
        assert data["has_password"] is False


# ===== Login =====
class TestLogin:
    def test_login_success_and_me(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert s.cookies.get("an_session")
        assert s.cookies.get("an_csrf")
        assert ADMIN_EMAIL in r.text

        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 200
        assert ADMIN_EMAIL in r2.text

    def test_login_wrong_password(self, guest_session):
        r = guest_session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass123"})
        assert r.status_code == 401
        assert "Incorrect email or password" in r.text or "incorrect" in r.text.lower()


# ===== CSRF =====
class TestCSRF:
    def test_cart_mutation_without_csrf_header_fails(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        r2 = s.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 1})
        assert r2.status_code == 403, f"Expected 403 without CSRF; got {r2.status_code} {r2.text}"

    def test_cart_mutation_with_csrf_header_succeeds(self, auth_session):
        _clear_cart(auth_session)
        r = auth_session.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 1})
        assert r.status_code in (200, 201), r.text


# ===== Cart pricing =====
class TestCartPricing:
    def test_server_authoritative_totals(self, auth_session):
        _clear_cart(auth_session)
        r = auth_session.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 2})
        assert r.status_code in (200, 201), r.text
        cart = auth_session.get(f"{API}/cart").json()
        assert cart.get("subtotal") == 298, f"Subtotal mismatch: {cart}"
        assert cart.get("shipping") == 49, f"Shipping mismatch: {cart}"
        assert cart.get("grand_total") == 347, f"Grand total mismatch: {cart}"

        # Add more to exceed 499 (3 more => 5*149 = 745)
        r2 = auth_session.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 3})
        assert r2.status_code in (200, 201)
        cart2 = auth_session.get(f"{API}/cart").json()
        assert cart2.get("subtotal", 0) >= 499
        assert cart2.get("shipping") == 0, f"Expected free shipping >= 499; got {cart2}"


# ===== Orders =====
class TestOrders:
    @pytest.fixture
    def valid_address(self):
        return {
            "full_name": "Test User",
            "mobile": "9876543210",
            "address": "123 Test Street",
            "city": "Cuttack",
            "state": "Odisha",
            "pincode": "753001",
        }

    def test_order_flow(self, auth_session, valid_address):
        _clear_cart(auth_session)
        auth_session.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 2})
        payload = {"address": valid_address, "payment_method": "cod", "donation_amount": 1}
        r = auth_session.post(f"{API}/orders", json=payload)
        assert r.status_code in (200, 201), f"Order create failed: {r.status_code} {r.text}"
        order = r.json().get("order")
        assert order and order.get("order_number")
        order_number = order["order_number"]
        # donation recorded separately -> grand_total should be subtotal+shipping+tax-discount (not add donation)
        # The spec says donation recorded separately
        assert order.get("donation_amount") == 1

        # cart cleared
        cart = auth_session.get(f"{API}/cart").json()
        assert not cart.get("items")

        # list orders
        rl = auth_session.get(f"{API}/orders")
        assert rl.status_code == 200
        nums = [o.get("order_number") for o in rl.json().get("orders", [])]
        assert order_number in nums

        # get detail
        rd = auth_session.get(f"{API}/orders/{order_number}")
        assert rd.status_code == 200

    def test_invalid_pincode(self, auth_session, valid_address):
        _clear_cart(auth_session)
        auth_session.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 1})
        bad = dict(valid_address); bad["pincode"] = "12"
        r = auth_session.post(f"{API}/orders", json={"address": bad, "payment_method": "cod"})
        assert r.status_code == 400

    def test_invalid_mobile(self, auth_session, valid_address):
        _clear_cart(auth_session)
        auth_session.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 1})
        bad = dict(valid_address); bad["mobile"] = "123"
        r = auth_session.post(f"{API}/orders", json={"address": bad, "payment_method": "cod"})
        assert r.status_code == 400


# ===== Serviceability =====
class TestServiceability:
    def test_serviceable_pin(self, guest_session):
        r = guest_session.post(f"{API}/serviceability", json={"pin": "753001"})
        assert r.status_code == 200
        data = r.json()
        assert data["serviceable"] is True
        assert data["cod"] is True

    def test_invalid_pin(self, guest_session):
        r = guest_session.post(f"{API}/serviceability", json={"pin": "12"})
        assert r.status_code == 400


# ===== Content gating =====
class TestContentGating:
    def test_recipes_requires_auth(self, guest_session):
        r = guest_session.get(f"{API}/recipes")
        assert r.status_code == 401

    def test_recipes_authed_count(self, auth_session):
        r = auth_session.get(f"{API}/recipes")
        assert r.status_code == 200
        recs = r.json().get("recipes", [])
        assert len(recs) == 14, f"Expected 14 recipes, got {len(recs)}"

    def test_recipe_detail_requires_auth(self, guest_session):
        r = guest_session.get(f"{API}/recipes/poha")
        assert r.status_code == 401

    def test_recipes_count_public(self, guest_session):
        r = guest_session.get(f"{API}/recipes-count")
        assert r.status_code == 200
        assert "count" in r.json()

    def test_articles_public(self, guest_session):
        r = guest_session.get(f"{API}/articles")
        assert r.status_code == 200
        arts = r.json().get("articles", [])
        assert isinstance(arts, list) and len(arts) >= 1

    def test_article_detail_public(self, guest_session):
        # Fetch any article slug dynamically because 'aaharnest-build' may not exist
        arts = guest_session.get(f"{API}/articles").json().get("articles", [])
        assert arts
        slug = arts[0]["slug"]
        r = guest_session.get(f"{API}/articles/{slug}")
        assert r.status_code == 200, f"Article {slug} failed: {r.text}"

    def test_article_aaharnest_build_slug(self, guest_session):
        """Spec says /api/articles/aaharnest-build should be public. Verify existence."""
        r = guest_session.get(f"{API}/articles/aaharnest-build")
        # This test will fail if the slug isn't seeded — reported to main agent
        assert r.status_code == 200, f"Expected aaharnest-build article; got {r.status_code}"


# ===== Account endpoints =====
class TestAccount:
    def test_profile_update(self, auth_session):
        r = auth_session.put(f"{API}/me/profile", json={"name": "AaharNest Admin"})
        assert r.status_code == 200

    def test_preferences(self, auth_session):
        rg = auth_session.get(f"{API}/me/preferences")
        assert rg.status_code == 200
        ru = auth_session.put(f"{API}/me/preferences", json={"language": "en"})
        assert ru.status_code == 200

    def test_addresses_crud(self, auth_session):
        addr = {
            "full_name": "Test Addr",
            "mobile": "9876543210",
            "address": "A1",
            "city": "Cuttack",
            "state": "Odisha",
            "pincode": "753001",
        }
        rp = auth_session.post(f"{API}/me/addresses", json=addr)
        assert rp.status_code in (200, 201), rp.text
        aid = rp.json().get("address", {}).get("id")
        assert aid
        rg = auth_session.get(f"{API}/me/addresses")
        assert rg.status_code == 200
        assert any(a.get("id") == aid for a in rg.json().get("addresses", []))
        rd = auth_session.delete(f"{API}/me/addresses/{aid}")
        assert rd.status_code in (200, 204)

    def test_saved_recipes(self, auth_session):
        rp = auth_session.post(f"{API}/me/saved-recipes", json={"recipe_slug": "poha"})
        assert rp.status_code in (200, 201), rp.text
        rg = auth_session.get(f"{API}/me/saved-recipes")
        assert rg.status_code == 200
        rd = auth_session.delete(f"{API}/me/saved-recipes/poha")
        assert rd.status_code in (200, 204)

    def test_wishlist(self, auth_session):
        rp = auth_session.post(f"{API}/me/wishlist", json={"product_slug": "ragi-flour"})
        assert rp.status_code in (200, 201), rp.text
        rg = auth_session.get(f"{API}/me/wishlist")
        assert rg.status_code == 200
        rd = auth_session.delete(f"{API}/me/wishlist/ragi-flour")
        assert rd.status_code in (200, 204)


# ===== Support =====
class TestSupport:
    def test_support_valid(self, guest_session):
        payload = {
            "name": "Test",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "subject": "Help",
            "category": "general",
            "message": "Hello support team, I need some help with my order please.",
            "website": "",
        }
        r = guest_session.post(f"{API}/support", json=payload)
        assert r.status_code == 200, r.text

    def test_support_honeypot(self, guest_session):
        payload = {
            "name": "Bot",
            "email": f"bot_{uuid.uuid4().hex[:6]}@example.com",
            "subject": "spam",
            "category": "general",
            "message": "spam message content",
            "website": "http://spam.example",
        }
        r = guest_session.post(f"{API}/support", json=payload)
        assert r.status_code == 200
