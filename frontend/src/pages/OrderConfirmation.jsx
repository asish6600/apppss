import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Package, MapPin, Truck, FileDown, Loader2, Mail, ReceiptText } from "lucide-react";
import api, { inr, apiError, downloadFile } from "@/lib/api";
import { Container, Section, PageLoader, PrimaryBtn, OutlineBtn, useSEO } from "@/components/common";
import { LangLink } from "@/components/LangLink";

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  useSEO({ title: `Order ${orderNumber} · AaharNest` });

  useEffect(() => {
    let stop = false;
    const fetch = () => api.get(`/orders/${orderNumber}`)
      .then((r) => { if (!stop) setOrder(r.data.order); return r.data.order; })
      .catch(() => { if (!stop) setOrder(false); return null; });

    fetch().then((o) => {
      // The invoice is emailed out of band, so the first read can land before the
      // dispatch has recorded its result. Re-read once to pick up the real status.
      if (o && !o.invoice) {
        const id = setTimeout(fetch, 4000);
        return () => clearTimeout(id);
      }
      return undefined;
    });
    return () => { stop = true; };
  }, [orderNumber]);

  const getInvoice = async () => {
    setBusy(true);
    try {
      await downloadFile(`/orders/${orderNumber}/invoice`, `INV-${orderNumber}.pdf`);
      toast.success("Invoice downloaded");
    } catch (e) {
      toast.error(apiError(e, "Could not download the invoice. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (order === null) return <PageLoader />;
  if (order === false) return <Section><Container><p>Order not found.</p></Container></Section>;

  const inv = order.invoice;
  const invoiceNo = order.invoice_no || inv?.invoice_no || `INV-${order.order_number}`;

  return (
    <Section><Container className="max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-sage/30 bg-white" data-testid="order-confirmation">
        <div className="h-1" style={{ background: "linear-gradient(90deg,#FF9933,#ffffff,#138808)" }} />
        <div className="p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest/10">
            <CheckCircle2 className="h-9 w-9 text-forest" />
          </span>
          <h1 className="mt-4 font-serif text-3xl text-charcoal">Order Successfully Placed</h1>
          <p className="mt-2 text-charcoal/65">
            Thank you! Your order <span className="font-700 text-forest" data-testid="order-number">{order.order_number}</span> is confirmed.
          </p>

          {/* INVOICE */}
          <div className="mt-6 rounded-2xl border border-amber/40 bg-amber/10 p-5 text-left" data-testid="invoice-panel">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-widest text-amber">
                  <ReceiptText className="h-4 w-4" />Tax invoice
                </p>
                <p className="mt-1.5 font-700 text-charcoal" data-testid="invoice-number">{invoiceNo}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-charcoal/70" data-testid="invoice-email-status">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  <span>
                    {inv?.emailed_customer
                      ? "A PDF copy has been emailed to you, and a copy to the AaharNest team."
                      : inv
                        ? "We could not email your invoice just now — download it here and it stays available in My Orders."
                        : "Your invoice is being emailed to you and to the AaharNest team."}
                  </span>
                </p>
              </div>
              <button onClick={getInvoice} disabled={busy} data-testid="checkout-invoice-download-btn"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-700 text-cream transition-[background-color,transform] duration-200 hover:bg-forest/90 hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-charcoal/30">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {busy ? "Preparing…" : "Download PDF Invoice"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
            <Info icon={Package} title="Items">
              {order.items.map((it) => (
                <p key={it.slug} className="text-sm text-charcoal/75">{it.name} × {it.qty} — {inr(it.line_total)}</p>
              ))}
            </Info>
            <Info icon={Truck} title="Payment & Delivery">
              <p className="text-sm text-charcoal/75">Cash on Delivery</p>
              <p className="text-sm text-charcoal/75">Estimated: {order.eta}</p>
              <p className="mt-2 text-sm font-700 text-forest">Total {inr(order.grand_total)}</p>
              {order.donation_amount > 0 && <p className="text-xs text-amber">Includes ₹{order.donation_amount} community contribution</p>}
            </Info>
            <Info icon={MapPin} title="Delivery Address" className="sm:col-span-2">
              <p className="text-sm text-charcoal/75">{order.address.full_name}, {order.address.mobile}</p>
              <p className="text-sm text-charcoal/75">{order.address.address}{order.address.apartment ? `, ${order.address.apartment}` : ""}, {order.address.city}, {order.address.state} — {order.address.pincode}</p>
            </Info>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PrimaryBtn as={LangLink} to="/account/orders" data-testid="track-order-btn">Track Order</PrimaryBtn>
            <OutlineBtn as={LangLink} to="/shop">Continue Shopping</OutlineBtn>
            <OutlineBtn as={LangLink} to="/support">Contact Support</OutlineBtn>
          </div>
        </div>
      </div>
    </Container></Section>
  );
}

function Info({ icon: Icon, title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-sage/30 bg-cream p-4 ${className}`}>
      <p className="flex items-center gap-2 text-xs font-700 uppercase tracking-widest text-forest"><Icon className="h-4 w-4" />{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
