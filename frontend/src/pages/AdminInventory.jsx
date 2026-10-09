/**
 * Admin Studio → Inventory & SKU.
 *
 * One row per sellable variant (extra pack sizes included — each is its own SKU).
 * SKU and stock are edited in place and saved per row; the out-of-stock switch is a
 * one-click override that is saved immediately, because that is the action an admin
 * takes the moment something sells out.
 *
 * A product shows as out of stock when EITHER its counted stock is 0 (automatic)
 * OR the admin has flipped the override (manual).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search, Save, Loader2, PackageX, PackageCheck, AlertTriangle, RotateCcw, Boxes,
} from "lucide-react";
import api, { inr, apiError } from "@/lib/api";
import { PageLoader } from "@/components/common";
import { Switch } from "@/components/ui/switch";

const field = "w-full rounded-lg border border-sage/50 bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-forest";

const FILTERS = [
  ["all", "All products", Boxes],
  ["in", "In stock", PackageCheck],
  ["low", "Low stock", AlertTriangle],
  ["out", "Out of stock", PackageX],
];

function StockBadge({ row }) {
  if (row.out_of_stock) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-700 text-destructive"
        data-testid={`inv-badge-out-${row.slug}`}>
        <PackageX className="h-3 w-3" />{row.manual_out_of_stock ? "Out (manual)" : "Sold out"}
      </span>
    );
  }
  if (row.low_stock) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-700 text-amber-700"
        data-testid={`inv-badge-low-${row.slug}`}>
        <AlertTriangle className="h-3 w-3" />Low
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-700 text-forest"
      data-testid={`inv-badge-in-${row.slug}`}>
      <PackageCheck className="h-3 w-3" />In stock
    </span>
  );
}

function InventoryRow({ row, onPatched }) {
  const [sku, setSku] = useState(row.sku || "");
  const [stock, setStock] = useState(String(row.stock ?? 0));
  const [threshold, setThreshold] = useState(String(row.low_stock_threshold ?? 10));
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Re-sync when the parent reloads the list (e.g. after a filter change).
  useEffect(() => {
    setSku(row.sku || "");
    setStock(String(row.stock ?? 0));
    setThreshold(String(row.low_stock_threshold ?? 10));
  }, [row.sku, row.stock, row.low_stock_threshold]);

  const dirty =
    sku !== (row.sku || "") ||
    Number(stock) !== Number(row.stock ?? 0) ||
    Number(threshold) !== Number(row.low_stock_threshold ?? 10);

  const patch = async (body, setter) => {
    setter(true);
    try {
      const { data } = await api.patch(`/admin/inventory/${row.slug}`, body);
      onPatched(row.slug, data.product);
      return true;
    } catch (e) {
      toast.error(apiError(e));
      return false;
    } finally {
      setter(false);
    }
  };

  const save = async () => {
    const n = Number(stock);
    const th = Number(threshold);
    if (!Number.isFinite(n) || n < 0) { toast.error("Stock must be 0 or more."); return; }
    if (!Number.isFinite(th) || th < 0) { toast.error("Low-stock threshold must be 0 or more."); return; }
    if (await patch({ sku: sku.trim(), stock: n, low_stock_threshold: th }, setBusy)) {
      toast.success(`${row.name} updated`);
    }
  };

  const toggleOut = async (checked) => {
    // the switch reads "available", so an ON switch means NOT out of stock
    if (await patch({ out_of_stock: !checked }, setToggling)) {
      toast.success(checked ? `${row.name} is back on sale` : `${row.name} marked out of stock`);
    }
  };

  const restock = async () => {
    if (await patch({ stock: 25, out_of_stock: false }, setBusy)) {
      toast.success(`${row.name} restocked to 25 units`);
    }
  };

  return (
    <tr className="border-t border-sage/20 align-middle" data-testid={`inv-row-${row.slug}`}>
      <td className="p-3">
        <div className="flex items-center gap-2.5">
          <img src={row.image} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
          <div className="min-w-0">
            <p className="truncate font-600 text-charcoal" data-testid={`inv-name-${row.slug}`}>{row.name}</p>
            <p className="truncate text-[11px] text-charcoal/50">
              {row.pack_size || "—"}{row.variant_primary === false ? " · extra pack size" : ""} · {inr(row.price)}
            </p>
          </div>
        </div>
      </td>
      <td className="p-3">
        <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="AN-XXX-000"
          data-testid={`inv-sku-${row.slug}`} className={`${field} min-w-[9rem] font-mono text-xs`} />
      </td>
      <td className="p-3">
        <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
          data-testid={`inv-stock-${row.slug}`} className={`${field} w-20`} />
      </td>
      <td className="p-3">
        <input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)}
          data-testid={`inv-threshold-${row.slug}`} className={`${field} w-20`} />
      </td>
      <td className="p-3"><StockBadge row={row} /></td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          {toggling
            ? <Loader2 className="h-4 w-4 animate-spin text-forest" />
            : <Switch checked={!row.manual_out_of_stock} onCheckedChange={toggleOut}
                aria-label={`${row.name} available for sale`} data-testid={`admin-stock-toggle-${row.slug}`} />}
          <span className="whitespace-nowrap text-[11px] font-600 text-charcoal/60">
            {row.manual_out_of_stock ? "Off sale" : "On sale"}
          </span>
        </div>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <button onClick={save} disabled={!dirty || busy} data-testid={`inv-save-${row.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3 py-1.5 text-xs font-700 text-cream transition-colors hover:bg-forest/90 disabled:cursor-not-allowed disabled:bg-charcoal/20">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save
          </button>
          {row.out_of_stock && (
            <button onClick={restock} disabled={busy} title="Set stock to 25 and put back on sale"
              data-testid={`inv-restock-${row.slug}`}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-600 text-forest transition-colors hover:bg-cream">
              <RotateCcw className="h-3.5 w-3.5" />Restock
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function InventoryAdmin() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (search.trim()) params.set("q", search.trim());
    api.get(`/admin/inventory?${params.toString()}`)
      .then((r) => setData(r.data))
      .catch(() => setData({ items: [], counts: { total: 0, out: 0 } }));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  // Patch one row in place so an edit does not reshuffle or scroll the table.
  const onPatched = (slug, patch) => {
    setData((d) => d && ({
      ...d,
      items: d.items.map((r) => (r.slug === slug ? { ...r, ...patch } : r)),
    }));
  };

  const items = data?.items || [];
  const summary = useMemo(() => ({
    out: items.filter((r) => r.out_of_stock).length,
    low: items.filter((r) => r.low_stock && !r.out_of_stock).length,
  }), [items]);

  return (
    <div data-testid="admin-inventory">
      <div className="mb-4 rounded-2xl border border-sage/30 bg-white p-4">
        <h2 className="font-serif text-xl text-forest">Inventory &amp; SKU</h2>
        <p className="mt-1 text-sm text-charcoal/65">
          Edit the SKU and unit count for every variant. A product goes out of stock
          <strong> automatically</strong> when its count reaches 0 after a sale — and the
          switch lets you take anything off sale right now, even with units left.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l, Icon]) => (
          <button key={k} onClick={() => setFilter(k)} data-testid={`inv-filter-${k}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-600 transition-colors ${
              filter === k ? "bg-forest text-cream" : "bg-white text-charcoal ring-1 ring-sage/40 hover:bg-cream"}`}>
            <Icon className="h-4 w-4" />{l}
            {k === "out" && summary.out > 0 && filter !== "out" && (
              <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-800 text-destructive">{summary.out}</span>
            )}
          </button>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU…"
              data-testid="inv-search" className={`${field} w-56 pl-8`} />
          </div>
          <button type="submit" data-testid="inv-search-btn"
            className="rounded-full bg-charcoal px-3.5 py-1.5 text-sm font-600 text-cream transition-colors hover:bg-charcoal/85">
            Search
          </button>
        </form>
      </div>

      {!data ? <PageLoader /> : (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-charcoal/60" data-testid="inv-summary">
            <span><strong className="text-charcoal">{items.length}</strong> shown</span>
            <span><strong className="text-destructive">{summary.out}</strong> out of stock</span>
            <span><strong className="text-amber-700">{summary.low}</strong> low</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-sage/30 bg-white">
            <table className="w-full min-w-[920px] text-sm" data-testid="admin-inventory-table">
              <thead>
                <tr className="bg-cream text-left text-charcoal/60">
                  <th className="p-3 font-600">Product</th>
                  <th className="p-3 font-600">SKU</th>
                  <th className="p-3 font-600">Stock</th>
                  <th className="p-3 font-600">Low at</th>
                  <th className="p-3 font-600">Status</th>
                  <th className="p-3 font-600">Available for sale</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => <InventoryRow key={row.slug} row={row} onPatched={onPatched} />)}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="p-6 text-center text-sm text-charcoal/55" data-testid="inv-empty">
                Nothing matches this filter.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default InventoryAdmin;
