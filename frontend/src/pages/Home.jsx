import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, HandCoins, Sprout, HeartHandshake, BadgeCheck, Truck, ArrowRight, ChevronLeft,
  ChevronRight, Clock, PackageCheck, ShieldCheck, Flame, BookOpen, Globe2, Plane,
  Quote,
} from "lucide-react";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Container, Section, SectionHeading, PrimaryBtn, OutlineBtn, GreenBtn, useSEO } from "@/components/common";
import { ProductCard, CategoryCard, ArticleCard, RecipeCard } from "@/components/cards";
import { LangLink, useLangNavigate } from "@/components/LangLink";
import { MadeInIndiaBadge, Eyebrow } from "@/components/Marks";
import { useCampaign, themeMeta, Countdown, offerEnds } from "@/components/PromoBanner";
import { OdishaSourcingMap } from "@/components/OdishaMap";
import { FestivalRibbon } from "@/components/FestivalBackdrop";
import { useFestivalTheme, upcomingFestival } from "@/lib/festivals";
import { categoryIcon } from "@/lib/categoryIcons";

// Koraput highlands — shared with the farmers page sourcing story.
/* Hero art is deliberately RAW PRODUCT only — millets, dals, spices, flours and
   cold-pressed oil. No cooked dishes (the old roti/rice/idli banners were removed on
   request): the banner should show what AaharNest actually sells. */
const HERO_FALLBACK = "/images/hero-pulses.webp";

const ODISHA_BAND_IMAGE = "https://static.prod-images.emergentagent.com/jobs/1e4cac8e-6b03-4e8a-9a3c-2e437491018a/images/b54e08b8c9714c9c2e4b15c085dd9b1f6cfd3912445d8e85e97073b3719ad6f6.jpeg";

const WHY = [
  ["01", "Quality First", "Carefully selected products with a strong focus on quality.", BadgeCheck],
  ["02", "Farmer Connected", "Wherever practical, we work directly with farmers to create better value.", Sprout],
  ["03", "Honest Pricing", "We work to keep quality food accessible and fairly priced.", HandCoins],
  ["04", "Better Everyday Food", "Helping customers make better food choices for everyday living.", Leaf],
  ["05", "Made in India", "Supporting Indian farmers, producers and local businesses.", Truck],
  ["06", "Giving Back", "Customers can voluntarily contribute ₹1 or ₹2 toward educational support for children in India.", HeartHandshake],
];

const TRUST = [
  [Sprout, "nav.farmers", "home.trustFarmers"],
  [ShieldCheck, "common.pureGenuine", "home.trustAuthentic"],
  [PackageCheck, "common.save", "home.trustHygienic"],
  [Truck, "header.deliverTo", "home.trustShipping"],
];

/* Why an Odia family away from home buys here. Positioning, not a delivery promise —
   shipping coverage and rates are quoted at checkout. */
const DIASPORA = [
  [Globe2, "Taste of home, wherever you are", "The mandia, the Kandhamal haldi, the cold-pressed oil you grew up with — from the same belts in Odisha, not a generic import shelf."],
  [ShieldCheck, "Sealed, labelled, traceable", "Every pack carries its SKU, pack size and sourcing district, so you know exactly what arrived."],
  [Plane, "Built for families far from Odisha", "Order for parents in Bhubaneswar or a kitchen in New Jersey — one basket, one invoice, PDF receipt by email."],
];

