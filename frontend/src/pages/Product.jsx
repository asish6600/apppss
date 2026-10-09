import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Truck, BadgeCheck, Heart, ChevronRight, Sparkles, Boxes, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api, { inr, apiError } from "@/lib/api";
import { Container, Section, PageLoader, useSEO } from "@/components/common";
import { TrustBadges, RecipeCard, ProductCard, DealClock } from "@/components/cards";
import { LangLink, useLangNavigate } from "@/components/LangLink";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCampaign, offerEnds, Countdown } from "@/components/PromoBanner";
import { ProductReviews } from "@/components/ProductReviews";
import { PackBrandTag } from "@/components/Logo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Product() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [pin, setPin] = useState("");
  const [serv, setServ] = useState(null);
  const [switching, setSwitching] = useState(null);
  const actionsRef = useRef(null);
  const { add } = useCart();
  const { isAuthed } = useAuth();
  const navigate = useLangNavigate();
  const campaign = useCampaign();
  const { t } = useI18n();

  useEffect(() => { setD(null); setQty(1); setImg(0); setServ(null); api.get(`/products/${slug}`).then((r) => setD(r.data)).catch(() => setD(false)); }, [slug]);

  // Pack-size siblings swap in place — no page navigation, cart stays keyed by the chosen size's slug.
  const switchVariant = async (vSlug) => {
    if (!vSlug || vSlug === d?.product?.slug) return;
    setSwitching(vSlug);
    try {
      const { data } = await api.get(`/products/${vSlug}`);
      setD(data); setQty(1); setImg(0);
      window.history.replaceState(null, "", window.location.pathname.replace(/\/product\/[^/?#]+/, `/product/${vSlug}`));
    } catch (e) { toast.error(apiError(e)); } finally { setSwitching(null); }
  };
  useSEO(d && d.product ? {
    title: `${d.product.name} · AaharNest`, description: d.product.description?.slice(0, 160),
    jsonLd: { "@context": "https://schema.org", "@type": "Product", name: d.product.name, image: window.location.origin + d.product.image, description: d.product.description, sku: d.product.sku, brand: { "@type": "Brand", name: "AaharNest" }, offers: { "@type": "Offer", price: d.product.price, priceCurrency: "INR", availability: !d.product.out_of_stock && d.product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } },
  } : {});

  if (d === null) return <PageLoader />;
  if (d === false) return <Section><Container><p>Product not found.</p></Container></Section>;
  const p = d.product;
  const images = p.images?.length ? p.images : [p.image];

  const checkPin = async () => {
    try { const { data } = await api.post("/serviceability", { pin }); setServ(data); }
    catch (e) { setServ({ serviceable: false, message: apiError(e) }); }
  };
  const buyNow = async () => { await add(p.slug, qty, false); navigate(isAuthed ? "/checkout" : "/auth?next=/checkout"); };
  const soldOut = p.out_of_stock || p.stock <= 0;
  const stockLabel = soldOut ? t("common.outOfStock") : p.stock <= 10 ? t("common.lowStock") : t("common.inStock");

  return (
    <Section data-testid="product-detail" className="pb-40 lg:pb-0">
      <Container>
        <nav className="mb-6 flex items-center gap-1 text-sm text-charcoal/50">
          <LangLink to="/shop" className="hover:text-forest">Shop</LangLink><ChevronRight className="h-3.5 w-3.5" />
          <LangLink to={`/categories/${p.category}`} className="hover:text-forest capitalize">{p.category.replace("-", " ")}</LangLink><ChevronRight className="h-3.5 w-3.5" />
          <span className="text-charcoal">{p.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} className="relative overflow-hidden rounded-3xl border border-sage/30 bg-white">
              <img src={images[img]} alt={p.name} className="aspect-square w-full object-cover" data-testid="product-main-image" />
              <PackBrandTag className="absolute bottom-3 right-3" />
            </motion.div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {images.map((im, i) => (
                  <button key={i} onClick={() => setImg(i)} className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${i === img ? "border-forest" : "border-transparent"}`}>
                    <img src={im} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-serif text-3xl text-charcoal md:text-4xl">{p.name}</h1>
            <p className="mt-1 text-sm text-charcoal/55">{p.pack_size} · SKU {p.sku}</p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-3xl font-700 text-forest">{inr(p.price)}</span>
              {p.mrp > p.price && <><span className="text-lg text-charcoal/40 line-through">{inr(p.mrp)}</span><span className="rounded-full bg-amber px-2 py-0.5 text-sm font-700 text-charcoal">{p.discount}% off</span></>}
            </div>
            <p className="mt-1 text-xs text-charcoal/50">{t("pdp.inclusiveTax")}</p>

            {p.campaign_slug && campaign && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-4 rounded-xl border border-amber/40 bg-amber/10 px-4 py-2.5 text-sm" data-testid="pdp-promo-badge">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber" />
                  <span className="font-700 text-charcoal">{campaign.emoji || "🌾"} {campaign.campaign_name} — {p.discount}% OFF</span>
                </div>
                {offerEnds(campaign.end_at) && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-charcoal/60">Offer ends in</span>
                    <Countdown endIso={campaign.end_at} light={false} />
                  </div>
                )}
              </motion.div>
            )}

            {p.deal?.live && (
              <div className="mt-4 rounded-xl border border-amber/50 bg-amber/10 px-4 py-2.5 text-sm" data-testid="pdp-deal-live">
                <span className="font-700 text-charcoal">{p.deal.badge} — {p.deal.discount}% OFF</span>
                <div className="mt-1"><DealClock endsAt={p.deal.ends_at} /></div>
                <p className="mt-1 text-xs text-charcoal/60">{p.deal.resets_daily ? "This deal price resets at midnight." : "Limited-time deal price."}</p>
              </div>
            )}
            {p.deal?.ended && (
              <div className="mt-4 rounded-xl border border-sage/40 bg-charcoal/5 px-4 py-2.5 text-sm" data-testid="pdp-deal-ended">
                <span className="font-700 text-charcoal/70">Deal ended</span>
                <p className="mt-1 text-xs text-charcoal/60">This product is now shown at its regular price.</p>
              </div>
            )}

            {p.is_combo && (
              <div className="mt-4 rounded-2xl border border-forest/25 bg-cream/60 p-4" data-testid="pdp-combo-contents">
                <p className="inline-flex items-center gap-1.5 text-xs font-700 uppercase tracking-wider text-forest"><Boxes className="h-4 w-4 text-amber" />You are buying the complete box</p>
                <ul className="mt-2 space-y-1">
                  {String(p.net_quantity || "").split(", ").filter(Boolean).map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-sm text-charcoal/75"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />{item}</li>
                  ))}
                </ul>
                {p.mrp > p.price && <p className="mt-2 text-sm font-700 text-amber">Bought separately {inr(p.mrp)} — you save {inr(p.mrp - p.price)} ({p.discount}%)</p>}
              </div>
            )}

            {/* PACK SIZE PICKER — each size is its own SKU with its own price and stock */}
            {d.variants?.length > 1 && (
              <div className="mt-5" data-testid="pack-size-picker">
                <p className="text-xs font-700 uppercase tracking-wider text-forest">{t("pdp.packSize")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {d.variants.map((v) => {
                    const on = v.slug === p.slug;
                    const out = v.out_of_stock || v.stock <= 0;
                    return (
                      <button key={v.slug} onClick={() => switchVariant(v.slug)} disabled={out || !!switching}
                        data-testid={`pack-option-${v.slug}`} aria-pressed={on}
                        className={`relative rounded-2xl border px-4 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45
                          ${on ? "border-forest bg-forest/5 ring-2 ring-forest/30" : "border-sage/50 bg-white hover:border-forest"}`}>
                        <span className="block text-sm font-700 text-charcoal">{v.pack_size}</span>
                        <span className="block text-xs font-600 text-forest">{inr(v.price)}</span>
                        {out && <span className="block text-[10px] font-600 text-destructive">Out of stock</span>}
                        {switching === v.slug && <Loader2 className="absolute right-1.5 top-1.5 h-3 w-3 animate-spin text-forest" />}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-charcoal/50">Prices and stock are per pack size. SKU {p.sku}.</p>
              </div>
            )}

            <div className="mt-4"><TrustBadges badges={p.badges} max={6} /></div>
            <p className={`mt-3 inline-flex items-center gap-1.5 text-sm font-600 ${soldOut ? "text-destructive" : "text-forest"}`}><BadgeCheck className="h-4 w-4" />{stockLabel}</p>
            <p className="mt-4 text-charcoal/75">{p.description}</p>

            {/* Desktop/tablet actions — qty, Add to Cart, Buy Now and wishlist share one row and one
                height, so nothing sits half a step out of line. On mobile these are hidden: the pinned
                bottom bar is the single set of actions, never a duplicate. */}
            <div ref={actionsRef} className="mt-6 hidden items-stretch gap-3 lg:flex">
              <div className="flex h-12 shrink-0 items-center gap-3 rounded-full border border-sage/50 px-3">
                <button onClick={() => setQty(Math.max(1, qty - 1))} data-testid="qty-dec" aria-label="Decrease quantity" className="text-forest"><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center font-600" data-testid="qty-value">{qty}</span>
                <button onClick={() => setQty(qty + 1)} data-testid="qty-inc" aria-label="Increase quantity" className="text-forest"><Plus className="h-4 w-4" /></button>
              </div>
              <button onClick={() => add(p.slug, qty)} disabled={soldOut} data-testid="pdp-add-to-cart"
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-forest px-6 font-600 text-cream hover:bg-forest/90 disabled:bg-charcoal/30">
                <ShoppingBag className="h-4 w-4 shrink-0" /><span className="truncate">{t("common.addToCart")}</span>
              </button>
              <button onClick={buyNow} disabled={soldOut} data-testid="pdp-buy-now"
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-amber px-6 font-700 text-charcoal hover:bg-amber/90 disabled:bg-charcoal/30">{t("common.buyNow")}</button>
              <WishlistButton slug={p.slug} />
            </div>

            {/* serviceability */}
            <div className="mt-6 rounded-2xl border border-sage/30 bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-600 text-forest"><Truck className="h-4 w-4" />{t("pdp.checkDelivery")}</p>
              <div className="mt-2 flex gap-2">
                <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit PIN" data-testid="pdp-pin-input" className="w-36 rounded-full border border-sage/50 px-4 py-2 text-sm outline-none focus:border-forest" />
                <button onClick={checkPin} data-testid="pdp-pin-check" className="rounded-full bg-forest px-4 py-2 text-sm font-600 text-cream">{t("pdp.check")}</button>
              </div>
              {serv && <p className={`mt-2 text-sm ${serv.serviceable ? "text-forest" : "text-destructive"}`} data-testid="pdp-serviceability-msg">{serv.message}{serv.serviceable && serv.cod ? " · Cash on Delivery available." : ""}</p>}
            </div>

            {/* details tabs */}
            <Tabs defaultValue="ingredients" className="mt-6">
              <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
                {["ingredients", "nutrition", "details", "storage", "origin"].map((k) => (
                  <TabsTrigger key={k} value={k} data-testid={`pdp-tab-${k}`} className="rounded-full capitalize data-[state=active]:bg-forest data-[state=active]:text-cream">{t(`pdp.${k}`) === `pdp.${k}` ? (k.charAt(0).toUpperCase() + k.slice(1)) : t(`pdp.${k}`)}</TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="ingredients" className="pt-3 text-sm text-charcoal/75">
                {p.ingredients || <span className="text-charcoal/50">Ingredient details for this pack are being updated.</span>}
              </TabsContent>
              <TabsContent value="nutrition" className="pt-3">
                {(p.nutrition && p.nutrition.length > 0) ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {p.nutrition.map((n) => <div key={n.label} className="rounded-xl bg-cream p-3 text-center"><p className="text-xs text-charcoal/55">{n.label}</p><p className="font-700 text-forest">{n.value}</p></div>)}
                  </div>
                ) : <p className="text-sm text-charcoal/50">Nutrition values for this pack are being updated.</p>}
                <p className="mt-2 text-xs text-charcoal/50">Values are indicative per 100g and can be part of a balanced diet.</p>
              </TabsContent>
              <TabsContent value="details" className="pt-3" data-testid="pdp-details-content">
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {[
                    ["Pack size", p.pack_size],
                    ["Net quantity", p.net_quantity],
                    ["SKU", p.sku],
                    ["Shelf life", p.shelf_life],
                    ["Country of origin", p.country_of_origin],
                    ["Sourcing belt", p.origin_region],
                    ["Marketed / packed by", p.manufacturer],
                    ["FSSAI", p.fssai_number],
                    ["Certification", (p.organic_status && p.certification) ? `${p.certification}${p.certification_number ? ` · ${p.certification_number}` : ""}` : "Not independently certified; see sourcing details"],
                    ["Suggested use", p.product_type || p.short_description],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5 border-b border-sage/20 py-1.5">
                      <dt className="text-xs font-700 uppercase tracking-wider text-charcoal/55">{k}</dt>
                      <dd className="text-charcoal/80">{v}</dd>
                    </div>
                  ))}
                </dl>
                {!p.organic_status && (
                  <p className="mt-3 rounded-xl bg-cream/60 px-3 py-2 text-[11px] leading-relaxed text-charcoal/60">
                    We only display an organic certification badge when the certifying body and certificate number
                    for this product are recorded with us. Where that data is not yet in place, the product is
                    described simply as what it is, without any organic claim.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="storage" className="pt-3 text-sm text-charcoal/75">
                {p.storage || <span className="text-charcoal/50">Store in an airtight container in a cool, dry place away from sunlight.</span>}
                {p.shelf_life && <p className="mt-2 text-xs text-charcoal/55">Best within {p.shelf_life.toLowerCase()}.</p>}
              </TabsContent>
              <TabsContent value="origin" className="pt-3 text-sm text-charcoal/75" data-testid="pdp-origin-copy">
                {p.origin}{p.origin_region && !String(p.origin || "").includes(p.origin_region) ? ` Sourcing belt: ${p.origin_region}.` : ""}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* RATINGS & REVIEWS — verified buyers only */}
        <ProductReviews slug={p.slug} onRatingChange={(s) => setD((prev) => (prev && prev.product ? { ...prev, product: { ...prev.product, rating: s.average, rating_count: s.count } } : prev))} />

        {/* RECIPES USING THIS PRODUCT */}
        {d.related_recipes?.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl text-charcoal">{t("pdp.recipesUsing")}</h2>
            <p className="mt-1 text-sm text-charcoal/60">Sign in to view full recipes.</p>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              {d.related_recipes.map((r) => <RecipeCard key={r.slug} r={r} locked={!isAuthed} />)}
            </div>
          </div>
        )}

        {/* RELATED PRODUCTS */}
        {d.related_products?.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl text-charcoal">{t("pdp.youMayLike")}</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{d.related_products.map((rp) => <ProductCard key={rp.slug} p={rp} />)}</div>
          </div>
        )}
      </Container>

      {/* Pinned mobile action bar — the only Add to Cart / Buy Now on mobile, always reachable while
          the page content scrolls behind it. Shows the live price for the selected pack size and qty. */}
      <div data-testid="mobile-sticky-bar"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sage/40 bg-cream/95 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.10)] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] leading-tight text-charcoal/55" data-testid="sticky-bar-pack">{p.pack_size}{qty > 1 ? ` × ${qty}` : ""}</p>
            <p className="flex items-baseline gap-1.5 leading-none">
              <span className="text-base font-800 text-forest" data-testid="sticky-bar-price">{inr(p.price * qty)}</span>
              {p.mrp > p.price && <span className="text-[11px] text-charcoal/40 line-through">{inr(p.mrp * qty)}</span>}
            </p>
          </div>
          <div className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-sage/50 bg-white px-2.5">
            <button onClick={() => setQty(Math.max(1, qty - 1))} data-testid="sticky-qty-dec" aria-label="Decrease quantity" className="text-forest"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-4 text-center text-sm font-600" data-testid="sticky-qty-value">{qty}</span>
            <button onClick={() => setQty(qty + 1)} data-testid="sticky-qty-inc" aria-label="Increase quantity" className="text-forest"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => add(p.slug, qty)} disabled={soldOut} data-testid="sticky-bar-add-to-cart"
            className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full bg-forest px-3 text-[13px] font-700 leading-none text-cream disabled:bg-charcoal/30">
            <ShoppingBag className="h-4 w-4 shrink-0" /><span className="truncate">{t("common.addToCart")}</span>
          </button>
          <button onClick={buyNow} disabled={soldOut} data-testid="sticky-bar-buy-now"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-amber px-4 text-[13px] font-700 leading-none text-charcoal disabled:bg-charcoal/30">{t("common.buyNow")}</button>
        </div>
      </div>
    </Section>
  );
}

function WishlistButton({ slug }) {
  const { isAuthed } = useAuth();
  const navigate = useLangNavigate();
  const addWish = async () => {
    if (!isAuthed) return navigate("/auth");
    try { await api.post("/me/wishlist", { product_slug: slug }); toast.success("Added to wishlist"); }
    catch (e) { toast.error(apiError(e)); }
  };
  return <button onClick={addWish} data-testid="pdp-wishlist" aria-label="Add to wishlist" className="rounded-full border border-sage/50 p-3 text-forest hover:bg-white"><Heart className="h-5 w-5" /></button>;
}
