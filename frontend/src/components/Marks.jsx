export function IndiaFlagIcon({ className = "h-4 w-5" }) {
  // Premium tricolour with a navy Ashoka Chakra (24 spokes)
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg viewBox="0 0 30 20" className={className} role="img" aria-label="Flag of India">
      <defs>
        <clipPath id="flag-rounded"><rect x="0.5" y="0.5" width="29" height="19" rx="3" ry="3" /></clipPath>
      </defs>
      <g clipPath="url(#flag-rounded)">
        <rect x="0" y="0" width="30" height="6.667" fill="#FF9933" />
        <rect x="0" y="6.667" width="30" height="6.667" fill="#FFFFFF" />
        <rect x="0" y="13.333" width="30" height="6.667" fill="#138808" />
        <g stroke="#0A3A8B" fill="none">
          <circle cx="15" cy="10" r="2.6" strokeWidth="0.35" />
          <circle cx="15" cy="10" r="0.5" fill="#0A3A8B" stroke="none" />
          {spokes.map((a) => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={15} y1={10} x2={15 + 2.6 * Math.cos(r)} y2={10 + 2.6 * Math.sin(r)} strokeWidth="0.18" />;
          })}
        </g>
      </g>
      <rect x="0.5" y="0.5" width="29" height="19" rx="3" ry="3" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
    </svg>
  );
}

export function MadeInIndiaBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-sage/50 bg-white px-3 py-1 text-xs font-600 ${className}`} data-testid="made-in-india-badge">
      <IndiaFlagIcon className="h-3.5 w-5 shrink-0 rounded-[3px] shadow-sm" />
      <span className="tricolour-text font-700">Made in India</span>
    </span>
  );
}

export function PureGenuineSeal({ className = "h-5 w-5" }) {
  // Scalloped seal with a check — reads as a stamp of authenticity at any size.
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 16;
    const r = i % 2 === 0 ? 11 : 9.2;
    return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="100% pure and genuine">
      <polygon points={points} fill="currentColor" opacity="0.18" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="12" cy="12" r="6.4" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <path d="M8.6 12.3l2.4 2.4 4.4-4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PureGenuineBadge({ onDark = false, className = "" }) {
  return (
    <span
      data-testid="pure-genuine-badge"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-600 ${
        onDark ? "border-amber/45 bg-cream/10 text-cream" : "border-sage/50 bg-white text-forest"
      } ${className}`}
    >
      <PureGenuineSeal className={`h-4 w-4 shrink-0 ${onDark ? "text-amber" : "text-forest"}`} />
      <span className="font-700">100% Pure &amp; Genuine</span>
    </span>
  );
}

export function TricolourHeading({ children, className = "" }) {
  return <span className={`tricolour-text ${className}`}>{children}</span>;
}

export function Eyebrow({ children, className = "" }) {
  return <p className={`text-xs font-700 uppercase tracking-[0.22em] text-forest ${className}`}>{children}</p>;
}
