import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Sprout, HandCoins, BadgeCheck, Truck, Leaf, HeartHandshake, Loader2, ArrowRight, MapPin } from "lucide-react";
import api, { apiError } from "@/lib/api";
import { Container, Section, SectionHeading, PrimaryBtn, OutlineBtn, GreenBtn, PageLoader, useSEO } from "@/components/common";
import { Eyebrow, MadeInIndiaBadge } from "@/components/Marks";
import { RecipeCard } from "@/components/cards";
import { LangLink } from "@/components/LangLink";
import { POLICIES, POLICY_UPDATED, SUPPORT_EMAIL } from "@/constants/legal";

const ODISHA_BELTS = [
  { name: "Koraput", crops: "Finger millet (mandia), minor millets, rajma", note: "Terraced, rain-fed highlands — one of India's oldest millet landscapes." },
  { name: "Kandhamal", crops: "Hill turmeric, ginger", note: "Shade-grown turmeric from the hills, prized for its aroma." },
  { name: "Rayagada", crops: "Millets, niger seed, pulses", note: "Smallholder plots on the Eastern Ghats slopes." },
  { name: "Kalahandi", crops: "Chana, moong, arhar, oilseeds", note: "Pulse-growing belt worked largely by collectives." },
  { name: "Mayurbhanj", crops: "Oilseeds, pulses and tubers", note: "Forest-fringe smallholdings farmed on the seasonal rains." },
  { name: "Ganjam", crops: "Groundnut, sesame, coconut, coastal rice", note: "Berhampur is the trading hub for this southern coastal belt." },
  { name: "Kendujhar", crops: "Niger seed, pulses, upland rice and millets", note: "Rain-fed uplands where niger and small millets grow between the hills." },
  { name: "Sundargarh", crops: "Rice, sesame, vegetables", note: "Mixed cropping on plateau soils in the state's north-west." },
];

const JOURNEY = [
  { title: "Grown in Odisha", body: "Sown on smallholder plots across the belts above — rain-fed wherever the crop allows, with the season decided by the land, not a calendar." },
  { title: "Harvested & dried at the village", body: "Grain, pulses and spices are cleaned and sun-dried close to where they grew, so less is lost on the road." },
  { title: "Checked & packed", body: "Lots are checked for moisture, foreign matter and grade, then packed in our own pack sizes — nothing re-bagged from an unnamed mix." },
  { title: "Delivered to your home", body: "Shipped pan-India from Odisha. The state on the pack is the state it grew in." },
];

const ODISHA_IMAGES = {
  millet: "https://static.prod-images.emergentagent.com/jobs/1e4cac8e-6b03-4e8a-9a3c-2e437491018a/images/b54e08b8c9714c9c2e4b15c085dd9b1f6cfd3912445d8e85e97073b3719ad6f6.jpeg",
  turmeric: "https://static.prod-images.emergentagent.com/jobs/1e4cac8e-6b03-4e8a-9a3c-2e437491018a/images/c7ca9cb79ab3db8c4eedb4c41800d91c68e429e2ce69d1e9579d814b66873b2f.jpeg",
  pulses: "https://static.prod-images.emergentagent.com/jobs/1e4cac8e-6b03-4e8a-9a3c-2e437491018a/images/c900704c5153de20c9740d930e32184bcdab237ec374b4c21df6f004cae9ffc7.jpeg",
};

