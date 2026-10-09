import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, HeartHandshake, Wallet, Loader2 } from "lucide-react";
import api, { inr, apiError } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { Container, Section, SectionHeading, useSEO } from "@/components/common";
import { useLangNavigate } from "@/components/LangLink";

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman & Nicobar Islands","Chandigarh","Dadra & Nagar Haveli and Daman & Diu","Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry"];

export default function Checkout() {
  const { cart, refresh } = useCart();
  const navigate = useLangNavigate();
  const [addr, setAddr] = useState({ full_name: "", mobile: "", address: "", apartment: "", landmark: "", city: "", state: "", pincode: "" });
  const [donation, setDonation] = useState(0);
  const [serv, setServ] = useState(null);
  const [busy, setBusy] = useState(false);
  useSEO({ title: "Checkout · AaharNest" });

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (/^[1-9][0-9]{5}$/.test(addr.pincode)) {
      api.post("/serviceability", { pin: addr.pincode }).then((r) => setServ(r.data)).catch(() => setServ(null));
    } else setServ(null);
  }, [addr.pincode]);

  const set = (k) => (e) => setAddr({ ...addr, [k]: e.target.value });
  const grand = cart.grand_total + donation;

  const placeOrder = async () => {
    if (cart.items.length === 0) return toast.error("Your cart is empty.");
    if (serv && !serv.serviceable) return toast.error("We don't deliver to this PIN code yet.");
    setBusy(true);
    try {
      const { data } = await api.post("/orders", { address: addr, payment_method: "cod", donation_amount: donation, save_address: true });
      await refresh();
      navigate(`/order/${data.order.order_number}`);
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const field = "w-full rounded-xl border border-sage/50 bg-white px-4 py-2.5 outline-none focus:border-forest";

  return (
    <Section><Container>
      <SectionHeading eyebrow="Checkout" title="Delivery & Payment" />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* address */}
          <div className="rounded-2xl border border-sage/30 bg-white p-6">
            <h3 className="flex items-center gap-2 font-serif text-xl text-charcoal"><Truck className="h-5 w-5 text-forest" />Delivery Address</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input placeholder="Full Name" value={addr.full_name} onChange={set("full_name")} data-testid="checkout-name" className={field} />
              <input placeholder="Mobile Number" value={addr.mobile} onChange={set("mobile")} data-testid="checkout-mobile" className={field} />
              <input placeholder="Address (House no, Street)" value={addr.address} onChange={set("address")} data-testid="checkout-address" className={`${field} sm:col-span-2`} />
              <input placeholder="Apartment / House (optional)" value={addr.apartment} onChange={set("apartment")} data-testid="checkout-apartment" className={field} />
              <input placeholder="Landmark (optional)" value={addr.landmark} onChange={set("landmark")} data-testid="checkout-landmark" className={field} />
              <input placeholder="City" value={addr.city} onChange={set("city")} data-testid="checkout-city" className={field} />
              <select value={addr.state} onChange={set("state")} data-testid="checkout-state" className={field}>
                <option value="">Select State / UT</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="PIN Code" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} data-testid="checkout-pincode" className={field} />
            </div>
            {serv && <p className={`mt-3 text-sm ${serv.serviceable ? "text-forest" : "text-destructive"}`} data-testid="checkout-serviceability">{serv.message}</p>}
          </div>

          {/* donation */}
          <div className="rounded-2xl border border-amber/40 bg-amber/10 p-6" data-testid="donation-selector">
            <h3 className="flex items-center gap-2 font-serif text-xl text-charcoal"><HeartHandshake className="h-5 w-5 text-amber" />Help a Child Learn</h3>
            <p className="mt-1 text-sm text-charcoal/70">Add ₹1 or ₹2 to your order to support educational opportunities for underprivileged children in India. Completely voluntary.</p>
            <div className="mt-4 flex gap-2">
              {[0, 1, 2].map((v) => (
                <button key={v} onClick={() => setDonation(v)} data-testid={`donation-${v}`}
                  className={`rounded-full px-5 py-2 text-sm font-600 transition-colors ${donation === v ? "bg-forest text-cream" : "bg-white text-charcoal ring-1 ring-sage/40"}`}>
                  {v === 0 ? "No contribution" : `Add ₹${v}`}
                </button>
              ))}
            </div>
          </div>

          {/* payment */}
          <div className="rounded-2xl border border-sage/30 bg-white p-6">
            <h3 className="flex items-center gap-2 font-serif text-xl text-charcoal"><Wallet className="h-5 w-5 text-forest" />Payment Method</h3>
            <label className="mt-4 flex items-center gap-3 rounded-xl border-2 border-forest bg-cream p-4">
              <input type="radio" checked readOnly data-testid="payment-cod" className="accent-forest" />
              <div><p className="font-600 text-charcoal">Cash on Delivery</p><p className="text-xs text-charcoal/60">Pay in cash when your order arrives.</p></div>
            </label>
            <p className="mt-2 text-xs text-charcoal/50">Online payment (UPI, Cards, Net Banking via Razorpay) is coming soon.</p>
          </div>
        </div>

        {/* summary */}
        <aside className="h-fit rounded-2xl border border-sage/30 bg-white p-6">
          <h3 className="font-serif text-xl text-charcoal">Order Summary</h3>
          <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
            {cart.items.map((it) => <div key={it.slug} className="flex justify-between text-sm"><span className="text-charcoal/70">{it.name} × {it.qty}</span><span className="font-600">{inr(it.line_total)}</span></div>)}
          </div>
          <dl className="mt-4 space-y-1.5 border-t border-sage/30 pt-4 text-sm text-charcoal/70">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(cart.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{cart.shipping === 0 ? "Free" : inr(cart.shipping)}</dd></div>
            {donation > 0 && <div className="flex justify-between text-amber"><dt>Community contribution</dt><dd>{inr(donation)}</dd></div>}
          </dl>
          <div className="mt-3 flex justify-between border-t border-sage/30 pt-3 text-lg font-700 text-forest"><span>Grand Total</span><span data-testid="checkout-grand-total">{inr(grand)}</span></div>
          <button onClick={placeOrder} disabled={busy} data-testid="place-order-btn" className="mt-5 w-full rounded-full bg-amber px-6 py-3 font-700 text-charcoal hover:bg-amber/90 disabled:opacity-60">
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Place Order (COD)"}
          </button>
          <p className="mt-2 text-center text-xs text-charcoal/50">Totals are calculated and verified securely on our server.</p>
        </aside>
      </div>
    </Container></Section>
  );
}
