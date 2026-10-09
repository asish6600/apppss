/* Grievance redressal — the escalation ladder, officer details and SLAs.
   Static content; required by the Consumer Protection (E-Commerce) Rules, 2020. */
import { AlertTriangle, Clock, Mail, MapPin, Phone, Scale, UserCheck } from "lucide-react";
import { Container, Section, useSEO } from "@/components/common";
import { LangLink } from "@/components/LangLink";
import { GRIEVANCE, POLICY_UPDATED } from "@/constants/legal";

export default function Grievance() {
  useSEO({
    title: "Grievance Redressal · AaharNest",
    description:
      "How to escalate a complaint at AaharNest: support chat, support desk, Grievance Officer and the National Consumer Helpline, with published response timelines.",
  });
  const { title, intro, ladder, officer, nodal, whatToInclude } = GRIEVANCE;

  return (
    <Section data-testid="grievance-page">
      <Container className="max-w-4xl">
        <p className="flex items-center gap-2 text-xs font-700 uppercase tracking-[0.22em] text-forest">
          <Scale className="h-4 w-4" /> Legal
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-charcoal md:text-5xl">{title}</h1>
        <p className="mt-2 text-xs text-charcoal/45">Last updated {POLICY_UPDATED}</p>
        <p className="mt-5 text-base leading-relaxed text-charcoal/70">{intro}</p>

        <h2 className="mt-12 font-serif text-2xl text-forest">How to escalate</h2>
        <ol className="mt-5 space-y-4">
          {ladder.map((s, i) => (
            <li
              key={s.step}
              className="relative rounded-3xl border border-sage/30 bg-white p-6 pl-7"
              data-testid={`grievance-step-${i + 1}`}
            >
              <span className="absolute left-0 top-7 h-10 w-1 rounded-r-full bg-amber" />
              <p className="text-xs font-700 uppercase tracking-[0.18em] text-amber">{s.step}</p>
              <p className="mt-1.5 font-serif text-xl text-charcoal">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/70">{s.body}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {s.email && (
                  <a
                    href={`mailto:${s.email}`}
                    className="inline-flex items-center gap-1.5 font-600 text-forest underline"
                    data-testid={`grievance-step-${i + 1}-email`}
                  >
                    <Mail className="h-4 w-4" /> {s.email}
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5 text-charcoal/55">
                  <Clock className="h-4 w-4 text-forest" /> {s.sla}
                </span>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-forest p-7 text-cream" data-testid="grievance-officer">
            <p className="flex items-center gap-2 text-xs font-700 uppercase tracking-[0.18em] text-amber">
              <UserCheck className="h-4 w-4" /> {officer.role}
            </p>
            <p className="mt-3 font-serif text-2xl">{officer.name}</p>
            <p className="mt-1 text-sm text-cream/70">{officer.designation}</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <a href={`mailto:${officer.email}`} className="underline" data-testid="grievance-officer-email">
                  {officer.email}
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <span className="text-cream/80">{officer.phone}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <span className="text-cream/80">{officer.hours}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <span className="text-cream/80">{officer.address}</span>
              </div>
            </dl>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-sage/30 bg-white p-7" data-testid="grievance-desk">
              <p className="text-xs font-700 uppercase tracking-[0.18em] text-forest">{nodal.role}</p>
              <a
                href={`mailto:${nodal.email}`}
                className="mt-3 inline-flex items-center gap-2 font-600 text-forest underline"
                data-testid="grievance-desk-email"
              >
                <Mail className="h-4 w-4" /> {nodal.email}
              </a>
              <p className="mt-2 text-sm text-charcoal/60">{nodal.hours}</p>
            </div>
            <div
              className="rounded-3xl border border-amber/40 bg-amber/10 p-7"
              data-testid="grievance-checklist"
            >
              <p className="flex items-center gap-2 text-xs font-700 uppercase tracking-[0.18em] text-forest">
                <AlertTriangle className="h-4 w-4" /> Please include
              </p>
              <ul className="mt-3 space-y-2">
                {whatToInclude.map((x) => (
                  <li key={x} className="flex gap-2.5 text-sm leading-relaxed text-charcoal/75">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl bg-white px-6 py-5 text-sm ring-1 ring-sage/30">
          <span className="font-600 text-charcoal/70">Related:</span>
          {[
            ["/returns", "Return & Refund Policy"],
            ["/cancellation", "Cancellation Policy"],
            ["/terms", "Terms & Conditions"],
            ["/privacy", "Privacy Policy"],
            ["/faq", "FAQ"],
          ].map(([to, label]) => (
            <LangLink key={to} to={to} className="text-forest underline" data-testid={`grievance-link-${to.slice(1)}`}>
              {label}
            </LangLink>
          ))}
        </div>
      </Container>
    </Section>
  );
}
