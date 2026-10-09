import httpx

BASE_URL = "http://localhost:8001"

NON_ODISHA_STATES = [
    "Punjab", "Haryana", "Rajasthan", "Gujarat", "Maharashtra", "Karnataka",
    "Tamil Nadu", "Kerala", "Andhra Pradesh", "Telangana", "Bihar",
    "Uttar Pradesh", "Madhya Pradesh", "West Bengal", "Assam",
    "Himachal Pradesh", "Jammu",
]


def test_farmers_endpoint_returns_three_odisha_farmers():
    """GET /api/farmers returns three farmers whose district field ends with
    'Odisha' and no card names a non-Odisha Indian state."""
    resp = httpx.get(f"{BASE_URL}/api/farmers", timeout=30)
    assert resp.status_code == 200, f"GET /api/farmers -> {resp.status_code}: {resp.text[:300]}"
    data = resp.json()
    farmers = data["farmers"]
    assert len(farmers) == 3, f"expected 3 farmers, got {len(farmers)}: {[f.get('id') for f in farmers]}"

    expected_ids = {"farmer-ragi", "farmer-spice", "farmer-pulse"}
    got_ids = {f["id"] for f in farmers}
    assert got_ids == expected_ids, f"unexpected farmer ids: {got_ids}"

    for f in farmers:
        district = f.get("district", "")
        assert district.strip().endswith("Odisha"), (
            f"farmer {f['id']} district '{district}' does not end with 'Odisha'"
        )
        assert f.get("demo") is True, f"farmer {f['id']} missing demo=true flag"
        assert f.get("image", "").startswith("https://"), f"farmer {f['id']} missing remote image"

        blob = " ".join(str(f.get(k, "")) for k in ("name", "story", "region", "district", "grows", "crop"))
        for state in NON_ODISHA_STATES:
            assert state not in blob, f"farmer {f['id']} mentions non-Odisha state '{state}'"
