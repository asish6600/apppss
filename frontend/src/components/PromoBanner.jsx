import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Clock } from "lucide-react";
import api from "@/lib/api";
import { PrimaryBtn, OutlineBtn } from "@/components/common";
import { LangLink } from "@/components/LangLink";

export function useCampaign() {
  const [c, setC] = useState(null);
  useEffect(() => { api.get("/campaign/active").then((r) => setC(r.data.campaign)).catch(() => {}); }, []);
  return c;
}

export const THEMES = {
  launch: { bg: "bg-charcoal", text: "text-cream", accent: "text-amber", emoji: "🌾", art: null, greeting: "", festive: false },
  diwali: { bg: "bg-[#2a1630]", text: "text-cream", accent: "text-amber", emoji: "🪔", art: "/images/festival-diwali.jpg", greeting: "Wishing you a bright, abundant Diwali 🪔", festive: true },
  "durga-puja": { bg: "bg-[#7a1f2b]", text: "text-cream", accent: "text-amber", emoji: "🌺", art: "/images/festival-harvest.jpg", greeting: "Shubho Durga Puja! Celebrate tradition, choose health 🌺", festive: true },
  navratri: { bg: "bg-[#8a1f5c]", text: "text-cream", accent: "text-amber", emoji: "🕉️", art: "/images/festival-harvest.jpg", greeting: "Happy Navratri — nine nights of light and goodness 🪩", festive: true },
  "ganesh-chaturthi": { bg: "bg-[#9a3412]", text: "text-cream", accent: "text-amber", emoji: "🐘", art: "/images/festival-harvest.jpg", greeting: "Ganpati Bappa Morya! Wishing you joy and prosperity 🐘", festive: true },
  holi: { bg: "bg-[#6d28d9]", text: "text-cream", accent: "text-amber", emoji: "🎨", art: "/images/festival-harvest.jpg", greeting: "Happy Holi — a splash of colour and wholesome joy 🎨", festive: true },
  "raksha-bandhan": { bg: "bg-[#9d174d]", text: "text-cream", accent: "text-amber", emoji: "🪢", art: "/images/festival-harvest.jpg", greeting: "Happy Raksha Bandhan — celebrate the bond 🪢", festive: true },
  pongal: { bg: "bg-forest", text: "text-cream", accent: "text-amber", emoji: "🌾", art: "/images/festival-harvest.jpg", greeting: "Happy Pongal — a harvest of health and happiness 🌾", festive: true },
  onam: { bg: "bg-[#065f46]", text: "text-cream", accent: "text-amber", emoji: "🌼", art: "/images/festival-harvest.jpg", greeting: "Happy Onam — a bountiful Sadhya season to you 🌼", festive: true },
  eid: { bg: "bg-[#064e3b]", text: "text-cream", accent: "text-amber", emoji: "🌙", art: "/images/festival-harvest.jpg", greeting: "Eid Mubarak — warmth, gratitude and good food 🌙", festive: true },
  christmas: { bg: "bg-[#7f1d1d]", text: "text-cream", accent: "text-amber", emoji: "🎄", art: "/images/festival-harvest.jpg", greeting: "Merry Christmas — wishing you warmth and wholesome cheer 🎄", festive: true },
  "new-year": { bg: "bg-[#1e3a8a]", text: "text-cream", accent: "text-amber", emoji: "✨", art: "/images/festival-harvest.jpg", greeting: "Happy New Year — to a healthier, happier you ✨", festive: true },
  "republic-day": { bg: "bg-charcoal", text: "text-cream", accent: "text-amber", emoji: "🇮🇳", art: "/images/festival-republic.jpg", greeting: "Celebrating India — Vocal for Local 🇮🇳", festive: true },
  "independence-day": { bg: "bg-charcoal", text: "text-cream", accent: "text-amber", emoji: "🇮🇳", art: "/images/festival-republic.jpg", greeting: "Happy Independence Day — Made in India 🇮🇳", festive: true },
  harvest: { bg: "bg-forest", text: "text-cream", accent: "text-amber", emoji: "🌾", art: "/images/festival-harvest.jpg", greeting: "A warm, bountiful harvest season to you 🌾", festive: true },
};
export const THEME_KEYS = Object.keys(THEMES);
export const themeMeta = (t) => THEMES[t] || THEMES.launch;
const themeOf = (t) => THEMES[t] || THEMES.launch;

