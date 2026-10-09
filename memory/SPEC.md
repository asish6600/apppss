# AaharNest — living spec

Indian organic grocery storefront (restored from AaharNest-project.zip, Oct 2026).

## Stack (NOT the farm-ts template — the uploaded app replaced it)
- `backend/` FastAPI + motor, `APIRouter(prefix="/api")` in `routes.py`, plus
  `admin_routes.py` and `reviews.py`. Entry `server.py`; seeds catalogue on startup.
- `frontend/` CRA + craco (JS, not TS), Tailwind, radix/shadcn, axios via
  `src/lib/api.js`, routes language-prefixed (`/en/shop`, `/en/cart`).
- Mongo DB name `test_database`. Supervisor programs unchanged (`yarn dev` → craco).

## Auth / sessions
- Opaque session cookie `an_session` (httpOnly) + non-httpOnly CSRF cookie `an_csrf`,
  double-submitted as the `X-CSRF-Token` header. Guest carts keyed by `an_cart` cookie.
- `GET /api/auth/me` returns 401 for guests — expected, not a bug.

## Cart flow
- `GET /api/cart` (prices server-side), `POST /api/cart/items`, `PUT/DELETE /api/cart/items/{slug}`.
- All mutations run `verify_csrf`, so a request without a valid `an_csrf` cookie is 403.

## Fixed bug: "not able to add to cart" (Oct 2026)
Root cause: add-to-cart hard-failed with **403 "Invalid request token"** whenever the
`an_csrf` cookie was absent at click time. Two real paths to that state — clicking Add
before the initial `GET /api/cart` had issued the cookie, and returning guests whose
csrf cookie (14-day max-age) had expired while the guest cart cookie (60 days) survived.
Fix:
1. `GET /api/csrf` — a cheap bootstrap endpoint that issues the cookie.
2. `src/lib/api.js` — request interceptor awaits a token (bootstrapping via `/api/csrf`,
   in-flight deduped) before any POST/PUT/PATCH/DELETE; response interceptor re-fetches
   the token and replays the request once on a 403.
3. `security.ensure_csrf_cookie` — guest csrf cookie lifetime raised to 60 days to match
   the guest cart cookie.
CSRF protection is unchanged: a mutation with no/mismatched token is still 403.

## Odisha-only sourcing + card/PDP layout changes (Oct 2026)
- Sourcing is Odisha-only for now. `catalog.py`: every `region=` is `"Odisha"`, product
  `origin` reads "Sourced from organic farms in Odisha and packed in India."; farmer-story
  regions in `seed.py` are "Odisha". `SEED_VERSION` bumped to `8` (wipes + reseeds products).
- Product cards no longer print any place name — brand line only ("AaharNest Farm Direct").
  The PDP Origin tab states Odisha sourcing.
- Checkout's delivery-state dropdown still lists all Indian states (sourcing is restricted,
  delivery is not).
- Footer carries a `100% Pure & Genuine` badge (`PureGenuineBadge` in `components/Marks.jsx`,
  `data-testid="pure-genuine-badge"`) beside Made in India.
- Card actions: Add to Cart + Buy stack vertically below `sm` and sit side by side from `sm`
  up, fixed `h-10`, so Add to Cart is never squeezed out of the 2-up mobile grid.
- PDP actions: qty + Add to Cart + Buy Now + wishlist share one `h-12` row on `lg+` and are
  hidden below `lg`. On mobile the pinned bottom bar (`mobile-sticky-bar`) is the only action
  set — always visible (no scroll gating), carries its own qty stepper
  (`sticky-qty-inc/dec/value`), and the page body has `pb-40` so nothing hides behind it.
- Known deviation: culinary/varietal references that are part of a product name or recipe
  style (e.g. "Organic Darjeeling Tea", "Punjabi chole masala", "Kerala cooking") are kept —
  they describe the dish or tea variety, not the sourcing region.

## Odisha sourcing story on the farmers page + header alignment (Oct 2026)
- `/en/farmers` (`Farmers` in `pages/Pages.jsx`) is now an Odisha sourcing story: hero with an
  `odisha-sourcing-pill`, a six-district belt strip (`odisha-belt-koraput`, `-kandhamal`,
  `-rayagada`, `-kalahandi`, `-mayurbhanj`, `-sundargarh`), three crop-by-region cards
  (`odisha-crop-millets|turmeric|pulses`) each linking to a real category page, and a four-step
  `odisha-journey` (`journey-step-1..4`).
