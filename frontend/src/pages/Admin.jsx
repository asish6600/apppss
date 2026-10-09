import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Megaphone, ClipboardList, LayoutDashboard, Upload, Loader2, Flame, Boxes, Eye, EyeOff, ArrowUp, ArrowDown, X, Star, LineChart, LifeBuoy, Warehouse, FileDown } from "lucide-react";
import api, { inr, apiError, downloadFile } from "@/lib/api";
import { Container, Section, PrimaryBtn, OutlineBtn, PageLoader, useSEO } from "@/components/common";
import { THEME_KEYS } from "@/components/PromoBanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GrowthAdmin } from "@/pages/AdminGrowth";
import { TicketsAdmin } from "@/pages/AdminTickets";
import { InventoryAdmin } from "@/pages/AdminInventory";

const field = "w-full rounded-xl border border-sage/50 bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const label = "text-xs font-600 text-charcoal/60";
const toLocalInput = (iso) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return ""; const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

export default function Admin() {
  const [tab, setTab] = useState("products");
  const [stats, setStats] = useState(null);
  useSEO({ title: "Admin Studio · AaharNest" });
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {}); }, [tab]);

  const TABS = [["products", "Products", Package], ["inventory", "Inventory & SKU", Warehouse],
    ["deals", "Today's Deals", Flame], ["combos", "Combo Boxes", Boxes],
    ["reviews", "Reviews", Star], ["campaigns", "Campaigns", Megaphone], ["orders", "Orders", ClipboardList],
    ["tickets", "Support Tickets", LifeBuoy],
    ["growth", "Growth & SEO", LineChart]];

  return (
    <Section>
      <Container>
        <div className="mb-6 flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 text-forest" />
          <div><p className="text-xs font-700 uppercase tracking-widest text-amber">Admin Studio</p>
            <h1 className="font-serif text-3xl text-charcoal">Manage AaharNest</h1></div>
        </div>
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[["Products", stats.products], ["Categories", stats.categories], ["Campaigns", stats.campaigns], ["Orders", stats.orders], ["Customers", stats.customers]].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-sage/30 bg-white p-4"><p className="text-xs text-charcoal/55">{k}</p><p className="mt-1 font-serif text-2xl text-forest">{v}</p></div>
            ))}
          </div>
        )}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)} data-testid={`admin-tab-${k}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-600 ${tab === k ? "bg-forest text-cream" : "bg-white text-charcoal ring-1 ring-sage/40"}`}>
              <Icon className="h-4 w-4" />{l}
            </button>
          ))}
        </div>
        {tab === "products" && <ProductsAdmin />}
        {tab === "inventory" && <InventoryAdmin />}
        {tab === "deals" && <DealsAdmin />}
        {tab === "combos" && <CombosAdmin />}
        {tab === "reviews" && <ReviewsAdmin />}
        {tab === "campaigns" && <CampaignsAdmin />}
        {tab === "orders" && <OrdersAdmin />}
        {tab === "tickets" && <TicketsAdmin />}
        {tab === "growth" && <GrowthAdmin />}
      </Container>
    </Section>
  );
}

/* ---------------- PRODUCTS ---------------- */
const EMPTY_PRODUCT = { name: "", slug: "", sku: "", category: "", subcategory: "", brand: "AaharNest", price: 0, mrp: 0, stock: 0, out_of_stock: false, low_stock_threshold: 10, pack_size: "", image: "", short_description: "", description: "", ingredients: "", storage: "", origin: "", origin_region: "", organic_status: false, certification: "", certification_number: "", farmer_connected: false, is_new: false, featured: false, is_combo: false, top_seller_rank: "", sales_count: "", badges: [], campaign_slug: "", status: "PUBLISHED" };

