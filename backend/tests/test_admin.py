"""Backend tests for AaharNest Admin Studio (products/campaigns/orders) and festival countdown."""
import os
import uuid
import time
import datetime as dt
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://aaharnest-build.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "asishs@2pirad.com"
ADMIN_PASSWORD = "AaharNest@2026"


@pytest.fixture(scope="session")
def guest():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    csrf = s.cookies.get("an_csrf")
    assert csrf
    s.headers.update({"X-CSRF-Token": csrf})
    return s


# ============ Access control ============
class TestAdminAccess:
    def test_products_unauth_401(self, guest):
        r = guest.get(f"{API}/admin/products")
        assert r.status_code == 401, r.text

    def test_stats_unauth_401(self, guest):
        r = guest.get(f"{API}/admin/stats")
        assert r.status_code == 401

    def test_campaigns_unauth_401(self, guest):
        r = guest.get(f"{API}/admin/campaigns")
        assert r.status_code == 401

    def test_orders_unauth_401(self, guest):
        r = guest.get(f"{API}/admin/orders")
        assert r.status_code == 401

    def test_admin_200(self, admin):
        for path in ("/admin/stats", "/admin/products", "/admin/campaigns", "/admin/orders"):
            r = admin.get(f"{API}{path}")
            assert r.status_code == 200, f"{path} -> {r.status_code} {r.text}"


# ============ Products CRUD ============
TEST_SLUG = f"test-millet-{uuid.uuid4().hex[:6]}"

class TestAdminProducts:
    def test_create_update_delete_discount(self, admin):
        payload = {
            "name": "QA Test Millet",
            "slug": TEST_SLUG,
            "category": "millets",
            "price": 100,
            "mrp": 150,
            "stock": 50,
            "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c",
            "status": "PUBLISHED",
            "featured": False,
        }
        r = admin.post(f"{API}/admin/products", json=payload)
        assert r.status_code in (200, 201), r.text
        prod = r.json()["product"]
        assert prod["slug"] == TEST_SLUG
        assert prod["discount"] == round((150 - 100) / 150 * 100)  # ~33

        # Public GET should see it (status PUBLISHED)
        rg = requests.get(f"{API}/products/{TEST_SLUG}")
        assert rg.status_code == 200, rg.text
        assert rg.json()["product"]["discount"] == prod["discount"]

        # Update price -> discount recalc
        upd = dict(payload); upd["price"] = 90
        ru = admin.put(f"{API}/admin/products/{TEST_SLUG}", json=upd)
        assert ru.status_code == 200, ru.text
        updp = ru.json()["product"]
        assert updp["price"] == 90
        assert updp["discount"] == round((150 - 90) / 150 * 100)  # 40

        # Verify public GET persisted
        rg2 = requests.get(f"{API}/products/{TEST_SLUG}")
        assert rg2.status_code == 200
        assert rg2.json()["product"]["price"] == 90

        # Delete
        rd = admin.delete(f"{API}/admin/products/{TEST_SLUG}")
        assert rd.status_code == 200

        rg3 = requests.get(f"{API}/products/{TEST_SLUG}")
        assert rg3.status_code == 404

    def test_products_list_has_21(self, admin):
        r = admin.get(f"{API}/admin/products")
        assert r.status_code == 200
        prods = r.json().get("products", [])
        # Spec says ~21 products seeded
        assert len(prods) >= 20, f"Expected ~21 products, got {len(prods)}"


# ============ Campaigns CRUD ============
CAMP_SLUG = f"qa-diwali-sale-{uuid.uuid4().hex[:6]}"

class TestAdminCampaigns:
    def test_launch_offer_exists(self, admin):
        r = admin.get(f"{API}/admin/campaigns")
        assert r.status_code == 200
        names = [c.get("campaign_name") for c in r.json().get("campaigns", [])]
        assert any("Launch" in (n or "") for n in names)

    def test_crud(self, admin):
        end = (dt.datetime.utcnow() + dt.timedelta(days=10)).isoformat()
        payload = {
            "campaign_name": "QA Diwali Sale",
            "campaign_slug": CAMP_SLUG,
            "discount_value": 30,
            "theme": "diwali",
            "status": "active",
            "end_at": end,
        }
        r = admin.post(f"{API}/admin/campaigns", json=payload)
        assert r.status_code in (200, 201), r.text
        c = r.json()["campaign"]
        assert c["campaign_slug"] == CAMP_SLUG
        assert c["theme"] == "diwali"

        # Update status to paused
        upd = dict(payload); upd["status"] = "paused"
        ru = admin.put(f"{API}/admin/campaigns/{CAMP_SLUG}", json=upd)
        assert ru.status_code == 200
        assert ru.json()["campaign"]["status"] == "paused"

        # Delete
        rd = admin.delete(f"{API}/admin/campaigns/{CAMP_SLUG}")
        assert rd.status_code == 200


# ============ Orders status ============
class TestAdminOrders:
    def test_update_status_if_any(self, admin):
        r = admin.get(f"{API}/admin/orders")
        assert r.status_code == 200
        orders = r.json().get("orders", [])
        if not orders:
            pytest.skip("No orders in system")
        o = orders[0]
        num = o["order_number"]
        current = o.get("status", "PLACED")
        new_status = "CONFIRMED" if current != "CONFIRMED" else "PLACED"
        ru = admin.put(f"{API}/admin/orders/{num}/status", json={"status": new_status})
        assert ru.status_code == 200, ru.text

        # Verify persistence
        rc = admin.get(f"{API}/admin/orders")
        updated = [x for x in rc.json()["orders"] if x["order_number"] == num][0]
        assert updated["status"] == new_status

    def test_invalid_status(self, admin):
        r = admin.get(f"{API}/admin/orders")
        orders = r.json().get("orders", [])
        if not orders:
            pytest.skip("No orders")
        num = orders[0]["order_number"]
        ru = admin.put(f"{API}/admin/orders/{num}/status", json={"status": "bogus_status_xyz"})
        assert ru.status_code == 400


# ============ CSRF enforcement on admin mutations ============
class TestAdminCSRF:
    def test_admin_product_create_without_csrf_header(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        # No X-CSRF-Token header set
        r2 = s.post(f"{API}/admin/products", json={"name": "X", "category": "millets", "price": 1})
        assert r2.status_code == 403, r2.status_code


# ============ Public campaign/promo check ============
class TestPublicCampaign:
    def test_products_include_campaign_slug(self, guest):
        r = guest.get(f"{API}/products")
        assert r.status_code == 200
        prods = r.json().get("products", [])
        assert any(p.get("campaign_slug") for p in prods), "Expected at least one product tied to a campaign"
