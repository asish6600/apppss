"""tscheck: SEO files (robots.txt, sitemap.xml, ads.txt) serve correctly from
the live catalogue, runtime-configured, never hardcoded."""
import re
import httpx

BASE = "http://localhost:8001/api"


def test_robots_txt_has_sitemap_line():
    r = httpx.get(f"{BASE}/robots.txt", timeout=10)
    assert r.status_code == 200, r.text
    assert "Sitemap:" in r.text, r.text


def test_sitemap_xml_has_many_locs_and_hreflang_and_product_slug():
    r = httpx.get(f"{BASE}/sitemap.xml", timeout=15)
    assert r.status_code == 200, r.text
    body = r.text
    assert body.startswith("<?xml"), body[:100]
    loc_count = len(re.findall(r"<loc>", body))
    assert loc_count > 1000, f"expected >1000 <loc> entries, got {loc_count}"
    assert "/en/product/forest-honey" in body
    assert 'hreflang="hi"' in body


def test_ads_txt_reflects_configured_publisher_id():
    # Capture current state, save a known publisher id, assert it appears, then restore.
    get_r = httpx.get(f"{BASE}/site-integrations", timeout=10)
    assert get_r.status_code == 200
    original = get_r.json()

    login_r = httpx.post(f"{BASE}/auth/login", json={
        "email": "asishs@2pirad.com", "password": "AaharNest@2026"
    }, timeout=10)
    assert login_r.status_code == 200, login_r.text
    # Dev server issues Secure cookies but this test talks plain http://localhost;
    # forward the raw cookie + csrf values manually (cookie jars drop Secure
    # cookies on non-TLS connections by design, unrelated to app behaviour).
    session_val = login_r.cookies.get("an_session")
    csrf = login_r.cookies.get("an_csrf")
    assert session_val and csrf
    headers = {"Cookie": f"an_session={session_val}; an_csrf={csrf}", "X-CSRF-Token": csrf}

    try:
        put_r = httpx.put(f"{BASE}/admin/site-integrations", json={
            "ga4_measurement_id": original.get("ga4_measurement_id"),
            "adsense_publisher_id": "ca-pub-1234567890123456",
            "search_console_verification": original.get("search_console_verification"),
            "gtm_container_id": original.get("gtm_container_id"),
            "bing_verification": original.get("bing_verification"),
        }, headers=headers, timeout=10)
        assert put_r.status_code == 200, put_r.text

        ads_r = httpx.get(f"{BASE}/ads.txt", timeout=10)
        assert ads_r.status_code == 200, ads_r.text
        assert "pub-1234567890123456" in ads_r.text, ads_r.text
    finally:
        httpx.put(f"{BASE}/admin/site-integrations", json={
            "ga4_measurement_id": original.get("ga4_measurement_id"),
            "adsense_publisher_id": original.get("adsense_publisher_id"),
            "search_console_verification": original.get("search_console_verification"),
            "gtm_container_id": original.get("gtm_container_id"),
            "bing_verification": original.get("bing_verification"),
        }, headers=headers, timeout=10)
