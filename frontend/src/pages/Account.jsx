import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { User, Package, Heart, Bookmark, MapPin, Bell, Shield, Lock, LogOut, Trash2, Loader2, CheckCircle2, Circle, Truck, ChevronDown, FileDown } from "lucide-react";
import api, { inr, apiError, downloadFile } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Container, Section, EmptyState, PrimaryBtn, OutlineBtn, PageLoader } from "@/components/common";
import { LangLink, useLang, useLangNavigate, path } from "@/components/LangLink";
import { ProductCard, RecipeCard } from "@/components/cards";
import { Link } from "react-router-dom";

const NAV = [
  ["Profile", "/account", User], ["My Orders", "/account/orders", Package], ["Wishlist", "/account/wishlist", Heart],
  ["Saved Recipes", "/account/saved", Bookmark],
  ["Addresses", "/account/addresses", MapPin], ["Notifications", "/account/notifications", Bell],
  ["Security", "/account/security", Lock], ["Privacy", "/account/privacy", Shield],
];

export function AccountLayout() {
  const { user, logout } = useAuth();
  const lang = useLang();
  const navigate = useLangNavigate();
  const { pathname } = useLocation();
  const base = pathname.replace(/^\/[a-z]{2}/, "") || "/";

  return (
    <Section><Container>
      <div className="mb-6"><p className="text-xs font-700 uppercase tracking-widest text-amber">My Account</p>
        <h1 className="mt-1 font-serif text-3xl text-charcoal">Hello, {user?.display_name || user?.email?.split("@")[0]}</h1></div>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* min-w-0 is load-bearing: a grid item defaults to min-width:auto, which would
            stretch this aside to the nav's full intrinsic width (9 tabs) and push the
            whole page wider than a phone/tablet viewport instead of letting the nav
            scroll inside itself. */}
        <aside className="h-fit min-w-0 lg:sticky lg:top-24">
          <nav className="flex gap-2 overflow-x-auto overscroll-x-contain rounded-2xl border border-sage/30 bg-white p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible" data-testid="account-nav">
            {NAV.map(([label, to, Icon]) => {
              const active = to === "/account" ? base === "/account" : base.startsWith(to);
              return (
                <Link key={to} to={path(lang, to)} data-testid={`account-nav-${to}`}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-600 transition-colors ${active ? "bg-forest text-cream" : "text-charcoal/75 hover:bg-cream"}`}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              );
            })}
            <button onClick={async () => { await logout(); navigate("/"); }} data-testid="account-logout" className="flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-600 text-destructive hover:bg-cream"><LogOut className="h-4 w-4" />Logout</button>
          </nav>
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </Container></Section>
  );
}

const Panel = ({ title, children }) => (
  <div className="rounded-2xl border border-sage/30 bg-white p-6"><h2 className="font-serif text-xl text-charcoal">{title}</h2><div className="mt-4">{children}</div></div>
);
const field = "w-full rounded-xl border border-sage/50 bg-white px-4 py-2.5 outline-none focus:border-forest";

export function AccountProfile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.display_name || "");
  const [city, setCity] = useState(user?.city || "");
  const [pref, setPref] = useState({ dietary_preference: "", allergies: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/me/preferences").then((r) => { const p = r.data.preferences || {}; setPref({ dietary_preference: p.dietary_preference || "", allergies: (p.allergies || []).join(", ") }); }).catch(() => {}); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/me/profile", { display_name: name, city });
      setUser(data.user);
      await api.put("/me/preferences", { dietary_preference: pref.dietary_preference, allergies: pref.allergies.split(",").map((s) => s.trim()).filter(Boolean) });
      toast.success("Profile saved");
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const cards = [["My Orders", "/account/orders", Package], ["Saved Recipes", "/account/saved", Bookmark], ["Wishlist", "/account/wishlist", Heart], ["Addresses", "/account/addresses", MapPin]];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(([label, to, Icon]) => (
          <LangLink key={to} to={to} className="rounded-2xl border border-sage/30 bg-white p-5 text-center transition-shadow hover:shadow-md" data-testid={`quick-${to}`}>
            <Icon className="mx-auto h-6 w-6 text-forest" /><p className="mt-2 text-sm font-600 text-charcoal">{label}</p>
          </LangLink>
        ))}
      </div>
      <Panel title="Personal Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-sm text-charcoal/60">Name</label><input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name" className={field} /></div>
          <div><label className="text-sm text-charcoal/60">Email</label><input value={user?.email} disabled className={`${field} opacity-60`} /></div>
          <div><label className="text-sm text-charcoal/60">City</label><input value={city} onChange={(e) => setCity(e.target.value)} data-testid="profile-city" className={field} /></div>
        </div>
      </Panel>
      <Panel title="Food Preferences">
        <p className="mb-3 text-xs text-charcoal/50">We do not collect a diagnosis. Food preferences are not a medical record.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="text-sm text-charcoal/60">Dietary preference</label>
            <select value={pref.dietary_preference} onChange={(e) => setPref({ ...pref, dietary_preference: e.target.value })} data-testid="profile-diet" className={field}>
              <option value="">No preference</option>{["Vegetarian","Vegan","Eggetarian","Non-vegetarian"].map((d) => <option key={d}>{d}</option>)}
            </select></div>
          <div><label className="text-sm text-charcoal/60">Allergies / foods to avoid (comma separated)</label><input value={pref.allergies} onChange={(e) => setPref({ ...pref, allergies: e.target.value })} data-testid="profile-allergies" className={field} /></div>
        </div>
      </Panel>
      <PrimaryBtn onClick={save} disabled={busy} data-testid="profile-save">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save changes"}</PrimaryBtn>
    </div>
  );
}

const TRACK_STEPS = [
  ["PLACED", "Order placed"], ["CONFIRMED", "Confirmed"], ["PROCESSING", "Being prepared"],
  ["PACKED", "Packed"], ["SHIPPED", "Shipped"], ["OUT_FOR_DELIVERY", "Out for delivery"], ["DELIVERED", "Delivered"],
];

function OrderTimeline({ order }) {
  const history = order.status_history || [];
  const atOf = (s) => { const h = history.find((x) => x.status === s); return h ? new Date(h.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null; };
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return (
      <div className="mt-3 rounded-xl bg-destructive/5 p-4 text-sm text-destructive" data-testid={`order-timeline-${order.order_number}`}>
        This order was {order.status === "CANCELLED" ? "cancelled" : "refunded"}{atOf(order.status) ? ` on ${atOf(order.status)}` : ""}.
      </div>
    );
  }
  const currentIdx = Math.max(0, TRACK_STEPS.findIndex(([s]) => s === order.status));
  return (
    <ol className="mt-4 space-y-0" data-testid={`order-timeline-${order.order_number}`}>
      {TRACK_STEPS.map(([s, label], i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              {done ? <CheckCircle2 className={`h-5 w-5 ${current ? "text-amber" : "text-forest"}`} /> : <Circle className="h-5 w-5 text-sage/50" />}
              {i < TRACK_STEPS.length - 1 && <span className={`my-0.5 w-0.5 flex-1 ${i < currentIdx ? "bg-forest" : "bg-sage/30"}`} style={{ minHeight: 18 }} />}
            </div>
            <div className={`pb-3 ${done ? "" : "opacity-50"}`}>
              <p className={`text-sm font-600 ${current ? "text-amber" : "text-charcoal"}`}>{label}{current && " · current"}</p>
              {atOf(s) && <p className="text-xs text-charcoal/50">{atOf(s)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AccountOrders() {
  const [orders, setOrders] = useState(null);
  const [openOrder, setOpenOrder] = useState(null);
  useEffect(() => { api.get("/orders").then((r) => setOrders(r.data.orders)).catch(() => setOrders([])); }, []);
  const getInvoice = async (num) => {
    try { await downloadFile(`/orders/${num}/invoice`, `INV-${num}.pdf`); toast.success("Invoice downloaded"); }
    catch (e) { toast.error(apiError(e, "Could not download the invoice.")); }
  };
  if (!orders) return <PageLoader />;
  if (orders.length === 0) return <EmptyState icon={Package} title="No orders yet." cta={<PrimaryBtn as={LangLink} to="/shop">Start Shopping</PrimaryBtn>} />;
  return (
    <div className="space-y-4" data-testid="account-orders">
      {orders.map((o) => {
        const open = openOrder === o.order_number;
        return (
          <div key={o.order_number} className="rounded-2xl border border-sage/30 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-700 text-forest">{o.order_number}</p><p className="text-xs text-charcoal/55">{new Date(o.created_at).toLocaleDateString("en-IN")}</p></div>
              <span className="rounded-full bg-cream px-3 py-1 text-xs font-700 text-forest">{o.status.replace(/_/g, " ")}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{o.items.map((it) => <span key={it.slug} className="rounded-lg bg-cream px-2 py-1 text-xs text-charcoal/70">{it.name} × {it.qty}</span>)}</div>
            <div className="mt-3 flex items-center justify-between border-t border-sage/20 pt-3">
              <span className="text-sm text-charcoal/60">COD · {o.eta}</span>
              <span className="font-700 text-forest">{inr(o.grand_total)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setOpenOrder(open ? null : o.order_number)} data-testid={`track-order-${o.order_number}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-forest px-4 py-2 text-sm font-600 text-forest transition-colors hover:bg-forest hover:text-cream">
                <Truck className="h-4 w-4" />{open ? "Hide tracking" : "Track order"}<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              <button onClick={() => getInvoice(o.order_number)} data-testid={`order-invoice-${o.order_number}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-cream px-4 py-2 text-sm font-600 text-forest ring-1 ring-sage/40 transition-colors hover:bg-sage/20">
                <FileDown className="h-4 w-4" />Invoice
              </button>
            </div>
            {open && <OrderTimeline order={o} />}
          </div>
        );
      })}
    </div>
  );
}

export function AccountWishlist() {
  const [items, setItems] = useState(null);
  const load = () => api.get("/me/wishlist").then((r) => setItems(r.data.wishlist)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  if (!items) return <PageLoader />;
  if (items.length === 0) return <EmptyState icon={Heart} title="Your wishlist is empty." cta={<PrimaryBtn as={LangLink} to="/shop">Browse Products</PrimaryBtn>} />;
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{items.map((p) => <ProductCard key={p.slug} p={p} />)}</div>;
}

export function AccountSaved() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/me/saved-recipes").then((r) => setItems(r.data.saved)).catch(() => setItems([])); }, []);
  if (!items) return <PageLoader />;
  if (items.length === 0) return <EmptyState icon={Bookmark} title="You haven't saved any recipes yet." cta={<PrimaryBtn as={LangLink} to="/recipes">Explore Recipes</PrimaryBtn>} />;
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{items.map((r) => <RecipeCard key={r.slug} r={r} />)}</div>;
}

export function AccountAddresses() {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ full_name: "", mobile: "", address: "", apartment: "", landmark: "", city: "", state: "", pincode: "" });
  const [show, setShow] = useState(false);
  const load = () => api.get("/me/addresses").then((r) => setItems(r.data.addresses)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); try { await api.post("/me/addresses", form); toast.success("Address saved"); setShow(false); setForm({ full_name: "", mobile: "", address: "", apartment: "", landmark: "", city: "", state: "", pincode: "" }); load(); } catch (err) { toast.error(apiError(err)); } };
  const del = async (id) => { await api.delete(`/me/addresses/${id}`); load(); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  if (!items) return <PageLoader />;
  return (
    <div className="space-y-4" data-testid="account-addresses">
      {items.map((a) => (
        <div key={a.id} className="flex items-start justify-between rounded-2xl border border-sage/30 bg-white p-5">
          <div><p className="font-600 text-charcoal">{a.full_name} · {a.mobile}</p><p className="text-sm text-charcoal/65">{a.address}{a.apartment ? `, ${a.apartment}` : ""}, {a.city}, {a.state} — {a.pincode}</p></div>
          <button onClick={() => del(a.id)} className="text-charcoal/40 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      {items.length === 0 && !show && <EmptyState icon={MapPin} title="No saved addresses yet." />}
      {show ? (
        <form onSubmit={add} className="grid gap-3 rounded-2xl border border-sage/30 bg-white p-5 sm:grid-cols-2" data-testid="address-form">
          <input required placeholder="Full Name" value={form.full_name} onChange={set("full_name")} className={field} />
          <input required placeholder="Mobile" value={form.mobile} onChange={set("mobile")} className={field} />
          <input required placeholder="Address" value={form.address} onChange={set("address")} className={`${field} sm:col-span-2`} />
          <input placeholder="Apartment (optional)" value={form.apartment} onChange={set("apartment")} className={field} />
          <input placeholder="Landmark (optional)" value={form.landmark} onChange={set("landmark")} className={field} />
          <input required placeholder="City" value={form.city} onChange={set("city")} className={field} />
          <input required placeholder="State" value={form.state} onChange={set("state")} className={field} />
          <input required placeholder="PIN Code" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} className={field} />
          <div className="flex gap-2 sm:col-span-2"><PrimaryBtn type="submit">Save</PrimaryBtn><OutlineBtn type="button" onClick={() => setShow(false)}>Cancel</OutlineBtn></div>
        </form>
      ) : <PrimaryBtn onClick={() => setShow(true)} data-testid="add-address-btn">Add New Address</PrimaryBtn>}
    </div>
  );
}

export function AccountNotifications() {
  const [on, setOn] = useState(true);
  return <Panel title="Notifications"><label className="flex items-center gap-3"><input type="checkbox" checked={on} onChange={() => setOn(!on)} data-testid="notif-toggle" className="accent-forest" /><span className="text-sm text-charcoal/75">Tell me when a new recipe or product is published</span></label><p className="mt-3 text-xs text-charcoal/50">Preferences are saved to your account.</p></Panel>;
}

export function AccountSecurity() {
  const logoutAll = async () => { try { await api.post("/auth/logout-all"); toast.success("Signed out of all devices"); window.location.reload(); } catch (e) { toast.error(apiError(e)); } };
  return (
    <Panel title="Security">
      <p className="text-sm text-charcoal/70">Your sessions are protected with secure, HttpOnly cookies and CSRF protection. Passwords (where set) are hashed with Argon2id.</p>
      <div className="mt-4"><OutlineBtn onClick={logoutAll} data-testid="logout-all-btn">Sign out of all devices</OutlineBtn></div>
    </Panel>
  );
}

export function AccountPrivacy() {
  const { logout } = useAuth();
  const navigate = useLangNavigate();
  const [confirm, setConfirm] = useState(false);
  const [date, setDate] = useState(null);
  const requestDelete = async () => { try { const { data } = await api.post("/me/delete"); setDate(data.deletion_date); toast("Account scheduled for deletion"); setTimeout(async () => { await logout(); navigate("/"); }, 2500); } catch (e) { toast.error(apiError(e)); } };
  return (
    <div className="space-y-6">
      <Panel title="Privacy & Data"><p className="text-sm text-charcoal/70">The database is the source of truth for your data. We collect only what we need to run your account and deliver orders.</p></Panel>
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="font-serif text-xl text-destructive">Danger Zone</h2>
        {date ? (
          <p className="mt-3 text-sm text-charcoal/75">Your account is scheduled for deletion on <strong>{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>. Sign in again before then to cancel.</p>
        ) : !confirm ? (
          <OutlineBtn onClick={() => setConfirm(true)} data-testid="delete-account-btn" tone="danger" className="mt-3"><Trash2 className="h-4 w-4" />Delete My Account</OutlineBtn>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-charcoal/75">This will schedule permanent deletion after 3 business days. You can cancel by signing in again during this period.</p>
            <div className="mt-3 flex gap-2"><button onClick={requestDelete} data-testid="confirm-delete-btn" className="rounded-full bg-destructive px-5 py-2.5 text-sm font-600 text-cream">Confirm account deletion</button><OutlineBtn onClick={() => setConfirm(false)}>Cancel</OutlineBtn></div>
          </div>
        )}
      </div>
    </div>
  );
}
