/**
 * Per-category iconography + tint. The catalogue's own slugs are the keys, so a
 * category keeps its icon in every one of the 7 locales (names are translated,
 * slugs are not). Anything unmapped falls back to a neutral leaf.
 */
import {
  Wheat, Bean, Sprout, Flame, Candy, Leaf, Nut, Soup, Croissant,
  Cookie, Sun, Sparkles, Boxes, HeartPulse, CupSoda,
} from "lucide-react";

export const CATEGORY_ICONS = {
  "organic-millets-grains": { Icon: Wheat, tint: "bg-[#FAF5E8]", ring: "ring-amber/35", fg: "text-amber-700", tagline: "Mandia & heritage grains" },
  "organic-pulses-dals": { Icon: Bean, tint: "bg-[#F3F7EF]", ring: "ring-sage/45", fg: "text-forest", tagline: "Kalahandi pulse bowl" },
  "organic-super-seeds": { Icon: Sprout, tint: "bg-[#EEF7F5]", ring: "ring-teal-300/50", fg: "text-teal-800", tagline: "Tiny seeds, dense nutrition" },
  "organic-spices": { Icon: Sparkles, tint: "bg-[#FEF9E7]", ring: "ring-yellow-300/50", fg: "text-yellow-800", tagline: "Kandhamal golden spice" },
  "cold-pressed-oils": { Icon: Flame, tint: "bg-[#FFF4EC]", ring: "ring-orange-300/50", fg: "text-orange-800", tagline: "Wood-churned kachi ghani" },
  "natural-sweeteners": { Icon: Candy, tint: "bg-[#FDF3E7]", ring: "ring-amber/35", fg: "text-amber-800", tagline: "Jaggery, not refined sugar" },
  "organic-tea": { Icon: CupSoda, tint: "bg-[#F0F7F2]", ring: "ring-emerald-300/50", fg: "text-emerald-800", tagline: "Whole-leaf & herbal" },
  "organic-nuts": { Icon: Nut, tint: "bg-[#F7F2EA]", ring: "ring-amber/30", fg: "text-amber-900", tagline: "Raw, unsalted, honest" },
  "organic-flours": { Icon: Soup, tint: "bg-[#FAF6EE]", ring: "ring-sage/40", fg: "text-forest", tagline: "Stone-milled atta" },
  "organic-breakfast": { Icon: Croissant, tint: "bg-[#FFF7E8]", ring: "ring-amber/30", fg: "text-amber-800", tagline: "Mornings done right" },
  "healthy-snacks": { Icon: Cookie, tint: "bg-[#FDF4F0]", ring: "ring-orange-200/60", fg: "text-orange-900", tagline: "Snack without the guilt" },
  "coconut-products": { Icon: Sun, tint: "bg-[#F6FAF6]", ring: "ring-sage/40", fg: "text-forest", tagline: "Coast-grown coconut" },
  "masala-blends": { Icon: Soup, tint: "bg-[#FEF4E6]", ring: "ring-amber/35", fg: "text-amber-800", tagline: "Freshly ground blends" },
  "wellness-foods": { Icon: HeartPulse, tint: "bg-[#F2F7F9]", ring: "ring-teal-200/60", fg: "text-teal-900", tagline: "Everyday wellness" },
  combos: { Icon: Boxes, tint: "bg-[#F4F2FA]", ring: "ring-indigo-200/60", fg: "text-indigo-900", tagline: "Save as a bundle" },
};

const FALLBACK = { Icon: Leaf, tint: "bg-cream", ring: "ring-sage/40", fg: "text-forest", tagline: "" };

export function categoryIcon(slug) {
  return CATEGORY_ICONS[slug] || FALLBACK;
}

/** Icon-only badge used on the category strip and category cards. */
export function CategoryGlyph({ slug, className = "", size = "h-5 w-5" }) {
  const { Icon, fg } = categoryIcon(slug);
  return <Icon className={`${size} ${fg} ${className}`} strokeWidth={1.7} aria-hidden />;
}