function CategoryStrip({ cats }) {
  const { catName } = useI18n();
  if (!cats.length) return null;
  return (
    <div className="sticky top-0 z-20 border-b border-sage/25 bg-white/80 backdrop-blur-xl">
      <Container>
        <div className="flex gap-4 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="category-strip">
          {cats.map((c) => {
            const { Icon, tint, ring } = categoryIcon(c.slug);
            return (
              <LangLink key={c.slug} to={`/categories/${c.slug}`} data-testid={`cat-shortcut-${c.slug}`}
                className="group flex min-w-[78px] flex-col items-center gap-2">
                <span className={`relative h-16 w-16 overflow-hidden rounded-2xl ${tint} p-0.5 ring-1 ${ring} transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-md`}>
                  <img src={c.image} alt={catName(c.slug, c.name)} loading="lazy" className="h-full w-full rounded-[0.85rem] object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white/95 shadow-sm">
                    <Icon className="h-3.5 w-3.5 text-forest" strokeWidth={2} aria-hidden />
                  </span>
                </span>
                <span className="max-w-[82px] text-center text-xs font-600 leading-tight text-charcoal/75 transition-colors group-hover:text-forest">
                  {catName(c.slug, c.name)}
                </span>
              </LangLink>
            );
          })}
        </div>
      </Container>
    </div>
  );
}