- Farmer stories in `seed.py` are Odisha-specific (Koraput / Kandhamal / Kalahandi, with a new
  `district` field) and still carry `demo: True` + the "Illustrative" label — per the app's own
  policy, no real person or testimonial is fabricated.
- Three generated Odisha field images are referenced by URL from `ODISHA_IMAGES` in `Pages.jsx`
  and from the farmer-story seed records.
- Header: the loose home pill beside the logo is gone; Home is the first item of the desktop
  primary nav row (still `data-testid="home-icon"`). All right-side controls are `h-10` with
  `whitespace-nowrap`, so "Login / Sign Up" no longer wraps to two lines and the pills share one
  baseline. The desktop nav shows the short label "About" while the page title and the mobile
  drawer keep "About AaharNest".

## Home page "Grown in Odisha" band (Oct 2026)
- `pages/Home.jsx` renders `home-odisha-band` directly below the trust/USP strip: a clickable
  band (whole band is a `LangLink` to `/farmers`) with the Koraput field image, the six district
  pills and a "Meet the farms behind your food" CTA. Image URL lives in `ODISHA_BAND_IMAGE`,
  shared with the farmers page story. Static content — nothing is gated on a fetch.

## Language fix + Google growth stack (Oct 2026)
- BUG FIX: switching language changed the URL but almost nothing translated, because nearly all
  copy was hard-coded English literals. `lib/i18n.js` now carries the full static UI dictionary
  for all 7 locales (en/hi/or/bn/gu/ta/te) plus `cat.<slug>` category names, and exposes
  `t(key)` and `catName(slug, fallback)`. Header, Footer, cards, Home, Shop/Categories/Category
  and the filter panel read every label from it. Product names/descriptions stay English by
  design (catalogue data). A missed `t` in `FiltersPanel` crashed /<lang>/shop — fixed.
- `backend/growth.py` (mounted in server.py): GET /api/site-integrations (public tag IDs),
  PUT /api/admin/site-integrations (admin + CSRF), POST /api/track/pageview (first-party
  counter), GET /api/admin/traffic (admin dashboard data), and GET /api/robots.txt,
  /api/ads.txt, /api/sitemap.xml (1386 URLs, hreflang for all 7 langs, built from the catalogue).
- `components/SiteIntegrations.jsx` fetches the IDs at runtime and injects gtag.js / GTM /
  adsbygoogle plus the google-site-verification and msvalidate.01 meta tags; sends one GA4
  page_view per route change and one first-party beacon. Nothing is hardcoded or in the build;
  with empty IDs no script loads and nothing errors. `AdSlot` renders null without a publisher ID.
- Admin Studio → "Growth & SEO" tab (`pages/AdminGrowth.jsx`, `data-testid="admin-growth"`):
  ID fields with Live/Not set badges, links to the SEO files, and the traffic dashboard
  (views today / range, per-day bars, top pages, referrers, devices, languages).
- Hosting note: on another host, rewrite /sitemap.xml, /robots.txt and /ads.txt to the /api
  equivalents and set APP_URL to the real domain.

## Ticket replies + multilingual chat (Oct 2026)

### Admin ticket replies
- `POST /api/admin/tickets/{number}/reply` (admin + CSRF), body `{message, status}`.
  Emails the customer, then appends to `support_tickets.replies[]` and sets the status in
  one action (`IN_PROGRESS` is the UI default). **Email first, persist second** — a send
  failure leaves no phantom reply on the ticket.
- `emailer.ticket_reply_email_html(ticket, message)` — the admin's text is escaped and
  blank-line-split into `<p>` server-side; the admin never supplies markup. Reply-To is
  already `EMAIL_REPLY_TO` (the support desk) via `send_email`, so the customer's answer
  reaches the team inbox, not the bot.
- A rejected send returns **400 with a readable detail**, not 502 — the ingress replaces a
  502 body with its own HTML error page, so the admin would never have seen the reason.
  Two real causes: an undeliverable mailbox (e.g. `@example.com` test data) and the
  `emailer` guardrail (`G2` blocks "reply with your password", shorteners, etc.).
