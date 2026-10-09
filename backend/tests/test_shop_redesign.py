"""Iteration-4: Shop/Menu redesign — combos, todays_deals, filters, admin flags, new recipes."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "asishs@2pirad.com"
ADMIN_PASSWORD = "AaharNest@2026"


def _admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    csrf = s.cookies.get("an_csrf")
    assert csrf
    s.headers.update({"X-CSRF-Token": csrf})
    return s


@pytest.fixture(scope="module")
def admin():
    return _admin_session()


# ===== Categories =====
class TestCategories:
    def test_13_categories_with_combos(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        cats = data.get("categories", data) if isinstance(data, dict) else data
        slugs = [c.get("slug") for c in cats]
        assert len(cats) == 13, f"Expected 13 categories, got {len(cats)}: {slugs}"
        assert "combos" in slugs, f"'combos' slug missing: {slugs}"


# ===== Products default + filters =====
class TestProductsListing:
    def test_default_shop_excludes_combo_and_deals(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        items = data.get("products", data) if isinstance(data, dict) else data
        assert len(items) == 21, f"Expected 21 default products, got {len(items)}"
        for p in items:
            assert not p.get("is_combo"), f"Combo leaked into default: {p.get('slug')}"
            assert not p.get("is_todays_deal"), f"Deal leaked into default: {p.get('slug')}"

    def test_combo_filter_returns_3(self):
        r = requests.get(f"{API}/products", params={"combo": "true"})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        slugs = sorted(p["slug"] for p in items)
        assert slugs == sorted(["combo-breakfast-trio", "combo-spice-essentials", "combo-dal-trio"]), slugs

    def test_todays_deal_filter_returns_3(self):
        r = requests.get(f"{API}/products", params={"todays_deal": "true"})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        slugs = sorted(p["slug"] for p in items)
        assert slugs == sorted(["deal-millet-mix", "deal-raw-honey", "deal-a2-ghee"]), slugs

    def test_offers_uniform_25pct(self):
        r = requests.get(f"{API}/products", params={"offers": "true"})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        assert len(items) > 0, "No offer products"
        for p in items:
            assert p.get("discount") == 25, f"{p['slug']} discount != 25 ({p.get('discount')})"

    def test_featured(self):
        r = requests.get(f"{API}/products", params={"featured": "true"})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        assert len(items) > 0

    def test_new_arrival(self):
        r = requests.get(f"{API}/products", params={"new_arrival": "true"})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        assert len(items) > 0
        for p in items:
            assert p.get("is_new") is True, f"{p['slug']} not is_new"

    def test_price_band(self):
        r = requests.get(f"{API}/products", params={"min_price": 100, "max_price": 199})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        for p in items:
            assert 100 <= p["price"] <= 199, f"{p['slug']} price {p['price']} out of band"

    def test_min_discount(self):
        r = requests.get(f"{API}/products", params={"min_discount": 20})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        for p in items:
            assert p.get("discount", 0) >= 20, f"{p['slug']} disc {p.get('discount')} < 20"

    def test_in_stock_only(self):
        r = requests.get(f"{API}/products", params={"in_stock": "true"})
        assert r.status_code == 200
        items = r.json().get("products", []) if isinstance(r.json(), dict) else r.json()
        for p in items:
            assert p.get("stock", 0) > 0, f"{p['slug']} stock={p.get('stock')}"


# ===== Admin product mutations =====
class TestAdminProductFlags:
    def test_admin_login_role(self, admin):
        r = admin.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text
        data = r.json()
        user = data.get("user", data)
        assert user.get("role") == "admin", f"Role not admin: {user}"

    def test_create_combo_product_and_cleanup(self, admin):
        slug = f"qa-combo-{uuid.uuid4().hex[:6]}"
        payload = {
            "slug": slug, "sku": f"QA-{slug[:10]}", "name": "QA Combo", "category": "combos",
            "price": 199, "mrp": 299, "size": "test", "image": "https://example.com/x.jpg",
            "description": "QA", "short": "QA", "ingredients": "x",
            "benefits": ["y"], "bestseller": False, "is_new": True, "veg": True,
            "stock": 10, "is_combo": True, "is_todays_deal": False,
        }
        r = admin.post(f"{API}/admin/products", json=payload)
        assert r.status_code in (200, 201), r.text
        # confirm not in default list
        rl = requests.get(f"{API}/products")
        slugs = [p["slug"] for p in (rl.json().get("products") if isinstance(rl.json(), dict) else rl.json())]
        assert slug not in slugs
        # confirm in combo list
        rc = requests.get(f"{API}/products", params={"combo": "true"})
        combo_slugs = [p["slug"] for p in (rc.json().get("products") if isinstance(rc.json(), dict) else rc.json())]
        assert slug in combo_slugs
        # cleanup
        admin.delete(f"{API}/admin/products/{slug}")

    def test_toggle_todays_deal_on_existing(self, admin):
        # Pick a non-combo, non-deal product to flip
        rl = requests.get(f"{API}/products")
        items = rl.json().get("products") if isinstance(rl.json(), dict) else rl.json()
        target = items[0]["slug"]

        # Fetch the admin product record to re-send full payload
        rget = admin.get(f"{API}/admin/products")
        all_prods = rget.json().get("products", [])
        orig = next(p for p in all_prods if p["slug"] == target)

        def _payload(flag):
            return {
                "name": orig["name"], "slug": orig["slug"], "sku": orig.get("sku", ""),
                "category": orig["category"], "price": orig["price"], "mrp": orig.get("mrp"),
                "stock": orig.get("stock", 0), "pack_size": orig.get("pack_size", ""),
                "image": orig.get("image", ""), "images": orig.get("images"),
                "description": orig.get("description", ""),
                "ingredients": orig.get("ingredients") or "",
                "is_combo": bool(orig.get("is_combo")),
                "is_todays_deal": flag,
                "is_new": bool(orig.get("is_new")),
                "featured": bool(orig.get("featured")),
            }

        # mark deal
        r = admin.put(f"{API}/admin/products/{target}", json=_payload(True))
        assert r.status_code == 200, r.text
        rl2 = requests.get(f"{API}/products")
        slugs2 = [p["slug"] for p in (rl2.json().get("products") if isinstance(rl2.json(), dict) else rl2.json())]
        assert target not in slugs2, f"{target} still in default after is_todays_deal=True"
        rd = requests.get(f"{API}/products", params={"todays_deal": "true"})
        deal_slugs = [p["slug"] for p in (rd.json().get("products") if isinstance(rd.json(), dict) else rd.json())]
        assert target in deal_slugs
        # revert
        rrev = admin.put(f"{API}/admin/products/{target}", json=_payload(False))
        assert rrev.status_code == 200


# ===== Recipes =====
class TestRecipes:
    def test_recipe_list_contains_new(self, admin):
        r = admin.get(f"{API}/recipes")
        assert r.status_code == 200, r.text
        data = r.json()
        items = data.get("recipes", data) if isinstance(data, dict) else data
        slugs = [x.get("slug") for x in items]
        for s in ["palak-paneer", "masala-dosa", "chole-bhature", "ragi-cookies"]:
            assert s in slugs, f"recipe {s} missing. Got: {slugs}"

    def test_palak_paneer_detail(self, admin):
        r = admin.get(f"{API}/recipes/palak-paneer")
        assert r.status_code == 200, r.text
        data = r.json()
        rec = data.get("recipe", data)
        assert rec.get("ingredients"), "no ingredients"
        assert rec.get("steps") or rec.get("instructions"), "no steps/instructions"


# ===== Cart/Order unchanged =====
class TestCartOrders:
    def test_cart_and_order_flow(self, admin):
        # clear
        rc = admin.get(f"{API}/cart")
        assert rc.status_code == 200
        for it in rc.json().get("items", []):
            admin.delete(f"{API}/cart/items/{it['slug']}")
        r = admin.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 1})
        assert r.status_code in (200, 201), r.text
        addr = {"full_name": "QA", "mobile": "9876543210", "address": "1 QA Rd",
                "city": "Cuttack", "state": "Odisha", "pincode": "753001"}
        ro = admin.post(f"{API}/orders", json={"address": addr, "payment_method": "cod"})
        assert ro.status_code in (200, 201), ro.text
        assert ro.json().get("order", {}).get("order_number")
