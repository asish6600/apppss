/* Admin Studio → Growth & SEO: paste the Google IDs once, see them go live, and read
   first-party traffic without any Google credentials. */
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Check, ExternalLink, Globe2, Loader2, MonitorSmartphone, Save, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";

const FIELDS = [
  { key: "ga4_measurement_id", label: "Google Analytics 4 — Measurement ID", hint: "Looks like G-XXXXXXXXXX. Analytics → Admin → Data streams → your web stream.", placeholder: "G-XXXXXXXXXX", href: "https://analytics.google.com/" },
  { key: "search_console_verification", label: "Google Search Console — verification code", hint: "Search Console → add property → HTML tag. Paste the whole tag or just the code.", placeholder: "paste the code or the full meta tag", href: "https://search.google.com/search-console" },
  { key: "adsense_publisher_id", label: "Google AdSense — publisher ID", hint: "Looks like ca-pub-0000000000000000. Also fills your ads.txt automatically.", placeholder: "ca-pub-0000000000000000", href: "https://www.google.com/adsense/" },
  { key: "gtm_container_id", label: "Google Tag Manager — container ID (optional)", hint: "Looks like GTM-XXXXXX. Only needed if you manage tags through GTM.", placeholder: "GTM-XXXXXX", href: "https://tagmanager.google.com/" },
  { key: "bing_verification", label: "Bing Webmaster — verification code (optional)", hint: "Bing Webmaster Tools → add site → HTML meta tag.", placeholder: "paste the code", href: "https://www.bing.com/webmasters" },
];

const SEO_FILES = [
  ["/sitemap.xml", "Every page, product, category, recipe and article in all 7 languages, with hreflang tags."],
  ["/robots.txt", "Lets search engines crawl the shop and points them at your sitemap."],
  ["/ads.txt", "Generated from your AdSense publisher ID — required before ads can serve."],
];

const field = "w-full rounded-xl border border-sage/50 bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const label = "text-xs font-700 uppercase tracking-wider text-charcoal/55";

