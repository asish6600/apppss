"""tscheck: Google tag IDs are runtime-configured via /api/site-integrations,
and the admin PUT + traffic GET are protected from unauthenticated callers."""
import httpx

BASE = "http://localhost:8001/api"


def test_site_integrations_public_get_returns_fields():
    r = httpx.get(f"{BASE}/site-integrations", timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ["ga4_measurement_id", "adsense_publisher_id", "search_console_verification",
                "gtm_container_id", "bing_verification"]:
        assert key in data, f"missing {key} in {data}"


def test_admin_site_integrations_put_requires_auth():
    r = httpx.put(f"{BASE}/admin/site-integrations", json={"ga4_measurement_id": "G-TSCHECK000"}, timeout=10)
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"


def test_admin_traffic_get_requires_auth():
    r = httpx.get(f"{BASE}/admin/traffic", timeout=10)
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"