- `AdminTickets.jsx` — reply composer (textarea + status select + send), outbound replies
  rendered in the ticket timeline beside the chat transcript, plus `N replies sent` and
  language badges on the card header. The old status-only row is kept, relabelled
  "Status only (no email)".

### Multilingual chat (all 7 locales)
- `backend/support_i18n.py` — `LANGS`, `LANG_NAMES`, `LANG_SCRIPTS`, and every string the
  bot says *without* the model, in all 7 languages: `GREETING_NEW`, `GREETING_WITH_ORDER`,
  `FALLBACK` (10 intents × 7), `TICKET_RAISED`, `CATEGORY`, `SUGGESTIONS`, `STATUS_WORD`.
  `norm()` coerces an unknown code to `en` (an invalid `lang` must never 500).
- `build_system_prompt(customer, order_context, lang)` now opens with a
  LANGUAGE-OVERRIDES-EVERYTHING block naming the target script, so the model answers in
  Odia/Tamil/etc. even when the customer types English, and never transliterates to Latin.
  `intent` and `summary` stay **English** for the internal team; order/ticket numbers,
  emails and "AaharNest" are left untouched.
- `chat_sessions.lang` and `support_tickets.lang` persist the choice; the ticket card shows
  the language badge so the team knows which language to reply in.
- `POST /support/chat/start` takes `lang`; `POST /support/chat/{id}/message` takes an
  optional `lang` that overrides it, which is how mid-conversation switching works.
- `SupportChat.jsx` — chat language starts from the site locale and is **decoupled** from
  it: a `langPinned` flag stops the site locale from clobbering a choice the customer made
  in the chat's own globe switcher. 27 new keys (`chat.*`, `footer.*`, `nav.faq`) added to
  all 6 non-English dicts in `i18n.js`.

### Verified
curl: Odia + Tamil replies land in the correct script (334 / 335 native chars), invalid
`lang` → `en`, reply emails + status change + timeline, and negatives (400 bad status, 404
unknown ticket, 401 unauthenticated, 400 guardrail). Browser: Odia site auto-selects Odia,
full chat UI + suggestion chips in Odia, switching to Tamil mid-chat works, admin reply
sends and renders in the timeline, 0 console errors.

### Fixed during this build
`AdminTickets.jsx` used `<Globe>` without importing it — the tab crashed with "Globe is
not defined". Caught by the browser pass, not by any lint (there is no eslint config).

## AI support chatbot + automated ticketing + FAQ/legal build (Oct 2026)

Preview URL is now `https://ai-support-hub-98.preview.emergentagent.com` (both
`backend/.env` APP_URL and `frontend/.env` REACT_APP_BACKEND_URL updated). The project was
re-restored from `AaharNest-project(2).zip` into a bare farm-ts skeleton, so **both**
`frontend/node_modules` (yarn) and the backend venv deps (`pip install -r requirements.txt`)
had to be reinstalled.

### Backend
- `backend/support_kb.py` — the bot's grounded knowledge: `INTENTS` (10), `TICKET_INTENTS`
  = {REFUND, TRANSACTION, PRODUCT_FAULT}, `INTENT_LABELS`, `ORDER_STATUS_COPY`, the policy
  `KB` text, 12 `FAQS`, and `build_system_prompt(customer, order_context)`.
- `backend/support_bot.py` (mounted in server.py) — all on the `/api` router:
  - `POST /api/support/chat/start` — **gate**: name + email + 10-digit Indian mobile are
    required before any chat exists. Creates `chat_sessions`, greets with the customer's real
    latest order status when their email matches an account.
  - `POST /api/support/chat/{chat_id}/message` — one grounded non-streaming Claude call
    (`claude-sonnet-5-5` via `emergentintegrations` + `EMERGENT_LLM_KEY`) returning JSON
    `{intent, reply, summary}`. Non-streaming on purpose: the reply drives a server-side side
    effect (raising + emailing a ticket), so the whole object must be in hand first.
  - `GET /api/support/chat/{chat_id}` — transcript, used to resume from localStorage.
  - `GET /api/support/tickets/{number}?chat_id=` — status lookup authorised by the chat email.
  - `GET /api/admin/tickets`, `PUT /api/admin/tickets/{number}/status` (admin + CSRF).
