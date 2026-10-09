/* Runtime Google tags: GA4, Tag Manager, AdSense and site-verification meta tags.
   Nothing is baked into the build — the IDs are saved in Admin Studio, stored in Mongo and
   fetched here at runtime, so the same bundle works on any host. Everything degrades
   silently: with no IDs configured, no script loads and no error surfaces. */
import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "@/lib/api";

const GA_SRC = "https://www.googletagmanager.com/gtag/js";
const GTM_SRC = "https://www.googletagmanager.com/gtm.js";
const ADS_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

const validGA = (v) => /^G-[A-Z0-9]{4,20}$/i.test(v || "");
const validAds = (v) => /^ca-pub-\d{10,20}$/i.test(v || "");
const validGTM = (v) => /^GTM-[A-Z0-9]{4,12}$/i.test(v || "");

const SiteIntegrationsContext = createContext({ settings: null, adsenseId: null });
export const useSiteIntegrations = () => useContext(SiteIntegrationsContext);

function removeById(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function loadScript(id, src, attrs = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.src = src;
  s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

function upsertMeta(id, name, content) {
  removeById(id);
  if (!content) return;
  const m = document.createElement("meta");
  m.id = id;
  m.name = name;
  m.content = content;
  document.head.appendChild(m);
}

function installGA(measurementId) {
  if (!validGA(measurementId)) return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
  }
  window.gtag("js", new Date());
  // SPA: we send our own page_view on every route change, so the automatic one is off.
  window.gtag("config", measurementId, { send_page_view: false });
  loadScript("runtime-ga4", `${GA_SRC}?id=${encodeURIComponent(measurementId)}`);
}

function installGTM(containerId) {
  if (!validGTM(containerId)) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  loadScript("runtime-gtm", `${GTM_SRC}?id=${encodeURIComponent(containerId)}`);
}

function installAdSense(publisherId) {
  if (!validAds(publisherId)) return;
  loadScript("runtime-adsense", `${ADS_SRC}?client=${encodeURIComponent(publisherId)}`, {
    crossorigin: "anonymous",
  });
}

export function SiteIntegrations({ children }) {
  const [settings, setSettings] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    api.get("/site-integrations")
      .then(({ data }) => {
        if (!alive || !data) return;
        setSettings(data);
        installGA(data.ga4_measurement_id);
        installGTM(data.gtm_container_id);
        installAdSense(data.adsense_publisher_id);
        upsertMeta("runtime-google-verification", "google-site-verification", data.search_console_verification);
        upsertMeta("runtime-bing-verification", "msvalidate.01", data.bing_verification);
      })
      .catch(() => { /* analytics and ads are optional — never break the page */ });
    return () => { alive = false; };
  }, []);

  // One page_view per route change (GA4) + our own first-party counter for Admin Studio.
  const pagePath = location.pathname + location.search;
  useEffect(() => {
    const gaId = settings?.ga4_measurement_id;
    if (validGA(gaId) && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [settings, pagePath]);

  useEffect(() => {
    const lang = (location.pathname.split("/")[1] || "").slice(0, 5);
    api.post("/track/pageview", {
      path: location.pathname,
      referrer: document.referrer || null,
      lang: lang || null,
    }).catch(() => { /* a missed count must never surface to the visitor */ });
  }, [location.pathname]);

  return (
    <SiteIntegrationsContext.Provider
      value={{ settings, adsenseId: validAds(settings?.adsense_publisher_id) ? settings.adsense_publisher_id : null }}>
      {children}
    </SiteIntegrationsContext.Provider>
  );
}

/* Ad slot that renders nothing at all until a publisher ID is configured. */
export function AdSlot({ slot, className = "" }) {
  const { adsenseId } = useSiteIntegrations();
  useEffect(() => {
    if (!adsenseId || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* adsbygoogle not ready — the script retries on its own */ }
  }, [adsenseId, slot]);
  if (!adsenseId || !slot) return null;
  return (
    <div className={`overflow-hidden rounded-2xl ${className}`} data-testid={`ad-slot-${slot}`}>
      <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={adsenseId}
        data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
