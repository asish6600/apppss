/**
 * Odisha sourcing map — the real surveyed state boundary.
 *
 * Renders all 30 Odisha districts from open census GeoJSON (see lib/odishaGeo.js),
 * with the eight AaharNest sourcing districts highlighted and selectable. The shapes
 * themselves are the hit targets, so the map is genuinely interactive rather than a
 * picture with dots on top. Inline SVG: no tile server, no map library, nothing fetched.
 *
 * Fully static — renders identically with no backend.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Sprout } from "lucide-react";
import { LangLink } from "@/components/LangLink";
import { ODISHA_VIEWBOX, ODISHA_DISTRICT_PATHS, ODISHA_CENTROIDS, SOURCING_DISTRICTS } from "@/lib/odishaGeo";

/**
 * Sourcing story per district. `name` must match the GeoJSON district name exactly —
 * that is the key used for the boundary path and the centroid.
 * We do not sell honey or ghee, so nothing here lists either.
 */
export const DISTRICTS = [
  {
    key: "koraput", name: "Koraput",
    belt: "Eastern Ghats highlands",
    crops: "Finger millet (mandia), highland coffee, black pepper",
    note: "Terraced smallholdings at roughly 3,000 ft — cool nights, slow-grown grain.",
    to: "/categories/organic-millets-grains",
  },
  {
    key: "kandhamal", name: "Kandhamal",
    belt: "Organic turmeric valley",
    crops: "Kandhamal haldi (GI-tagged turmeric), ginger, wild spices",
    note: "Turmeric grown without chemical input, prized for its deep colour.",
    to: "/categories/organic-spices",
  },
  {
    key: "rayagada", name: "Rayagada",
    belt: "Millet belt",
    crops: "Little millet, foxtail millet, pulses",
    note: "One of India's most active millet-revival districts.",
    to: "/categories/organic-millets-grains",
  },
  {
    key: "kalahandi", name: "Kalahandi",
    belt: "Pulse bowl",
    crops: "Arhar, moong, kulthi and local rice",
    note: "Black cotton soil that grows dense, clean-tasting dal.",
    to: "/categories/organic-pulses-dals",
  },
  {
    key: "ganjam", name: "Ganjam",
    belt: "Southern coastal plain",
    crops: "Groundnut, sesame, coconut and coastal rice",
    note: "Berhampur is the trading hub for this belt — groundnut and sesame for cold-pressed oil.",
    to: "/categories/cold-pressed-oils",
  },
  {
    key: "kendujhar", name: "Kendujhar",
    belt: "Iron-hill plateau",
    crops: "Niger seed, pulses, upland rice and millets",
    note: "Rain-fed uplands where niger and small millets grow between the hills.",
    to: "/categories/organic-super-seeds",
  },
  {
    key: "mayurbhanj", name: "Mayurbhanj",
    belt: "Simlipal forest fringe",
    crops: "Oilseeds, pulses and tubers",
    note: "Smallholder plots on the forest edge, farmed on the seasonal rains.",
    to: "/categories/organic-pulses-dals",
  },
  {
    key: "sundargarh", name: "Sundargarh",
    belt: "Northern plateau",
    crops: "Oilseeds, mustard, groundnut",
    note: "Mustard for cold-pressed, wood-churned kachi ghani oil.",
    to: "/categories/cold-pressed-oils",
  },
];

const BY_NAME = Object.fromEntries(DISTRICTS.map((d) => [d.name, d]));
const SOURCING = new Set(SOURCING_DISTRICTS);
const { w: VW, h: VH } = ODISHA_VIEWBOX;

/**
 * The "Grown in Odisha" sourcing band. `variant="plain"` drops the outer card for use
 * inside an existing section.
 */