- **Ticketing is a server-side business rule, not a model decision.** `_fallback_intent()`
  keyword-classifies every message; if that says REFUND / TRANSACTION / PRODUCT_FAULT a
  ticket is raised even when the model classified the turn as something softer. Ticket
  numbers are `ANT<yymmdd><seq4>`.
- Tickets email the desk (`SUPPORT_TICKET_EMAIL=customercare@aaharnest.com`) plus an
  acknowledgement to the customer, via two new server-side templates in `emailer.py`
  (`ticket_admin_email_html`, `ticket_ack_email_html`). An email failure is logged and does
  NOT break the chat — the ticket is already persisted and visible in Admin Studio
  (`emailed_admin` flag shows which way it went).
- **Graceful degradation**: with no `EMERGENT_LLM_KEY` or on any LLM error the bot falls back
  to `_FALLBACK_REPLY[intent]` and still raises the ticket. The chat never hard-fails.
- Real order data: `_order_context(email)` resolves the account by email (orders are keyed by
  `user_id`), returns the last 5 orders, and an explicit "no account / no orders" marker
  otherwise. The system prompt forbids inventing an order, date, amount or courier.
- New indexes in `db.py`: `chat_sessions.id`, `chat_sessions.customer.email`,
  `chat_messages.(chat_id, at)`, `support_tickets.ticket_number` (unique),
  `support_tickets.(status, created_at)`, `support_tickets.email`.
- New `.env` keys: `EMERGENT_LLM_KEY`, `EMERGENT_EMAIL_KEY`, `EMAIL_FROM_NAME`,
  `EMAIL_REPLY_TO`, `SUPPORT_TICKET_EMAIL`, `GRIEVANCE_EMAIL`, `SUPPORT_BOT_MODEL`.
  `EMERGENT_EMAIL_KEY` was previously missing, so `emailer.py` could not have sent anything.

### Frontend
- `components/SupportChat.jsx` — floating launcher + panel, mounted once in `Layout.jsx` so
  it is on every page. Gate form → thread with typing indicator, suggestion chips, inline
  ticket badge, 2000-char cap, Enter-to-send. Resumes via `localStorage` key
  `an_support_chat_id`, and a failed resume silently clears it (never blocks the widget).
- `constants/legal.js` — the **static** customer-facing twin of the backend KB: 6 `FAQ_GROUPS`
  (41 Q&As), `POLICIES` for returns/cancellation/shipping/privacy/terms/disclaimer, and
  `GRIEVANCE` (4-step ladder, officer block, checklist). Static on purpose — a paused
  preview serves the frontend alone, so no policy page may be gated on a fetch.
- `pages/Faq.jsx` (`/<lang>/faq`) — search + category filter + accordion + FAQPage JSON-LD.
- `pages/Grievance.jsx` (`/<lang>/grievance`) — escalation ladder with published SLAs,
  Grievance Officer card, "please include" checklist. **Officer name, phone and postal
  address are deliberate TODO placeholders** — the user has not supplied real ones.
- `pages/Pages.jsx` — `Legal()` rewritten to render the full `POLICIES` map by slug
  (`privacy`, `terms`, `shipping`, `returns`/`refund-policy`, `cancellation`, `disclaimer`)
  with a related-links row; the `Support` page gained a "ask Nesti" callout + policy links.
- `pages/AdminTickets.jsx` — Admin Studio → **Support Tickets** tab: status filters with
  counts, per-ticket customer/order details, collapsible chat transcript, email-sent badge,
  status update + internal note.
- `Footer.jsx` — now 6 columns; the Help column links Support/FAQ/Shipping/Returns/
  Cancellation and a new Legal column links Privacy/Terms/Disclaimer/Grievance. **Bug fixed**:
  the old Help column used `t("common.remove")` and `t("account.security")` as the labels for
  /returns and /terms, so the footer read "Remove" and "Security".
- `lib/i18n.js` — added `nav.faq`, 9 `footer.*` and 16 `chat.*` keys to the `en` dict. `t()`
  falls back to `en`, so the other 6 locales inherit English for the new strings rather than
  rendering raw keys.

### Known deviations
- **Ticket email delivery**: the integration proxy rejects `@aaharnest.com` recipients with
  `422 undeliverable_recipient` (that domain has no live mailbox yet), so `_create_ticket`
  tries `SUPPORT_TICKET_EMAIL` first and falls back to `SUPPORT_TICKET_FALLBACK_EMAIL`
  (`asishs@2pirad.com`, verified deliverable). `customercare@aaharnest.com` is still the
  address published on every customer-facing page, and the Admin Studio banner states where
  tickets are actually being delivered. Remove the fallback once the real mailbox is live.
