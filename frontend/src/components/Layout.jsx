import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { FestivalGreeting } from "@/components/FestivalGreeting";
import { FestivalBackdrop } from "@/components/FestivalBackdrop";
import { SupportChat } from "@/components/SupportChat";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-cream">
      <ScrollToTop />
      <FestivalBackdrop />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <FestivalGreeting />
      <SupportChat />
      <Toaster position="top-center" richColors toastOptions={{ style: { fontFamily: "Inter, sans-serif" } }} />
    </div>
  );
}
