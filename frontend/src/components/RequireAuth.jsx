import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/lib/i18n";
import { PageLoader } from "@/components/common";

export function RequireAuth({ children }) {
  const { ready, isAuthed } = useAuth();
  const { lang } = useI18n();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!isAuthed) return <Navigate to={`/${lang}/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { ready, isAuthed, user } = useAuth();
  const { lang } = useI18n();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!isAuthed) return <Navigate to={`/${lang}/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (user?.role !== "admin") return <Navigate to={`/${lang}`} replace />;
  return children;
}