function HeroCarousel() {
  const c = useCampaign();
  const fest = useFestivalTheme();
  const navigate = useLangNavigate();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef();

  const slides = [];
  // A live festival leads the carousel — that is the whole point of the calendar.
  if (fest.festive) {
    slides.push({
      key: `fest-${fest.key}`, eyebrow: `${fest.emoji} ${fest.name}`, greeting: fest.greetingOr,
      title: fest.greeting.split("—")[0].trim() + ",", title2: "celebrated with real food",
      desc: `${fest.blurb} Festive picks: ${fest.picks.toLowerCase()}.`,
      offer: "", cta: "Shop festive picks", to: "/shop?offers=1",
      img: fest.image || HERO_FALLBACK, bg: "bg-forest", tint: fest.tint,
    });
  }
  if (c) {
    const th = themeMeta(c.theme);
    slides.push({
      key: "campaign", eyebrow: `${c.emoji || th.emoji} ${c.campaign_name}`, greeting: c.greeting || th.greeting,
      title: "Celebrate Tradition,", title2: "Choose Health", desc: c.description,
      offer: c.max_discount_label, cta: c.cta_text || "Shop the Offer", to: "/shop?offers=1",
      img: (c.banner_image && c.banner_image.startsWith("/") ? c.banner_image : th.art) || HERO_FALLBACK,
      bg: th.bg, end: c.end_at,
    });
  }
  slides.push(
    { key: "brand", eyebrow: "🌿 Grown in Odisha · Delivered worldwide", title: "Know your food.", title2: "Choose with confidence.", desc: "Discover thoughtfully sourced Indian pantry staples — millets, dals, flours, spices and cold-pressed oils from Odisha. Clear labels, honest ingredients and traditional recipes to help you cook with what you understand.", offer: "", cta: "Shop Products", to: "/shop", img: HERO_FALLBACK, bg: "bg-forest" },
    { key: "millets", eyebrow: "🌾 Millets & Wholegrains", title: "Ancient Grains,", title2: "Everyday Goodness", desc: "Fibre-rich mandia, bajra and foxtail millet from the Eastern Ghats, with stone-milled flours for a healthier plate.", offer: "", cta: "Explore Millets", to: "/categories/organic-millets-grains", img: "/images/hero-millets.webp", bg: "bg-charcoal" },
    { key: "spices", eyebrow: "🌶️ Spices & Cold-Pressed Oils", title: "Kandhamal Haldi.", title2: "Kachi Ghani Oil.", desc: "GI-tagged turmeric, freshly ground masalas and wood-churned cold-pressed oils — nothing stripped, nothing stretched.", offer: "", cta: "Shop Spices & Oils", to: "/categories/organic-spices", img: "/images/hero-oils.webp", bg: "bg-charcoal" },
  );

  useEffect(() => {
    clearInterval(timer.current);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || paused || slides.length < 2) return undefined;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(timer.current);
  }, [slides.length, paused]);

  const s = slides[idx % slides.length];
  const go = (n) => setIdx((n + slides.length) % slides.length);

  return (
    <Container className="pt-6">
      <div
        className={`relative h-[460px] overflow-hidden rounded-3xl shadow-[0_18px_48px_rgba(23,74,53,0.18)] md:h-[520px] xl:h-[560px] 2xl:h-[620px] ${s.bg}`}
        data-testid="hero-carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div key={s.key} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="absolute inset-0">
            <img src={s.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
            <div className={`absolute inset-0 bg-gradient-to-r ${s.tint || "from-charcoal/90 via-charcoal/55 to-transparent"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-y-0 left-0 z-10 flex w-full flex-col justify-center px-7 md:w-[62%] md:px-14 2xl:px-20">
          <AnimatePresence mode="wait">
            <motion.div key={s.key} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.55, ease: "easeOut" }}>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber/35 bg-charcoal/25 px-3 py-1 text-[11px] font-700 uppercase tracking-[0.2em] text-amber backdrop-blur-sm">
                {s.eyebrow}
              </p>
              {s.greeting && <p className="mt-3 font-serif text-base italic text-cream/90">{s.greeting}</p>}
              <h1 className="mt-2 font-serif text-[2.1rem] leading-[1.06] text-cream md:text-5xl lg:text-6xl">
                {s.title}<br /><span className="tricolour-text">{s.title2}</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-cream/80 md:text-base">{s.desc}</p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                {s.offer && <span className="rounded-full bg-amber px-4 py-1.5 text-sm font-800 text-charcoal">{s.offer.toUpperCase()}</span>}
                {offerEnds(s.end) && <span className="inline-flex items-center gap-2 text-xs text-cream/80"><Clock className="h-3.5 w-3.5" />Ends in <Countdown endIso={s.end} /></span>}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <PrimaryBtn onClick={() => navigate(s.to)} data-testid="hero-cta">{s.cta}<ArrowRight className="h-4 w-4" /></PrimaryBtn>
                <OutlineBtn onClick={() => navigate("/shop")} tone="onDark" data-testid="hero-shop-cta">Browse the full Shop</OutlineBtn>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* standing proof chips — visible on every slide */}
        <div className="absolute bottom-5 right-5 z-10 hidden max-w-[34%] flex-col gap-2 lg:flex">
          {[["Sourced in Odisha", "Six districts, named on every pack"],
            ["100% Pure & Genuine", "No fillers, no invented claims"],
            ["PDF invoice by email", "Every order, automatically"]].map(([h, b]) => (
            <div key={h} className="rounded-xl border border-cream/15 bg-charcoal/40 px-3.5 py-2.5 backdrop-blur-md">
              <p className="text-xs font-700 text-cream">{h}</p>
              <p className="text-[11px] leading-snug text-cream/65">{b}</p>
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 z-10 h-1" style={{ background: "linear-gradient(90deg,#FF9933,#ffffff,#138808)" }} />
        <button onClick={() => go(idx - 1)} aria-label="Previous slide" data-testid="hero-prev" className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-cream backdrop-blur transition-colors duration-200 hover:bg-white/35 md:block"><ChevronLeft className="h-5 w-5" /></button>
        <button onClick={() => go(idx + 1)} aria-label="Next slide" data-testid="hero-next" className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-cream backdrop-blur transition-colors duration-200 hover:bg-white/35 md:block"><ChevronRight className="h-5 w-5" /></button>
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((sl, i) => (
            <button key={sl.key} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${i === idx % slides.length ? "w-7 bg-amber" : "w-2 bg-cream/50 hover:bg-cream/80"}`} />
          ))}
        </div>
      </div>
    </Container>
  );
}

function CollectionRow({ eyebrow, title, sub, items, to, linkLabel, testid, Icon, Card = ProductCard, cols = "md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6" }) {
  if (!items || items.length === 0) return null;
  return (
    <Section data-testid={testid}>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-[0.22em] text-forest"><Icon className="h-4 w-4 text-amber" />{eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-charcoal md:text-4xl">{title}</h2>
            {sub && <p className="mt-2 text-sm text-charcoal/65">{sub}</p>}
          </div>
          <LangLink to={to} data-testid={`${testid}-link`} className="inline-flex items-center gap-1 font-600 text-forest hover:underline">{linkLabel} <ArrowRight className="h-4 w-4" /></LangLink>
        </div>
        <div className={`mt-7 grid grid-cols-2 gap-4 ${cols}`}>
          {items.map((p) => <Card key={p.slug} p={p} />)}
        </div>
      </Container>
    </Section>
  );
}

