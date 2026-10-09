/**
 * Odia + national festival calendar — date-driven, no admin action needed.
 *
 * Dates for lunar/solar festivals shift every year, so each festival carries an
 * explicit per-year window. Solar-calendar festivals (Raja, Makar Sankranti,
 * Republic/Independence Day, Christmas, New Year) repeat on fixed dates and use
 * `fixed` instead. A festival with no window for the current year simply never
 * activates — nothing is guessed.
 *
 * Everything here is static data, so the festive layer renders identically with
 * no backend (the paused-preview CDN build).
 */

const IMG = {
  diya: "https://images.unsplash.com/photo-1702247413045-aa486c6b0164?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  temple: "https://images.unsplash.com/photo-1572542090858-2b8968a0f4de?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  marigold: "https://images.unsplash.com/photo-1636036504904-ccb42dace056?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  harvest: "/images/festival-harvest.jpg",
  republic: "/images/festival-republic.jpg",
  diwaliLocal: "/images/festival-diwali.jpg",
};

/**
 * `fixed`: [month (1-12), day, spanDays]  — repeats every year
 * `years`: { 2026: ["MM-DD", spanDays], ... } — lunar festivals, per year
 *
 * tint  — gradient scrim classes laid over the festive image so headline text
 *         keeps its AA contrast on every slide.
 * accentHex — used for the ambient page glow, kept inside the brand palette.
 */
