import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Home as HomeIcon, Menu, Search, ShoppingBag, User, Heart, MapPin, ChevronDown, LayoutGrid, Truck, Headphones, PackageSearch, Flame, Sparkles, Boxes, BookOpen, Newspaper, Info, Sparkle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SearchDialog } from "@/components/SearchDialog";
import { LangLink, useLangNavigate } from "@/components/LangLink";
import { IndiaFlagIcon } from "@/components/Marks";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import api from "@/lib/api";

// Unique, non-competitor naming — Gift Ideas / Offers Zone / Meal Plans are permanently removed
const PRIMARY_NAV = [
  { key: "nav.shop", to: "/shop", Icon: ShoppingBag, testid: "shop" },
  { key: "nav.deals", to: "/daily-deals", Icon: Flame, testid: "daily-deals" },
  { key: "nav.favourites", to: "/top-picks", Icon: Sparkle, testid: "top-picks" },
  { key: "nav.fresh", to: "/fresh-arrivals", Icon: Sparkles, testid: "fresh-arrivals" },
  { key: "nav.combos", to: "/combo-packs", Icon: Boxes, testid: "combo-packs" },
  { key: "nav.recipes", to: "/recipes", Icon: BookOpen, testid: "nest-kitchen" },
  { key: "nav.journal", to: "/articles", Icon: Newspaper, testid: "journal" },
  { key: "nav.aboutFull", shortKey: "nav.about", to: "/about", Icon: Info, testid: "about" },
];

const MOBILE_NAV = [
  { key: "nav.home", to: "/", Icon: HomeIcon },
  ...PRIMARY_NAV,
  { key: "nav.allCategories", to: "/categories", Icon: LayoutGrid },
  { key: "nav.farmers", to: "/farmers", Icon: Truck },
  { key: "nav.support", to: "/support", Icon: Headphones },
  { key: "nav.faq", to: "/faq", Icon: Headphones },
];

