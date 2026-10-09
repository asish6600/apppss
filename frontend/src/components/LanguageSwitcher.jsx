import { useLocation, useNavigate } from "react-router-dom";
import { Globe, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_CODES, useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }) {
  const { lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const current = LOCALES.find((l) => l.code === lang) || LOCALES[0];

  const switchTo = (code) => {
    const parts = location.pathname.split("/");
    if (LOCALE_CODES.includes(parts[1])) parts[1] = code;
    else parts.splice(1, 0, code);
    navigate(parts.join("/") + location.search);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="language-switcher-trigger"
          className="inline-flex items-center gap-1.5 rounded-full border border-sage/50 bg-white px-3 py-1.5 text-sm font-600 text-charcoal transition-colors hover:border-forest"
          aria-label="Change language"
        >
          <Globe className="h-4 w-4 text-forest" />
          {!compact && <span className="font-sans">{current.native}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            data-testid={`language-option-${l.code}`}
            onClick={() => switchTo(l.code)}
            className="flex items-center justify-between gap-6 font-sans"
          >
            <span>{l.native}</span>
            {l.code === lang && <Check className="h-4 w-4 text-forest" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
