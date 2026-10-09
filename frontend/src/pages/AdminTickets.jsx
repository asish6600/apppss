/* Admin Studio → Support Tickets: the inbox the AI chatbot files into.
   Refund, transaction and product-fault chats land here and are emailed to the desk. */
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bot, Check, Clock, Globe, Loader2, Mail, Phone, RefreshCw, Send, Ticket, User } from "lucide-react";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { PageLoader } from "@/components/common";

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const LANG_LABEL = {
  en: "English", hi: "हिन्दी", or: "ଓଡ଼ିଆ", bn: "বাংলা", gu: "ગુજરાતી", ta: "தமிழ்", te: "తెలుగు",
};
const STATUS_STYLE = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber/25 text-charcoal",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-charcoal/10 text-charcoal/60",
};
const field = "w-full rounded-xl border border-sage/50 bg-white px-3 py-2 text-sm outline-none focus:border-forest";

function TicketCard({ t, onChanged }) {
  const [status, setStatus] = useState(t.status);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState(t.status === "OPEN" ? "IN_PROGRESS" : t.status);
  const [replying, setReplying] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/tickets/${t.ticket_number}/status`, { status, note });
      toast.success(`${t.ticket_number} → ${status.replace("_", " ")}`);
      setNote("");
      onChanged();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (reply.trim().length < 2) return;
    setReplying(true);
    try {
      const { data } = await api.post(`/admin/tickets/${t.ticket_number}/reply`, {
        message: reply.trim(),
        status: replyStatus,
      });
      toast.success(`Replied to ${data.emailed_to} · ${t.ticket_number} → ${replyStatus.replace("_", " ")}`);
      setReply("");
      onChanged();
    } catch (e) {
      toast.error(apiError(e, "The reply could not be emailed."));
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-sage/30 bg-white p-5" data-testid={`ticket-${t.ticket_number}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-700 text-forest">
              <Ticket className="h-4 w-4" /> {t.ticket_number}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-700 ${STATUS_STYLE[t.status] || ""}`}>
              {t.status.replace("_", " ")}
            </span>
            {t.priority === "HIGH" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-700 text-white">
                <AlertCircle className="h-3 w-3" /> High
              </span>
            )}
            {t.source === "AI_CHAT" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-600 text-forest">
                <Bot className="h-3 w-3" /> AI chat
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-600 ${
                t.emailed_admin ? "bg-emerald-50 text-emerald-700" : "bg-amber/20 text-charcoal/70"
              }`}
              title={t.emailed_admin ? "Emailed to the support desk" : "Email not sent — check backend logs"}
            >
              <Mail className="mr-1 inline h-3 w-3" />
              {t.emailed_admin ? "Emailed" : "Not emailed"}
            </span>
            {t.lang && t.lang !== "en" && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-forest text-cream px-2.5 py-0.5 text-[11px] font-700"
                title="The customer chatted in this language — reply in it"
              >
                <Globe className="h-3 w-3" /> {LANG_LABEL[t.lang] || t.lang}
              </span>
            )}
            {(t.replies || []).length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-700 text-emerald-700">
                {t.replies.length} repl{t.replies.length === 1 ? "y" : "ies"} sent
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-600 text-charcoal">{t.category}</p>
          <p className="mt-1 text-sm text-charcoal/70">{t.summary}</p>
        </div>
        <p className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-charcoal/50">
          <Clock className="h-3.5 w-3.5" />
          {new Date(t.created_at).toLocaleString("en-IN")}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-charcoal/65">
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-forest" /> {t.name}
        </span>
        <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1.5 underline">
          <Mail className="h-3.5 w-3.5 text-forest" /> {t.email}
        </a>
        <a href={`tel:${t.phone}`} className="inline-flex items-center gap-1.5 underline">
          <Phone className="h-3.5 w-3.5 text-forest" /> {t.phone}
        </a>
        {(t.order_numbers || []).length > 0 && <span>Orders: {t.order_numbers.join(", ")}</span>}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid={`ticket-${t.ticket_number}-transcript-toggle`}
        className="mt-4 text-xs font-700 text-forest underline"
      >
        {open ? "Hide" : "Show"} chat transcript ({(t.transcript || []).length})
        {(t.replies || []).length > 0 ? ` · ${t.replies.length} repl${t.replies.length === 1 ? "y" : "ies"}` : ""}
      </button>
      {open && (
        <div className="mt-3 space-y-2 rounded-xl bg-cream p-4" data-testid={`ticket-${t.ticket_number}-transcript`}>
          {(t.transcript || []).map((m, i) => (
            <p key={i} className="text-xs leading-relaxed">
              <span className={`font-700 ${m.role === "user" ? "text-forest" : "text-amber"}`}>
                {m.role === "user" ? "Customer" : "Nesti"}:
              </span>{" "}
              <span className="text-charcoal/80">{m.text}</span>
            </p>
          ))}
          {(t.replies || []).map((r, i) => (
            <div
              key={`r${i}`}
              className="rounded-lg border-l-2 border-forest bg-white px-3 py-2"
              data-testid={`ticket-${t.ticket_number}-reply-${i}`}
            >
              <p className="text-[11px] font-700 uppercase tracking-wider text-forest">
                Your reply · emailed to {r.to} · {new Date(r.at).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-charcoal/80">{r.message}</p>
              <p className="mt-1 text-[11px] text-charcoal/50">by {r.by} · set to {r.status?.replace("_", " ")}</p>
            </div>
          ))}
          {(t.notes || []).map((n, i) => (
            <p key={`n${i}`} className="border-t border-sage/30 pt-2 text-xs text-charcoal/60">
              <span className="font-700">{n.status}</span> by {n.by} — {n.note || "no note"}
            </p>
          ))}
        </div>
      )}

      {/* Reply to the customer and set the status in one action. */}
      <div className="mt-4 rounded-xl border border-forest/25 bg-forest/5 p-4" data-testid={`ticket-${t.ticket_number}-reply-box`}>
        <p className="flex items-center gap-1.5 text-xs font-700 uppercase tracking-wider text-forest">
          <Send className="h-3.5 w-3.5" /> Reply to {t.name} ({t.email})
        </p>
        <textarea
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={4000}
          placeholder="Write your answer. The customer gets it by email and can reply straight back to your support inbox."
          data-testid={`ticket-${t.ticket_number}-reply-input`}
          className="mt-2.5 w-full resize-y rounded-xl border border-sage/50 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-forest"
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <label className="text-xs text-charcoal/60" htmlFor={`rs-${t.ticket_number}`}>
            Then set to
          </label>
          <select
            id={`rs-${t.ticket_number}`}
            value={replyStatus}
            onChange={(e) => setReplyStatus(e.target.value)}
            data-testid={`ticket-${t.ticket_number}-reply-status`}
            className={`${field} max-w-[170px]`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={sendReply}
            disabled={replying || reply.trim().length < 2}
            data-testid={`ticket-${t.ticket_number}-reply-send`}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber px-5 py-2 text-sm font-700 text-charcoal transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50"
          >
            {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send reply &amp; update
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-charcoal/50">
          Sent as AaharNest; replies go to your support desk inbox. Shortened links and any request
          for a password, OTP or card number are blocked by our email guardrail.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sage/30 pt-3">
        <span className="text-xs text-charcoal/50">Status only (no email):</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid={`ticket-${t.ticket_number}-status`} className={`${field} max-w-[170px]`}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note (optional)"
          data-testid={`ticket-${t.ticket_number}-note`}
          className={`${field} min-w-[200px] flex-1`}
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          data-testid={`ticket-${t.ticket_number}-save`}
          className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-sm font-600 text-cream disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Update
        </button>
      </div>
    </div>
  );
}

export function TicketsAdmin() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api
      .get("/admin/tickets", { params: filter ? { status: filter } : {} })
      .then((r) => { setData(r.data); setErr(""); })
      .catch((e) => { setErr(apiError(e)); setData({ tickets: [], counts: {} }); });
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <PageLoader />;

  return (
    <div data-testid="admin-tickets">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[["", "All"], ...STATUSES.map((s) => [s, s.replace("_", " ")])].map(([v, label]) => (
            <button
              key={v || "all"}
              type="button"
              onClick={() => setFilter(v)}
              data-testid={`tickets-filter-${v || "all"}`}
              className={`rounded-full px-4 py-2 text-xs font-700 ${
                filter === v ? "bg-forest text-cream" : "bg-white text-charcoal/70 ring-1 ring-sage/40"
              }`}
            >
              {label}
              {v && data.counts?.[v] != null ? ` (${data.counts[v]})` : ""}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          data-testid="tickets-refresh"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-700 text-forest ring-1 ring-sage/40"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <p className="mb-4 text-xs text-charcoal/55">
        The AI support assistant files a ticket here automatically for refund, payment/transaction and
        product-fault conversations, and emails it to{" "}
        <span className="font-700 text-forest">{data.desk_email || "the support desk"}</span>
        {data.delivery_email && data.delivery_email !== data.desk_email && (
          <>
            {" "}— currently delivered to{" "}
            <span className="font-700 text-forest">{data.delivery_email}</span> because the published
            mailbox is not live yet
          </>
        )}
        .
      </p>

      {err && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" data-testid="tickets-error">{err}</p>
      )}

      {data.tickets.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-sage/50 bg-white/60 py-16 text-center"
          data-testid="tickets-empty"
        >
          <Ticket className="mx-auto h-9 w-9 text-sage" />
          <p className="mt-3 text-charcoal/70">No tickets{filter ? ` with status ${filter.replace("_", " ")}` : ""} yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.tickets.map((t) => (
            <TicketCard key={t.ticket_number} t={t} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

export default TicketsAdmin;