export function OdishaSourcingMap({ variant = "band", className = "" }) {
  const [activeName, setActiveName] = useState("Kandhamal");
  const active = BY_NAME[activeName] || DISTRICTS[1];
  const centroid = ODISHA_CENTROIDS[active.name];

  const map = (
    <div className="relative mx-auto w-full max-w-[460px]" data-testid="odisha-map">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="h-auto w-full overflow-visible" role="img"
        aria-label="Map of Odisha showing AaharNest's eight sourcing districts">
        <defs>
          <linearGradient id="an-od-src" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E0A52F" />
            <stop offset="100%" stopColor="#C9881B" />
          </linearGradient>
          <filter id="an-od-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#D99A22" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Non-sourcing districts: quiet context so the state still reads as Odisha */}
        <g>
          {Object.entries(ODISHA_DISTRICT_PATHS)
            .filter(([n]) => !SOURCING.has(n))
            .map(([n, d]) => (
              <path key={n} d={d} fill="#1A5038" fillOpacity="0.55"
                stroke="#8FAF82" strokeOpacity="0.22" strokeWidth="0.7" />
            ))}
        </g>

        {/* Sourcing districts: highlighted and interactive */}
        <g>
          {DISTRICTS.map((d) => {
            const on = d.name === activeName;
            return (
              <path
                key={d.name}
                d={ODISHA_DISTRICT_PATHS[d.name]}
                fill={on ? "url(#an-od-src)" : "#B8821F"}
                fillOpacity={on ? 1 : 0.62}
                stroke={on ? "#FFF6E2" : "#E8CB8A"}
                strokeOpacity={on ? 0.95 : 0.45}
                strokeWidth={on ? 1.8 : 0.8}
                filter={on ? "url(#an-od-glow)" : undefined}
                className="cursor-pointer transition-[fill-opacity,stroke-opacity] duration-200 hover:fill-opacity-90 focus:outline-none"
                tabIndex={0}
                role="button"
                aria-label={`${d.name} — ${d.crops}`}
                aria-pressed={on}
                onMouseEnter={() => setActiveName(d.name)}
                onFocus={() => setActiveName(d.name)}
                onClick={() => setActiveName(d.name)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveName(d.name); } }}
                data-testid={`odisha-shape-${d.key}`}
              />
            );
          })}
        </g>

        {/* Marker + label for the active district only, so the map stays legible */}
        {centroid && (
          <g pointerEvents="none" data-testid="odisha-active-marker">
            <circle cx={centroid[0]} cy={centroid[1]} r="11" fill="#F8F5EC" fillOpacity="0.28"
              className="animate-pin-pulse" style={{ transformOrigin: `${centroid[0]}px ${centroid[1]}px` }} />
            <circle cx={centroid[0]} cy={centroid[1]} r="5" fill="#F8F5EC" stroke="#174A35" strokeWidth="2" />
            <text x={centroid[0]} y={centroid[1] - 13} textAnchor="middle"
              className="font-sans" fontSize="15" fontWeight="700"
              fill="#F8F5EC" stroke="#123B2A" strokeWidth="3.5" paintOrder="stroke">
              {active.name}
            </text>
          </g>
        )}
      </svg>
      <span className="absolute bottom-6 right-1 text-[10px] uppercase tracking-widest text-cream/35">
        Bay of Bengal
      </span>
    </div>
  );

  const detail = (
    <div className="flex flex-col gap-5">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/45 bg-cream/10 px-3 py-1 text-[11px] font-700 uppercase tracking-widest text-amber">
          <MapPin className="h-3.5 w-3.5" /> Grown in Odisha
        </span>
        <h2 className="mt-3 font-serif text-2xl leading-tight text-cream md:text-4xl">
          Eight districts. <span className="text-amber">One honest shelf.</span>
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-cream/75 md:text-base">
          Every AaharNest product is sourced from organic farms in Odisha — the millet terraces
          of the Eastern Ghats, the turmeric valleys of Kandhamal, the groundnut plains around
          Berhampur. Tap a district to see what grows there.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" data-testid="odisha-district-pills">
        {DISTRICTS.map((d) => (
          <button key={d.key} type="button" onClick={() => setActiveName(d.name)}
            data-testid={`odisha-district-${d.key}`}
            className={`rounded-full px-3 py-1 text-[11px] font-700 ring-1 transition-colors duration-200 ${
              d.name === activeName
                ? "bg-amber text-charcoal ring-amber"
                : "bg-cream/10 text-cream/85 ring-cream/20 hover:bg-cream/20"
            }`}>
            {d.name}
          </button>
        ))}
      </div>

      <motion.div key={active.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-2xl border border-cream/15 bg-cream/[0.07] p-5 backdrop-blur-sm"
        data-testid="odisha-district-detail">
        <p className="text-[11px] font-700 uppercase tracking-widest text-amber">{active.belt}</p>
        <h3 className="mt-1 font-serif text-xl text-cream" data-testid="odisha-active-district">{active.name}</h3>
        <p className="mt-2 flex items-start gap-2 text-sm text-cream/85">
          <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
          <span>{active.crops}</span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-cream/60">{active.note}</p>
        <LangLink to={active.to} data-testid={`odisha-shop-${active.key}`}
          className="group mt-4 inline-flex items-center gap-1.5 text-sm font-700 text-amber hover:underline">
          Shop from {active.name}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </LangLink>
      </motion.div>

      <LangLink to="/farmers" data-testid="odisha-map-farmers-link"
        className="group inline-flex items-center gap-1.5 text-sm font-600 text-cream/80 hover:text-cream">
        Meet the farms behind your food
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </LangLink>
    </div>
  );

  const inner = (
    <div className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-12">
      <div className="order-2 md:order-1">{map}</div>
      <div className="order-1 md:order-2">{detail}</div>
    </div>
  );

  if (variant === "plain") return <div className={className}>{inner}</div>;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-3xl border border-amber/25 bg-[#123B2A] p-6 shadow-[0_18px_48px_rgba(23,74,53,0.22)] md:p-12 grain ${className}`}
      data-testid="odisha-sourcing-band"
    >
      <div className="absolute inset-x-0 top-0 h-1"
        style={{ background: "linear-gradient(90deg,#FF9933,#ffffff,#138808)" }} />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-sage/10 blur-3xl" />
      <div className="relative">{inner}</div>
    </motion.section>
  );
}

export default OdishaSourcingMap;
