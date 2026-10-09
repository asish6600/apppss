# AaharNest — PRD

## Original Problem Statement
Improve AaharNest messaging and UX without redesigning the website. Preserve the existing forest-green/cream palette, typography, layouts, cards, navigation and responsive behaviour. Make targeted content/UX changes to clarify the brand's purpose, product information and recipe-to-product navigation. Never fabricate certifications, suppliers, origins or health claims.

## User personas
- First-time visitor who wants to understand quickly what AaharNest offers.
- Diaspora/home cook looking for authentic Indian pantry staples with trustworthy labels.
- Buyer researching a specific product (pack size, origin, certification, storage).

## Core requirements (static)
- Preserve the existing design system (colours, type, cards, nav, spacing, animations).
- Clear hero headline "Know your food. Choose with confidence." explaining AaharNest's purpose.
- About/sourcing content covering mission, product selection and verified sourcing practices.
- Product detail pages that surface pack size, SKU, shelf life, country/belt of origin, manufacturer, FSSAI, certification and suggested use.
- Recipe pages linked to real catalogue products via explicit `recipe_slugs` or keyword fallback — never fabricated.
- Organic / certification claims shown only when the data is actually recorded.
- Preserve all backend contracts, Mongo schema, SMTP+JWT auth, cart, checkout, orders, refunds and admin flows.

## What's been implemented — 2026-02 iteration
- Home.jsx: `brand` hero slide copy + SEO rewritten to the new headline/description.
- Pages.jsx About(): expanded to brand mission, product selection, verified sourcing, recipes-to-use blocks (same card layout and typography).
- Product.jsx: added **Details** tab (data-testid `pdp-tab-details` / `pdp-details-content`) showing pack size, net quantity, SKU, shelf life, country of origin, sourcing belt, marketed/packed by, FSSAI, certification and suggested use. Fields with missing values are hidden. Shows transparency message when `organic_status=false`. Empty-state fallbacks added for ingredients/nutrition.
- Product.jsx: dropped the hard-coded "For now we source only from organic farms in Odisha" sentence from every product's origin tab; now shows the product's actual `origin` + optional sourcing belt only.
- Recipes.jsx: improved empty state and "Shop ingredients" subcopy.
- routes.py `/api/products/{slug}`: keyword fallback for `related_recipes` when the explicit `recipe_slugs` do not resolve against the DB (uses product name tokens against recipe `ingredients`).
- routes.py `/api/recipes/{slug}`: keyword fallback for `products` when no product explicitly links the recipe (uses recipe ingredient tokens against product name/keywords).
- Backend `.env` ADMIN_EMAIL / ADMIN_PASSWORD confirmed present so the seed admin user is created on startup.
- Preview URL in `/app/memory/test_credentials.md` updated to current preview URL.

## Backlog
- P1: Seed EXTRA_RECIPES from catalog.py (ragi-dosa, millet-khichdi, foxtail-millet-upma…) so product→recipe links resolve exactly as authored, instead of relying only on keyword fallback.
- P1: Replace FSSAI/manufacturer placeholders with real supplier details once licence documents arrive.
- P2: Add explicit curated recipe→product mappings in a static table (today it is keyword matching + per-product `recipe_slugs`).
- P2: `pdp.details` localised string in all i18n locales (current code falls back to English "Details").
- P2: Capture real farmer stories to replace the "Illustrative" cards on /farmers.

## Verification
- Backend tests: 7/7 pass (product-detail fields, origin cleanup, product→recipe fallback, recipe→product fallback, auth-gated recipes, serviceability PIN, guest cart with CSRF).
- Frontend tests: hero brand slide, About page content, PDP Details tab (all 10 fields + transparency message), mobile 390px PDP, cart/serviceability — all verified.

## 2026-02 iteration B — Odia recipe coverage
- Added 15 authentic Odia recipes to backend/odia_recipes.py: mandia-manda, mandia-ambili, chatua-pana, til-nadia-ladoo, mudhi-mishrana, kadali-manja-bara, podo-pitha, kodo-khechedi, palli-chatani, chenchudi, tulasi-chaha, nadia-ladoo, moringa-rasa, amla-chatani, ashwa-pana.
- Each recipe is a real Odia dish (Raja/Pana Sankranti/Lakshmi Puja festival pithas, tribal Koraput ambili, Puri temple khechedi style, Cuttack mudhi mishrana) with ingredients, step-by-step method, nutrition, notes and festival/healthy tags.
- Every one of the 79 published products in catalog.py now has `recipes=[...]` referencing real Odia slugs. Combos too.
- SEED_VERSION bumped to 10 to force product reseed.
- Backend `/api/recipes/{slug}` product cap raised from 6 → 10 so richer recipes (kodo-khechedi links 6 millets + dal + spices + nuts) can show their full product set.
- organic-amla-powder now linked to 3 recipes (amla-chatani + chatua-pana + tomato-khata) — amla is traditionally used in all three.

### Verified
- 47/47 backend tests pass (/app/backend/tests/test_product_recipe_links.py + previous).
- /api/products/{slug} related_recipes non-empty for every one of 79 products.
- Every new recipe has 5+ ingredients, 4+ steps, nutrition, and a populated products list.
- Frontend PDPs show real Odia recipe cards for moong-dal, mustard-oil, amla-powder, urad-dal etc.
