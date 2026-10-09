import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/lib/i18n";
import { inr } from "@/lib/api";
import { Container, Section, SectionHeading, EmptyState, PrimaryBtn, useSEO } from "@/components/common";
import { LangLink, useLangNavigate } from "@/components/LangLink";

export default function Cart() {
  const { cart, update, remove, count } = useCart();
  const { isAuthed } = useAuth();
  const { t } = useI18n();
  const navigate = useLangNavigate();
  useSEO({ title: "Your Cart · AaharNest" });

  if (count === 0) return (
    <Section><Container>
      <SectionHeading eyebrow="Cart" title={t("cart.title")} />
      <EmptyState icon={ShoppingBag} title={t("cart.empty")} cta={<PrimaryBtn as={LangLink} to="/shop" data-testid="cart-empty-cta">{t("cart.continue")}</PrimaryBtn>} />
    </Container></Section>
  );

  return (
    <Section><Container>
      <SectionHeading eyebrow="Cart" title={t("cart.title")} />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3" data-testid="cart-items">
          {cart.items.map((it) => (
            <div key={it.slug} className="flex gap-4 rounded-2xl border border-sage/30 bg-white p-4">
              <img src={it.image} alt={it.name} className="h-24 w-24 rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between">
                  <div><LangLink to={`/product/${it.slug}`} className="font-600 text-charcoal hover:text-forest">{it.name}</LangLink><p className="text-xs text-charcoal/55">{it.pack_size}</p></div>
                  <button onClick={() => remove(it.slug)} data-testid={`cartpage-remove-${it.slug}`} className="text-charcoal/40 hover:text-destructive"><Trash2 className="h-5 w-5" /></button>
                </div>
                {!it.in_stock && <p className="mt-1 text-xs text-destructive">Only {it.stock} left — please reduce quantity.</p>}
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-3 rounded-full border border-sage/50 px-2 py-1">
                    <button onClick={() => update(it.slug, it.qty - 1)} data-testid={`cartpage-dec-${it.slug}`} className="text-forest"><Minus className="h-4 w-4" /></button>
                    <span className="w-6 text-center font-600">{it.qty}</span>
                    <button onClick={() => update(it.slug, it.qty + 1)} data-testid={`cartpage-inc-${it.slug}`} className="text-forest"><Plus className="h-4 w-4" /></button>
                  </div>
                  <span className="text-lg font-700 text-forest">{inr(it.line_total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-sage/30 bg-white p-6">
          <h3 className="font-serif text-xl text-charcoal">Order Summary</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label={t("cart.subtotal")} value={inr(cart.subtotal)} />
            <Row label={t("cart.shipping")} value={cart.shipping === 0 ? t("cart.free") : inr(cart.shipping)} />
            {cart.subtotal < cart.free_shipping_threshold && <p className="text-xs text-amber">Add {inr(cart.free_shipping_threshold - cart.subtotal)} more for free delivery.</p>}
          </dl>
          <div className="mt-4 flex items-center justify-between border-t border-sage/30 pt-4 text-lg font-700 text-forest">
            <span>{t("cart.total")}</span><span data-testid="cart-grand-total">{inr(cart.grand_total)}</span>
          </div>
          <button onClick={() => navigate(isAuthed ? "/checkout" : "/auth?next=/checkout")} data-testid="cartpage-checkout" className="mt-5 w-full rounded-full bg-amber px-6 py-3 font-700 text-charcoal hover:bg-amber/90">{t("cart.checkout")}</button>
          <LangLink to="/shop" className="mt-3 block text-center text-sm font-600 text-forest hover:underline">{t("cart.continue")}</LangLink>
        </aside>
      </div>
    </Container></Section>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between text-charcoal/70"><dt>{label}</dt><dd>{value}</dd></div>;
}
