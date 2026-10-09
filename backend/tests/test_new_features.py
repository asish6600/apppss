"""Backend tests for iteration-3 features: image upload, order status_history, new campaign themes."""
import io
import os
import time
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


# tiny PNG (1x1) bytes
PNG_1x1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x00\x03\x00\x01\xc8\xd7\x1b\x1e\x00\x00\x00\x00IEND\xaeB`\x82"
)


# ===== IMAGE UPLOAD =====
class TestImageUpload:
    def test_unauth_upload_rejected(self):
        s = requests.Session()
        files = {"file": ("x.png", io.BytesIO(PNG_1x1), "image/png")}
        r = s.post(f"{API}/admin/upload-image", files=files)
        assert r.status_code in (401, 403), r.status_code

    def test_admin_upload_and_serve(self, admin):
        files = {"file": ("test.png", io.BytesIO(PNG_1x1), "image/png")}
        r = admin.post(f"{API}/admin/upload-image", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "path" in data and "url" in data
        assert data["url"].startswith("/api/files/")
        # fetch via url
        file_url = BASE_URL + data["url"]
        rg = requests.get(file_url)
        assert rg.status_code == 200, f"{rg.status_code} {rg.text[:200]}"
        ct = rg.headers.get("Content-Type", "")
        assert ct.startswith("image/"), f"Unexpected content-type: {ct}"


# ===== CAMPAIGN with new themes =====
class TestCampaignThemes:
    @pytest.mark.parametrize("theme", ["durga-puja", "holi", "eid"])
    def test_create_theme(self, admin, theme):
        slug = f"qa-{theme}-{uuid.uuid4().hex[:6]}"
        payload = {
            "campaign_slug": slug,
            "campaign_name": f"QA {theme} campaign",
            "title": f"QA {theme} campaign",
            "subtitle": "test",
            "theme": theme,
            "end_at": "2099-01-01T00:00:00Z",
            "active": True,
        }
        r = admin.post(f"{API}/admin/campaigns", json=payload)
        assert r.status_code in (200, 201), r.text
        # cleanup
        admin.delete(f"{API}/admin/campaigns/{slug}")


# ===== ORDER STATUS HISTORY =====
class TestOrderStatusHistory:
    def test_place_and_transition(self, admin):
        # ensure cart has one item
        # clear cart
        rc = admin.get(f"{API}/cart")
        if rc.status_code == 200:
            for item in rc.json().get("items", []):
                admin.delete(f"{API}/cart/items/{item['slug']}")
        r = admin.post(f"{API}/cart/items", json={"slug": "ragi-flour", "qty": 1})
        assert r.status_code in (200, 201), r.text

        addr = {
            "full_name": "QA Tester",
            "mobile": "9876543210",
            "address": "123 QA Lane",
            "city": "Cuttack",
            "state": "Odisha",
            "pincode": "753001",
        }
        ro = admin.post(f"{API}/orders", json={"address": addr, "payment_method": "cod"})
        assert ro.status_code in (200, 201), ro.text
        order_number = ro.json()["order"]["order_number"]

        # transition CONFIRMED
        r1 = admin.put(f"{API}/admin/orders/{order_number}/status", json={"status": "CONFIRMED"})
        assert r1.status_code == 200, r1.text
        time.sleep(0.3)
        r2 = admin.put(f"{API}/admin/orders/{order_number}/status", json={"status": "SHIPPED"})
        assert r2.status_code == 200, r2.text

        # fetch order detail as the ordering user (admin here)
        rd = admin.get(f"{API}/orders/{order_number}")
        assert rd.status_code == 200
        payload = rd.json()
        order = payload.get("order") or payload
        history = order.get("status_history", [])
        statuses = [h.get("status") for h in history]
        assert "PLACED" in statuses, f"History missing PLACED: {statuses}"
        assert "CONFIRMED" in statuses, f"History missing CONFIRMED: {statuses}"
        assert "SHIPPED" in statuses, f"History missing SHIPPED: {statuses}"
        for h in history:
            assert h.get("at"), f"Missing 'at' timestamp in {h}"