- The chat reply is non-streaming (see above) — the user sees a typing indicator, not tokens.
- Grievance Officer name / phone / postal address are placeholders pending real details.
- New chat + legal copy is English-only across all 7 locales (inherited via the `en` fallback).
- The `EMERGENT_LLM_KEY` budget was initially 0 (every call fell back to the keyword replies);
  it was topped up mid-build and Claude replies are now live.


## PDF invoices + Inventory/SKU admin + Odisha-forward home redesign (Oct 2026)

Preview URL is now `https://aahar-studio.preview.emergentagent.com` (both `backend/.env`
APP_URL and `frontend/.env` REACT_APP_BACKEND_URL updated). Project was re-restored from
`AaharNest-project(1).zip` into a bare farm-ts skeleton, so `frontend/node_modules` (yarn)
and the backend venv deps had to be reinstalled. **New backend dep: `reportlab==4.2.5`**
(added to requirements.txt).

### PDF invoice on checkout
- `backend/invoice.py` — `build_invoice_pdf(order, customer) -> bytes` and
  `invoice_number(order_number)` (`INV-<order_number>`). Pure reportlab rendering: tricolour
  rule, brand header, invoice/order metadata, bill-to, line items **with SKU**, totals,
  compliance block and notes. No DB and no network in this module.
- Amounts print as `Rs. N` — Helvetica has no Rupee glyph, so `₹` would render as a blank box.
- `INVOICE_LEGAL` (FSSAI / GSTIN / Packed by) deliberately reads **"To be updated"**. The
  design brief asked for a GSTIN; inventing one would break the app's own
  organic-transparency policy, so it stays a placeholder until the business supplies it.
- `_price_cart` now stamps `sku` on every cart line, so order documents (and therefore
  invoices) carry the SKU that was sold.
- `POST /api/orders` fires `asyncio.create_task(_dispatch_invoice(order, user))` — the PDF is
  built and emailed **out of band**, so a slow or refused mail provider can never fail a
  placed order. The task writes an `invoice` block back onto the order:
  `{invoice_no, emailed_customer, emailed_admin[], failed[], attempted_at}`.
- Recipients: the customer, plus every address in `INVOICE_ADMIN_EMAILS`
  (`customercare@aaharnest.com,asishs@2pirad.com` in `.env`).
- `emailer.send_email` gained `attachments=[{filename, content: bytes, content_type}]`
  (base64 in the JSON payload). `_attachment_fault(resp)` decides whether a 4xx was really
  about the attachment; an undeliverable recipient or a billing refusal is NOT retried
  without the PDF, because that would burn a second send on the same failure.
- `emailer.invoice_customer_email_html` / `invoice_admin_email_html` — fixed server-side
  templates, every value escaped, links only to APP_URL (G3/G4).
- Download routes (the PDF is always available even when email is not):
  `GET /api/orders/{order_number}/invoice` (customer, ownership enforced by the `user_id`
  filter) and `GET /api/admin/orders/{order_number}/invoice` (admin).
- Frontend: `lib/api.js` gained `downloadFile(path, filename)` — fetches the blob through
  `api` because the backend is a different origin and the route is cookie-authenticated, so a
  plain `<a href>` would omit credentials and 401. Used by `OrderConfirmation.jsx`
  (`checkout-invoice-download-btn` + the email-status line, which re-reads the order once
  after 4 s to pick up the out-of-band dispatch result), `Account.jsx` → My Orders
  (`order-invoice-<n>`) and Admin Studio → Orders (`admin-invoice-<n>`, plus a per-order
  line showing exactly where the invoice email landed).

### Inventory & SKU admin (Admin Studio → "Inventory & SKU")
- `out_of_stock` is the admin's **manual override**; stock reaching 0 is the **automatic**
  path. Both render as out of stock.
- `catalog_logic.available_stock` returns 0 when `out_of_stock` is set, so the override
  blocks add-to-cart (409) and checkout, not just the badge.