export const FESTIVALS = [
  {
    key: "makar-sankranti",
    name: "Makar Sankranti & Pongal",
    greeting: "Happy Makar Sankranti & Pongal — a harvest of health and happiness",
    greetingOr: "ମକର ସଂକ୍ରାନ୍ତି ଓ ପୋଙ୍ଗଲର ଶୁଭେଚ୍ଛା",
    blurb: "The first harvest of the year. New rice, jaggery and sesame — the sweetest start to a season.",
    emoji: "🌾",
    image: IMG.harvest,
    tint: "from-amber-950/85 via-amber-900/45 to-transparent",
    accentHex: "#D99A22",
    motif: "sun",
    picks: "New-harvest rice, organic jaggery, sesame and millets",
    fixed: [1, 14, 3],
  },
  {
    key: "republic-day",
    name: "Republic Day",
    greeting: "Celebrating India — Vocal for Local",
    greetingOr: "ଗଣତନ୍ତ୍ର ଦିବସର ଶୁଭେଚ୍ଛା",
    blurb: "Food grown by Indian farmers, packed in India, delivered to Indian homes across the world.",
    emoji: "🇮🇳",
    image: IMG.republic,
    tint: "from-charcoal/90 via-charcoal/55 to-transparent",
    accentHex: "#FF9933",
    motif: "tricolour",
    picks: "Made-in-India pantry staples",
    fixed: [1, 26, 2],
  },
  {
    key: "pana-sankranti",
    name: "Pana Sankranti — Odia New Year",
    greeting: "Subha Pana Sankranti — a cool, abundant Odia new year to you",
    greetingOr: "ଶୁଭ ପଣା ସଂକ୍ରାନ୍ତି — ନୂତନ ବର୍ଷର ଶୁଭେଚ୍ଛା",
    blurb: "Odisha's new year, cooled with bela pana. Summer begins with sweetness and shade.",
    emoji: "🏺",
    image: IMG.marigold,
    tint: "from-emerald-950/85 via-amber-950/45 to-transparent",
    accentHex: "#8FAF82",
    motif: "pot",
    picks: "Jaggery, cooling spices and summer sherbet staples",
    fixed: [4, 14, 2],
  },
  {
    key: "raja",
    name: "Raja Parba",
    greeting: "Happy Raja — celebrating mother earth, rest and good food",
    greetingOr: "ରଜ ପର୍ବର ଶୁଭେଚ୍ଛା",
    blurb: "Three days when Odisha lets the earth rest — swings, paan and a kitchen full of pitha.",
    emoji: "🌿",
    image: IMG.marigold,
    tint: "from-rose-950/85 via-emerald-950/45 to-transparent",
    accentHex: "#C85A32",
    motif: "swing",
    picks: "Poda pitha flours, organic jaggery and coconut",
    fixed: [6, 14, 4],
  },
  {
    key: "rath-yatra",
    name: "Rath Yatra",
    greeting: "Jai Jagannath — wishing you a blessed Rath Yatra",
    greetingOr: "ଜୟ ଜଗନ୍ନାଥ — ରଥଯାତ୍ରାର ଶୁଭେଚ୍ଛା",
    blurb: "Puri's grand chariot festival. Mahaprasad begins with honest grain, clean spice and good oil.",
    emoji: "🛕",
    image: IMG.temple,
    tint: "from-amber-950/85 via-red-950/50 to-transparent",
    accentHex: "#D99A22",
    motif: "wheel",
    picks: "Aromatic rice, stone-milled flours and khaja ingredients",
    years: { 2026: ["07-16", 4], 2027: ["07-05", 4], 2028: ["06-24", 4] },
  },
  {
    key: "nuakhai",
    name: "Nuakhai Juhar",
    greeting: "Nuakhai Juhar — the first grain of the harvest, shared with you",
    greetingOr: "ନୂଆଖାଇ ଜୁହାର",
    blurb: "Western Odisha greets the first rice of the season. Nothing tastes more like home.",
    emoji: "🌾",
    image: IMG.harvest,
    tint: "from-emerald-950/85 via-amber-950/45 to-transparent",
    accentHex: "#8FAF82",
    motif: "paddy",
    picks: "New-harvest fragrant rice, pitha millets and jaggery",
    years: { 2026: ["08-22", 3], 2027: ["09-10", 3], 2028: ["08-29", 3] },
  },
  {
    key: "independence-day",
    name: "Independence Day",
    greeting: "Happy Independence Day — Made in India, grown by Indian farmers",
    greetingOr: "ସ୍ୱାଧୀନତା ଦିବସର ଶୁଭେଚ୍ଛା",
    blurb: "A salute to the farmers who feed the country.",
    emoji: "🇮🇳",
    image: IMG.republic,
    tint: "from-charcoal/90 via-charcoal/55 to-transparent",
    accentHex: "#138808",
    motif: "tricolour",
    picks: "Farmer-direct staples from across India",
    fixed: [8, 15, 2],
  },
  {
    key: "durga-puja",
    name: "Durga Puja",
    greeting: "Shubho Durga Puja & Subha Bijaya — celebrate tradition, choose health",
    greetingOr: "ଶୁଭ ଦୁର୍ଗା ପୂଜା ଓ ଶୁଭ ବିଜୟା",
    blurb: "Pandal evenings and bhog kitchens. We stock the grain and spice that make them.",
    emoji: "🌺",
    image: IMG.marigold,
    tint: "from-red-950/85 via-amber-950/45 to-transparent",
    accentHex: "#C85A32",
    motif: "flower",
    picks: "Fragrant spices, aromatic rice and stone-milled flours",
    years: { 2026: ["10-17", 7], 2027: ["10-06", 7], 2028: ["09-25", 7] },
  },
  {
    key: "diwali",
    name: "Diwali & Kali Puja",
    greeting: "Subha Deepavali — wishing you a bright, abundant Diwali",
    greetingOr: "ଶୁଭ ଦୀପାବଳି",
    blurb: "Lamps, sweets and a clean pantry. Cold-pressed oil and real jaggery make all the difference.",
    emoji: "🪔",
    image: IMG.diya,
    tint: "from-amber-950/85 via-yellow-950/50 to-transparent",
    accentHex: "#E6B800",
    motif: "diya",
    picks: "Cold-pressed mustard oil, jaggery and dry fruits",
    years: { 2026: ["11-08", 5], 2027: ["10-29", 5], 2028: ["11-15", 5] },
  },
  {
    key: "christmas",
    name: "Christmas",
    greeting: "Merry Christmas — warmth, wholesome food and good company",
    greetingOr: "ବଡ଼ଦିନର ଶୁଭେଚ୍ଛା",
    blurb: "Baking season. Real jaggery, nuts and spice instead of the artificial stuff.",
    emoji: "🎄",
    image: IMG.diya,
    tint: "from-emerald-950/88 via-red-950/45 to-transparent",
    accentHex: "#138808",
    motif: "star",
    picks: "Dry fruits, jaggery and baking spices",
    fixed: [12, 24, 3],
  },
  {
    key: "new-year",
    name: "New Year",
    greeting: "Happy New Year — to a healthier, happier you",
    greetingOr: "ନୂତନ ବର୍ଷର ଶୁଭେଚ୍ଛା",
    blurb: "A fresh start deserves a cleaner shelf.",
    emoji: "✨",
    image: IMG.diya,
    tint: "from-indigo-950/88 via-charcoal/55 to-transparent",
    accentHex: "#D99A22",
    motif: "star",
    picks: "Millets, superfoods and wholegrain swaps",
    fixed: [12, 31, 2],
  },
];

