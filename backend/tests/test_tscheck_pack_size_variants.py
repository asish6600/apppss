import httpx

BASE = "http://localhost:8001/api"


def test_variants_present_for_all_siblings():
    """GET /api/products/<slug> returns a variants array listing every sibling pack size,
    for each slug in the organic-moong-dal pack-size group."""
    slugs = {
        "organic-moong-dal-500g": "500 g",
        "organic-moong-dal": "1 kg",
        "organic-moong-dal-2kg": "2 kg",
    }
    expected_pack_sizes = set(slugs.values())

    for slug, expected_pack_size in slugs.items():
        r = httpx.get(f"{BASE}/products/{slug}")
        assert r.status_code == 200, f"GET /products/{slug} -> {r.status_code}: {r.text[:200]}"
        data = r.json()

        product = data.get("product", data)
        assert product.get("slug") == slug
        assert product.get("net_quantity") == expected_pack_size

        variants = data.get("variants")
        assert isinstance(variants, list) and len(variants) == 3, (
            f"expected 3 variants for {slug}, got {variants}"
        )

        variant_slugs = {v["slug"] for v in variants}
        assert variant_slugs == set(slugs.keys()), f"variant slugs mismatch for {slug}: {variant_slugs}"

        variant_pack_sizes = {v["slug"]: v["pack_size"] for v in variants}
        for vslug, vpack in slugs.items():
            assert variant_pack_sizes[vslug] == vpack

        # exactly one is_primary == True (the 1kg one)
        primary = [v for v in variants if v.get("is_primary")]
        assert len(primary) == 1 and primary[0]["slug"] == "organic-moong-dal", (
            f"expected organic-moong-dal to be primary, got {primary}"
        )