- `catalog_logic.present_product(p, now, admin=False)` adds `out_of_stock`,
  `manual_out_of_stock` and `stock_on_hand`, and **clamps the reported `stock` to 0** for
  storefront payloads — that is why every pre-existing `stock <= 0` check in the UI keeps
  working untouched. `admin=True` keeps the real count for the inventory screen.
- `low_stock(p)` + `DEFAULT_LOW_STOCK_THRESHOLD = 10`; per-product `low_stock_threshold`.
- `GET /api/admin/inventory?q=&filter=all|in|low|out` — one row per variant (extra pack
  sizes included, each its own SKU). `PATCH /api/admin/inventory/{slug}` is partial by
  design (the toggle sends only `out_of_stock`); **SKU uniqueness is enforced with a 409**.
- Shop's `in_stock=1` filter now also excludes `out_of_stock: true`.
- `pages/AdminInventory.jsx` — filter chips with an out-of-stock count, search by name/SKU,
  in-place SKU + stock + threshold editing saved per row (`inv-save-<slug>`), an immediate
  availability `Switch` (`admin-stock-toggle-<slug>`, ON = on sale), a one-click Restock
  shortcut, and status badges. The product modal also gained an out-of-stock checkbox
  (`pf-out-of-stock`) and a low-stock threshold field.

### Festival calendar + Odisha map + home redesign
- `lib/festivals.js` — static Odia + national calendar. Fixed-date festivals use
  `fixed: [month, day, span]`; lunar ones carry explicit per-year windows
  (`years: {2026: ["07-16", 4], …}`) for 2026-2028, so **no date is ever guessed** — a
  festival with no window for the current year simply never activates. Covers Makar
  Sankranti/Pongal, Republic Day, Pana Sankranti (Odia new year), Raja, Rath Yatra, Nuakhai,
  Independence Day, Durga Puja, Diwali, Christmas, New Year. Each carries an English *and*
  an Odia greeting. `activeFestival()` dresses the site from **one day before** the main
  date; `DEFAULT_SEASON` is the off-festival fallback; `upcomingFestival()` powers the
  "coming up" teaser. `useFestivalTheme()` always returns a usable object.
- `components/FestivalBackdrop.jsx` — `FestivalBackdrop` is mounted once in `Layout.jsx`, so
  the seasonal layer reaches every page. It is a `fixed … -z-10 pointer-events-none` wash at
  ~7% image opacity under a `bg-cream/80` scrim plus two blurred colour glows, so it can
  never intercept a click or drop text contrast. `FestivalRibbon` is the slim top-of-home
  greeting bar (English + Odia).
- `components/OdishaMap.jsx` — `OdishaSourcingMap`, an inline hand-built SVG silhouette of
  Odisha (no tile server, no map dependency, nothing fetched) with the six sourcing
  districts as keyboard-focusable pins. Hover/tap/focus updates a spotlight card with the
  belt, crops, a note and a real category link. Deliberately an **illustrative** silhouette,
  not a survey-accurate boundary.
- `lib/categoryIcons.js` — per-category lucide icon + tint keyed on the **catalogue slug**
  (slugs are not translated, so a category keeps its icon in all 7 locales). Used by the
  home category strip and `CategoryCard`.
- `pages/Home.jsx` redesigned: festival ribbon → sticky category strip with icon chips →
  taller editorial hero (festival slide leads when one is active, pause-on-hover, standing
  proof chips) → USP strip → upcoming-festival teaser → **Odisha sourcing map band** (which
  replaced the old flat "Grown in Odisha" band) → categories → deals → top sellers → new
  **"For Odia families, everywhere"** diaspora block → recipes → why → transparency →
  Made in India → farmers → community → articles.
- `tailwind.config.js` gained `pin-pulse`, `ticker` and `sheen` keyframes/animations.
- Product card / PDP / combo card now read `p.out_of_stock || p.stock <= 0`.

### Verified
curl: inventory list + PATCH (SKU, stock, override), storefront clamp to 0, add-to-cart
blocked 409 on an overridden product, duplicate SKU 409, negative stock 400, unknown slug
404, missing CSRF 403, unauth 401. Full order placed end to end with SKUs on the lines;
invoice PDF downloads for customer (200, `application/pdf`, correct Content-Disposition),
for admin, and 404/401 on the negatives. PDF content verified by extraction — all blocks
present, no overlap, no garbled glyphs.