export function offerEnds(endIso) {
  if (!endIso) return null;
  const end = new Date(endIso);
  if (isNaN(end) || end < new Date()) return null;
  return end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function diff(endIso) {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  let s = Math.max(0, Math.floor((end - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return { d, h, m, s, done: end <= now };
}

export function Countdown({ endIso, className = "", light = true }) {
  const [t, setT] = useState(() => diff(endIso));
  useEffect(() => {
    if (!endIso) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setT(diff(endIso));
    if (reduce) return; // static for reduced motion
    const id = setInterval(() => setT(diff(endIso)), 1000);
    return () => clearInterval(id);
  }, [endIso]);
  if (!endIso || t.done) return null;
  const cell = (v, l) => (
    <div className="flex flex-col items-center">
      <span className={`min-w-[2.2rem] rounded-lg px-2 py-1 font-800 tabular-nums ${light ? "bg-cream/15 text-cream" : "bg-charcoal/10 text-charcoal"}`} data-testid={`countdown-${l}`}>{String(v).padStart(2, "0")}</span>
      <span className={`mt-1 text-[10px] uppercase tracking-wider ${light ? "text-cream/60" : "text-charcoal/50"}`}>{l}</span>
    </div>
  );
  return (
    <div className={`inline-flex items-end gap-1.5 ${className}`} data-testid="countdown">
      {cell(t.d, "days")}<span className={light ? "text-cream/40 pb-5" : "text-charcoal/40 pb-5"}>:</span>
      {cell(t.h, "hrs")}<span className={light ? "text-cream/40 pb-5" : "text-charcoal/40 pb-5"}>:</span>
      {cell(t.m, "min")}<span className={light ? "text-cream/40 pb-5" : "text-charcoal/40 pb-5"}>:</span>
      {cell(t.s, "sec")}
    </div>
  );
}

export function PromoBanner({ compact = false }) {
  const c = useCampaign();
  if (!c) return null;
  const th = themeOf(c.theme);
  const emoji = c.emoji || th.emoji;
  const art = c.banner_image && c.banner_image.startsWith("/") ? c.banner_image : th.art;
  const greeting = c.greeting || th.greeting;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-3xl border border-amber/40 grain ${th.bg} ${th.text}`}
      data-testid="promo-banner"
    >
      {art && <>
        <img src={art} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className={`absolute inset-0 ${th.bg} opacity-60`} />
        <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-current to-transparent opacity-0" />
      </>}
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg,#FF9933,#ffffff,#138808)", backgroundSize: "200% auto", animation: "tricolour-shift 6s linear infinite" }} />
      <div className={`relative flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between ${compact ? "md:p-7" : "md:p-10"}`}>
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className={`inline-flex items-center gap-2 text-xs font-700 uppercase tracking-[0.22em] ${th.accent}`}>
            <Sparkles className="h-4 w-4" /> {emoji} {c.campaign_name}
          </motion.p>
          {greeting && <p className="mt-1 font-serif text-base italic opacity-90" data-testid="promo-greeting">{greeting}</p>}
          <h2 className={`mt-2 font-serif ${compact ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}>
            Good Food. <span className="tricolour-text">Better Prices.</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm opacity-75">{c.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.25, type: "spring", stiffness: 180 }}
              className="inline-block rounded-full bg-amber px-4 py-1.5 text-sm font-800 text-charcoal"
            >
              {(c.max_discount_label || "Special offer").toUpperCase()} *
            </motion.span>
            {offerEnds(c.end_at) && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs opacity-70"><Clock className="h-3.5 w-3.5" />Ends in</span>
                <Countdown endIso={c.end_at} />
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <PrimaryBtn as={LangLink} to="/shop?offers=1" data-testid="promo-shop-offer-btn">{c.cta_text || "Shop the Offer"} <ArrowRight className="h-4 w-4" /></PrimaryBtn>
          <OutlineBtn as={LangLink} to="/shop" tone="onDark">View all products</OutlineBtn>
        </div>
      </div>
      <p className="px-6 pb-4 text-[11px] opacity-50 md:px-10">*Discounts apply only to selected products, where shown.</p>
    </motion.div>
  );
}
