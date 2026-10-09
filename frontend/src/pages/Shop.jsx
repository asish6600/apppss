import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { PackageSearch, SlidersHorizontal, X, Search } from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Container, Section, SectionHeading, GridSkeleton, useSEO, EmptyState, OutlineBtn, PrimaryBtn } from "@/components/common";
import { LangLink } from "@/components/LangLink";
import { ProductCard, CategoryCard } from "@/components/cards";
import { PromoBanner, useCampaign } from "@/components/PromoBanner";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const PRICE_BUCKETS = [
  { label: "Under ₹100", min: 0, max: 99 },
  { label: "₹100 – ₹199", min: 100, max: 199 },
  { label: "₹200 – ₹299", min: 200, max: 299 },
  { label: "₹300 – ₹499", min: 300, max: 499 },
  { label: "₹500 & above", min: 500, max: 100000 },
];
const DISCOUNT_BUCKETS = [5, 10, 15, 20, 25];
const RATING_BUCKETS = [4.5, 4.0, 3.5];

const SORTS = [
  ["recommended", "Recommended"],
  ["popular", "Popular"],
  ["newest", "Newest"],
  ["price_asc", "Price: Low to High"],
  ["price_desc", "Price: High to Low"],
  ["rating", "Highest Rated"],
  ["discount", "Biggest Discount"],
];

/* Multi-select list params are stored comma-separated in the URL so filters combine and survive refresh. */
function useListParam(sp, key) {
  return useMemo(() => (sp.get(key) || "").split(",").filter(Boolean), [sp, key]);
}

