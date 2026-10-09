import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

export function useLang() {
  const { lang } = useI18n();
  return lang;
}

export function path(lang, to) {
  if (!to || to === "/") return `/${lang}`;
  return `/${lang}${to.startsWith("/") ? "" : "/"}${to}`;
}

export function LangLink({ to, children, ...props }) {
  const lang = useLang();
  return <Link to={path(lang, to)} {...props}>{children}</Link>;
}

export function useLangNavigate() {
  const lang = useLang();
  const navigate = useNavigate();
  return (to, opts) => navigate(path(lang, to), opts);
}
