"""Growth: runtime-configured Google integrations (GA4 / AdSense / Search Console),
SEO files (sitemap.xml, robots.txt, ads.txt) and a first-party traffic log.

No identifier is ever hardcoded or baked into the frontend build: the owner saves them
in Admin Studio, they live in Mongo, and the frontend reads them at runtime.
"""
import os
import re
from datetime import datetime, timedelta, timezone
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict, field_validator

from db import db
from security import get_admin_user, verify_csrf

router = APIRouter(prefix="/api")

SETTINGS_KEY = "site_integrations"
LANGS = ["en", "hi", "or", "bn", "gu", "ta", "te"]

FIELDS = (
    "ga4_measurement_id",
    "adsense_publisher_id",
    "search_console_verification",
    "gtm_container_id",
    "bing_verification",
)


class IntegrationsIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ga4_measurement_id: str | None = None
    adsense_publisher_id: str | None = None
    search_console_verification: str | None = None
    gtm_container_id: str | None = None
    bing_verification: str | None = None

    @field_validator("ga4_measurement_id")
    @classmethod
    def _ga4(cls, v):
        v = (v or "").strip()
        if v and not re.fullmatch(r"G-[A-Z0-9]{4,20}", v, re.I):
            raise ValueError("GA4 Measurement ID looks like G-XXXXXXXXXX")
        return v or None

    @field_validator("adsense_publisher_id")
    @classmethod
    def _ads(cls, v):
        v = (v or "").strip()
        if v and not re.fullmatch(r"ca-pub-\d{10,20}", v, re.I):
            raise ValueError("AdSense publisher ID looks like ca-pub-0000000000000000")
        return v or None

    @field_validator("gtm_container_id")
    @classmethod
    def _gtm(cls, v):
        v = (v or "").strip()
        if v and not re.fullmatch(r"GTM-[A-Z0-9]{4,12}", v, re.I):
            raise ValueError("GTM container ID looks like GTM-XXXXXX")
        return v or None

    @field_validator("search_console_verification", "bing_verification")
    @classmethod
    def _token(cls, v):
        v = (v or "").strip()
        if not v:
            return None
        # Owners often paste the whole <meta> tag — keep only the content value.
        m = re.search(r'content=["\']([^"\']+)["\']', v)
        if m:
            v = m.group(1).strip()
        if len(v) > 256 or not re.fullmatch(r"[A-Za-z0-9_\-=.]+", v):
            raise ValueError("Paste only the verification code, not the full tag")
        return v


class IntegrationsOut(IntegrationsIn):
    updated_at: str | None = None


async def _load() -> dict:
    return await db.app_config.find_one({"key": SETTINGS_KEY}, {"_id": 0}) or {}


def _public(row: dict) -> dict:
    return {**{f: row.get(f) or None for f in FIELDS}, "updated_at": row.get("updated_at")}


@router.get("/site-integrations")
async def public_integrations():
    """Read by every visitor's browser so the tags can be injected at runtime.
    Only tag identifiers live here — these are public by design (they ship in the page)."""
    return _public(await _load())


@router.put("/admin/site-integrations", dependencies=[Depends(get_admin_user)])
async def save_integrations(body: IntegrationsIn, request: Request):
    verify_csrf(request)
    doc = {f: getattr(body, f) for f in FIELDS}
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.app_config.update_one({"key": SETTINGS_KEY}, {"$set": {"key": SETTINGS_KEY, **doc}}, upsert=True)
    return _public(await _load())


# ---------------- FIRST-PARTY TRAFFIC LOG ----------------
class PageViewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    path: str
    referrer: str | None = None
    lang: str | None = None


def _device(ua: str) -> str:
    ua = (ua or "").lower()
    if "ipad" in ua or "tablet" in ua:
        return "tablet"
    if "mobi" in ua or "android" in ua or "iphone" in ua:
        return "mobile"
    if not ua:
        return "unknown"
    return "desktop"


def _referrer_host(ref: str | None) -> str:
    if not ref:
        return "direct"
    m = re.match(r"https?://([^/:]+)", ref.strip())
    if not m:
        return "direct"
    host = m.group(1).lower().removeprefix("www.")
    return host or "direct"


@router.post("/track/pageview", status_code=204)
async def track_pageview(body: PageViewIn, request: Request):
    """First-party counter so the owner sees traffic in Admin Studio without any
    Google credentials. Fire-and-forget: never blocks or fails the page."""
    path = (body.path or "/")[:300]
    now = datetime.now(timezone.utc)
    await db.page_views.insert_one({
        "path": path,
        "lang": (body.lang or "")[:5] or None,
        "referrer": _referrer_host(body.referrer),
        "device": _device(request.headers.get("user-agent", "")),
        "day": now.date().isoformat(),
        "created_at": now,
    })
    return Response(status_code=204)