### Known deviations
- **Email delivery is blocked by account state, not by code.** Two separate external causes,
  both visible in `backend.err.log` and on the order's `invoice.failed[]`:
  `customercare@aaharnest.com` is rejected `422 undeliverable_recipient` (that domain still
  has no live mailbox — already documented above for tickets), and the real
  `asishs@2pirad.com` send is refused `402 insufficient_credits` (the Emergent email credit
  balance is 0). The order still completes and the PDF is always downloadable in-app.
  **Nothing in the invoice code needs to change once credits are topped up.**
- **Attachment support on the managed email proxy is unverified.** It could not be exercised
  with 0 credits, so the send carries the PDF as a base64 `attachments[]` entry and falls
  back to a link-only email if the proxy ever rejects the field specifically.
- Invoice FSSAI / GSTIN / packer fields are placeholders (see above).
- New home/map/diaspora/festival copy is English-only across all 7 locales (inherited via
  the existing `en` fallback in `i18n.js`), except the festival greetings which ship an Odia
  line too. Consistent with the catalogue-copy policy already in this spec.
- The Odisha map is an illustrative silhouette, not a cartographically accurate boundary.

### Note on `.emergent/recordings/crash-17915352830*.md`
Two crash digests dated Oct 9 08:41 report `Can't find variable: categoryIcon` in
`CategoryCard`. These are **stale mid-edit HMR artifacts**, already resolved: the
`import { categoryIcon } from "@/lib/categoryIcons"` line landed in a later hot-update than
the `CategoryCard` body that used it. The import is present (`components/cards.jsx:12`) and
subsequent full-page loads render all 16 category icons with zero console errors.

### Home: "Our Farmers" split section removed (Oct 2026, on request)
The `Our Farmers` block (image + `home.farmersTitle` + "Meet Our Farmers" button,
`data-testid="home-farmers-btn"`) was deleted from `pages/Home.jsx`. The home page now runs
Made in India → Community → Articles. `/<lang>/farmers` itself is untouched and still
reachable from the Odisha sourcing map band (`odisha-map-farmers-link`), the header nav and
the footer. This also cleared a latent bug the section exposed: `home.farmersTitle` had no
entry in any `i18n.js` dictionary, so it rendered as the raw key string on screen.
`GreenBtn` and `Eyebrow` imports in Home.jsx are still used by other sections.

## Real Odisha map, +2 districts, honey/ghee dropped, raw-product heroes (Oct 2026)

