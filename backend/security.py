"""Security helpers: Argon2id passwords, hashed OTP, opaque sessions, CSRF, rate limiting."""
import os
import hashlib
import secrets
import time
from datetime import datetime, timezone, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from fastapi import Request, HTTPException, Depends

from db import db

_ph = PasswordHasher()

SESSION_COOKIE = "an_session"
CSRF_COOKIE = "an_csrf"
GUEST_COOKIE = "an_cart"
SESSION_DAYS = 14


# ---------- passwords ----------
def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(hashed: str, password: str) -> bool:
    try:
        return _ph.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


# ---------- otp ----------
def generate_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def hash_otp(code: str) -> str:
    return _ph.hash(code)


def verify_otp(hashed: str, code: str) -> bool:
    try:
        return _ph.verify(hashed, code)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


# ---------- sessions ----------
def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    await db.sessions.insert_one({
        "token_hash": _hash_token(token),
        "user_id": user_id,
        "created_at": now.isoformat(),
        "expires_at": now + timedelta(days=SESSION_DAYS),
    })
    return token


async def revoke_session(token: str):
    await db.sessions.delete_one({"token_hash": _hash_token(token)})


async def revoke_all_sessions(user_id: str):
    await db.sessions.delete_many({"user_id": user_id})


def set_auth_cookies(response, token: str):
    csrf = secrets.token_urlsafe(24)
    common = dict(secure=True, samesite="none", path="/", max_age=SESSION_DAYS * 86400)
    response.set_cookie(SESSION_COOKIE, token, httponly=True, **common)
    response.set_cookie(CSRF_COOKIE, csrf, httponly=False, **common)


def clear_auth_cookies(response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")


def ensure_csrf_cookie(request, response):
    """Issue a CSRF token to anyone (incl. guests) who doesn't have one yet,
    so the double-submit check can pass for guest cart mutations. Lives as long
    as the guest cart cookie — a shorter life left returning guests holding a
    cart they could no longer add to."""
    if not request.cookies.get(CSRF_COOKIE):
        csrf = secrets.token_urlsafe(24)
        response.set_cookie(CSRF_COOKIE, csrf, httponly=False, secure=True,
                            samesite="none", path="/", max_age=60 * 86400)


async def _user_from_request(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    sess = await db.sessions.find_one({"token_hash": _hash_token(token)}, {"_id": 0})
    if not sess:
        return None
    user = await db.users.find_one({"id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
    return user


async def get_current_user(request: Request):
    user = await _user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    if user.get("account_status") == "DELETION_PENDING":
        # allow access so they can cancel, flag it
        user["_deletion_pending"] = True
    return user


async def get_admin_user(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


async def get_optional_user(request: Request):
    return await _user_from_request(request)


def verify_csrf(request: Request):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    header = request.headers.get("X-CSRF-Token")
    cookie = request.cookies.get(CSRF_COOKIE)
    if not header or not cookie or header != cookie:
        raise HTTPException(status_code=403, detail="Invalid request token. Please refresh and try again.")


# ---------- rate limiting (in-memory sliding window) ----------
_buckets: dict[str, list[float]] = {}


def rate_limit(key: str, max_calls: int, window_seconds: int):
    now = time.time()
    arr = [t for t in _buckets.get(key, []) if now - t < window_seconds]
    if len(arr) >= max_calls:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a little and try again.")
    arr.append(now)
    _buckets[key] = arr


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
