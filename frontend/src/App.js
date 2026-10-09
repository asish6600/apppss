import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { I18nProvider, LOCALE_CODES } from "@/lib/i18n";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Layout } from "@/components/Layout";
import { SiteIntegrations } from "@/components/SiteIntegrations";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAuth";

import Home from "@/pages/Home";
import { Shop, Categories, Category } from "@/pages/Shop";
import { DailyDeals, TopPicks, FreshArrivals, ComboPacks } from "@/pages/Lists";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Auth from "@/pages/Auth";
import { Recipes, RecipeDetail } from "@/pages/Recipes";
import { Articles, ArticleDetail } from "@/pages/Articles";
import { Farmers, WhyAaharNest, MadeInIndia, Community, About, Nutrition, Support, Legal, NotFound } from "@/pages/Pages";
import Faq from "@/pages/Faq";
import Grievance from "@/pages/Grievance";
import { AccountLayout, AccountProfile, AccountOrders, AccountWishlist, AccountSaved, AccountAddresses, AccountNotifications, AccountSecurity, AccountPrivacy } from "@/pages/Account";
import Admin from "@/pages/Admin";

function AppShell() {
  const { lang } = useParams();
  if (!LOCALE_CODES.includes(lang)) return <Navigate to="/en" replace />;
  return (
    <I18nProvider>
      <SiteIntegrations>
        <AuthProvider>
          <CartProvider>
            <Layout />
          </CartProvider>
        </AuthProvider>
      </SiteIntegrations>
    </I18nProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/:lang" element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:slug" element={<Category />} />
          <Route path="daily-deals" element={<DailyDeals />} />
          <Route path="top-picks" element={<TopPicks />} />
          <Route path="fresh-arrivals" element={<FreshArrivals />} />
          <Route path="combo-packs" element={<ComboPacks />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="order/:orderNumber" element={<RequireAuth><OrderConfirmation /></RequireAuth>} />
          <Route path="auth" element={<Auth />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="recipes/:slug" element={<RequireAuth><RecipeDetail /></RequireAuth>} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/:slug" element={<ArticleDetail />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="why-aaharnest" element={<WhyAaharNest />} />
          <Route path="made-in-india" element={<MadeInIndia />} />
          <Route path="farmers" element={<Farmers />} />
          <Route path="community" element={<Community />} />
          <Route path="about" element={<About />} />
          <Route path="support" element={<Support />} />
          <Route path="faq" element={<Faq />} />
          <Route path="grievance" element={<Grievance />} />
          <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="privacy" element={<Legal />} />
          <Route path="terms" element={<Legal />} />
          <Route path="shipping" element={<Legal />} />
          <Route path="returns" element={<Legal />} />
          <Route path="refund-policy" element={<Legal />} />
          <Route path="cancellation" element={<Legal />} />
          <Route path="disclaimer" element={<Legal />} />
          <Route path="account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
            <Route index element={<AccountProfile />} />
            <Route path="orders" element={<AccountOrders />} />
            <Route path="wishlist" element={<AccountWishlist />} />
            <Route path="saved" element={<AccountSaved />} />
            <Route path="addresses" element={<AccountAddresses />} />
            <Route path="notifications" element={<AccountNotifications />} />
            <Route path="security" element={<AccountSecurity />} />
            <Route path="privacy" element={<AccountPrivacy />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<Navigate to="/en" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