function FiltersPanel({ cats, facets, sp, setParam, toggleList, campaign, onClearAll, onClose }) {
  const { t, catName } = useI18n();
  const active = sp.get("category") || "";
  const offers = sp.get("offers") === "1";
  const inStock = sp.get("in_stock") === "1";
  const organic = sp.get("organic") === "1";
  const minPrice = sp.get("min_price");
  const maxPrice = sp.get("max_price");
  const minDiscount = Number(sp.get("min_discount") || 0);
  const minRating = Number(sp.get("min_rating") || 0);
  const subs = useListParam(sp, "subcategory");
  const packs = useListParam(sp, "pack_size");
  const brands = useListParam(sp, "brand");
  const diets = useListParam(sp, "dietary");
  const types = useListParam(sp, "product_type");
  const activePrice = PRICE_BUCKETS.findIndex((b) => String(b.min) === minPrice && String(b.max) === maxPrice);

  const SectionBlock = ({ title, children, scroll = false }) => (
    <div className="border-b border-sage/20 py-4 last:border-b-0">
      <p className="mb-3 text-xs font-700 uppercase tracking-wider text-forest">{title}</p>
      <div className={scroll ? "max-h-44 overflow-y-auto pr-1" : ""}>{children}</div>
    </div>
  );

  const RowBtn = ({ active: on, onClick, label, testid }) => (
    <button onClick={onClick} data-testid={testid}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-600 transition-all ${on ? "bg-forest text-cream shadow-sm" : "bg-white text-charcoal ring-1 ring-sage/40 hover:ring-forest"}`}>
      {on && <X className="h-3 w-3" />}{label}
    </button>
  );

  return (
    <div className="space-y-0" data-testid="shop-filter-panel">
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-serif text-lg text-forest">{t("shop.filters")}</h3>
        <button onClick={onClearAll} data-testid="filter-clear-all" className="text-xs font-600 text-amber hover:underline">{t("shop.clearAll")}</button>
      </div>

      <SectionBlock title={t("shop.special")}>
        <div className="flex flex-wrap gap-2">
          <RowBtn active={offers} onClick={() => setParam("offers", offers ? "" : "1")} testid="filter-offers"
            label={campaign ? `${campaign.discount_value}% ${t("common.off")}` : t("shop.onOffer")} />
          <RowBtn active={inStock} onClick={() => setParam("in_stock", inStock ? "" : "1")} testid="filter-in-stock" label={t("shop.inStockOnly")} />
          <RowBtn active={organic} onClick={() => setParam("organic", organic ? "" : "1")} testid="filter-organic" label="Certified organic" />
        </div>
      </SectionBlock>

      <SectionBlock title={t("shop.category")}>
        <div className="flex flex-wrap gap-2">
          <RowBtn active={!active} onClick={() => setParam("category", "")} testid="filter-cat-all" label="All" />
          {cats.filter((c) => c.slug !== "combos").map((c) => (
            <RowBtn key={c.slug} active={active === c.slug} onClick={() => setParam("category", active === c.slug ? "" : c.slug)} testid={`filter-${c.slug}`} label={catName(c.slug, c.name)} />
          ))}
        </div>
      </SectionBlock>

      {facets.subcategories?.length > 0 && (
        <SectionBlock title="Subcategory" scroll>
          <div className="flex flex-wrap gap-2">
            {facets.subcategories.map((s) => (
              <RowBtn key={s} active={subs.includes(s)} onClick={() => toggleList("subcategory", s)} testid={`filter-sub-${s}`} label={s} />
            ))}
          </div>
        </SectionBlock>
      )}

      <SectionBlock title="Price">
        <div className="flex flex-wrap gap-2">
          {PRICE_BUCKETS.map((b, i) => (
            <RowBtn key={b.label} active={activePrice === i}
              onClick={() => {
                const n = new URLSearchParams(sp);
                if (activePrice === i) { n.delete("min_price"); n.delete("max_price"); }
                else { n.set("min_price", String(b.min)); n.set("max_price", String(b.max)); }
                setParam("__url", n);
              }}
              testid={`filter-price-${i}`} label={b.label} />
          ))}
        </div>
      </SectionBlock>

      {facets.pack_sizes?.length > 0 && (
        <SectionBlock title="Pack size" scroll>
          <div className="flex flex-wrap gap-2">
            {facets.pack_sizes.map((s) => (
              <RowBtn key={s} active={packs.includes(s)} onClick={() => toggleList("pack_size", s)} testid={`filter-pack-${s}`} label={s} />
            ))}
          </div>
        </SectionBlock>
      )}

      {facets.product_types?.length > 0 && (
        <SectionBlock title="Product type" scroll>
          <div className="flex flex-wrap gap-2">
            {facets.product_types.map((s) => (
              <RowBtn key={s} active={types.includes(s)} onClick={() => toggleList("product_type", s)} testid={`filter-type-${s}`} label={s} />
            ))}
          </div>
        </SectionBlock>
      )}

      {facets.dietary?.length > 0 && (
        <SectionBlock title="Dietary preference">
          <div className="flex flex-wrap gap-2">
            {facets.dietary.map((s) => (
              <RowBtn key={s} active={diets.includes(s)} onClick={() => toggleList("dietary", s)} testid={`filter-diet-${s}`} label={s} />
            ))}
          </div>
        </SectionBlock>
      )}

      {facets.brands?.length > 1 && (
        <SectionBlock title="Brand">
          <div className="flex flex-wrap gap-2">
            {facets.brands.map((s) => (
              <RowBtn key={s} active={brands.includes(s)} onClick={() => toggleList("brand", s)} testid={`filter-brand-${s}`} label={s} />
            ))}
          </div>
        </SectionBlock>
      )}

      <SectionBlock title="Customer rating">
        <div className="flex flex-wrap gap-2">
          <RowBtn active={!minRating} onClick={() => setParam("min_rating", "")} testid="filter-rating-any" label="Any" />
          {RATING_BUCKETS.map((r) => (
            <RowBtn key={r} active={minRating === r} onClick={() => setParam("min_rating", minRating === r ? "" : String(r))} testid={`filter-rating-${r}`} label={`${r}★ & above`} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Minimum discount">
        <div className="flex flex-wrap gap-2">
          <RowBtn active={!minDiscount} onClick={() => setParam("min_discount", "")} testid="filter-disc-any" label="Any" />
          {DISCOUNT_BUCKETS.map((d) => (
            <RowBtn key={d} active={minDiscount === d} onClick={() => setParam("min_discount", minDiscount === d ? "" : String(d))} testid={`filter-disc-${d}`} label={`${d}% +`} />
          ))}
        </div>
      </SectionBlock>

      {onClose && (
        <div className="pt-4 lg:hidden">
          <OutlineBtn onClick={onClose} className="w-full">See results</OutlineBtn>
        </div>
      )}
    </div>
  );
}

export function Shop() {
  const { t, catName } = useI18n();
  const [sp, setSp] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [facets, setFacets] = useState({});
  const [products, setProducts] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState(sp.get("q") || "");
  const campaign = useCampaign();
  const sort = sp.get("sort") || "recommended";

  useSEO({ title: "Shop · Organic Indian Food Products | AaharNest", description: "Shop organic Indian food — millets, dals, flours, spices, seeds, cold-pressed oils, teas and healthy snacks from AaharNest." });

  useEffect(() => { api.get("/categories").then((r) => setCats(r.data.categories)).catch(() => {}); }, []);

  const category = sp.get("category") || "";
  useEffect(() => {
    api.get(`/catalog/facets${category ? `?category=${category}` : ""}`).then((r) => setFacets(r.data)).catch(() => setFacets({}));
  }, [category]);

  useEffect(() => { setSearch(sp.get("q") || ""); }, [sp]);

  useEffect(() => {
    setProducts(null);
    const qs = new URLSearchParams();
    for (const [k, v] of sp.entries()) {
      if (!v) continue;
      if (["offers", "in_stock", "organic"].includes(k)) qs.set(k, "true");
      else qs.set(k, v);
    }
    if (sort && sort !== "recommended") qs.set("sort", sort);
    api.get(`/products?${qs.toString()}`).then((r) => setProducts(r.data.products)).catch(() => setProducts([]));
  }, [sp, sort]);

  const setParam = (k, v) => {
    if (k === "__url") { setSp(v); return; }
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v); else n.delete(k);
    // a category change invalidates its subcategory selection
    if (k === "category") n.delete("subcategory");
    setSp(n);
  };

  const toggleList = (key, value) => {
    const n = new URLSearchParams(sp);
    const cur = (n.get(key) || "").split(",").filter(Boolean);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    if (next.length) n.set(key, next.join(",")); else n.delete(key);
    setSp(n);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setParam("q", search.trim());
  };

  const clearAll = () => setSp({});
  const offers = sp.get("offers") === "1";
  const campaignPct = campaign?.discount_value;

  const subTitle = offers && campaignPct
    ? `Every product below is at exactly ${campaignPct}% off — the same discount shown on the offer banner, the home page and each product page.`
    : t("shop.sub");

  const activeChips = useMemo(() => {
    const chips = [];
    if (sp.get("q")) chips.push({ k: "q", label: `“${sp.get("q")}”` });
    if (sp.get("category")) chips.push({ k: "category", label: cats.find((c) => c.slug === sp.get("category"))?.name || sp.get("category") });
    for (const key of ["subcategory", "pack_size", "brand", "dietary", "product_type"]) {
      for (const v of (sp.get(key) || "").split(",").filter(Boolean)) chips.push({ k: key, v, label: v });
    }
    if (offers) chips.push({ k: "offers", label: `${campaignPct || ""}% off bundle` });
    if (sp.get("in_stock") === "1") chips.push({ k: "in_stock", label: "In stock" });
    if (sp.get("organic") === "1") chips.push({ k: "organic", label: "Certified organic" });
    if (sp.get("min_price")) chips.push({ k: "price", label: `₹${sp.get("min_price")}–₹${sp.get("max_price")}` });
    if (sp.get("min_rating")) chips.push({ k: "min_rating", label: `${sp.get("min_rating")}★ & above` });
    if (sp.get("min_discount")) chips.push({ k: "min_discount", label: `${sp.get("min_discount")}% + off` });
    return chips;
  }, [sp, cats, offers, campaignPct]);

  const removeChip = (c) => {
    const n = new URLSearchParams(sp);
    if (c.k === "price") { n.delete("min_price"); n.delete("max_price"); }
    else if (c.v) {
      const next = (n.get(c.k) || "").split(",").filter((x) => x && x !== c.v);
      if (next.length) n.set(c.k, next.join(",")); else n.delete(c.k);
    } else n.delete(c.k);
    setSp(n);
  };

  return (
    <Section>
      <Container>
        <SectionHeading eyebrow={t("shop.eyebrow")} title={offers ? `${campaignPct || ""}% ${t("common.off")}` : t("shop.title")} sub={subTitle} />
        <div className="mb-8"><PromoBanner compact /></div>

        {/* SEARCH */}
        <form onSubmit={submitSearch} className="mb-6 flex gap-2" data-testid="shop-search-form">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="shop-search-input"
              placeholder={t("shop.searchPlaceholder")}
              className="w-full rounded-full border border-sage/40 bg-white/70 py-3 pl-11 pr-4 text-sm outline-none backdrop-blur-md transition-colors focus:border-forest" />
          </div>
          <button type="submit" data-testid="shop-search-submit" className="rounded-full bg-forest px-6 py-3 text-sm font-600 text-cream transition-colors hover:bg-forest/90">Search</button>
        </form>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="glass-card sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl p-5">
              <FiltersPanel cats={cats} facets={facets} sp={sp} setParam={setParam} toggleList={toggleList} campaign={campaign} onClearAll={clearAll} />
            </div>
          </aside>

          <div>
            {/* Toolbar */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <button data-testid="mobile-filters-btn" className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-600 text-forest lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" />Filters{activeChips.length > 0 ? ` · ${activeChips.length}` : ""}
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto bg-white/90 backdrop-blur-2xl" data-testid="mobile-filters-sheet">
                  <SheetHeader><SheetTitle className="font-serif text-xl text-forest">{t("shop.filters")}</SheetTitle></SheetHeader>
                  <div className="mt-4">
                    <FiltersPanel cats={cats} facets={facets} sp={sp} setParam={setParam} toggleList={toggleList} campaign={campaign} onClearAll={clearAll} onClose={() => setMobileOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>

              {activeChips.map((c) => (
                <button key={`${c.k}-${c.v || ""}`} onClick={() => removeChip(c)} data-testid={`active-chip-${c.k}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1.5 text-xs font-600 text-forest ring-1 ring-forest/20 hover:bg-forest/20">
                  <X className="h-3 w-3" />{c.label}
                </button>
              ))}

              <select value={sort} onChange={(e) => setParam("sort", e.target.value === "recommended" ? "" : e.target.value)} data-testid="shop-sort"
                className="ml-auto rounded-full border border-sage/40 bg-white/80 px-4 py-2 text-sm font-600 text-charcoal outline-none backdrop-blur focus:border-forest">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {!products ? <GridSkeleton /> : products.length === 0 ? (
              <EmptyState icon={PackageSearch} title="No matching products found. Try adjusting the filters." />
            ) : (
              <>
                <p className="mb-3 text-xs text-charcoal/55" data-testid="shop-result-count">{products.length} products</p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => <ProductCard key={p.slug} p={p} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}

export function Categories() {
  const { t, catName } = useI18n();
  const [cats, setCats] = useState([]);
  useSEO({ title: "Categories · AaharNest" });
  useEffect(() => { api.get("/categories").then((r) => setCats(r.data.categories)).catch(() => {}); }, []);
  return (
    <Section>
      <Container>
        <SectionHeading eyebrow={t("common.explore")} title={t("home.shopByCategory")} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => <CategoryCard key={c.slug} c={c} />)}
        </div>
      </Container>
    </Section>
  );
}

