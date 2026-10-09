"""Backend tests for Iteration 3: Odia transliterated names + recipe search/festival features.

Scope:
- GET /api/products returns odia_name field for every product
- Spot-check specific odia_name values on known slugs
- search_keywords (via ?q=) now includes the Odia name (lowercase)
- Combo products may legitimately have odia_name=""
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def all_products():
    """Fetch default list + combos + today's deals so we cover every product."""
    out = {}
    for params in [{}, {"combo": "true"}, {"todays_deal": "true"}]:
        r = requests.get(f"{API}/products", params=params, timeout=20)
        assert r.status_code == 200, f"GET /api/products {params} -> {r.status_code}"
        for p in r.json().get("products", []):
            out[p["slug"]] = p
    return out


# ---- Odia name field presence -----------------------------------------------

def test_products_have_odia_name_field(all_products):
    assert len(all_products) >= 70, f"Expected ~79 products, got {len(all_products)}"
    missing = [s for s, p in all_products.items() if "odia_name" not in p]
    assert not missing, f"Products missing odia_name key: {missing[:10]}"


SPOT_CHECK = {
    "organic-ragi-whole": "Mandia",
    "cold-pressed-mustard-oil": "Sorisha Tela",
    "organic-jaggery-powder": "Guda Churna",
    "organic-sattu": "Chatua",
    "organic-urad-dal-whole": "Sabuta Biri",
    "organic-amla-powder": "Anla Churna",
    "organic-poha": "Chuda",
}


@pytest.mark.parametrize("slug,expected", list(SPOT_CHECK.items()))
def test_spot_check_odia_names(all_products, slug, expected):
    p = all_products.get(slug)
    assert p is not None, f"Product {slug} missing"
    assert p.get("odia_name") == expected, f"{slug}: got {p.get('odia_name')!r}, want {expected!r}"


def test_most_products_have_non_empty_odia_name(all_products):
    # Combos may have empty odia_name, but majority should be populated.
    populated = [p for p in all_products.values() if (p.get("odia_name") or "").strip()]
    ratio = len(populated) / max(len(all_products), 1)
    assert ratio > 0.6, f"Only {ratio:.0%} products have odia_name populated"


# ---- Search by Odia keyword -------------------------------------------------

@pytest.mark.parametrize(
    "query,expected_slug_substr",
    [
        ("mandia", "ragi"),
        ("sorisha", "mustard-oil"),
        ("chatua", "sattu"),
    ],
)
def test_search_by_odia_keyword(query, expected_slug_substr):
    r = requests.get(f"{API}/products", params={"q": query}, timeout=20)
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.json().get("products", [])]
    assert any(expected_slug_substr in s for s in slugs), (
        f"?q={query} returned {slugs}; expected one containing {expected_slug_substr!r}"
    )


# ---- PDP odia_name ----------------------------------------------------------

def test_pdp_returns_odia_name():
    r = requests.get(f"{API}/products/organic-ragi-whole", timeout=20)
    assert r.status_code == 200
    body = r.json()
    product = body.get("product") or body
    assert product.get("odia_name") == "Mandia"


# ---- Recipes still gated / sanity -------------------------------------------

def test_recipes_count_endpoint():
    r = requests.get(f"{API}/recipes-count", timeout=20)
    assert r.status_code == 200
    assert r.json().get("count", 0) >= 34