### Real Odisha map (replaced the hand-drawn silhouette)
- `frontend/src/lib/odishaGeo.js` is a **GENERATED** file — do not hand-edit the path
  strings. Built from open 2011-census district GeoJSON
  (`github.com/udit-001/india-maps-data`, state Odisha, 30 districts) via:
  equirectangular projection with a `cos(latitude)` width correction (so the state is
  not horizontally stretched), then Douglas-Peucker simplification at eps 1.5 px on a
  560 px width, dropping sub-10px slivers. ~20 KB of inline path data, viewBox 560x469.
  Exports `ODISHA_VIEWBOX`, `ODISHA_DISTRICT_PATHS`, `ODISHA_CENTROIDS` (true
  area-weighted centroids of each district's largest ring) and `SOURCING_DISTRICTS`.
- `components/OdishaMap.jsx` now draws all 30 districts: the 22 non-sourcing ones as
  quiet context so the state still reads as Odisha, and the 8 sourcing districts as
  highlighted, **clickable/focusable `<path>` elements** (the shape is the hit target —
  `odisha-shape-<key>`), with a marker + outlined label for the active one only.
  The earlier hand-drawn blob and its percentage-positioned pins are gone.
- **Districts are now 8** (was 6): added **Ganjam** (southern coastal plain; groundnut,
  sesame, coconut, coastal rice — Berhampur named as the trading hub, since Berhampur is
  a city *inside* Ganjam, not a district) and **Kendujhar** (iron-hill plateau; niger
  seed, pulses, upland rice, millets). Heading copy is "Eight districts."
  NOTE: `DISTRICTS[].name` must match the GeoJSON district spelling exactly — that string
  is the key into both the path map and the centroid map.
- Fixed pre-existing dead links: district `to:` slugs had pointed at non-existent
  categories (`organic-spices-masalas`, `organic-dals-pulses`, `organic-honey-sweeteners`,
  `organic-oils-ghee`); they now use the real slugs.
- `pages/Pages.jsx` (farmers page) district list also gained Ganjam + Kendujhar.

### Honey and ghee are no longer sold
Both products and the whole category are **deleted**, not hidden.
- `backend/catalog.py`: removed the `organic-honey` category, all three honey products,
  the `HNY` SKU prefix, the `forest-honey` deal and the honey pack-size variants. The
  `HN` product-type constant was removed **together with its `"Honey"` value** — that
  tuple is positional unpacking, so dropping only one side would have silently shifted
  every later constant (`TE`, `NU`, `FL`, …). Verified post-change: `TE == "Tea"`,
  `WP == "Wellness Powder"`. Tulsi-tea copy no longer suggests adding honey.
- Live DB purge removed 6 docs (3 products + 3 pack-size variants:
  `raw-honey`, `forest-honey`, `multifloral-honey`, `raw-honey-250g`, `raw-honey-1kg`,
  `forest-honey-250g`), the category doc, and cleaned 1 dangling cart line. Catalogue is
  now **112 products / 15 categories**.
- Copy stripped of honey *and* ghee as things we sell: `lib/festivals.js` festive picks
  and blurbs, `lib/categoryIcons.js` (honey entry + the now-unused `Droplet` import),
  `pages/Home.jsx` (diaspora copy + SEO description), `pages/Shop.jsx` SEO,
  `lib/i18n.js` (`cat.organic-honey` removed from all 7 locales, search placeholder).
- Ghee still appears as a **home-kitchen ingredient inside recipe steps** (millet
  khichdi, pongal, etc.). That is deliberate — we are not selling ghee, and rewriting
  authentic recipes to omit it would make them wrong.
- Retired-category URLs: `pages/Shop.jsx` → `Category()` now tracks an `exists` state and
  renders "This category is no longer available." with links to All Categories / Shop.
  Previously an unknown slug rendered a bare "Category" heading plus "No products in this
  category yet", which reads as a bug — and `/categories/organic-honey` is now exactly
  that case for anyone with an old link or a stale search result.
  `components/common.jsx` → `EmptyState` gained an optional `sub` prop for this.

### Hero banner: raw product only, no cooked dishes
- Deleted `hero-spread.webp` (roti / pulao / salad / raita flat-lay) and
  `hero-idli.jpg|.webp` — both were the cooked-dish banners called out, and both carried
  a visible third-party "Grok" watermark.
- New landscape 1600x900 webp hero art in `public/images/`, all raw product:
  `hero-pulses.webp` (dark flat-lay of dals/lentils in bowls — the shared
  `HERO_FALLBACK`, also used behind campaign and festival slides),
  `hero-millets.webp` (millets, wholegrains and stone-milled flour) and
  `hero-oils.webp` (cold-pressed oil bottle with whole spices). The millets and oils
  images were generated to brief with the left third kept as dark negative space for the
  headline; the pulses image is licensed stock. Also downloaded but unused:
  `hero-pantry.webp`, `hero-spices.webp`, `hero-dals.webp`.
  A market-sack photo was rejected — it carried other brands' pack text.
- Hero now has 3 standing slides (brand / millets / spices+oils) instead of 2.

### Verified
Real map renders with 8 selectable district shapes; Ganjam and Kendujhar both click
through to the correct detail card. Hero cycles hero-pulses → hero-millets → hero-oils
with no cooked-dish art. Home and /categories contain no "honey" text; 15 category cards;
no honey category card; `GET /api/categories/organic-honey` → 404 and
`?category=organic-honey` → 0 products. Zero HTTP >= 400 and zero page errors beyond the
expected guest `/api/auth/me` 401s.

### Note: clicking district shapes in tests
`DISTRICTS` are concave real polygons, so a district's **bounding-box centre is not
necessarily inside its own fill** — Sundargarh's bbox centre lands in a notch belonging
to a neighbour. A Playwright `click()` (which aims at the bbox centre) can therefore
silently miss the shape and leave the previous selection in place. This is a test-harness
artifact, not an app bug: verified that clicking a point genuinely inside the fill
(`SVGGeometryElement.isPointInFill`) selects Sundargarh, and the `odisha-district-<key>`
pill always works. **Prefer the pills when automating this component.**