/** Off-festival fallback — the brand's own seasonal mood, never a blank slot. */
export const DEFAULT_SEASON = {
  key: "everyday",
  name: "Grown in Odisha",
  greeting: "Wholesome food for a healthier you",
  greetingOr: "ସୁସ୍ଥ ଜୀବନ ପାଇଁ ଭଲ ଖାଦ୍ୟ",
  blurb: "Farm-direct millets, spices, flours and cold-pressed oils from the highlands of Odisha.",
  emoji: "🌿",
  image: null,
  tint: "from-forest/90 via-forest/55 to-transparent",
  accentHex: "#174A35",
  motif: "leaf",
  picks: "Everyday organic staples",
  festive: false,
};

const pad = (n) => String(n).padStart(2, "0");

function windowFor(f, year) {
  if (f.fixed) {
    const [m, d, span] = f.fixed;
    return { start: new Date(year, m - 1, d), span };
  }
  const y = f.years?.[year];
  if (!y) return null;
  const [md, span] = y;
  const [m, d] = md.split("-").map(Number);
  return { start: new Date(year, m - 1, d), span };
}

/**
 * The festival active on `date`, or null. A festival stays active for its whole
 * `span` in days, starting the day before the main date so the site is already
 * dressed when people start shopping for it.
 */
export function activeFestival(date = new Date()) {
  const year = date.getFullYear();
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  // check this year and the previous one, so a window spanning 31 Dec -> 1 Jan still matches
  for (const y of [year, year - 1]) {
    for (const f of FESTIVALS) {
      const w = windowFor(f, y);
      if (!w) continue;
      const from = new Date(w.start);
      from.setDate(from.getDate() - 1); // dress the site a day early
      const to = new Date(w.start);
      to.setDate(to.getDate() + w.span - 1);
      if (today >= from.setHours(0, 0, 0, 0) && today <= to.setHours(23, 59, 59, 999)) {
        return { ...f, festive: true, startsOn: `${y}-${pad(w.start.getMonth() + 1)}-${pad(w.start.getDate())}` };
      }
    }
  }
  return null;
}

/**
 * The festive theme to dress the app with right now. Always returns a usable
 * object — `festive` tells you whether it is an actual festival or the everyday
 * brand mood.
 */
export function useFestivalTheme(date) {
  return activeFestival(date) || DEFAULT_SEASON;
}

/** Next upcoming festival within `days`, for the "coming up" teaser. */
export function upcomingFestival(date = new Date(), days = 45) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let best = null;
  for (const y of [date.getFullYear(), date.getFullYear() + 1]) {
    for (const f of FESTIVALS) {
      const w = windowFor(f, y);
      if (!w) continue;
      const diff = Math.round((w.start - today) / 86400000);
      if (diff > 0 && diff <= days && (!best || diff < best.inDays)) {
        best = { ...f, inDays: diff };
      }
    }
  }
  return best;
}