export function Category() {
  const { t, catName } = useI18n();
  const { slug } = useParams();
  const [products, setProducts] = useState(null);
  const [cat, setCat] = useState(null);
  // null = still loading, false = no such category (e.g. a retired slug someone
  // bookmarked), object = found. Without this an unknown slug rendered a bare
  // "Category" heading plus "no products yet", which reads as a bug to the user.
  const [exists, setExists] = useState(null);

  useEffect(() => {
    setExists(null); setCat(null); setProducts(null);
    api.get("/categories")
      .then((r) => {
        const found = r.data.categories.find((c) => c.slug === slug);
        setCat(found || null);
        setExists(!!found);
      })
      .catch(() => setExists(false));
    api.get(`/products?category=${slug}${slug === "combos" ? "&combo=true" : ""}`)
      .then((r) => setProducts(r.data.products)).catch(() => setProducts([]));
  }, [slug]);

  useSEO({ title: `${cat?.name || "Category"} · AaharNest`, description: cat?.note });

  if (exists === false) {
    return (
      <Section>
        <Container>
          <EmptyState icon={PackageSearch} title="This category is no longer available."
            sub="It may have been renamed or retired. Browse everything we currently stock instead." />
          <div className="mt-6 flex flex-wrap justify-center gap-3" data-testid="category-gone-actions">
            <PrimaryBtn as={LangLink} to="/categories" data-testid="category-gone-all-categories">
              All categories
            </PrimaryBtn>
            <OutlineBtn as={LangLink} to="/shop" data-testid="category-gone-shop">Shop all products</OutlineBtn>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <SectionHeading eyebrow={t("shop.category")} title={catName(cat?.slug, cat?.name) || t("shop.category")} sub={cat?.note} />
        {!products ? <GridSkeleton /> : products.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No products in this category yet." />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        )}
      </Container>
    </Section>
  );
}
