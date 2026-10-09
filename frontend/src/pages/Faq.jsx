/* FAQ hub — fully static so it renders with or without a backend. */
import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle, Mail, MessageCircle, Scale, Search } from "lucide-react";
import { Container, Section, useSEO } from "@/components/common";
import { LangLink } from "@/components/LangLink";
import { FAQ_GROUPS, SUPPORT_EMAIL } from "@/constants/legal";

function FaqItem({ q, a, testid }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-sage/30 last:border-0" data-testid={testid}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid={`${testid}-toggle`}
        className="flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:text-forest"
      >
        <span className="text-[15px] font-600 text-charcoal">{q}</span>
        <ChevronDown
          className={`mt-0.5 h-4.5 w-4.5 shrink-0 text-forest transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-5 pr-8 text-sm leading-relaxed text-charcoal/70" data-testid={`${testid}-answer`}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function Faq() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("all");
  useSEO({
    title: "FAQ · AaharNest",
    description:
      "Answers on AaharNest orders, payment, pan-India delivery, returns, refunds, cancellations, account privacy, Odisha sourcing and our health-tip policy.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_GROUPS.flatMap((g) =>
        g.items.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        }))
      ),
    },
  });

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_GROUPS.filter((g) => active === "all" || g.id === active)
      .map((g) => ({
        ...g,
        items: q ? g.items.filter(([a, b]) => `${a} ${b}`.toLowerCase().includes(q)) : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [query, active]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Section data-testid="faq-page">
      <Container className="max-w-5xl">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-700 uppercase tracking-[0.22em] text-forest">
            <HelpCircle className="h-4 w-4" /> Help Centre
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-charcoal md:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-base leading-relaxed text-charcoal/65">
            Everything about ordering, delivery, returns, refunds, your account and our Odisha
            sourcing. Still stuck? Our support assistant is on every page, bottom-right.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-charcoal/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the FAQ…"
              data-testid="faq-search"
              className="w-full rounded-full border border-sage/50 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-forest"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[["all", "All"], ...FAQ_GROUPS.map((g) => [g.id, g.title])].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                data-testid={`faq-filter-${id}`}
                className={`rounded-full px-4 py-2 text-xs font-700 transition-colors ${
                  active === id ? "bg-forest text-cream" : "bg-white text-charcoal/70 ring-1 ring-sage/40 hover:text-forest"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {total === 0 ? (
          <div
            className="mt-10 rounded-3xl border border-dashed border-sage/50 bg-white/60 px-6 py-14 text-center"
            data-testid="faq-empty"
          >
            <p className="text-charcoal/70">No answers match “{query}”.</p>
            <p className="mt-2 text-sm text-charcoal/55">
              Ask our support assistant instead — it is in the bottom-right corner of every page.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {groups.map((g) => (
              <div key={g.id} data-testid={`faq-group-${g.id}`}>
                <h2 className="font-serif text-2xl text-forest">{g.title}</h2>
                <div className="mt-3 rounded-3xl border border-sage/30 bg-white px-5 md:px-7">
                  {g.items.map(([q, a], i) => (
                    <FaqItem key={q} q={q} a={a} testid={`faq-${g.id}-${i}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-forest p-6 text-cream" data-testid="faq-cta-chat">
            <MessageCircle className="h-6 w-6 text-amber" />
            <p className="mt-3 font-serif text-xl">Ask the assistant</p>
            <p className="mt-2 text-sm leading-relaxed text-cream/75">
              Open the chat in the bottom-right corner for order status, returns, refunds and
              wellness tips. Refund, payment and product-fault reports raise a ticket instantly.
            </p>
          </div>
          <LangLink
            to="/support"
            className="rounded-3xl border border-sage/40 bg-white p-6 transition-colors hover:border-forest"
            data-testid="faq-cta-support"
          >
            <Mail className="h-6 w-6 text-forest" />
            <p className="mt-3 font-serif text-xl text-charcoal">Write to support</p>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
              Prefer a form? Send us the details and we will reply by email at {SUPPORT_EMAIL}.
            </p>
          </LangLink>
          <LangLink
            to="/grievance"
            className="rounded-3xl border border-sage/40 bg-white p-6 transition-colors hover:border-forest"
            data-testid="faq-cta-grievance"
          >
            <Scale className="h-6 w-6 text-forest" />
            <p className="mt-3 font-serif text-xl text-charcoal">Escalate a grievance</p>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/65">
              Not resolved? Our Grievance Officer acknowledges within 48 hours and resolves within
              30 days.
            </p>
          </LangLink>
        </div>
      </Container>
    </Section>
  );
}