function ProductsAdmin() {
  const [products, setProducts] = useState(null);
  const [cats, setCats] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [editing, setEditing] = useState(null); // product object or {} for new
  const load = useCallback(() => { api.get("/admin/products").then((r) => setProducts(r.data.products)).catch(() => setProducts([])); }, []);
  useEffect(() => { load(); api.get("/categories").then((r) => setCats(r.data.categories)); api.get("/admin/campaigns").then((r) => setCampaigns(r.data.campaigns)); }, [load]);

  const del = async (slug) => { if (!window.confirm("Delete this product?")) return; try { await api.delete(`/admin/products/${slug}`); toast.success("Deleted"); load(); } catch (e) { toast.error(apiError(e)); } };

  if (!products) return <PageLoader />;
  return (
    <div>
      <div className="mb-4"><PrimaryBtn onClick={() => setEditing({ ...EMPTY_PRODUCT, _new: true })} data-testid="admin-add-product"><Plus className="h-4 w-4" />Add Product</PrimaryBtn></div>
      <div className="overflow-x-auto rounded-2xl border border-sage/30 bg-white">
        <table className="w-full min-w-[700px] text-sm" data-testid="admin-products-table">
          <thead><tr className="bg-cream text-left text-charcoal/60"><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.slug} className="border-t border-sage/20" data-testid={`admin-product-row-${p.slug}`}>
                <td className="p-3"><div className="flex items-center gap-2"><img src={p.image} alt="" className="h-9 w-9 rounded-md object-cover" /><span className="font-600 text-charcoal">{p.name}</span></div></td>
                <td className="p-3 capitalize text-charcoal/70">{p.category}</td>
                <td className="p-3 text-charcoal/70">{inr(p.price)} {p.mrp > p.price && <span className="text-xs text-charcoal/40 line-through">{inr(p.mrp)}</span>}</td>
                <td className="p-3 text-charcoal/70">{p.stock}{(p.out_of_stock || p.stock <= 0) && <span className="ml-1.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-700 text-destructive" data-testid={`admin-oos-${p.slug}`}>OUT</span>}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "PUBLISHED" ? "bg-forest/10 text-forest" : "bg-charcoal/10 text-charcoal/60"}`}>{p.status}</span></td>
                <td className="p-3"><div className="flex gap-1">
                  <button onClick={() => setEditing(p)} data-testid={`admin-edit-${p.slug}`} className="rounded-lg p-2 text-forest hover:bg-cream"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(p.slug)} data-testid={`admin-delete-${p.slug}`} className="rounded-lg p-2 text-destructive hover:bg-cream"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <ProductModal product={editing} cats={cats} campaigns={campaigns} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ProductModal({ product, cats, campaigns, onClose, onSaved }) {
  const [f, setF] = useState({ ...product, badges: (product.badges || []).join(", ") });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const full = `${process.env.REACT_APP_BACKEND_URL}${data.url}`;
      setF((prev) => ({ ...prev, image: full }));
      toast.success("Image uploaded");
    } catch (err) { toast.error(apiError(err)); } finally { setUploading(false); e.target.value = ""; }
  };
  const save = async () => {
    setBusy(true);
    const payload = { ...f, price: Number(f.price), mrp: Number(f.mrp) || null, stock: Number(f.stock),
      out_of_stock: !!f.out_of_stock,
      low_stock_threshold: f.low_stock_threshold === "" || f.low_stock_threshold == null ? null : Number(f.low_stock_threshold),
      top_seller_rank: f.top_seller_rank === "" || f.top_seller_rank == null ? null : Number(f.top_seller_rank),
      sales_count: f.sales_count === "" || f.sales_count == null ? null : Number(f.sales_count),
      badges: String(f.badges).split(",").map((s) => s.trim()).filter(Boolean), campaign_slug: f.campaign_slug || null };
    delete payload._new; delete payload._id; delete payload.discount; delete payload.id; delete payload.created_at; delete payload.updated_at;
    delete payload.manual_out_of_stock; delete payload.stock_on_hand; delete payload.deal; delete payload.regular_price;
    try {
      if (product._new) await api.post("/admin/products", payload);
      else await api.put(`/admin/products/${product.slug}`, payload);
      toast.success("Saved"); onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] overflow-y-auto bg-cream sm:max-w-2xl" data-testid="admin-product-modal">
        <DialogHeader><DialogTitle className="font-serif text-xl text-forest">{product._new ? "Add Product" : "Edit Product"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className={label}>Name</p><input value={f.name} onChange={set("name")} data-testid="pf-name" className={field} /></div>
          <div><p className={label}>Slug {product._new ? "(auto if blank)" : "(locked)"}</p><input value={f.slug} onChange={set("slug")} disabled={!product._new} className={`${field} ${!product._new ? "opacity-60" : ""}`} /></div>
          <div><p className={label}>SKU</p><input value={f.sku} onChange={set("sku")} className={field} /></div>
          <div><p className={label}>Category</p><select value={f.category} onChange={set("category")} data-testid="pf-category" className={field}><option value="">Select…</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><p className={label}>Selling Price (₹)</p><input type="number" value={f.price} onChange={set("price")} data-testid="pf-price" className={field} /></div>
          <div><p className={label}>MRP (₹)</p><input type="number" value={f.mrp} onChange={set("mrp")} data-testid="pf-mrp" className={field} /></div>
          <div><p className={label}>Stock</p><input type="number" value={f.stock} onChange={set("stock")} data-testid="pf-stock" className={field} /></div>
          <div><p className={label}>Low-stock alert at</p><input type="number" value={f.low_stock_threshold ?? 10} onChange={set("low_stock_threshold")} data-testid="pf-low-stock" className={field} /></div>
          <label className="flex items-center gap-2 rounded-xl bg-amber/10 p-3 text-sm sm:col-span-2">
            <input type="checkbox" checked={!!f.out_of_stock} onChange={set("out_of_stock")} data-testid="pf-out-of-stock" className="accent-forest" />
            <span>Mark <strong>Out of Stock</strong> (forces the product off sale even if units remain. Stock reaching 0 already does this on its own.)</span>
          </label>
          <div><p className={label}>Pack size</p><input value={f.pack_size} onChange={set("pack_size")} className={field} /></div>
          <div className="sm:col-span-2">
            <p className={label}>Product image</p>
            <div className="mt-1 flex items-start gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-sage/40 bg-white">
                {f.image ? <img src={f.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-charcoal/40">No image</div>}
              </div>
              <div className="flex-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-forest px-3 py-2 text-sm font-600 text-forest transition-colors hover:bg-forest hover:text-cream" data-testid="pf-upload-label">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading…" : "Upload photo"}
                  <input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} data-testid="pf-upload-input" className="hidden" />
                </label>
                <p className="mt-1 text-[11px] text-charcoal/50">JPG, PNG or WEBP · up to 8 MB. Or paste an image URL below.</p>
                <input value={f.image} onChange={set("image")} data-testid="pf-image" placeholder="https://…" className={`${field} mt-2`} />
              </div>
            </div>
          </div>
          <div className="sm:col-span-2"><p className={label}>Short description</p><input value={f.short_description} onChange={set("short_description")} className={field} /></div>
          <div className="sm:col-span-2"><p className={label}>Full description</p><textarea rows={3} value={f.description} onChange={set("description")} className={field} /></div>
          <div className="sm:col-span-2"><p className={label}>Ingredients</p><input value={f.ingredients} onChange={set("ingredients")} className={field} /></div>
          <div><p className={label}>Origin</p><input value={f.origin} onChange={set("origin")} className={field} /></div>
          <div><p className={label}>Origin region</p><input value={f.origin_region || ""} onChange={set("origin_region")} className={field} /></div>
          <div className="sm:col-span-2"><p className={label}>Badges (comma separated)</p><input value={f.badges} onChange={set("badges")} className={field} /></div>
          <div><p className={label}>Campaign</p><select value={f.campaign_slug || ""} onChange={set("campaign_slug")} data-testid="pf-campaign" className={field}><option value="">None</option>{campaigns.map((c) => <option key={c.campaign_slug} value={c.campaign_slug}>{c.campaign_name}</option>)}</select></div>
          <div><p className={label}>Status</p><select value={f.status} onChange={set("status")} className={field}><option>PUBLISHED</option><option>DRAFT</option><option>ARCHIVED</option></select></div>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={set("featured")} data-testid="pf-featured" className="accent-forest" />Top Seller (Customer Favourites)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_new} onChange={set("is_new")} data-testid="pf-is-new" className="accent-forest" />Fresh Arrival (New)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.is_combo} onChange={set("is_combo")} data-testid="pf-is-combo" className="accent-forest" />Combo Box</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.organic_status} onChange={set("organic_status")} className="accent-forest" />Organic (verified)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.farmer_connected} onChange={set("farmer_connected")} className="accent-forest" />Farmer connected</label>
          </div>
          <div><p className={label}>Top Seller rank (1 = highest)</p><input type="number" value={f.top_seller_rank ?? ""} onChange={set("top_seller_rank")} data-testid="pf-top-rank" className={field} placeholder="blank = unranked" /></div>
          <div><p className={label}>Sales count</p><input type="number" value={f.sales_count ?? ""} onChange={set("sales_count")} data-testid="pf-sales-count" className={field} /></div>
          <p className="sm:col-span-2 -mt-1 rounded-xl bg-amber/10 p-3 text-[11px] text-charcoal/65">
            <strong>Today's Deals</strong> are managed from their own tab — add a product there to give it a limited-time deal price. A live deal product shows <em>only</em> on the Today's Deals page; hidden or ended deals fall back to the Shop at their regular price. <strong>Combo Boxes</strong> are built in the Combo Boxes tab and appear only on the Combo Boxes page.
          </p>
          {f.organic_status && <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2 rounded-xl bg-amber/10 p-3">
            <div><p className={label}>Certification</p><input value={f.certification} onChange={set("certification")} className={field} placeholder="e.g. India Organic (only if verified)" /></div>
            <div><p className={label}>Certification number</p><input value={f.certification_number} onChange={set("certification_number")} className={field} /></div>
          </div>}
        </div>
        <div className="mt-4 flex gap-2"><PrimaryBtn onClick={save} disabled={busy} data-testid="pf-save">{busy ? "Saving…" : "Save Product"}</PrimaryBtn><OutlineBtn onClick={onClose}>Cancel</OutlineBtn></div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- TODAY'S DEALS MANAGER ---------------- */
function DealsAdmin() {
  const [data, setData] = useState(null);
  const [pick, setPick] = useState("");
  const [pct, setPct] = useState(20);
  const [badge, setBadge] = useState("Today's Deal");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get("/admin/deals").then((r) => setData(r.data)).catch(() => setData({ deals: [], candidates: [] })), []);
  useEffect(() => { load(); }, [load]);

  const addDeal = async () => {
    if (!pick) { toast.error("Choose a product first."); return; }
    setBusy(true);
    try {
      await api.post("/admin/deals", { slug: pick, deal_discount: Number(pct), deal_badge: badge || "Today's Deal" });
      toast.success("Added to Today's Deals"); setPick(""); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const patch = async (slug, body, msg = "Updated") => {
    try { await api.put(`/admin/deals/${slug}`, body); toast.success(msg); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const remove = async (slug) => {
    if (!window.confirm("Remove this product from Today's Deals? It returns to the Shop at its regular price.")) return;
    try { await api.delete(`/admin/deals/${slug}`); toast.success("Removed from deals"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const move = async (i, dir) => {
    const slugs = data.deals.map((d) => d.slug);
    const j = i + dir;
    if (j < 0 || j >= slugs.length) return;
    [slugs[i], slugs[j]] = [slugs[j], slugs[i]];
    try { await api.put("/admin/deals/reorder", { slugs }); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  if (!data) return <PageLoader />;
  return (
    <div data-testid="admin-deals">
      <div className="mb-5 rounded-2xl border border-amber/40 bg-amber/10 p-4">
        <p className="text-sm font-700 text-forest">Today's Deals Manager</p>
        <p className="mt-1 text-xs text-charcoal/65">Only products you add here appear on the Today's Deals page — a product is never pulled in just because it is discounted. Deal prices reset at midnight (IST) unless you set an explicit end date; when a deal ends the item shows “Deal ended” and reverts to its regular price. Hiding a deal sends the product back to the Shop at its normal price.</p>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-sage/30 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <p className={label}>Add a product to Today's Deals</p>
          <select value={pick} onChange={(e) => setPick(e.target.value)} data-testid="deal-add-select" className={field}>
            <option value="">Select a product…</option>
            {data.candidates.map((c) => <option key={c.slug} value={c.slug}>{c.name} — {inr(c.price)} ({c.pack_size})</option>)}
          </select>
        </div>
        <div><p className={label}>Deal discount %</p><input type="number" min="1" max="90" value={pct} onChange={(e) => setPct(e.target.value)} data-testid="deal-add-pct" className={`${field} sm:w-28`} /></div>
        <div><p className={label}>Badge</p><input value={badge} onChange={(e) => setBadge(e.target.value)} data-testid="deal-add-badge" className={`${field} sm:w-36`} /></div>
        <div className="flex items-end"><PrimaryBtn onClick={addDeal} disabled={busy} data-testid="deal-add-btn"><Plus className="h-4 w-4" />Add Deal</PrimaryBtn></div>
      </div>

      {data.deals.length === 0 ? <p className="text-charcoal/60">No deals yet. Add one above.</p> : (
        <div className="space-y-3" data-testid="admin-deals-list">
          {data.deals.map((d, i) => <DealRow key={d.slug} d={d} i={i} total={data.deals.length} onMove={move} onPatch={patch} onRemove={remove} />)}
        </div>
      )}
    </div>
  );
}

function DealRow({ d, i, total, onMove, onPatch, onRemove }) {
  const [pct, setPct] = useState(d.deal_discount || 0);
  const [badge, setBadge] = useState(d.deal_badge || "");
  const [stock, setStock] = useState(d.deal_stock ?? "");
  const [end, setEnd] = useState(toLocalInput(d.deal_end_at));
  const state = d.deal?.status || (d.deal_visible ? "live" : "hidden");
  const tone = { live: "bg-forest/10 text-forest", hidden: "bg-charcoal/10 text-charcoal/60", ended: "bg-destructive/10 text-destructive", scheduled: "bg-amber/20 text-charcoal" }[state] || "bg-charcoal/10";

  return (
    <div className="rounded-2xl border border-sage/30 bg-white p-4" data-testid={`admin-deal-row-${d.slug}`}>
      <div className="flex flex-wrap items-start gap-3">
        <img src={d.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
        <div className="min-w-[180px] flex-1">
          <p className="font-600 text-charcoal">{d.name}</p>
          <p className="text-xs text-charcoal/55">{d.pack_size} · MRP {inr(d.mrp)} · regular {inr(d.regular_price ?? d.price)}</p>
          <p className="mt-1 text-sm font-700 text-forest">Deal {inr(d.deal_price)} <span className="text-xs font-600 text-amber">({d.deal_discount}% off)</span></p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-700 ${tone}`} data-testid={`deal-state-${d.slug}`}>{state}</span>
        <div className="flex gap-1">
          <button onClick={() => onMove(i, -1)} disabled={i === 0} data-testid={`deal-up-${d.slug}`} className="rounded-lg p-2 text-forest hover:bg-cream disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
          <button onClick={() => onMove(i, 1)} disabled={i === total - 1} data-testid={`deal-down-${d.slug}`} className="rounded-lg p-2 text-forest hover:bg-cream disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
          <button onClick={() => onPatch(d.slug, { deal_visible: !d.deal_visible }, d.deal_visible ? "Deal hidden — product back in Shop" : "Deal shown")} data-testid={`deal-toggle-${d.slug}`} className="rounded-lg p-2 text-forest hover:bg-cream">
            {d.deal_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button onClick={() => onRemove(d.slug)} data-testid={`deal-remove-${d.slug}`} className="rounded-lg p-2 text-destructive hover:bg-cream"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 border-t border-sage/20 pt-3 sm:grid-cols-5">
        <div><p className={label}>Discount %</p><input type="number" value={pct} onChange={(e) => setPct(e.target.value)} data-testid={`deal-pct-${d.slug}`} className={field} /></div>
        <div><p className={label}>Badge</p><input value={badge} onChange={(e) => setBadge(e.target.value)} data-testid={`deal-badge-${d.slug}`} className={field} /></div>
        <div><p className={label}>Deal stock (blank = all)</p><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} data-testid={`deal-stock-${d.slug}`} className={field} /></div>
        <div><p className={label}>Ends at (blank = midnight)</p><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} data-testid={`deal-end-${d.slug}`} className={field} /></div>
        <div className="flex items-end gap-2">
          <PrimaryBtn data-testid={`deal-save-${d.slug}`} onClick={() => onPatch(d.slug, {
            deal_discount: Number(pct), deal_badge: badge,
            deal_stock: stock === "" ? null : Number(stock), clear_stock: stock === "",
            deal_end_at: end ? fromLocalInput(end) : null, clear_dates: !end,
          }, "Deal saved")}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- COMBO BOX BUILDER ---------------- */