export function Header() {
  const { t, catName } = useI18n();
  const { isAuthed, user, logout } = useAuth();
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const location = useLocation();
  const navigate = useLangNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { api.get("/categories").then((r) => setCats(r.data.categories || [])).catch(() => {}); }, []);

  const isActive = (to) => {
    const base = location.pathname.replace(/^\/[a-z]{2}/, "") || "/";
    return to === "/" ? base === "/" : base.startsWith(to);
  };

  const SearchBox = ({ className = "" }) => (
    <button onClick={() => setSearchOpen(true)} data-testid="search-trigger"
      className={`flex items-center gap-3 rounded-full border border-sage/40 bg-white/70 px-4 py-2.5 text-left text-sm text-charcoal/55 backdrop-blur-md transition-all hover:border-forest/60 hover:bg-white/90 hover:shadow-sm ${className}`}>
      <Search className="h-4 w-4 shrink-0 text-forest" />
      <span className="truncate">{t("header.searchPlaceholder")}</span>
      <span className="ml-auto hidden rounded-full bg-forest px-3 py-1 text-xs font-700 text-cream sm:inline-block">{t("header.search")}</span>
    </button>
  );

  const AccountControl = () => (
    isAuthed ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label={t("nav.account")} data-testid="user-menu-trigger" className="glass-pill inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-forest">
            <User className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm font-600 leading-none xl:inline">{(user?.display_name || user?.email || "").split("@")[0]}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-white/95 backdrop-blur-xl">
          <div className="px-2 py-1.5 text-sm font-600 text-forest">{user?.display_name || user?.email}</div>
          <DropdownMenuSeparator />
          {user?.role === "admin" && <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin" className="font-600 text-amber">Admin Studio</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => navigate("/account")} data-testid="menu-account">{t("account.myAccount")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/account/orders")} data-testid="menu-orders">{t("account.orders")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/account/wishlist")} data-testid="menu-wishlist">{t("account.wishlist")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await logout(); navigate("/"); }} data-testid="menu-logout" className="text-destructive">{t("account.logout")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <LangLink to="/auth" data-testid="header-signin-link" className="glass-pill inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-600 leading-none text-forest"><User className="h-5 w-5 shrink-0" /><span className="hidden xl:inline">{t("header.login")}</span></LangLink>
    )
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/60 backdrop-blur-xl shadow-[0_1px_0_rgba(23,74,53,0.06)]" data-testid="site-header">
      {/* TOP UTILITY BAR */}
      <div className="bg-forest/95 text-cream backdrop-blur">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-1.5 text-xs sm:px-6 lg:px-10 2xl:px-14">
          <div className="flex items-center gap-2 font-600">
            <IndiaFlagIcon className="h-3 w-4 rounded-[2px]" />
            <span>{t("util.madeInIndia")}</span>
            <span className="hidden text-cream/50 sm:inline">·</span>
            <span className="hidden sm:inline">{t("util.supportLocal")}</span>
          </div>
          <div className="flex items-center gap-4 font-600">
            <span className="hidden items-center gap-1.5 md:inline-flex"><Truck className="h-3.5 w-3.5" />{t("util.freeShipping")}</span>
            <LangLink to="/account/orders" data-testid="utility-track-order" className="inline-flex items-center gap-1.5 hover:text-amber"><PackageSearch className="h-3.5 w-3.5" />{t("util.trackOrder")}</LangLink>
            <LangLink to="/support" data-testid="utility-support" className="inline-flex items-center gap-1.5 hover:text-amber"><Headphones className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("util.help")}</span></LangLink>
          </div>
        </div>
      </div>

      {/* MAIN HEADER */}
      <div className={`transition-[padding] duration-300 ${scrolled ? "py-2" : "py-3"}`}>
        <div className="mx-auto flex max-w-shell items-center gap-3 px-4 sm:px-6 md:gap-6 lg:px-10 2xl:px-14">
          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button aria-label={t("nav.menu")} data-testid="mobile-menu-trigger" className="glass-pill rounded-full p-2 text-forest"><Menu className="h-6 w-6" /></button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 border-r border-white/40 bg-white/75 p-0 backdrop-blur-2xl" data-testid="mobile-nav-drawer">
                <div className="flex items-center border-b border-sage/20 px-5 py-4"><Logo /></div>
                <nav className="flex flex-col gap-0.5 p-3">
                  {MOBILE_NAV.map(({ key, to, Icon }) => (
                    <SheetClose asChild key={to}>
                      <LangLink to={to} data-testid={`mobile-nav-${to}`}
                        className={`inline-flex items-center gap-3 rounded-xl px-3 py-3 text-base font-600 transition-colors ${isActive(to) ? "bg-forest text-cream" : "text-charcoal hover:bg-white/80"}`}>
                        <Icon className="h-5 w-5 opacity-80" />{t(key)}
                      </LangLink>
                    </SheetClose>
                  ))}
                  <div className="mt-4 px-3"><LanguageSwitcher /></div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo + tagline */}
          <div className="min-w-0 shrink-0">
            <Logo />
            <p className="mt-0.5 hidden text-[11px] font-500 text-charcoal/55 sm:block">{t("header.tagline")}</p>
          </div>

          {/* Search (desktop) */}
          {/* Search grows with the shell so a 1920px header doesn't leave a dead gap
              between the search field and the account controls. */}
          <div className="hidden min-w-0 flex-1 md:block"><SearchBox className="w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl" /></div>

          {/* Right controls — every pill is h-10 so the labels sit on one baseline and nothing wraps */}
          <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
            <button className="glass-pill hidden h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-left text-sm text-charcoal xl:inline-flex" data-testid="deliver-to">
              <MapPin className="h-5 w-5 shrink-0 text-forest" />
              <span className="leading-tight"><span className="block text-[10px] leading-none text-charcoal/50">{t("header.deliverTo")}</span><span className="block font-700 leading-tight">{t("header.india")} 🇮🇳</span></span>
            </button>
            <div className="hidden sm:block"><LanguageSwitcher compact /></div>
            <AccountControl />
            <LangLink to="/account/wishlist" aria-label={t("account.wishlist")} data-testid="header-wishlist" className="glass-pill inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest"><Heart className="h-5 w-5" /></LangLink>
            <button onClick={() => setOpen(true)} aria-label={t("nav.cart")} data-testid="cart-trigger" className="glass-pill relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <span data-testid="cart-count" className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber text-[11px] font-700 text-charcoal shadow-sm">{count}</span>}
            </button>
          </div>
        </div>
        {/* Search (mobile) */}
        <div className="mt-2 px-4 md:hidden"><SearchBox className="w-full" /></div>
      </div>

      {/* PRIMARY NAV ROW */}
      <div className="hidden border-t border-white/40 bg-white/40 backdrop-blur-xl lg:block">
        <div className="mx-auto flex max-w-shell items-center gap-2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="all-categories-btn" className="my-2 inline-flex shrink-0 items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-700 text-cream shadow-sm transition-colors hover:bg-forest/90">
                <LayoutGrid className="h-4 w-4" />{t("nav.allCategories")}<ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[640px] border border-white/50 bg-white/85 p-3 backdrop-blur-2xl" data-testid="mega-menu">
              <p className="px-2 pb-1.5 text-[11px] font-700 uppercase tracking-widest text-amber">{t("nav.allCategories")}</p>
              <div className="grid grid-cols-3 gap-1">
                {cats.map((c) => (
                  <DropdownMenuItem key={c.slug} onClick={() => navigate(`/categories/${c.slug}`)} data-testid={`mega-cat-${c.slug}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-cream/70">
                    <img src={c.image} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-sage/30" />
                    <span className="text-sm font-600 text-charcoal">{catName(c.slug, c.name)}</span>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem onClick={() => navigate("/shop")} className="rounded-xl px-2 py-2 text-sm font-700 text-forest hover:bg-cream/70">
                {t("common.seeAll")} →
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-testid="primary-nav">
            {/* Home leads the nav row — where people look for it, instead of a loose icon beside the logo */}
            <LangLink to="/" data-testid="home-icon" aria-label={t("nav.home")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-600 transition-all ${isActive("/") ? "bg-forest/10 text-forest" : "text-charcoal/75 hover:bg-white/80 hover:text-forest"}`}>
              <HomeIcon className="h-3.5 w-3.5 opacity-70" />{t("nav.home")}
            </LangLink>
            <span className="mx-1 h-5 w-px shrink-0 bg-sage/40" aria-hidden="true" />
            {PRIMARY_NAV.map(({ key, shortKey, to, Icon, testid }) => (
              <LangLink key={to} to={to} data-testid={`primary-nav-${testid}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-600 transition-all ${isActive(to) ? "bg-forest/10 text-forest" : "text-charcoal/75 hover:bg-white/80 hover:text-forest"}`}>
                <Icon className="h-3.5 w-3.5 opacity-70" />{t(shortKey || key)}
              </LangLink>
            ))}
          </nav>
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
