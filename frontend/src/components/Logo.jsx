import { LangLink } from "@/components/LangLink";

export function Logo({ className = "", onDark = false }) {
  return (
    <LangLink to="/" className={`inline-flex items-center gap-2 ${className}`} data-testid="logo-home-link" aria-label="AaharNest home">
      <img src="/brand/aaharnest-mark.png" alt="AaharNest"
        className={`h-9 w-9 object-contain ${onDark ? "rounded-lg bg-cream/95 p-0.5 shadow-sm" : ""}`}
        width="36" height="36" data-testid={onDark ? "footer-logo-mark" : "header-logo-mark"} />
      <span className="font-serif text-2xl font-700 leading-none tracking-tight">
        <span className={onDark ? "text-cream" : "text-forest"} data-testid="logo-aahar">Aahar</span>
        <span className="text-amber" data-testid="logo-nest">Nest</span>
      </span>
    </LangLink>
  );
}

export function NestMark({ className = "h-8 w-8", onDark = false }) {
  const leaf = onDark ? "#8FAF82" : "#174A35";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M6 30c4-6 12-9 18-9s14 3 18 9c-5 5-11 7-18 7s-13-2-18-7z" fill="none" stroke={leaf} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 31c3-3 8-5 14-5s11 2 14 5" fill="none" stroke={leaf} strokeWidth="1.6" opacity="0.6" />
      <path d="M24 20c0-5 3-9 7-11-1 5-3 8-7 11z" fill="#D99A22" />
      <path d="M24 20c0-4-2-8-6-10 1 4 2 7 6 10z" fill="#8FAF82" />
      <circle cx="21" cy="27" r="1.6" fill="#D99A22" />
      <circle cx="27" cy="28" r="1.6" fill="#D99A22" />
      <circle cx="24" cy="26" r="1.6" fill={leaf} />
    </svg>
  );
}

/* Brand mark printed onto the pack in product photography. */
export function PackBrandTag({ className = "", compact = false }) {
  return (
    <span
      className={`pointer-events-none inline-flex select-none items-center gap-1.5 rounded-full bg-cream/92 shadow-sm ring-1 ring-forest/15 backdrop-blur-[2px] ${compact ? "px-1.5 py-0.5" : "px-2 py-1"} ${className}`}
      data-testid="pack-brand-tag" aria-hidden="true">
      <img src="/brand/aaharnest-mark.png" alt="" className={compact ? "h-3 w-3 object-contain" : "h-4 w-4 object-contain"} />
      <span className={`font-serif font-700 leading-none tracking-tight ${compact ? "text-[9px]" : "text-[11px]"}`}>
        <span className="text-forest">Aahar</span><span className="text-amber">Nest</span>
      </span>
    </span>
  );
}