/** Teaser for the next festival, so the calendar is visible even off-season. */
function UpcomingFestivalStrip() {
  const fest = useFestivalTheme();
  const next = upcomingFestival();
  if (fest.festive || !next) return null;
  return (
    <Container className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/35 bg-amber/10 px-5 py-4"
        data-testid="upcoming-festival-strip" data-festival={next.key}>
        <p className="flex flex-wrap items-center gap-2 text-sm text-charcoal/80">
          <span className="text-lg leading-none">{next.emoji}</span>
          <span className="font-700 text-charcoal">{next.name}</span>
          <span className="text-charcoal/50">in {next.inDays} {next.inDays === 1 ? "day" : "days"}</span>
          <span className="hidden text-charcoal/40 sm:inline">·</span>
          <span className="hidden text-charcoal/65 sm:inline">{next.picks}</span>
        </p>
        <LangLink to="/shop" data-testid="upcoming-festival-cta"
          className="group inline-flex items-center gap-1.5 text-sm font-700 text-forest hover:underline">
          Stock up early <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </LangLink>
      </div>
    </Container>
  );
}

export default function Home() {
  const { t } = useI18n();
  const [data, setData] = useState({ categories: [], featured: [], articles: [], deals: [], recipes: [] });
  useSEO({
    title: "AaharNest — Know Your Food. Choose with Confidence.",
    description: "A trusted Indian marketplace to discover thoughtfully sourced Indian pantry staples from Odisha — millets, dals, flours, spices and cold-pressed oils — with clear labels, honest ingredients and traditional recipes.",
    jsonLd: { "@context": "https://schema.org", "@type": "Organization", name: "AaharNest", slogan: "Know your food. Choose with confidence.", url: window.location.origin },
  });

  useEffect(() => {
    (async () => {
      const [c, f, a, d, r] = await Promise.all([
        api.get("/categories"), api.get("/products?bestseller=true&limit=5"), api.get("/articles"),
        api.get("/products?todays_deal=true"), api.get("/recipes/preview"),
      ]);
      setData({
        categories: c.data.categories, featured: f.data.products, articles: a.data.articles.slice(0, 3),
        deals: d.data.products.slice(0, 5),
        recipes: r.data.recipes || [],
      });
    })().catch(() => {});
  }, []);

  return (
    <>
      <FestivalRibbon />
      <CategoryStrip cats={data.categories} />
      <HeroCarousel />

      {/* TRUST / USP STRIP */}
      <Container className="mt-10">
        <div className="grid grid-cols-2 gap-4 rounded-3xl border border-sage/30 bg-white p-5 shadow-[0_12px_32px_rgba(23,74,53,0.07)] md:grid-cols-4 md:p-7" data-testid="usp-strip">
          {TRUST.map(([Icon, title, sub]) => (
            <div key={title} className="group flex flex-col items-center gap-2 text-center" data-testid="trust-strip-item">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-forest transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <p className="text-sm font-700 text-charcoal">{t(title)}</p>
              <p className="text-xs text-charcoal/55">{t(sub)}</p>
            </div>
          ))}
        </div>
      </Container>

      <UpcomingFestivalStrip />

      {/* GROWN IN ODISHA — interactive sourcing map, the heart of the story */}
      <Container className="mt-12">
        <OdishaSourcingMap />
      </Container>

      {/* SHOP BY CATEGORY */}
      <Section>
        <Container>
          <SectionHeading eyebrow={t("nav.shop")} title={t("home.shopByCategory")} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {data.categories.slice(0, 6).map((c) => <CategoryCard key={c.slug} c={c} />)}
          </div>
          <div className="mt-6"><LangLink to="/categories" className="inline-flex items-center gap-1 font-600 text-forest hover:underline" data-testid="home-all-categories">{t("common.viewAll")} <ArrowRight className="h-4 w-4" /></LangLink></div>
        </Container>
      </Section>

      {/* TODAY'S DEALS — admin-selected, limited-time only */}
      <CollectionRow testid="home-daily-deals" Icon={Flame} eyebrow={t("home.todayOnly")}
        title={t("nav.deals")} sub={t("home.dealsSub")}
        items={data.deals} to="/daily-deals" linkLabel={t("home.seeAllDeals")} />

      {/* OUR TOP SELLING PRODUCTS — exactly 5, one row on desktop */}
      <Section className="bg-white">
        <Container>
          <div className="flex items-end justify-between">
            <SectionHeading eyebrow={t("home.pantry")} title={t("home.topSellers")} sub={t("home.topSellersSub")} />
            <LangLink to="/top-picks" className="mb-10 hidden items-center gap-1 font-600 text-forest hover:underline md:inline-flex" data-testid="home-all-products">{t("home.allFavourites")} <ArrowRight className="h-4 w-4" /></LangLink>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5" data-testid="home-top-sellers">
            {data.featured.slice(0, 5).map((p) => <ProductCard key={p.slug} p={p} />)}
          </div>
        </Container>
      </Section>

      {/* FOR ODIA FAMILIES EVERYWHERE */}
      <Section>
        <Container>
          <div className="overflow-hidden rounded-3xl border border-sage/30 bg-white shadow-[0_12px_32px_rgba(23,74,53,0.07)]" data-testid="home-diaspora">
            <div className="grid md:grid-cols-[1fr_1.25fr]">
              <div className="relative min-h-[240px]">
                <img src={ODISHA_BAND_IMAGE} alt="Terraced millet fields in the Koraput highlands of Odisha" loading="lazy"
                  className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/70 via-forest/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-serif text-xl text-cream">Koraput, Odisha</p>
                  <p className="text-xs text-cream/80">Where a good part of your basket begins</p>
                </div>
              </div>
              <div className="p-6 md:p-10">
                <Eyebrow>For Odia families, everywhere</Eyebrow>
                <h2 className="mt-2 font-serif text-2xl text-charcoal md:text-3xl">
                  Odisha on your shelf — <span className="text-forest">in Cuttack or in California</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-charcoal/70">
                  Thousands of Odia families live far from the belts their food comes from. AaharNest exists to
                  close that distance — the same mandia, the same Kandhamal haldi, the same kachi ghani oil, packed
                  and labelled honestly.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {DIASPORA.map(([Icon, h, b]) => (
                    <div key={h} data-testid="diaspora-card">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream text-forest">
                        <Icon className="h-5 w-5" strokeWidth={1.7} />
                      </span>
                      <h3 className="mt-2.5 text-sm font-700 leading-snug text-charcoal">{h}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-charcoal/60">{b}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <GreenBtn as={LangLink} to="/shop" data-testid="diaspora-shop-btn">Shop the Odisha shelf</GreenBtn>
                  <OutlineBtn as={LangLink} to="/support" data-testid="diaspora-support-btn">Ask about delivery</OutlineBtn>
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-charcoal/45">
                  Shipping coverage and charges are confirmed at checkout for your address.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* HEALTHY RECIPES */}
      {data.recipes.length > 0 && (
        <Section className="bg-white" data-testid="home-recipes">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-[0.22em] text-forest"><BookOpen className="h-4 w-4 text-amber" />Nest Kitchen</p>
                <h2 className="mt-2 font-serif text-3xl tracking-tight text-charcoal md:text-4xl">Healthy Indian Recipes</h2>
                <p className="mt-2 text-sm text-charcoal/65">Real dishes you can cook tonight with the grains, dals and spices on our shelves.</p>
              </div>
              <LangLink to="/recipes" data-testid="home-recipes-link" className="inline-flex items-center gap-1 font-600 text-forest hover:underline">Browse all recipes <ArrowRight className="h-4 w-4" /></LangLink>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">
              {data.recipes.slice(0, 4).map((r) => <RecipeCard key={r.slug} r={r} />)}
            </div>
          </Container>
        </Section>
      )}

      {/* WHY AAHARNEST */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Why AaharNest" title={t("home.whyTitle")} sub={t("home.whySub")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map(([n, title, body, Icon]) => (
              <motion.div key={n}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="rounded-2xl border border-sage/30 bg-cream/40 p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(23,74,53,0.1)]"
                data-testid={`why-card-${n}`}>
                <div className="flex items-center justify-between"><Icon className="h-7 w-7 text-forest" /><span className="font-serif text-3xl text-sage/50">{n}</span></div>
                <h3 className="mt-4 text-lg font-700 text-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{body}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ORGANIC TRANSPARENCY */}
      <Section className="bg-white">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-forest/20 bg-cream/50 p-8 md:p-12" data-testid="organic-transparency">
            <Quote className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-forest/5" />
            <Eyebrow>Organic transparency</Eyebrow>
            <h2 className="mt-2 font-serif text-3xl text-charcoal">We only claim what we can show you.</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {[
                ["Certification on the label, not the marketing", "A product shows an organic certification badge only when the certifying body and certificate details have actually been recorded for it. Everything else is described simply as what it is."],
                ["Compliance details are placeholders until supplied", "FSSAI licence and packer details read “to be updated” until the real supplier documents reach us. We would rather show a placeholder than a number we invented."],
                ["Food, not medicine", "Our descriptions stay on flavour, cooking and nutrition. We make no claims about curing, treating or preventing any condition."],
              ].map(([h, b]) => (
                <div key={h} className="rounded-2xl bg-white p-5 ring-1 ring-sage/30 transition-shadow duration-300 hover:shadow-md">
                  <BadgeCheck className="h-6 w-6 text-forest" />
                  <h3 className="mt-3 font-700 text-charcoal">{h}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* MADE IN INDIA */}
      <section className="relative overflow-hidden bg-charcoal py-20 text-cream grain" data-testid="made-in-india-section">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-saffron/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-indiagreen/10 blur-3xl" />
        <Container className="relative text-center">
          <div className="flex justify-center"><MadeInIndiaBadge /></div>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl"><span className="tricolour-text">Made in India</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-cream/75">From Indian farms and local producers to homes across India and the world. Supporting Indian farmers, producers and local businesses.</p>
          <OutlineBtn as={LangLink} to="/made-in-india" tone="onDark" className="mt-7" data-testid="home-made-in-india-btn">Learn more</OutlineBtn>
        </Container>
      </section>

      {/* The old "Our Farmers" split section was removed on request — the Odisha
          sourcing map band above already carries the farms story and links to /farmers. */}

      {/* COMMUNITY */}
      <Section>
        <Container>
          <div className="rounded-3xl border border-amber/40 bg-amber/10 p-8 md:p-12" data-testid="home-community">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow>Community</Eyebrow>
                <h2 className="mt-2 font-serif text-3xl text-charcoal">A Little From You. A Big Step for a Child.</h2>
                <p className="mt-3 max-w-2xl text-charcoal/70">At checkout you can voluntarily add ₹1 or ₹2 toward educational opportunities for underprivileged children in India. It is entirely optional and never pre-selected.</p>
              </div>
              <OutlineBtn as={LangLink} to="/community" data-testid="home-community-btn">How it works</OutlineBtn>
            </div>
          </div>
        </Container>
      </Section>

      {/* ARTICLES */}
      <Section className="bg-white">
        <Container>
          <SectionHeading eyebrow={t("home.learn")} title={t("home.articlesTitle")} />
          <div className="grid gap-5 md:grid-cols-3">{data.articles.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
        </Container>
      </Section>
    </>
  );
}