export function Farmers() {
  const [farmers, setFarmers] = useState(null);
  useSEO({
    title: "Our Farmers in Odisha · AaharNest",
    description: "Every AaharNest product is sourced from organic farms in Odisha — Koraput, Kandhamal, Rayagada, Kalahandi, Mayurbhanj and Sundargarh. See where your food grows.",
  });
  useEffect(() => { api.get("/farmers").then((r) => setFarmers(r.data.farmers)).catch(() => setFarmers([])); }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-forest py-20 text-cream" data-testid="farmers-hero">
        <img src={ODISHA_IMAGES.millet} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/40" />
        <Container className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <MadeInIndiaBadge />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/45 bg-cream/10 px-3 py-1 text-xs font-700 text-amber" data-testid="odisha-sourcing-pill">
              <MapPin className="h-3.5 w-3.5" />Sourced in Odisha
            </span>
          </div>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl md:text-5xl">Grown in Odisha, Cooked in Your Kitchen</h1>
          <p className="mt-4 max-w-2xl text-lg text-cream/85">
            For now we buy from one state only — Odisha. Millets from the Koraput highlands, turmeric from the Kandhamal hills,
            pulses from Kalahandi. Fewer places, better known: we would rather know the belt our food comes from than list a dozen states.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-cream/65">
            When Farmers Grow, We Grow Together. Wherever possible we procure directly and create better value for the people who grow our food.
          </p>
        </Container>
      </section>

      {/* ODISHA SOURCING BELTS */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Where your food grows" title="The six Odisha belts we buy from"
            sub="Odisha's organic growing is concentrated in a handful of districts. These are the ones our catalogue draws on today — as we add growers, this list is what will grow, not the number of states." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="odisha-belt-strip">
            {ODISHA_BELTS.map((b, i) => (
              <div key={b.name} data-testid={`odisha-belt-${b.name.toLowerCase()}`}
                className="group relative overflow-hidden rounded-2xl border border-sage/30 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <span className="absolute right-4 top-4 font-serif text-3xl text-sage/40">{String(i + 1).padStart(2, "0")}</span>
                <p className="inline-flex items-center gap-1.5 text-xs font-700 uppercase tracking-widest text-amber"><MapPin className="h-3.5 w-3.5" />Odisha</p>
                <h3 className="mt-1 font-serif text-xl text-forest">{b.name}</h3>
                <p className="mt-2 text-sm font-600 text-charcoal/80">{b.crops}</p>
                <p className="mt-1.5 text-sm text-charcoal/60">{b.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-charcoal/50">Districts reflect where the crops in our catalogue are grown. Other states will be added only when we can name the belt and the grower.</p>

          {/* CROP BY REGION */}
          <h2 className="mt-16 font-serif text-2xl text-charcoal">What comes from where</h2>
          <p className="mt-1 text-sm text-charcoal/60">Three of the crops that define our catalogue, and the Odisha landscapes they come from.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-3" data-testid="odisha-crop-cards">
            {[
              { img: ODISHA_IMAGES.millet, belt: "Koraput highlands", crop: "Millets", body: "Mandia (finger millet) and minor millets from rain-fed terraces, milled into our flours and sold as whole grain.", to: "/categories/organic-millets-grains", cta: "Shop millets & grains" },
              { img: ODISHA_IMAGES.turmeric, belt: "Kandhamal hills", crop: "Turmeric & spices", body: "Shade-grown hill turmeric, sun-dried and ground close to the farm so the aroma survives the journey.", to: "/categories/organic-spices", cta: "Shop spices" },
              { img: ODISHA_IMAGES.pulses, belt: "Kalahandi plains", crop: "Pulses & dals", body: "Chana, moong and arhar from smallholder plots, cleaned and graded before they are packed.", to: "/categories/organic-pulses-dals", cta: "Shop pulses & dals" },
            ].map((c) => (
              <article key={c.crop} data-testid={`odisha-crop-${c.crop.split(" ")[0].toLowerCase()}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-sage/30 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-[16/10] overflow-hidden bg-cream">
                  <img src={c.img} alt={`${c.crop} from the ${c.belt}, Odisha`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-forest/90 px-2.5 py-1 text-[10px] font-800 uppercase tracking-wide text-cream"><MapPin className="h-3 w-3" />{c.belt}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-serif text-xl text-charcoal">{c.crop}</h3>
                  <p className="mt-2 text-sm text-charcoal/70">{c.body}</p>
                  <LangLink to={c.to} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-700 text-forest transition-colors hover:text-amber">
                    {c.cta}<ArrowRight className="h-4 w-4" />
                  </LangLink>
                </div>
              </article>
            ))}
          </div>

          {/* FIELD TO HOME JOURNEY */}
          <h2 className="mt-16 font-serif text-2xl text-charcoal">From an Odisha field to your home</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4" data-testid="odisha-journey">
            {JOURNEY.map((s, i) => (
              <div key={s.title} data-testid={`journey-step-${i + 1}`} className="relative rounded-2xl border border-sage/30 bg-white p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forest text-sm font-800 text-cream">{i + 1}</span>
                <h3 className="mt-3 font-700 text-forest">{s.title}</h3>
                <p className="mt-1.5 text-sm text-charcoal/70">{s.body}</p>
                {i < JOURNEY.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-sage md:block" />}
              </div>
            ))}
          </div>

          <div className="mt-16">
            <SectionHeading eyebrow="How we work" title="Shortening the distance from farm to home" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[["What we source", "Millets, pulses, breakfast grains, spices and other crops grown on organic farms in Odisha."],
              ["How we work", "Wherever practical, we work directly with farmers and commit before the season — not a one-time order."],
              ["Honest claims", "We never claim zero intermediaries. We work to shorten unnecessary supply-chain layers."]].map(([t, b]) => (
              <div key={t} className="rounded-2xl border border-sage/30 bg-white p-6"><h3 className="font-700 text-forest">{t}</h3><p className="mt-2 text-sm text-charcoal/70">{b}</p></div>
            ))}
          </div>

          {/* supply chain */}
          <div className="mt-12 grid gap-6 rounded-3xl border border-sage/30 bg-white p-8 md:grid-cols-2">
            <div><p className="text-xs font-700 uppercase tracking-widest text-charcoal/50">Traditional supply chain</p>
              <div className="mt-3 space-y-1 text-charcoal/70">{["Farmer","Multiple intermediaries","Distributor","Retailer","Customer"].map((s) => <p key={s}>↓ {s}</p>)}</div>
            </div>
            <div><p className="text-xs font-700 uppercase tracking-widest text-forest">AaharNest model</p>
              <div className="mt-3 space-y-1 text-forest">{["Odisha farmer","AaharNest sourcing","Quality / processing / packaging","Customer"].map((s) => <p key={s}>↓ {s}</p>)}</div>
              <p className="mt-3 text-xs text-charcoal/50">Wherever practical, we work to shorten the supply chain.</p>
            </div>
          </div>

          <h2 className="mt-14 font-serif text-2xl text-charcoal">Farmer Stories from Odisha</h2>
          <p className="mt-1 text-sm text-charcoal/60">We never fabricate real people or testimonials. These cards show the Odisha belts we buy from — verified grower stories are coming soon.</p>
          {!farmers ? <PageLoader /> : farmers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-sage/30 bg-white p-6 text-sm text-charcoal/60" data-testid="farmers-empty">Grower stories are being prepared. In the meantime, the belts above show exactly where our catalogue is sourced from.</p>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {farmers.map((f) => (
                <div key={f.id} className="overflow-hidden rounded-2xl border border-sage/30 bg-white" data-testid={`farmer-card-${f.id}`}>
                  <div className="relative"><img src={f.image} alt="Illustrative Odisha farm" className="aspect-[4/3] w-full object-cover" />
                    {f.demo && <span className="absolute left-3 top-3 rounded-full bg-charcoal/85 px-2.5 py-1 text-[11px] font-600 text-cream">Illustrative</span>}
                  </div>
                  <div className="p-5"><p className="inline-flex items-center gap-1.5 text-xs font-700 uppercase tracking-widest text-amber"><MapPin className="h-3.5 w-3.5" />{f.district || f.region} · {f.crop}</p>
                    <h3 className="mt-1 font-serif text-lg text-charcoal">{f.name}</h3>
                    <p className="mt-2 text-sm text-charcoal/70">{f.story}</p>
                    {f.grows && <p className="mt-2 text-xs text-charcoal/55"><span className="font-700 text-forest">Grows:</span> {f.grows}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}

export function WhyAaharNest() {
  useSEO({ title: "Why AaharNest · AaharNest" });
  const blocks = [
    ["Quality", "Carefully selected, quality-focused products for the everyday Indian table.", BadgeCheck],
    ["Fair Pricing", "We work to keep quality food accessible by reducing unnecessary layers in the supply chain. Quality shouldn't have to be expensive.", HandCoins],
    ["Farmer Connection", "Wherever practical, we work directly with farmers to create better value for the people who grow our food.", Sprout],
    ["Made in India", "Supporting Indian farmers, producers and local businesses. Vocal for Local.", Truck],
    ["Healthy Living", "Helping customers make better everyday food choices — without medical claims.", Leaf],
    ["Community Contribution", "An optional ₹1 or ₹2 at checkout, voluntarily supporting children's education in India.", HeartHandshake],
    ["Pan-India Delivery", "Delivered across India with a configurable serviceability system, so you know before you order.", Truck],
  ];
  return (
    <Section><Container>
      <SectionHeading eyebrow="Why AaharNest" title="More Than a Food Store" sub="AaharNest exists to make quality food more accessible while creating better relationships between customers, farmers and local producers." />
      <div className="grid gap-5 md:grid-cols-2">
        {blocks.map(([t, b, Icon]) => (
          <div key={t} className="flex gap-4 rounded-2xl border border-sage/30 bg-white p-6">
            <Icon className="h-8 w-8 shrink-0 text-forest" />
            <div><h3 className="text-lg font-700 text-charcoal">{t}</h3><p className="mt-1 text-sm text-charcoal/70">{b}</p></div>
          </div>
        ))}
      </div>
      <div className="mt-10"><PrimaryBtn as={LangLink} to="/shop" data-testid="why-shop-btn">Shop Products <ArrowRight className="h-4 w-4" /></PrimaryBtn></div>
    </Container></Section>
  );
}

export function MadeInIndia() {
  useSEO({ title: "Made in India · AaharNest" });
  return (
    <>
      <section className="bg-charcoal py-20 text-cream grain">
        <Container className="text-center">
          <Eyebrow className="text-amber">Vocal for Local</Eyebrow>
          <h1 className="mt-3 font-serif text-5xl"><span className="tricolour-text">Made in India</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-cream/75">From Indian farms and local producers to homes across India.</p>
        </Container>
      </section>
      <Section><Container>
        <div className="grid gap-5 md:grid-cols-2">
          {[["Indian sourcing", "We focus on crops grown in India — millets, pulses, breakfast grains and spices."],
            ["Indian producers", "Supporting local processors and small businesses that make food here."],
            ["Local food ecosystem", "Better connections between farmers and customers can create stronger local food systems."],
            ["Farmer support", "Wherever practical, we commit to farmers before the season to create steadier demand."]].map(([t, b]) => (
            <div key={t} className="rounded-2xl border border-sage/30 bg-white p-6"><h3 className="font-700 text-forest">{t}</h3><p className="mt-2 text-sm text-charcoal/70">{b}</p></div>
          ))}
        </div>
      </Container></Section>
    </>
  );
}

export function Community() {
  useSEO({ title: "Community · AaharNest" });
  return (
    <Section><Container className="max-w-3xl">
      <Eyebrow>Community</Eyebrow>
      <h1 className="mt-2 font-serif text-4xl text-charcoal">A Little From You. A Big Step for a Child.</h1>
      <p className="mt-4 text-charcoal/70">At checkout, you can voluntarily add ₹1 or ₹2 to your order toward educational opportunities for underprivileged children in India. It is entirely optional and never pre-selected.</p>
      <div className="mt-8 space-y-5">
        {[["Purpose", "To make it effortless for customers who wish to give a little toward children's education."],
          ["How contributions work", "If you choose to add ₹1 or ₹2 at checkout, it is recorded separately from product revenue in your order."],
          ["Where money goes", "We are building the structure to work with a legitimate, verified partner organisation."],
          ["Transparency", "Until a verified NGO/charity partner is in place, we do not claim that contributions are currently being distributed. This page will be updated with the partner, reporting and allocation details once confirmed."]].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-sage/30 bg-white p-6"><h3 className="font-700 text-forest">{t}</h3><p className="mt-2 text-sm text-charcoal/70">{b}</p></div>
        ))}
      </div>
      <p className="mt-6 rounded-2xl bg-amber/10 p-4 text-sm text-charcoal/70">Note: Donation architecture is in place; no partner distribution is claimed yet. Contributions are held and clearly separated until a verified partner is configured.</p>
    </Container></Section>
  );
}

export function About() {
  useSEO({ title: "About · AaharNest", description: "AaharNest helps you discover organic Indian pantry staples with clear labels, verified sourcing from Odisha and traditional recipes to cook with confidence." });
  return (
    <Section><Container className="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <Eyebrow>About</Eyebrow>
        <h1 className="mt-2 font-serif text-4xl text-charcoal md:text-5xl">Know your food. Choose with confidence.</h1>
        <p className="mt-3 font-serif text-xl text-amber">Healthy Food • Happy Living</p>
        <div className="mt-6 space-y-4 text-charcoal/75">
          <p>AaharNest exists to help people discover good everyday Indian food — and understand exactly what is on the label before it reaches their kitchen. Our focus is on traditional pantry staples: millets, dals, flours, whole and ground spices, cold-pressed oils, seeds and breakfast grains.</p>
          <p><span className="font-700 text-forest">Our mission.</span> Make quality Indian food easier to trust. Every product listing names its ingredients, pack size, origin belt and storage instructions, so a first-time buyer can read a label and know what they are getting — no mystery blends, no overclaims.</p>
          <p><span className="font-700 text-forest">How we select products.</span> We stock single-ingredient staples and small-batch blends from farms and producers we can name. For now we buy from one state — Odisha — because fewer, better-known belts let us check what we sell. If a crop is not grown by one of our partners, we do not list it.</p>
          <p><span className="font-700 text-forest">Verified sourcing, honest claims.</span> A product is marked “Farmer sourced” only when it comes directly from a grower on our list. An organic certification badge appears only when the certifying body and certificate number have actually been recorded against that product — otherwise the listing simply describes the food. FSSAI licence and packer details read “to be updated” until the real supplier documents reach us. We would rather show a placeholder than invent a number.</p>
          <p><span className="font-700 text-forest">Recipes to use what you buy.</span> Every category links to traditional Indian recipes — breakfast pithas, dalma, pakhala, millet khichdi — so your pantry does not sit idle. We cook with the same ingredients we sell.</p>
          <p className="text-sm text-charcoal/55">Recipes and articles are a guide for the kitchen, not medicine. We make no claims about curing, treating or preventing any condition. Editorial content is produced by the AaharNest Editorial Team.</p>
        </div>
        <div className="mt-8 flex gap-3"><GreenBtn as={LangLink} to="/shop">Shop Products</GreenBtn><OutlineBtn as={LangLink} to="/farmers">Our Farmers</OutlineBtn></div>
      </div>
      <img src="/images/about-flatlay.webp" alt="Wholesome ingredients" className="aspect-[4/5] w-full rounded-3xl object-cover" />
    </Container></Section>
  );
}

export function Nutrition() {
  const [articles, setArticles] = useState(null);
  useSEO({ title: "Nutrition · AaharNest" });
  useEffect(() => { api.get("/articles?category=Nutrition").then((r) => setArticles(r.data.articles)).catch(() => setArticles([])); }, []);
  return (
    <Section><Container>
      <SectionHeading eyebrow="Nutrition" title="Balanced, factual nutrition" sub="Information to support better everyday choices. These ingredients can be part of a balanced diet — not a treatment." />
      {!articles ? <PageLoader /> : (
        <div className="grid gap-5 md:grid-cols-3">{articles.map((a) => <RecipeArticleLink key={a.slug} a={a} />)}</div>
      )}
    </Container></Section>
  );
}
function RecipeArticleLink({ a }) {
  return (
    <LangLink to={`/articles/${a.slug}`} className="group block overflow-hidden rounded-2xl border border-sage/30 bg-white shadow-sm hover:shadow-md">
      <div className="aspect-[16/10] overflow-hidden"><img src={a.image} alt={a.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" /></div>
      <div className="p-4"><h3 className="font-serif text-lg text-charcoal">{a.title}</h3><p className="mt-1 line-clamp-2 text-sm text-charcoal/60">{a.summary}</p></div>
    </LangLink>
  );
}

export function Support() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", category: "Order", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  useSEO({ title: "Support · AaharNest" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const { data } = await api.post("/support", form); toast.success(data.message || "Sent"); setForm({ name: "", email: "", subject: "", category: "Order", message: "", website: "" }); }
    catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };
  const field = "w-full rounded-xl border border-sage/50 bg-white px-4 py-2.5 outline-none focus:border-forest";
  return (
    <Section><Container className="max-w-2xl">
      <SectionHeading eyebrow="Support" title="We're here to help" sub="Questions about an order, delivery, a product or your account? Send us a message." />
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-sage/30 bg-white p-7" data-testid="support-form">
        <input className="hidden" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} aria-hidden />
        <div className="grid gap-4 sm:grid-cols-2">
          <input required placeholder="Name" value={form.name} onChange={set("name")} data-testid="support-name" className={field} />
          <input required type="email" placeholder="Email" value={form.email} onChange={set("email")} data-testid="support-email" className={field} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <input required placeholder="Subject" value={form.subject} onChange={set("subject")} data-testid="support-subject" className={field} />
          <select value={form.category} onChange={set("category")} data-testid="support-category" className={field}>
            {["Order","Delivery","Payment","Product","Account","Recipe","Other"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <textarea required rows={5} placeholder="How can we help?" value={form.message} onChange={set("message")} data-testid="support-message" className={field} />
        <PrimaryBtn type="submit" disabled={busy} data-testid="support-submit">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send message"}</PrimaryBtn>
      </form>
      <div className="mt-6 rounded-3xl bg-forest p-7 text-cream" data-testid="support-bot-callout">
        <p className="text-xs font-700 uppercase tracking-[0.2em] text-amber">Faster: ask Nesti</p>
        <p className="mt-2 font-serif text-2xl">Our AI assistant answers instantly</p>
        <p className="mt-2 text-sm leading-relaxed text-cream/75">
          Open the chat in the bottom-right corner of any page. Share your name, email and mobile
          number and it can read your order status, explain our policies and share wellness tips.
          Refund, payment and product-fault reports raise a support ticket and email our desk
          straight away, so nothing waits in a queue.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[["/faq", "Browse the FAQ"], ["/returns", "Return & Refund Policy"], ["/cancellation", "Cancellation Policy"], ["/grievance", "Grievance Redressal"]].map(([to, label]) => (
            <LangLink key={to} to={to} className="font-600 text-amber underline" data-testid={`support-link-${to.slice(1)}`}>{label}</LangLink>
          ))}
        </div>
      </div>
    </Container></Section>
  );
}

/* Legal pages render from the static POLICIES map in constants/legal.js — one route per
   policy slug, full prose, no fetch. */
const LEGAL_SLUGS = {
  privacy: "privacy", terms: "terms", shipping: "shipping",
  returns: "returns", refund: "returns", "refund-policy": "returns",
  cancellation: "cancellation", disclaimer: "disclaimer",
};

const RELATED = [
  ["/returns", "Return & Refund"],
  ["/cancellation", "Cancellation"],
  ["/shipping", "Shipping"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
  ["/disclaimer", "Disclaimer"],
  ["/grievance", "Grievance"],
  ["/faq", "FAQ"],
];

export function Legal() {
  const { pathname } = useLocation();
  const slug = pathname.split("/").filter(Boolean).pop();
  const policy = POLICIES[LEGAL_SLUGS[slug] || ""];
  useSEO({
    title: `${policy ? policy.title : "Policy"} · AaharNest`,
    description: policy ? policy.intro.slice(0, 180) : undefined,
  });

  if (!policy) {
    return (
      <Section><Container className="max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-2 font-serif text-4xl text-charcoal">Policy</h1>
        <p className="mt-5 leading-relaxed text-charcoal/75">
          This policy is not published yet. Please see our{" "}
          <LangLink to="/faq" className="text-forest underline">FAQ</LangLink> or contact support.
        </p>
      </Container></Section>
    );
  }

  return (
    <Section data-testid={`legal-${LEGAL_SLUGS[slug]}`}>
      <Container className="max-w-3xl">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-charcoal md:text-5xl">{policy.title}</h1>
        <p className="mt-2 text-xs text-charcoal/45">Last updated {POLICY_UPDATED}</p>
        <p className="mt-5 text-base leading-relaxed text-charcoal/70">{policy.intro}</p>

        <div className="mt-10 space-y-8">
          {policy.sections.map(([heading, points], si) => (
            <div key={heading} data-testid={`legal-section-${si}`}>
              <h2 className="font-serif text-2xl text-forest">{heading}</h2>
              <ul className="mt-3 space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-charcoal/75">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-sage/30 bg-white p-7" data-testid="legal-help">
          <p className="font-serif text-xl text-charcoal">Need this applied to your order?</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
            Our support assistant (bottom-right of every page) can look up your order and raise a
            refund, return or product-fault ticket for you straight away. You can also write to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-600 text-forest underline">{SUPPORT_EMAIL}</a>, or
            escalate through <LangLink to="/grievance" className="font-600 text-forest underline">Grievance Redressal</LangLink>.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span className="font-600 text-charcoal/60">Related:</span>
          {RELATED.filter(([to]) => to !== `/${slug}`).map(([to, label]) => (
            <LangLink key={to} to={to} className="text-forest underline" data-testid={`legal-related-${to.slice(1)}`}>
              {label}
            </LangLink>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export function NotFound() {
  useSEO({ title: "Not found · AaharNest" });
  return <Section><Container className="text-center"><h1 className="font-serif text-5xl text-forest">404</h1><p className="mt-3 text-charcoal/70">This page could not be found.</p><div className="mt-6"><PrimaryBtn as={LangLink} to="/">Back home</PrimaryBtn></div></Container></Section>;
}
