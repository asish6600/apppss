import httpx

BASE_URL = "http://localhost:8001"

OTHER_STATES = [
    "Madhya Pradesh", "Rajasthan", "Kerala", "Maharashtra", "Tamil Nadu",
    "Gujarat", "Karnataka", "Andhra Pradesh", "Uttarakhand", "Kashmir",
    "Assam", "Bihar", "Telangana", "Goa", "Chhattisgarh",
    "Himachal Pradesh", "Uttar Pradesh",
]


def test_single_product_origin_is_odisha():
    resp = httpx.get(f"{BASE_URL}/api/products/organic-foxtail-millet", timeout=30)
    assert resp.status_code == 200, resp.text
    product = resp.json()["product"]
    assert "Odisha" in (product.get("origin") or ""), product.get("origin")
    assert product.get("origin_region") == "Odisha", product.get("origin_region")


def test_all_published_products_origin_has_no_other_state():
    resp = httpx.get(f"{BASE_URL}/api/products?limit=250", timeout=30)
    assert resp.status_code == 200, resp.text
    products = resp.json()["products"]
    assert len(products) > 0

    violations = []
    for p in products:
        origin = p.get("origin") or ""
        region = p.get("origin_region") or ""
        for state in OTHER_STATES:
            if state in origin or state in region:
                violations.append((p.get("slug"), state))

    assert violations == [], f"Products with non-Odisha state in origin fields: {violations[:10]}"
