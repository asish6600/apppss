import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useCampaign, themeMeta } from "@/components/PromoBanner";
import { LangLink } from "@/components/LangLink";

export function FestivalGreeting() {
  const c = useCampaign();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!c) return;
    const th = themeMeta(c.theme);
    if (!th.festive) return;
    const key = `an_greeting_${c.campaign_slug}`;
    if (localStorage.getItem(key)) return;
    const timer = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(timer);
  }, [c]);

  if (!c) return null;
  const th = themeMeta(c.theme);
  const close = () => {
    localStorage.setItem(`an_greeting_${c.campaign_slug}`, "1");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          data-testid="festival-greeting"
        >
          <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-amber/40 ${th.bg} ${th.text} shadow-2xl grain`}
          >
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: "linear-gradient(90deg,#FF9933,#ffffff,#138808)" }} />
            {th.art && <img src={th.art} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" />}
            <button onClick={close} aria-label="Close greeting" data-testid="festival-greeting-close" className="absolute right-3 top-3 z-10 rounded-full bg-white/15 p-1.5 text-current backdrop-blur transition hover:bg-white/25"><X className="h-4 w-4" /></button>
            <div className="relative px-7 py-9 text-center">
              <div className="text-5xl">{c.emoji || th.emoji}</div>
              <p className={`mt-4 inline-flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-[0.25em] ${th.accent}`}><Sparkles className="h-3.5 w-3.5" />{c.campaign_name}</p>
              <h2 className="mt-2 font-serif text-2xl leading-snug md:text-3xl">{c.greeting || th.greeting || "Warm festive wishes from AaharNest"}</h2>
              {c.max_discount_label && <p className="mt-3 inline-block rounded-full bg-amber px-4 py-1.5 text-sm font-800 text-charcoal">{c.max_discount_label.toUpperCase()}</p>}
              <p className="mt-4 text-sm opacity-80">From our farmers to your family — wholesome food for a healthier you.</p>
              <LangLink to="/shop?offers=1" onClick={close} data-testid="festival-greeting-cta"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-cream px-6 py-3 text-sm font-700 text-charcoal transition-transform hover:scale-[1.03]">
                {c.cta_text || "Shop the Offer"} <ArrowRight className="h-4 w-4" />
              </LangLink>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
