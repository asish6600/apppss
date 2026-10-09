/**
 * Festival backdrop — the app-wide seasonal layer.
 *
 * Mounted once in Layout.jsx so the festive mood reaches every page, not just the
 * home page. It is purely decorative: a fixed, very low-opacity image wash plus two
 * ambient colour glows behind all content (`-z-10`, `pointer-events-none`), so it
 * can never intercept a click or drop text contrast. Content keeps its own solid
 * surfaces, which is what guarantees AA.
 *
 * Driven entirely by the date (lib/festivals.js) — static, no fetch.
 */
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useFestivalTheme } from "@/lib/festivals";
import { LangLink } from "@/components/LangLink";

export function FestivalBackdrop() {
  const f = useFestivalTheme();
  if (!f.festive) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden
      data-testid="festival-backdrop" data-festival={f.key}>
      {f.image && (
        <img src={f.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.07]" />
      )}
      <div className="absolute inset-0 bg-cream/80" />
      <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: f.accentHex, opacity: 0.1 }} />
      <div className="absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{ background: "#8FAF82", opacity: 0.1 }} />
    </div>
  );
}

/**
 * Slim festive ribbon for the top of the home page. Carries the greeting in English
 * and Odia — the Odia line is the point for a diaspora audience.
 */
export function FestivalRibbon() {
  const f = useFestivalTheme();
  if (!f.festive) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="relative overflow-hidden border-b border-amber/30 bg-forest text-cream"
      data-testid="festival-ribbon" data-festival={f.key}
    >
      {f.image && <img src={f.image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-25" />}
      <div className={`absolute inset-0 bg-gradient-to-r ${f.tint}`} />
      <div className="relative mx-auto flex max-w-shell flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center">
        <span className="text-base leading-none">{f.emoji}</span>
        <span className="text-[11px] font-700 uppercase tracking-[0.2em] text-amber">{f.name}</span>
        <span className="hidden text-cream/30 sm:inline">·</span>
        <span className="text-xs font-600 text-cream/90 sm:text-sm" data-testid="festival-ribbon-greeting">{f.greeting}</span>
        <span className="hidden text-cream/30 md:inline">·</span>
        <span className="hidden font-sans text-xs text-amber/90 md:inline">{f.greetingOr}</span>
        <LangLink to="/shop?offers=1" data-testid="festival-ribbon-cta"
          className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber px-3 py-1 text-[11px] font-800 text-charcoal transition-transform duration-200 hover:scale-105">
          <Sparkles className="h-3 w-3" /> Festive picks
        </LangLink>
      </div>
    </motion.div>
  );
}

export default FestivalBackdrop;
