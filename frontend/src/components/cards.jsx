import { useState, useEffect } from "react";
import { Clock, Star, Heart, Eye, ShoppingBag, Plus, BadgeCheck, Boxes, Timer } from "lucide-react";
import { toast } from "sonner";
import { LangLink, useLang, useLangNavigate } from "@/components/LangLink";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/lib/i18n";
import api, { inr, apiError } from "@/lib/api";
import { path } from "@/components/LangLink";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackBrandTag } from "@/components/Logo";
import { categoryIcon } from "@/lib/categoryIcons";

/* Short "ends in" label for a live deal — the deal clock resets at midnight IST. */
function dealLeft(iso) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (!(ms > 0)) return "";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return h > 0 ? `${h}h ${m}m left` : m > 0 ? `${m}m ${s}s left` : `${s}s left`;
}

export function DealClock({ endsAt, className = "" }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const label = dealLeft(endsAt);
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-700 text-amber ${className}`} data-testid="deal-clock">
      <Timer className="h-3 w-3" />{label}
    </span>
  );
}

export function TrustBadges({ badges = [], max = 2 }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.slice(0, max).map((b) => (
        <span key={b} className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-600 text-forest ring-1 ring-sage/40">{b}</span>
      ))}
    </div>
  );
}

function Stars({ value, count, noRatingsLabel }) {
  if (value == null) {
    return <span className="text-[11px] font-600 text-charcoal/45" data-testid="no-ratings">{noRatingsLabel}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber" aria-label={`Rated ${value} out of 5`}>
      <Star className="h-3.5 w-3.5 fill-amber" />
      <span className="text-xs font-700 text-charcoal">{value}</span>
      {count > 0 && <span className="text-[11px] font-400 text-charcoal/45">({count})</span>}
    </span>
  );
}

/* Only shown when the admin has actually recorded certification details — never assumed. */
function OrganicMark({ p }) {
  if (!p.organic_status || !(p.certification || "").trim()) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wide text-forest ring-1 ring-forest/20" data-testid={`organic-badge-${p.slug}`}>
      <BadgeCheck className="h-3 w-3" />Certified Organic
    </span>
  );
}

export function ProductCard({ p }) {
  const { add } = useCart();
  const { isAuthed } = useAuth();
  const { t } = useI18n();
  const navigate = useLangNavigate();
  const [wished, setWished] = useState(false);
  const [quick, setQuick] = useState(false);
  const rating = p.rating ?? null;
  const reviews = p.rating_count ?? 0;
  const deal = p.deal || null;
  const dealEnded = deal?.ended;
  const dealLive = deal?.live;
  // `out_of_stock` is the admin override; the backend also clamps `stock` to 0 for it.
  const soldOut = p.out_of_stock || p.stock <= 0;

  const toggleWish = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthed) { toast("Sign in to save to your wishlist"); return; }
    try {
      if (wished) { await api.delete(`/me/wishlist/${p.slug}`); setWished(false); }
      else { await api.post("/me/wishlist", { product_slug: p.slug }); setWished(true); toast.success("Saved to wishlist"); }
    } catch (err) { toast.error(apiError(err)); }
  };

  const buyNow = async (e) => {
    e?.preventDefault();
    await add(p.slug, 1, false);
    navigate(isAuthed ? "/checkout" : "/auth?next=/checkout");
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-sage/30 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" data-testid={`product-card-${p.slug}`}>
      <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
        {dealLive && <span className="rounded-full bg-amber px-2.5 py-1 text-[10px] font-800 uppercase tracking-wide text-charcoal shadow-sm" data-testid={`deal-badge-${p.slug}`}>{deal.badge}</span>}
        {dealEnded && <span className="rounded-full bg-charcoal/80 px-2.5 py-1 text-[10px] font-800 uppercase tracking-wide text-cream shadow-sm" data-testid={`deal-ended-${p.slug}`}>Deal ended</span>}
        {p.discount > 0 && <span className="rounded-full bg-forest px-2.5 py-1 text-xs font-800 text-cream shadow-sm">{p.discount}% {t("common.off")}</span>}
        {p.featured && !dealLive && <span className="rounded-full bg-forest/90 px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wide text-cream">Top Seller</span>}
        {p.is_new && !soldOut && <span className="rounded-full bg-sage px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wide text-forest">Fresh</span>}
      </div>
      <button onClick={toggleWish} aria-label="Add to wishlist" data-testid={`wishlist-${p.slug}`}
        className={`absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition-all hover:scale-110 ${wished ? "text-red-500" : "text-charcoal/40 opacity-0 group-hover:opacity-100"}`}>
        <Heart className={`h-4 w-4 ${wished ? "fill-red-500" : ""}`} />
      </button>

      <LangLink to={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden bg-cream">
        <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <PackBrandTag className="absolute bottom-2 right-2 z-10" compact />
        {soldOut && <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-1.5 text-center text-xs font-600 text-cream">{t("common.outOfStock")}</span>}
        <button onClick={(e) => { e.preventDefault(); setQuick(true); }} data-testid={`quick-view-${p.slug}`}
          className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 translate-y-3 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-600 text-forest opacity-0 shadow-md backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:inline-flex">
          <Eye className="h-3.5 w-3.5" /> {t("common.quickView")}
        </button>
      </LangLink>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {/* Sourcing is Odisha-only for now, so no place name is shown on products — brand line only. */}
        <p className="text-[11px] uppercase leading-tight tracking-wider text-charcoal/45">{p.brand || "AaharNest"}</p>
        <LangLink to={`/product/${p.slug}`}><h3 className="line-clamp-2 font-600 leading-snug text-charcoal">{p.name}</h3></LangLink>
        {p.odia_name && <p className="font-serif text-xs italic leading-tight text-forest/80" data-testid={`product-odia-name-${p.slug}`}>Odia: {p.odia_name}</p>}
        {p.short_description && <p className="line-clamp-1 text-xs text-charcoal/55" data-testid={`product-descriptor-${p.slug}`}>{p.short_description}</p>}
        <div className="flex items-center gap-2"><Stars value={rating} count={reviews} noRatingsLabel={t("common.noRatings")} /></div>
        <p className="text-xs font-600 text-charcoal/65">{p.pack_size}</p>
        <OrganicMark p={p} />
        {dealLive && <DealClock endsAt={deal.ends_at} />}
        {dealEnded && <span className="text-[11px] font-600 text-charcoal/50">This deal has ended — shown at its regular price.</span>}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-800 text-forest" data-testid={`price-${p.slug}`}>{inr(p.price)}</span>
            {p.mrp > p.price && <span className="text-sm text-charcoal/40 line-through">{inr(p.mrp)}</span>}
          </div>
        </div>
        {/* Actions stack on narrow cards (2-up mobile grid) so Add to Cart is never squeezed out,
            and sit side by side with equal heights from sm up. */}
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <button onClick={() => add(p.slug, 1)} disabled={soldOut} data-testid={`add-to-cart-${p.slug}`}
            className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-full bg-forest px-2.5 text-[13px] font-600 leading-none text-cream transition-colors hover:bg-forest/90 disabled:cursor-not-allowed disabled:bg-charcoal/30 sm:px-3 sm:text-sm">
            <Plus className="h-4 w-4 shrink-0" /><span className="truncate">{t("common.addToCart")}</span>
          </button>
          <button onClick={buyNow} disabled={soldOut} data-testid={`buy-now-${p.slug}`}
            className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-full bg-amber px-3.5 text-[13px] font-700 leading-none text-charcoal transition-colors hover:bg-amber/90 disabled:cursor-not-allowed disabled:bg-charcoal/20 sm:w-auto sm:text-sm">
            {t("common.buy")}
          </button>
        </div>
      </div>

      <Dialog open={quick} onOpenChange={setQuick}>
        <DialogContent className="overflow-hidden bg-cream sm:max-w-lg" data-testid={`quick-view-modal-${p.slug}`}>
          <DialogHeader><DialogTitle className="font-serif text-xl text-forest">{p.name}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-xl bg-white"><img src={p.image} alt={p.name} className="aspect-square w-full object-cover" /><PackBrandTag className="absolute bottom-2 right-2" /></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2"><Stars value={rating} count={reviews} noRatingsLabel={t("common.noRatings")} /></div>
              <p className="mt-2 text-sm text-charcoal/70">{p.short_description || p.description}</p>
              <p className="mt-2 text-xs font-600 text-charcoal/60">{p.pack_size}</p>
              <div className="mt-2"><OrganicMark p={p} /></div>
              <TrustBadges badges={p.badges} max={4} />
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-800 text-forest">{inr(p.price)}</span>
                {p.mrp > p.price && <span className="text-sm text-charcoal/40 line-through">{inr(p.mrp)}</span>}
                {p.discount > 0 && <span className="text-xs font-700 text-amber">{p.discount}% off</span>}
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-4">
                <button onClick={() => { add(p.slug, 1); setQuick(false); }} disabled={soldOut} data-testid={`quick-add-${p.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-600 text-cream hover:bg-forest/90 disabled:bg-charcoal/30"><ShoppingBag className="h-4 w-4" />{t("common.addToCart")}</button>
                <LangLink to={`/product/${p.slug}`} onClick={() => setQuick(false)} className="text-center text-sm font-600 text-forest hover:underline">View full details</LangLink>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Combo Boxes are sold as a whole bundle — the card makes the contents and the saving explicit. */
export function ComboCard({ p }) {
  const { add } = useCart();
  const { isAuthed } = useAuth();
  const navigate = useLangNavigate();
  const included = String(p.net_quantity || "").split(", ").filter(Boolean);
  const savings = Math.max(0, (p.mrp || 0) - (p.price || 0));
  // `out_of_stock` is the admin override; the backend also clamps `stock` to 0 for it.
  const soldOut = p.out_of_stock || p.stock <= 0;

  const buyNow = async () => {
    await add(p.slug, 1, false);
    navigate(isAuthed ? "/checkout" : "/auth?next=/checkout");
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-sage/30 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" data-testid={`combo-card-${p.slug}`}>
      <LangLink to={`/product/${p.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-cream">
        <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <PackBrandTag className="absolute bottom-2 right-2 z-10" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-[10px] font-800 uppercase tracking-wide text-cream"><Boxes className="h-3 w-3" />Combo Box</span>
        {p.discount > 0 && <span className="absolute right-3 top-3 rounded-full bg-amber px-2.5 py-1 text-xs font-800 text-charcoal">{p.discount}% OFF</span>}
        {soldOut && <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-1.5 text-center text-xs font-600 text-cream">{t("common.outOfStock")}</span>}
      </LangLink>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <LangLink to={`/product/${p.slug}`}><h3 className="font-serif text-xl leading-snug text-charcoal">{p.name}</h3></LangLink>
          <p className="mt-1 text-sm text-charcoal/60">{p.short_description}</p>
        </div>
        <div className="rounded-2xl bg-cream/60 p-3">
          <p className="text-[11px] font-700 uppercase tracking-wider text-forest">{included.length} products included</p>
          <ul className="mt-2 space-y-1" data-testid={`combo-items-${p.slug}`}>
            {included.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs text-charcoal/70"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />{item}</li>
            ))}
          </ul>
        </div>
        <div className="mt-auto">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-800 text-forest" data-testid={`combo-price-${p.slug}`}>{inr(p.price)}</span>
            <span className="text-sm text-charcoal/40 line-through">{inr(p.mrp)}</span>
            <span className="text-xs text-charcoal/50">bought separately</span>
          </div>
          {savings > 0 && <p className="mt-1 text-sm font-700 text-amber" data-testid={`combo-savings-${p.slug}`}>You save {inr(savings)} on this box</p>}
          <p className="mt-1 text-[11px] text-charcoal/50">You are buying the complete bundle — all {included.length} items ship together.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <button onClick={() => add(p.slug, 1)} disabled={soldOut} data-testid={`combo-add-${p.slug}`}
              className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-full bg-forest px-4 text-sm font-600 text-cream hover:bg-forest/90 disabled:bg-charcoal/30">
              <Plus className="h-4 w-4 shrink-0" /><span className="truncate">Add Box to Cart</span>
            </button>
            <button onClick={buyNow} disabled={soldOut} data-testid={`combo-buy-${p.slug}`}
              className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-amber px-4 text-sm font-700 text-charcoal hover:bg-amber/90 disabled:bg-charcoal/20 sm:w-auto">Buy Now</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategoryCard({ c }) {
  const { t, catName } = useI18n();
  const { Icon, tagline } = categoryIcon(c.slug);
  return (
    <LangLink to={`/categories/${c.slug}`} data-testid={`category-card-${c.slug}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-sage/30 bg-forest shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(23,74,53,0.22)]">
      <img src={c.image} alt={c.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/45 to-transparent" />
      <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-cream/95 shadow-sm ring-1 ring-forest/10 backdrop-blur transition-transform duration-300 group-hover:scale-110"
        data-testid={`category-icon-${c.slug}`}>
        <Icon className="h-4.5 w-4.5 text-forest" strokeWidth={1.8} aria-hidden />
      </span>
      <div className="relative p-4">
        <h3 className="font-serif text-xl text-cream">{catName(c.slug, c.name)}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-cream/80">{c.note || tagline}</p>
        <span className="mt-2 inline-flex translate-y-2 items-center gap-1 text-xs font-600 text-amber opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">{t("common.shopNow")} →</span>
      </div>
    </LangLink>
  );
}

export function RecipeCard({ r, locked = false }) {
  const Inner = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <img src={r.image} alt={r.imageAlt || r.title} loading="lazy" className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${locked ? "blur-[3px]" : ""}`} />
        {r.category && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-700 uppercase tracking-wide text-forest backdrop-blur">{r.category}</span>}
      </div>
      <div className="p-4">
        <h3 className="font-600 leading-snug text-charcoal">{r.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-charcoal/55">
          {r.minutes && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.minutes} min</span>}
          {r.difficulty && <span>{r.difficulty}</span>}
          {r.servings && <span>Serves {r.servings}</span>}
        </div>
      </div>
    </>
  );
  const cls = "group block overflow-hidden rounded-2xl border border-sage/30 bg-white shadow-sm transition-shadow hover:shadow-md";
  if (locked) return <div className={cls} data-testid={`recipe-card-locked-${r.slug}`}>{Inner}</div>;
  return <LangLink to={`/recipes/${r.slug}`} className={cls} data-testid={`recipe-card-${r.slug}`}>{Inner}</LangLink>;
}

export function ArticleCard({ a }) {
  return (
    <LangLink to={`/articles/${a.slug}`} data-testid={`article-card-${a.slug}`}
      className="group block overflow-hidden rounded-2xl border border-sage/30 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="aspect-[16/10] overflow-hidden bg-cream">
        <img src={a.image} alt={a.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="p-4">
        <p className="text-[11px] font-700 uppercase tracking-widest text-amber">{a.category}</p>
        <h3 className="mt-1.5 font-serif text-lg leading-snug text-charcoal">{a.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-charcoal/60">{a.summary}</p>
      </div>
    </LangLink>
  );
}

export { path, useLang };
