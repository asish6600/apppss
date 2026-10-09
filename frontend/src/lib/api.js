import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const asset = (path) => (path && path.startsWith("http") ? path : path || "");

function getCsrf() {
  const m = document.cookie.match(/(?:^|; )an_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

const api = axios.create({ baseURL: API, withCredentials: true });

const MUTATING = ["post", "put", "patch", "delete"];

// The CSRF cookie is only issued by the server. A mutation fired before that
// cookie exists (fast click on first load) or after it has expired (its max-age
// is shorter than the guest-cart cookie's) would otherwise hard-fail with 403 —
// the "cannot add to cart" bug. Bootstrap the token first, in-flight-deduped.
let csrfBootstrap = null;
async function ensureCsrf() {
  if (getCsrf()) return getCsrf();
  if (!csrfBootstrap) {
    csrfBootstrap = axios
      .get(`${API}/csrf`, { withCredentials: true })
      .catch(() => {})
      .finally(() => { csrfBootstrap = null; });
  }
  await csrfBootstrap;
  return getCsrf();
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (MUTATING.includes(method)) {
    config.headers["X-CSRF-Token"] = (await ensureCsrf()) || getCsrf();
  }
  return config;
});

// A token can also go stale between pages (logout clears it). Re-fetch once and
// replay the request instead of surfacing "Invalid request token" to the user.
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const config = error?.config;
    const method = (config?.method || "get").toLowerCase();
    if (
      error?.response?.status === 403 &&
      config &&
      !config._csrfRetried &&
      MUTATING.includes(method)
    ) {
      config._csrfRetried = true;
      await axios.get(`${API}/csrf`, { withCredentials: true }).catch(() => {});
      const token = getCsrf();
      if (token) {
        config.headers = { ...config.headers, "X-CSRF-Token": token };
        return api.request(config);
      }
    }
    return Promise.reject(error);
  }
);

export function apiError(e, fallback = "Something went wrong. Please try again.") {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x && x.msg) || JSON.stringify(x)).join(" ");
  if (d.msg) return d.msg;
  return fallback;
}

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Fetch a binary endpoint and hand it to the browser as a download.
 * Goes through `api` (not a bare <a href>) because the backend lives on another
 * origin and the route is cookie-authenticated — a plain link would omit
 * credentials and come back 401.
 */
export async function downloadFile(path, filename) {
  const { data } = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoke on the next tick so Safari has started the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default api;