function StatRow({ title, rows, empty, testid }) {
  return (
    <div className="rounded-2xl border border-sage/30 bg-white p-5" data-testid={testid}>
      <p className="text-sm font-700 text-forest">{title}</p>
      {!rows || rows.length === 0 ? (
        <p className="mt-2 text-sm text-charcoal/50">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-charcoal/75">{r.name}</span>
              <span className="shrink-0 font-700 text-charcoal">{r.views}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GrowthAdmin() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [traffic, setTraffic] = useState(null);
  const [days, setDays] = useState(30);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/site-integrations");
      const next = {};
      FIELDS.forEach(({ key }) => { next[key] = data?.[key] || ""; });
      setForm(next);
      setSaved(data || {});
    } catch (e) { toast.error(apiError(e)); setForm({}); }
  }, []);

  const loadTraffic = useCallback(async (d) => {
    try {
      const { data } = await api.get(`/admin/traffic?days=${d}`);
      setTraffic(data);
    } catch (e) { toast.error(apiError(e)); setTraffic(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadTraffic(days); }, [loadTraffic, days]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const payload = {};
      FIELDS.forEach(({ key }) => { payload[key] = (form?.[key] || "").trim() || null; });
      const { data } = await api.put("/admin/site-integrations", payload);
      setSaved(data);
      toast.success("Saved — tags go live on the next page load");
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const peak = Math.max(1, ...((traffic?.by_day || []).map((d) => d.views)));

  return (
    <div className="space-y-8" data-testid="admin-growth">
      {/* ---- TRACKING IDS ---- */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-charcoal">Google &amp; search setup</h2>
            <p className="mt-1 max-w-2xl text-sm text-charcoal/60">
              Paste each ID once. Nothing is hardcoded in the site, so these keep working when you move to another host.
              Leave a field empty and that tag simply never loads.
            </p>
          </div>
          <button onClick={save} disabled={busy || !form} data-testid="growth-save"
            className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-700 text-cream disabled:bg-charcoal/30">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save settings
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {FIELDS.map((f) => {
            const live = !!saved?.[f.key];
            return (
              <div key={f.key} className="rounded-2xl border border-sage/30 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className={label}>{f.label}</p>
                  <span data-testid={`growth-status-${f.key}`}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-700 ${live ? "bg-forest/10 text-forest" : "bg-charcoal/5 text-charcoal/50"}`}>
                    {live ? <><Check className="h-3 w-3" />Live</> : "Not set"}
                  </span>
                </div>
                <input value={form?.[f.key] ?? ""} onChange={set(f.key)} placeholder={f.placeholder}
                  data-testid={`growth-input-${f.key}`} className={`${field} mt-2`} />
                <p className="mt-2 text-xs text-charcoal/55">{f.hint}</p>
                <a href={f.href} target="_blank" rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-700 text-forest hover:underline">
                  Open console<ExternalLink className="h-3 w-3" />
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- SEO FILES ---- */}
      <section>
        <h2 className="inline-flex items-center gap-2 font-serif text-2xl text-charcoal"><Search className="h-5 w-5 text-amber" />SEO files</h2>
        <p className="mt-1 max-w-2xl text-sm text-charcoal/60">
          Served live from your catalogue — they update themselves as you add products. Submit the sitemap URL in Search Console.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3" data-testid="growth-seo-files">
          {SEO_FILES.map(([path, note]) => (
            <div key={path} className="rounded-2xl border border-sage/30 bg-white p-5">
              <a href={`/api${path}`} target="_blank" rel="noreferrer noopener"
                data-testid={`growth-seo-${path.replace(/[^a-z]/gi, "")}`}
                className="inline-flex items-center gap-1 font-700 text-forest hover:underline">
                {path}<ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-2 text-xs text-charcoal/60">{note}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-xs text-charcoal/75">
          <span className="font-700">When you move to your own host:</span> point <code>/sitemap.xml</code>,
          <code> /robots.txt</code> and <code>/ads.txt</code> at <code>/api/sitemap.xml</code>,
          <code> /api/robots.txt</code> and <code>/api/ads.txt</code>, and set <code>APP_URL</code> to your domain
          so the sitemap lists the right URLs.
        </p>
      </section>

      {/* ---- FIRST-PARTY TRAFFIC ---- */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 font-serif text-2xl text-charcoal"><BarChart3 className="h-5 w-5 text-amber" />Your traffic</h2>
            <p className="mt-1 text-sm text-charcoal/60">Counted on your own server — no Google account needed, and it works before Analytics is set up.</p>
          </div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} data-testid="growth-traffic-range" className={`${field} w-auto`}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {traffic === null ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-charcoal/60"><Loader2 className="h-4 w-4 animate-spin" />Loading traffic…</p>
        ) : traffic === false ? (
          <p className="mt-4 text-sm text-charcoal/60">Traffic could not be loaded right now.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[["Views today", traffic.today_views, TrendingUp], [`Views in ${traffic.days} days`, traffic.total_views, BarChart3],
                ["Pages tracked", traffic.top_pages?.length || 0, Globe2]].map(([t, v, Icon]) => (
                <div key={t} className="rounded-2xl border border-sage/30 bg-white p-5" data-testid={`growth-stat-${String(t).toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                  <p className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-wider text-charcoal/55"><Icon className="h-4 w-4 text-forest" />{t}</p>
                  <p className="mt-2 font-serif text-3xl text-forest">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-sage/30 bg-white p-5" data-testid="growth-by-day">
              <p className="text-sm font-700 text-forest">Views per day</p>
              {(traffic.by_day || []).length === 0 ? (
                <p className="mt-2 text-sm text-charcoal/50">No visits recorded yet.</p>
              ) : (
                <div className="mt-4 flex h-32 items-end gap-1.5 overflow-x-auto">
                  {traffic.by_day.map((d) => (
                    <div key={d.day} className="flex min-w-[14px] flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.views} views`}>
                      <div className="w-full rounded-t bg-forest/80 transition-all" style={{ height: `${Math.max(4, (d.views / peak) * 100)}%` }} />
                      <span className="text-[9px] text-charcoal/45">{d.day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatRow testid="growth-top-pages" title="Top pages" rows={traffic.top_pages} empty="No page views yet." />
              <StatRow testid="growth-referrers" title="Where visitors come from" rows={traffic.referrers} empty="No referrers yet." />
              <StatRow testid="growth-devices" title="Devices" rows={traffic.devices} empty="No devices yet." />
              <StatRow testid="growth-languages" title="Languages used" rows={traffic.languages} empty="No languages yet." />
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-charcoal/50"><MonitorSmartphone className="h-3.5 w-3.5" />Counts every page view, including your own visits.</p>
          </>
        )}
      </section>
    </div>
  );
}
