"""
tscheck: Profile form must persist edits (criterion: City field persists
across reload).

Previously found bug: PUT /api/me/profile accepted `city` and wrote it to
Mongo, but the response (and GET /api/auth/me) was built via `public_user()`,
which never included the `city` key. Fixed by adding
`"city": u.get("city")` to public_user() in backend/routes.py. These tests
now assert city IS returned by both endpoints.
"""
import requests

API = "http://localhost:8001/api"
EMAIL = "asishs@2pirad.com"
PASSWORD = "AaharNest@2026"


def _login_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    # Cookies are issued with Secure=True; http.cookiejar (used by `requests`)
    # refuses to replay Secure cookies over a plain http:// connection, so the
    # jar-based session cookie would silently vanish on the next request.
    # Pull the raw Set-Cookie values and resend them explicitly instead.
    session_cookie = r.cookies.get("an_session")
    csrf = r.cookies.get("an_csrf")
    assert session_cookie, "Missing an_session cookie after login"
    assert csrf, "Missing an_csrf cookie after login"
    s.cookies.clear()
    s.headers.update({"Cookie": f"an_session={session_cookie}; an_csrf={csrf}", "X-CSRF-Token": csrf})
    return s


def test_profile_city_update_returns_200():
    s = _login_session()
    unique_city = "tscheck-city-persist-001"
    r = s.put(f"{API}/me/profile", json={"display_name": "tscheck-profile-persist", "city": unique_city})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["display_name"] == "tscheck-profile-persist"


def test_profile_city_is_returned_and_persists():
    """city must be echoed by both the PUT response and the following
    GET /auth/me, so the UI can re-populate the field after a reload."""
    s = _login_session()
    unique_city = "tscheck-city-persist-002"
    put_resp = s.put(f"{API}/me/profile", json={"city": unique_city})
    assert put_resp.status_code == 200, put_resp.text
    put_user = put_resp.json()["user"]

    me_resp = s.get(f"{API}/auth/me")
    assert me_resp.status_code == 200, me_resp.text
    me_user = me_resp.json()["user"]

    # FIXED: `city` is written to the DB and now returned by public_user()
    # in both the PUT response and the subsequent GET /auth/me response.
    assert put_user.get("city") == unique_city, (
        f"Expected city={unique_city!r} in PUT response; got {put_user}"
    )
    assert me_user.get("city") == unique_city, (
        f"Expected city={unique_city!r} in GET /auth/me response; got {me_user}"
    )
    # Ensure other core fields are still present/well-formed (no schema regression)
    for key in ("id", "email", "display_name", "role", "email_verified", "language", "account_status"):
        assert key in me_user, f"Missing expected key {key!r} in user object: {me_user}"