function CombosAdmin() {
  const [combos, setCombos] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => api.get("/admin/products").then((r) => setCombos(r.data.products.filter((p) => p.is_combo))).catch(() => setCombos([])), []);
  useEffect(() => { load(); }, [load]);
  const del = async (slug) => {
    if (!window.confirm("Delete this Combo Box?")) return;
    try { await api.delete(`/admin/products/${slug}`); toast.success("Deleted"); load(); } catch (e) { toast.error(apiError(e)); }
  };
  if (!combos) return <PageLoader />;
  return (
    <div data-testid="admin-combos">
      <div className="mb-5 rounded-2xl border border-forest/25 bg-cream/60 p-4">
        <p className="text-sm font-700 text-forest">Combo Box Builder</p>
        <p className="mt-1 text-xs text-charcoal/65">A Combo Box is a bundle of existing products. Pick the member products and enter a bundle discount % — the box price, the “bought separately” total and the savings are calculated for you, so combo pricing can never drift from product pricing.</p>
      </div>
      <div className="mb-4"><PrimaryBtn onClick={() => setEditing({ _new: true })} data-testid="admin-add-combo"><Plus className="h-4 w-4" />New Combo Box</PrimaryBtn></div>
      {combos.length === 0 ? <p className="text-charcoal/60">No combo boxes yet.</p> : (
        <div className="grid gap-3 md:grid-cols-2" data-testid="admin-combos-list">
          {combos.map((c) => (
            <div key={c.slug} className="rounded-2xl border border-sage/30 bg-white p-4" data-testid={`admin-combo-row-${c.slug}`}>
              <div className="flex items-start gap-3">
                <img src={c.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-600 text-charcoal">{c.name}</p>
                  <p className="text-xs text-charcoal/55">{(c.combo_items || []).length} products · {c.combo_discount_pct}% bundle discount</p>
                  <p className="mt-1 text-sm font-700 text-forest">{inr(c.price)} <span className="text-xs font-400 text-charcoal/40 line-through">{inr(c.mrp)}</span> <span className="text-xs font-600 text-amber">save {inr((c.mrp || 0) - (c.price || 0))}</span></p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(c)} data-testid={`admin-edit-combo-${c.slug}`} className="rounded-lg p-2 text-forest hover:bg-cream"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(c.slug)} className="rounded-lg p-2 text-destructive hover:bg-cream"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <ComboModal combo={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ComboModal({ combo, onClose, onSaved }) {
  const [f, setF] = useState({
    name: combo.name || "", slug: combo.slug || "", image: combo.image || "",
    short_description: combo.short_description || "", description: combo.description || "",
    stock: combo.stock ?? 40, combo_discount_pct: combo.combo_discount_pct ?? 15,
    status: combo.status || "PUBLISHED",
  });
  const [items, setItems] = useState(combo.combo_items?.length ? combo.combo_items : []);
  const [candidates, setCandidates] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.get("/admin/deals").then((r) => setCandidates(r.data.candidates)).catch(() => {}); }, []);

  useEffect(() => {
    if (items.length === 0) { setPreview(null); return; }
    api.post("/admin/combos/preview", { items, discount_pct: Number(f.combo_discount_pct) || 0 })
      .then((r) => setPreview(r.data)).catch(() => setPreview(null));
  }, [items, f.combo_discount_pct]);

  const addItem = (slug) => { if (slug && !items.some((i) => i.slug === slug)) setItems([...items, { slug, qty: 1 }]); };
  const setQty = (slug, qty) => setItems(items.map((i) => (i.slug === slug ? { ...i, qty: Math.max(1, Number(qty) || 1) } : i)));
  const removeItem = (slug) => setItems(items.filter((i) => i.slug !== slug));

  const save = async () => {
    if (!f.name.trim()) { toast.error("Give the combo box a name."); return; }
    if (items.length === 0) { toast.error("Add at least one product to the box."); return; }
    setBusy(true);
    const payload = {
      ...f, stock: Number(f.stock), combo_discount_pct: Number(f.combo_discount_pct) || 0,
      category: "combos", subcategory: "Combo Box", is_combo: true, combo_items: items,
      pack_size: `${items.length} products`, product_type: "Combo Box",
      badges: ["Combo Box", "Made in India"],
    };
    try {
      if (combo._new) await api.post("/admin/products", payload);
      else await api.put(`/admin/products/${combo.slug}`, payload);
      toast.success("Combo Box saved"); onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] overflow-y-auto bg-cream sm:max-w-2xl" data-testid="admin-combo-modal">
        <DialogHeader><DialogTitle className="font-serif text-xl text-forest">{combo._new ? "New Combo Box" : "Edit Combo Box"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className={label}>Box name</p><input value={f.name} onChange={set("name")} data-testid="cbf-name" className={field} placeholder="Millet Starter Box" /></div>
          <div><p className={label}>Slug {combo._new ? "(auto if blank)" : "(locked)"}</p><input value={f.slug} onChange={set("slug")} disabled={!combo._new} className={`${field} ${!combo._new ? "opacity-60" : ""}`} /></div>
          <div className="sm:col-span-2"><p className={label}>Bundle image URL</p><input value={f.image} onChange={set("image")} data-testid="cbf-image" className={field} placeholder="https://…" /></div>
          <div className="sm:col-span-2"><p className={label}>Short description</p><input value={f.short_description} onChange={set("short_description")} data-testid="cbf-short" className={field} /></div>
          <div className="sm:col-span-2"><p className={label}>Full description</p><textarea rows={2} value={f.description} onChange={set("description")} className={field} /></div>
          <div><p className={label}>Bundle discount %</p><input type="number" min="0" max="80" value={f.combo_discount_pct} onChange={set("combo_discount_pct")} data-testid="cbf-pct" className={field} /></div>
          <div><p className={label}>Stock (boxes)</p><input type="number" value={f.stock} onChange={set("stock")} data-testid="cbf-stock" className={field} /></div>

          <div className="sm:col-span-2 rounded-xl border border-sage/40 bg-white p-3">
            <p className={label}>Products in this box</p>
            <select value="" onChange={(e) => addItem(e.target.value)} data-testid="cbf-add-item" className={`${field} mt-1`}>
              <option value="">Add a product…</option>
              {candidates.filter((c) => !items.some((i) => i.slug === c.slug)).map((c) => (
                <option key={c.slug} value={c.slug}>{c.name} — {inr(c.price)} ({c.pack_size})</option>
              ))}
            </select>
            <div className="mt-3 space-y-2" data-testid="cbf-items">
              {items.length === 0 && <p className="text-xs text-charcoal/50">No products added yet.</p>}
              {(preview?.members || items).map((m) => {
                const slug = m.slug;
                const meta = preview?.members?.find((x) => x.slug === slug) || candidates.find((c) => c.slug === slug) || {};
                const qty = items.find((i) => i.slug === slug)?.qty || 1;
                return (
                  <div key={slug} className="flex items-center gap-2 rounded-xl bg-cream/60 p-2" data-testid={`cbf-item-${slug}`}>
                    {meta.image && <img src={meta.image} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                    <span className="flex-1 text-sm text-charcoal">{meta.name || slug}<span className="ml-1 text-xs text-charcoal/50">{meta.pack_size ? `(${meta.pack_size})` : ""}</span></span>
                    <span className="text-xs text-charcoal/60">{inr(meta.price)}</span>
                    <input type="number" min="1" value={qty} onChange={(e) => setQty(slug, e.target.value)} data-testid={`cbf-qty-${slug}`} className="w-14 rounded-lg border border-sage/50 px-2 py-1 text-sm" />
                    <button onClick={() => removeItem(slug)} data-testid={`cbf-remove-${slug}`} className="rounded-lg p-1.5 text-destructive hover:bg-white"><X className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {preview && (
            <div className="sm:col-span-2 grid grid-cols-3 gap-3 rounded-xl bg-forest/5 p-3 text-center" data-testid="cbf-preview">
              <div><p className="text-[11px] text-charcoal/55">Bought separately</p><p className="font-700 text-charcoal/70 line-through">{inr(preview.items_total)}</p></div>
              <div><p className="text-[11px] text-charcoal/55">Combo price</p><p className="font-800 text-forest" data-testid="cbf-combo-price">{inr(preview.combo_price)}</p></div>
              <div><p className="text-[11px] text-charcoal/55">Customer saves</p><p className="font-800 text-amber" data-testid="cbf-savings">{inr(preview.savings)} ({preview.discount_pct}%)</p></div>
            </div>
          )}

          <div><p className={label}>Status</p><select value={f.status} onChange={set("status")} className={field}><option>PUBLISHED</option><option>DRAFT</option><option>ARCHIVED</option></select></div>
        </div>
        <div className="mt-4 flex gap-2"><PrimaryBtn onClick={save} disabled={busy} data-testid="cbf-save">{busy ? "Saving…" : "Save Combo Box"}</PrimaryBtn><OutlineBtn onClick={onClose}>Cancel</OutlineBtn></div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- REVIEW MODERATION ---------------- */
function ReviewsAdmin() {
  const [reviews, setReviews] = useState(null);
  const load = useCallback(() => api.get("/admin/reviews").then((r) => setReviews(r.data.reviews)).catch(() => setReviews([])), []);
  useEffect(() => { load(); }, [load]);
  const del = async (id) => {
    if (!window.confirm("Delete this review? The product rating is recalculated immediately.")) return;
    try { await api.delete(`/admin/reviews/${id}`); toast.success("Review deleted"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  if (!reviews) return <PageLoader />;
  return (
    <div data-testid="admin-reviews">
      <div className="mb-5 rounded-2xl border border-sage/40 bg-cream/60 p-4">
        <p className="text-sm font-700 text-forest">Review Moderation</p>
        <p className="mt-1 text-xs text-charcoal/65">Reviews can only be posted by customers who actually ordered the product, so every rating is a verified purchase. Deleting an abusive or spam review recalculates that product's star rating straight away.</p>
      </div>
      {reviews.length === 0 ? <p className="text-charcoal/60">No reviews yet.</p> : (
        <div className="space-y-3" data-testid="admin-reviews-list">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-sage/30 bg-white p-4" data-testid={`admin-review-${r.id}`}>
              <div className="flex flex-wrap items-start gap-3">
                {r.product_image && <img src={r.product_image} alt="" className="h-12 w-12 rounded-xl object-cover" />}
                <div className="min-w-[200px] flex-1">
                  <p className="text-sm font-600 text-charcoal">{r.product_name}</p>
                  <p className="text-xs text-charcoal/55">{r.user_name} · {new Date(r.created_at || r.updated_at).toLocaleDateString("en-IN")}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2.5 py-1 text-xs font-700 text-charcoal">
                  <Star className="h-3 w-3 fill-amber text-amber" />{r.rating}
                </span>
                <button onClick={() => del(r.id)} data-testid={`admin-review-delete-${r.id}`} className="rounded-lg p-2 text-destructive hover:bg-cream"><Trash2 className="h-4 w-4" /></button>
              </div>
              {r.title && <p className="mt-2 text-sm font-600 text-charcoal">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm text-charcoal/70">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- CAMPAIGNS ---------------- */
const EMPTY_CAMPAIGN = { campaign_name: "", campaign_slug: "", description: "", discount_type: "percentage", discount_value: 0, max_discount_label: "", cta_text: "Shop the Offer", banner_image: "", theme: "launch", emoji: "🌾", status: "active", start_at: "", end_at: "" };

function CampaignsAdmin() {
  const [campaigns, setCampaigns] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => api.get("/admin/campaigns").then((r) => setCampaigns(r.data.campaigns)).catch(() => setCampaigns([])), []);
  useEffect(() => { load(); }, [load]);
  const del = async (slug) => { if (!window.confirm("Delete this campaign? Products will be detached.")) return; try { await api.delete(`/admin/campaigns/${slug}`); toast.success("Deleted"); load(); } catch (e) { toast.error(apiError(e)); } };
  if (!campaigns) return <PageLoader />;
  return (
    <div>
      <div className="mb-4"><PrimaryBtn onClick={() => setEditing({ ...EMPTY_CAMPAIGN, _new: true })} data-testid="admin-add-campaign"><Plus className="h-4 w-4" />Add Campaign</PrimaryBtn></div>
      <div className="grid gap-3 md:grid-cols-2" data-testid="admin-campaigns-list">
        {campaigns.map((c) => (
          <div key={c.campaign_slug} className="rounded-2xl border border-sage/30 bg-white p-5">
            <div className="flex items-start justify-between">
              <div><p className="font-700 text-forest">{c.emoji} {c.campaign_name}</p><p className="text-xs text-charcoal/55">{c.campaign_slug} · {c.theme}</p></div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "active" ? "bg-forest/10 text-forest" : "bg-charcoal/10 text-charcoal/60"}`}>{c.status}</span>
            </div>
            <p className="mt-2 text-sm text-charcoal/70">{c.max_discount_label || `${c.discount_value}% off`}</p>
            {c.end_at && <p className="mt-1 text-xs text-charcoal/50">Ends {new Date(c.end_at).toLocaleString("en-IN")}</p>}
            <div className="mt-3 flex gap-1">
              <button onClick={() => setEditing(c)} data-testid={`admin-edit-campaign-${c.campaign_slug}`} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-forest hover:bg-cream"><Pencil className="h-4 w-4" />Edit</button>
              <button onClick={() => del(c.campaign_slug)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-destructive hover:bg-cream"><Trash2 className="h-4 w-4" />Delete</button>
            </div>
          </div>
        ))}
      </div>
      {editing && <CampaignModal campaign={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function CampaignModal({ campaign, onClose, onSaved }) {
  const [f, setF] = useState({ ...campaign, start_at: toLocalInput(campaign.start_at), end_at: toLocalInput(campaign.end_at) });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    const payload = { ...f, discount_value: Number(f.discount_value), start_at: fromLocalInput(f.start_at), end_at: fromLocalInput(f.end_at) };
    delete payload._new; delete payload._id; delete payload.campaign_id;
    try {
      if (campaign._new) await api.post("/admin/campaigns", payload);
      else await api.put(`/admin/campaigns/${campaign.campaign_slug}`, payload);
      toast.success("Saved"); onSaved();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] overflow-y-auto bg-cream sm:max-w-xl" data-testid="admin-campaign-modal">
        <DialogHeader><DialogTitle className="font-serif text-xl text-forest">{campaign._new ? "Add Campaign" : "Edit Campaign"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><p className={label}>Campaign name</p><input value={f.campaign_name} onChange={set("campaign_name")} data-testid="cf-name" className={field} /></div>
          <div><p className={label}>Slug {campaign._new ? "(auto if blank)" : "(locked)"}</p><input value={f.campaign_slug} onChange={set("campaign_slug")} disabled={!campaign._new} className={`${field} ${!campaign._new ? "opacity-60" : ""}`} /></div>
          <div className="sm:col-span-2"><p className={label}>Description</p><input value={f.description} onChange={set("description")} className={field} /></div>
          <div><p className={label}>Discount value (%)</p><input type="number" value={f.discount_value} onChange={set("discount_value")} data-testid="cf-discount" className={field} /></div>
          <div><p className={label}>Discount label</p><input value={f.max_discount_label} onChange={set("max_discount_label")} className={field} placeholder="up to 25% OFF" /></div>
          <div><p className={label}>Theme</p><select value={f.theme} onChange={set("theme")} data-testid="cf-theme" className={field}>{THEME_KEYS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><p className={label}>Emoji</p><input value={f.emoji} onChange={set("emoji")} className={field} /></div>
          <div className="sm:col-span-2"><p className={label}>Festival greeting (optional — defaults by theme)</p><input value={f.greeting || ""} onChange={set("greeting")} className={field} placeholder="e.g. Wishing you a bright, abundant Diwali 🪔" /></div>
          <div><p className={label}>CTA text</p><input value={f.cta_text} onChange={set("cta_text")} className={field} /></div>
          <div><p className={label}>Status</p><select value={f.status} onChange={set("status")} data-testid="cf-status" className={field}><option value="active">active</option><option value="scheduled">scheduled</option><option value="ended">ended</option></select></div>
          <div><p className={label}>Start</p><input type="datetime-local" value={f.start_at} onChange={set("start_at")} className={field} /></div>
          <div><p className={label}>End</p><input type="datetime-local" value={f.end_at} onChange={set("end_at")} data-testid="cf-end" className={field} /></div>
        </div>
        <p className="mt-2 text-xs text-charcoal/50">A live countdown shows automatically when an end date is set and the campaign is active.</p>
        <div className="mt-4 flex gap-2"><PrimaryBtn onClick={save} disabled={busy} data-testid="cf-save">{busy ? "Saving…" : "Save Campaign"}</PrimaryBtn><OutlineBtn onClick={onClose}>Cancel</OutlineBtn></div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- ORDERS ---------------- */
const STATUSES = ["PLACED", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"];
function OrdersAdmin() {
  const [orders, setOrders] = useState(null);
  const load = useCallback(() => api.get("/admin/orders").then((r) => setOrders(r.data.orders)).catch(() => setOrders([])), []);
  useEffect(() => { load(); }, [load]);
  const update = async (num, status) => { try { await api.put(`/admin/orders/${num}/status`, { status }); toast.success("Status updated"); load(); } catch (e) { toast.error(apiError(e)); } };
  const invoice = async (num) => { try { await downloadFile(`/admin/orders/${num}/invoice`, `INV-${num}.pdf`); } catch (e) { toast.error(apiError(e, "Could not download the invoice.")); } };
  if (!orders) return <PageLoader />;
  if (orders.length === 0) return <p className="text-charcoal/60">No orders yet.</p>;
  return (
    <div className="space-y-3" data-testid="admin-orders-list">
      {orders.map((o) => (
        <div key={o.order_number} className="rounded-2xl border border-sage/30 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-700 text-forest">{o.order_number}</p><p className="text-xs text-charcoal/55">{new Date(o.created_at).toLocaleString("en-IN")} · {o.items.length} items · {inr(o.grand_total)}{o.donation_amount > 0 ? ` · ₹${o.donation_amount} donation` : ""}</p></div>
            <div className="flex items-center gap-2">
              <button onClick={() => invoice(o.order_number)} data-testid={`admin-invoice-${o.order_number}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-forest px-3 py-1.5 text-xs font-700 text-forest transition-colors hover:bg-forest hover:text-cream">
                <FileDown className="h-3.5 w-3.5" />Invoice
              </button>
              <select value={o.status} onChange={(e) => update(o.order_number, e.target.value)} data-testid={`admin-order-status-${o.order_number}`} className="rounded-full border border-sage/50 bg-white px-3 py-1.5 text-sm font-600 outline-none focus:border-forest">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-charcoal/60">{o.address?.full_name}, {o.address?.city}, {o.address?.state} — {o.address?.pincode}</p>
          {o.invoice && (
            <p className="mt-1 text-[11px] text-charcoal/50" data-testid={`admin-invoice-status-${o.order_number}`}>
              {o.invoice.invoice_no} · customer email {o.invoice.emailed_customer ? "sent" : "not sent"}
              {o.invoice.emailed_admin?.length ? ` · desk copy to ${o.invoice.emailed_admin.join(", ")}` : " · no desk copy"}
              {o.invoice.failed?.length ? ` · failed: ${o.invoice.failed.join(", ")}` : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
