import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useI18n } from "@/lib/i18n";
import { inr } from "@/lib/api";
import { useLangNavigate } from "@/components/LangLink";

export function CartDrawer() {
  const { cart, open, setOpen, update, remove, count } = useCart();
  const { t } = useI18n();
  const navigate = useLangNavigate();

  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col bg-cream sm:max-w-md" data-testid="cart-drawer">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-forest">{t("cart.title")}</SheetTitle>
        </SheetHeader>

        {count === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-12 w-12 text-sage" />
            <p className="text-charcoal/70">{t("cart.empty")}</p>
            <button onClick={() => go("/shop")} data-testid="cart-empty-shop-btn" className="rounded-full bg-forest px-6 py-2.5 text-sm font-600 text-cream">
              {t("cart.continue")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {cart.items.map((it) => (
                <div key={it.slug} className="flex gap-3 rounded-xl border border-sage/30 bg-white p-3" data-testid={`cart-line-${it.slug}`}>
                  <img src={it.image} alt={it.name} className="h-16 w-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-600 text-charcoal">{it.name}</p>
                    <p className="text-xs text-charcoal/60">{it.pack_size}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-sage/40 px-1">
                        <button onClick={() => update(it.slug, it.qty - 1)} data-testid={`cart-dec-${it.slug}`} className="p-1 text-forest"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-5 text-center text-sm font-600">{it.qty}</span>
                        <button onClick={() => update(it.slug, it.qty + 1)} data-testid={`cart-inc-${it.slug}`} className="p-1 text-forest"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="font-700 text-forest">{inr(it.line_total)}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(it.slug)} data-testid={`cart-remove-${it.slug}`} className="self-start text-charcoal/40 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="border-t border-sage/30 pt-4">
              <div className="flex items-center justify-between text-sm text-charcoal/70">
                <span>{t("cart.subtotal")}</span><span>{inr(cart.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-charcoal/70">
                <span>{t("cart.shipping")}</span><span>{cart.shipping === 0 ? t("cart.free") : inr(cart.shipping)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-lg font-700 text-forest">
                <span>{t("cart.total")}</span><span>{inr(cart.grand_total)}</span>
              </div>
              <button onClick={() => go("/checkout")} data-testid="cart-checkout-btn" className="mt-4 w-full rounded-full bg-amber px-6 py-3 font-700 text-charcoal transition-colors hover:bg-amber/90">
                {t("cart.checkout")}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