@router.get("/admin/traffic", dependencies=[Depends(get_admin_user)])
async def traffic_summary(days: int = 30):
    days = max(1, min(days, 90))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    match = {"$match": {"created_at": {"$gte": since}}}

    async def top(field, limit=10):
        rows = await db.page_views.aggregate([
            match, {"$group": {"_id": f"${field}", "views": {"$sum": 1}}},
            {"$sort": {"views": -1}}, {"$limit": limit},
        ]).to_list(limit)
        return [{"name": r["_id"] or "unknown", "views": r["views"]} for r in rows]

    by_day = await db.page_views.aggregate([
        match, {"$group": {"_id": "$day", "views": {"$sum": 1}}}, {"$sort": {"_id": 1}},
    ]).to_list(100)

    total = await db.page_views.count_documents({"created_at": {"$gte": since}})
    today = await db.page_views.count_documents({"day": datetime.now(timezone.utc).date().isoformat()})
    return {
        "days": days,
        "total_views": total,
        "today_views": today,
        "by_day": [{"day": r["_id"], "views": r["views"]} for r in by_day],
        "top_pages": await top("path"),
        "referrers": await top("referrer"),
        "devices": await top("device", 5),
        "languages": await top("lang", 8),
    }


# ---------------- SEO FILES ----------------
def _site_url(request: Request) -> str:
    env = (os.environ.get("APP_URL") or "").strip().rstrip("/")
    if env:
        return env
    return str(request.base_url).rstrip("/")


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt(request: Request):
    base = _site_url(request)
    body = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /*/admin\n"
        "Disallow: /*/account\n"
        "Disallow: /*/checkout\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )
    return PlainTextResponse(body, media_type="text/plain")


@router.get("/ads.txt", response_class=PlainTextResponse)
async def ads_txt():
    row = await _load()
    ca = (row.get("adsense_publisher_id") or "").strip()
    if not ca:
        return PlainTextResponse("", media_type="text/plain")
    pub = ca[3:] if ca.lower().startswith("ca-") else ca  # ads.txt uses pub-..., not ca-pub-...
    return PlainTextResponse(f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n", media_type="text/plain")


@router.get("/sitemap.xml")
async def sitemap_xml(request: Request):
    base = _site_url(request)
    static_paths = ["", "/shop", "/categories", "/daily-deals", "/top-picks", "/fresh-arrivals",
                    "/combo-packs", "/recipes", "/articles", "/farmers", "/why-aaharnest",
                    "/made-in-india", "/about", "/community", "/support", "/nutrition",
                    "/privacy", "/terms", "/shipping", "/returns"]

    entries: list[tuple[str, str | None, str]] = []
    for p in static_paths:
        entries.append((p, None, "0.8" if p else "1.0"))
    for c in await db.categories.find({"status": "PUBLISHED"}, {"_id": 0, "slug": 1}).to_list(200):
        entries.append((f"/categories/{c['slug']}", None, "0.7"))
    for p in await db.products.find({"status": "PUBLISHED"}, {"_id": 0, "slug": 1, "updated_at": 1}).to_list(2000):
        entries.append((f"/product/{p['slug']}", (p.get("updated_at") or "")[:10] or None, "0.9"))
    for a in await db.articles.find({"status": "PUBLISHED"}, {"_id": 0, "slug": 1}).to_list(500):
        entries.append((f"/articles/{a['slug']}", None, "0.5"))
    for r in await db.recipes.find({"status": "PUBLISHED"}, {"_id": 0, "slug": 1}).to_list(500):
        entries.append((f"/recipes/{r['slug']}", None, "0.5"))

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for path, lastmod, priority in entries:
        for lang in LANGS:
            loc = escape(f"{base}/{lang}{path}")
            out.append(f"<url><loc>{loc}</loc>")
            if lastmod:
                out.append(f"<lastmod>{escape(lastmod)}</lastmod>")
            for alt in LANGS:
                out.append(f'<xhtml:link rel="alternate" hreflang="{alt}" href="{escape(f"{base}/{alt}{path}")}"/>')
            out.append(f"<priority>{priority}</priority></url>")
    out.append("</urlset>")
    return Response("".join(out), media_type="application/xml")
