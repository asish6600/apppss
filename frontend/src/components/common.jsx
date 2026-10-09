import { useEffect } from "react";

export function Container({ className = "", children }) {
  return <div className={`mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-10 2xl:px-14 ${className}`}>{children}</div>;
}

export function Section({ className = "", children, ...p }) {
  return <section className={`py-16 md:py-20 ${className}`} {...p}>{children}</section>;
}

export function SectionHeading({ eyebrow, title, sub, center = false, light = false }) {
  return (
    <div className={`${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} mb-10`}>
      {eyebrow && <p className={`text-xs font-700 uppercase tracking-[0.22em] ${light ? "text-amber" : "text-forest"}`}>{eyebrow}</p>}
      <h2 className={`mt-2 font-serif text-3xl tracking-tight md:text-4xl ${light ? "text-cream" : "text-charcoal"}`}>{title}</h2>
      {sub && <p className={`mt-3 text-base ${light ? "text-cream/75" : "text-charcoal/65"}`}>{sub}</p>}
    </div>
  );
}

export function PrimaryBtn({ as: As = "button", className = "", children, ...props }) {
  return <As className={`inline-flex items-center justify-center gap-2 rounded-full bg-amber px-6 py-3 text-sm font-700 text-charcoal transition-transform duration-200 hover:scale-[1.02] hover:bg-amber/90 focus:outline-none focus:ring-2 focus:ring-forest ${className}`} {...props}>{children}</As>;
}

export function GreenBtn({ as: As = "button", className = "", children, ...props }) {
  return <As className={`inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-600 text-cream transition-colors hover:bg-forest/90 focus:outline-none focus:ring-2 focus:ring-forest ${className}`} {...props}>{children}</As>;
}

/**
 * Outlined button. `tone="onDark"` is required when placing it on a dark surface
 * (hero, Made-in-India band, promo banner): passing `text-cream` via className does
 * NOT work, because Tailwind emits both that and the base `text-forest` at equal
 * specificity and the stylesheet order decides the winner — which silently rendered
 * dark-on-dark text. Swapping the base classes avoids the conflict entirely.
 */
export function OutlineBtn({ as: As = "button", tone = "default", className = "", children, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-600 transition-colors focus:outline-none focus:ring-2";
  const tones = {
    default: "border border-forest text-forest hover:bg-forest hover:text-cream focus:ring-forest",
    onDark: "border border-cream/60 text-cream hover:bg-cream hover:text-charcoal focus:ring-cream",
    danger: "border border-destructive text-destructive hover:bg-destructive hover:text-cream focus:ring-destructive",
  };
  return <As className={`${base} ${tones[tone] || tones.default} ${className}`} {...props}>{children}</As>;
}

export function Spinner({ className = "" }) {
  return <div className={`h-6 w-6 animate-spin rounded-full border-2 border-sage border-t-forest ${className}`} />;
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-sage/30 bg-white">
          <div className="aspect-square bg-cream" />
          <div className="space-y-2 p-4"><div className="h-4 w-3/4 rounded bg-cream" /><div className="h-4 w-1/3 rounded bg-cream" /><div className="h-9 rounded-full bg-cream" /></div>
        </div>
      ))}
    </div>
  );
}

export function useSEO({ title, description, jsonLd } = {}) {
  useEffect(() => {
    if (title) document.title = title.includes("AaharNest") ? title : `${title} · AaharNest`;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
      m.setAttribute("content", description);
    }
    let script;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => { if (script) document.head.removeChild(script); };
  }, [title, description, jsonLd]);
}

export function EmptyState({ icon: Icon, title, sub, cta }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-sage/50 bg-white/50 py-16 text-center">
      {Icon && <Icon className="h-10 w-10 text-sage" />}
      <div className="space-y-1.5">
        <p className="text-charcoal/70">{title}</p>
        {sub && <p className="mx-auto max-w-sm px-4 text-sm text-charcoal/50">{sub}</p>}
      </div>
      {cta}
    </div>
  );
}
