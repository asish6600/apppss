/* Floating AI support assistant ("Nesti").
   Gate: name + email + phone are collected before any chat can start — the backend
   enforces the same. Refund / transaction / product-fault turns come back with a real
   ticket number, which we surface inline. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ChevronDown, Globe, Headset, Loader2, MessageCircle, Send, ShieldCheck, Sparkles, Ticket, X,
} from "lucide-react";
import { LangLink } from "@/components/LangLink";
import api, { apiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STORE_KEY = "an_support_chat_id";
/* Chat language is independent of the site language: it starts from whatever the customer
   is browsing in, but they can switch it here without navigating away. */
const CHAT_LANGS = [
  ["en", "English"], ["hi", "हिन्दी"], ["or", "ଓଡ଼ିଆ"], ["bn", "বাংলা"],
  ["gu", "ગુજરાતી"], ["ta", "தமிழ்"], ["te", "తెలుగు"],
];
const field =
  "w-full rounded-xl border border-sage/50 bg-white px-3.5 py-2.5 text-sm text-charcoal outline-none transition-colors focus:border-forest";

function Bubble({ m }) {
  const mine = m.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${m.role}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          mine
            ? "rounded-br-sm bg-forest text-cream"
            : "rounded-bl-sm bg-white text-charcoal ring-1 ring-sage/40"
        }`}
      >
        {m.text}
        {m.ticket_number && (
          <span
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber/15 px-2 py-1 text-xs font-700 text-forest"
            data-testid="chat-ticket-badge"
          >
            <Ticket className="h-3.5 w-3.5" /> {m.ticket_number}
          </span>
        )}
      </div>
    </div>
  );
}

export function SupportChat() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatLang, setChatLang] = useState(lang || "en");
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [text, setText] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Follow the site language until the customer has made their own choice in the chat.
  const [langPinned, setLangPinned] = useState(false);
  useEffect(() => {
    if (!langPinned && !chatId) setChatLang(lang || "en");
  }, [lang, langPinned, chatId]);

  // Resume an existing conversation on this browser, but never block the widget on it.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
    if (!saved) return;
    setRestoring(true);
    api
      .get(`/support/chat/${saved}`)
      .then(({ data }) => {
        setChatId(data.chat_id);
        setMessages(data.messages || []);
        if (data.lang) { setChatLang(data.lang); setLangPinned(true); }
        setForm({ name: data.customer?.name || "", email: data.customer?.email || "", phone: data.customer?.phone || "" });
      })
      .catch(() => window.localStorage.removeItem(STORE_KEY))
      .finally(() => setRestoring(false));
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, sending]);

  useEffect(() => {
    if (open && chatId) inputRef.current?.focus();
  }, [open, chatId]);

  const start = async (e) => {
    e.preventDefault();
    setError("");
    setStarting(true);
    try {
      const { data } = await api.post("/support/chat/start", { ...form, lang: chatLang, consent: true });
      window.localStorage.setItem(STORE_KEY, data.chat_id);
      setChatId(data.chat_id);
      setMessages(data.messages || []);
      setSuggestions(data.suggestions || []);
      if (data.lang) setChatLang(data.lang);
    } catch (err) {
      setError(apiError(err, "We could not start the chat. Please try again."));
    } finally {
      setStarting(false);
    }
  };

  const send = useCallback(
    async (raw) => {
      const body = (raw ?? "").trim();
      if (!body || !chatId || sending) return;
      setError("");
      setSuggestions([]);
      setText("");
      setMessages((prev) => [...prev, { role: "user", text: body, at: new Date().toISOString() }]);
      setSending(true);
      try {
        const { data } = await api.post(`/support/chat/${chatId}/message`, { text: body, lang: chatLang });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.reply, ticket_number: data.ticket?.ticket_number || null, at: new Date().toISOString() },
        ]);
      } catch (err) {
        setError(apiError(err, "That message did not go through. Please try again."));
      } finally {
        setSending(false);
      }
    },
    [chatId, sending, chatLang]
  );

  const reset = () => {
    window.localStorage.removeItem(STORE_KEY);
    setChatId(null);
    setMessages([]);
    setSuggestions([]);
    setText("");
    setError("");
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("chat.open")}
          data-testid="support-chat-launcher"
          className="fixed bottom-5 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-700 text-cream shadow-xl ring-1 ring-forest/20 transition-transform duration-200 hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-amber md:bottom-7 md:right-7"
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber" />
          </span>
          <span className="hidden sm:inline">{t("chat.open")}</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-x-3 bottom-3 z-[60] flex max-h-[85vh] flex-col overflow-hidden rounded-3xl border border-sage/40 bg-cream shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[600px] sm:max-h-[calc(100vh-3rem)] sm:w-[400px]"
          data-testid="support-chat-panel"
        >
          <div className="flex items-start gap-3 bg-forest px-4 py-3.5 text-cream">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/20 ring-1 ring-amber/40">
              <Headset className="h-4.5 w-4.5 text-amber" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-700 leading-tight">
                {t("chat.title")}
                <Sparkles className="h-3.5 w-3.5 text-amber" />
              </p>
              <p className="truncate text-xs text-cream/70">{t("chat.subtitle")}</p>
            </div>
            <label className="relative shrink-0" title={t("chat.language")}>
              <span className="sr-only">{t("chat.language")}</span>
              <Globe className="pointer-events-none absolute left-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber" />
              <select
                value={chatLang}
                onChange={(e) => {
                  setChatLang(e.target.value);
                  setLangPinned(true);
                }}
                data-testid="chat-language-select"
                className="cursor-pointer appearance-none rounded-full bg-cream/15 py-1 pl-6 pr-5 text-[11px] font-700 text-cream outline-none transition-colors hover:bg-cream/25"
              >
                {CHAT_LANGS.map(([code, label]) => (
                  <option key={code} value={code} className="text-charcoal">
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-cream/70" />
            </label>
            {chatId && (
              <button
                type="button"
                onClick={reset}
                data-testid="support-chat-reset"
                className="rounded-full px-2 py-1 text-[11px] font-600 text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream"
              >
                {t("chat.newChat")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("chat.close")}
              data-testid="support-chat-close"
              className="rounded-full p-1.5 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
            >
              <ChevronDown className="h-4 w-4 sm:hidden" />
              <X className="hidden h-4 w-4 sm:block" />
            </button>
          </div>

          {!chatId ? (
            <form
              onSubmit={start}
              className="flex-1 space-y-3.5 overflow-y-auto px-4 py-5"
              data-testid="support-chat-gate"
            >
              <div className="rounded-2xl bg-white p-4 ring-1 ring-sage/40">
                <p className="text-sm font-700 text-forest">{t("chat.gateTitle")}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-charcoal/65">{t("chat.gateSub")}</p>
              </div>
              <div>
                <label className="text-xs font-700 uppercase tracking-wider text-charcoal/55" htmlFor="chat-name">
                  {t("chat.name")}
                </label>
                <input
                  id="chat-name"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={`mt-1.5 ${field}`}
                  data-testid="chat-gate-name"
                />
              </div>
              <div>
                <label className="text-xs font-700 uppercase tracking-wider text-charcoal/55" htmlFor="chat-email">
                  {t("chat.email")}
                </label>
                <input
                  id="chat-email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`mt-1.5 ${field}`}
                  data-testid="chat-gate-email"
                />
              </div>
              <div>
                <label className="text-xs font-700 uppercase tracking-wider text-charcoal/55" htmlFor="chat-phone">
                  {t("chat.phone")}
                </label>
                <input
                  id="chat-phone"
                  required
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  className={`mt-1.5 ${field}`}
                  data-testid="chat-gate-phone"
                />
              </div>
              {error && (
                <p className="flex items-start gap-1.5 text-xs font-600 text-red-600" data-testid="chat-gate-error">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={starting || restoring}
                data-testid="chat-gate-submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber px-6 py-3 text-sm font-700 text-charcoal transition-transform duration-200 hover:scale-[1.01] disabled:opacity-60"
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {t("chat.startChat")}
              </button>
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-charcoal/55">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" />
                <span>
                  {t("chat.privacyNote")}{" "}
                  <LangLink to="/privacy" className="font-600 text-forest underline" data-testid="chat-privacy-link">
                    {t("chat.privacyLink")}
                  </LangLink>
                </span>
              </p>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto bg-cream px-4 py-4" data-testid="support-chat-thread">
                {messages.map((m, i) => (
                  <Bubble key={`${m.at}-${i}`} m={m} />
                ))}
                {sending && (
                  <div className="flex justify-start" data-testid="chat-typing">
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 ring-1 ring-sage/40">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest/60"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {error && (
                  <p className="flex items-start gap-1.5 text-xs font-600 text-red-600" data-testid="chat-error">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
                <div ref={endRef} />
              </div>

              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-sage/30 bg-cream px-4 pt-3" data-testid="chat-suggestions">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      data-testid={`chat-suggestion-${s.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-600 text-forest ring-1 ring-sage/50 transition-colors hover:bg-forest hover:text-cream"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                }}
                className="flex items-end gap-2 border-t border-sage/30 bg-cream px-3 py-3"
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(text);
                    }
                  }}
                  placeholder={t("chat.placeholder")}
                  maxLength={2000}
                  data-testid="chat-input"
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-sage/50 bg-white px-3.5 py-3 text-sm text-charcoal outline-none transition-colors focus:border-forest"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  aria-label={t("chat.send")}
                  data-testid="chat-send"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-cream transition-transform duration-200 hover:scale-105 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
                </button>
              </form>
              <p className="bg-cream px-4 pb-3 text-[11px] leading-snug text-charcoal/50">{t("chat.disclaimer")}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
