import { Logo } from "@/components/Logo";
import { LangLink } from "@/components/LangLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MadeInIndiaBadge, PureGenuineBadge } from "@/components/Marks";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  const col = (title, links) => (
    <div>
      <p className="text-xs font-700 uppercase tracking-[0.2em] text-amber">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, to]) => (
          <li key={to}><LangLink to={to} className="text-sm text-cream/75 transition-colors hover:text-cream" data-testid={`footer-${to}`}>{label}</LangLink></li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="mt-20 bg-forest text-cream" data-testid="site-footer">
      <div className="mx-auto grid max-w-shell gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 sm:px-6 lg:px-10 2xl:px-14">
        <div className="sm:col-span-2 lg:col-span-2">
          <Logo onDark />
          <p className="mt-4 max-w-xs text-sm text-cream/70">{t("footer.tagline")}</p>
          <p className="mt-3 max-w-xs text-sm text-cream/60">{t("footer.blurb")}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2"><MadeInIndiaBadge /><PureGenuineBadge onDark /></div>
        </div>
        {col(t("footer.explore"), [
          [t("nav.shop"), "/shop"], [t("nav.categories"), "/categories"],
          [t("nav.deals"), "/daily-deals"], [t("nav.favourites"), "/top-picks"],
          [t("nav.fresh"), "/fresh-arrivals"], [t("nav.combos"), "/combo-packs"],
        ])}
        {col(t("footer.aboutHead"), [
          [t("nav.why"), "/why-aaharnest"], [t("nav.farmers"), "/farmers"], [t("common.madeInIndia"), "/made-in-india"],
          [t("nav.about"), "/about"], [t("common.explore"), "/community"],
        ])}
        {col(t("footer.help"), [
          [t("nav.support"), "/support"], [t("footer.faq"), "/faq"],
          [t("footer.shippingPolicy"), "/shipping"], [t("footer.returns"), "/returns"],
          [t("footer.cancellation"), "/cancellation"],
        ])}
        {col(t("footer.legal"), [
          [t("footer.privacy"), "/privacy"], [t("footer.terms"), "/terms"],
          [t("footer.disclaimer"), "/disclaimer"], [t("footer.grievance"), "/grievance"],
        ])}
      </div>
      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-shell flex-col items-center justify-between gap-4 px-4 py-5 sm:px-6 md:flex-row lg:px-10 2xl:px-14">
          <p className="text-sm text-cream/60">© 2026 AaharNest. {t("footer.rights")}</p>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
