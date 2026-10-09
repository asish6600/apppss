import { useEffect, useState, useCallback } from "react";
import { Star, Loader2, Trash2, BadgeCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PrimaryBtn, OutlineBtn } from "@/components/common";
import { LangLink } from "@/components/LangLink";

function StarRow({ value, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= value ? "fill-amber text-amber" : "text-charcoal/25"}`} />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex items-center gap-1" data-testid="review-star-picker">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)} data-testid={`review-star-${i}`} aria-label={`Rate ${i} out of 5`}
          className="transition-transform hover:scale-110">
          <Star className={`h-6 w-6 ${i <= (hover || value) ? "fill-amber text-amber" : "text-charcoal/25"}`} />
        </button>
      ))}
    </span>
  );
}

export function ProductReviews({ slug, onRatingChange }) {
  const { isAuthed } = useAuth();
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/products/${slug}/reviews`).then((r) => {
      setData(r.data);
      if (r.data.my_review) {
        setRating(r.data.my_review.rating);
        setTitle(r.data.my_review.title || "");
        setBody(r.data.my_review.body || "");
      } else { setRating(0); setTitle(""); setBody(""); }
    }).catch(() => setData({ reviews: [], summary: { average: null, count: 0, breakdown: {} }, can_review: false }));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { toast.error("Pick a star rating first."); return; }
    setBusy(true);
    try {
      const { data: res } = await api.post(`/products/${slug}/reviews`, { rating, title, body });
      toast.success("Thanks — your review is live.");
      onRatingChange?.(res.summary);
      load();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete your review?")) return;
    try {
      const { data: res } = await api.delete(`/reviews/${id}`);
      toast.success("Review deleted");
      onRatingChange?.(res.summary);
      load();
    } catch (err) { toast.error(apiError(err)); }
  };

  if (!data) return null;
  const s = data.summary || { average: null, count: 0, breakdown: {} };

  return (
    <section className="mt-14 border-t border-sage/30 pt-10" data-testid="product-reviews">
      <h2 className="font-serif text-2xl text-charcoal">Ratings &amp; Reviews</h2>

      {/* SUMMARY */}
      <div className="mt-5 grid gap-6 rounded-2xl border border-sage/30 bg-white p-6 md:grid-cols-[220px_1fr]">
        <div className="text-center md:border-r md:border-sage/20">
          {s.count > 0 ? (
            <>
              <p className="font-serif text-5xl text-forest" data-testid="review-average">{s.average}</p>
              <div className="mt-2 flex justify-center"><StarRow value={Math.round(s.average)} /></div>
              <p className="mt-1 text-xs text-charcoal/55" data-testid="review-count">
                Based on {s.count} verified {s.count === 1 ? "review" : "reviews"}
              </p>
            </>
          ) : (
            <>
              <p className="font-serif text-3xl text-charcoal/40" data-testid="review-empty">No ratings yet</p>
              <p className="mt-2 text-xs text-charcoal/55">Only customers who have ordered this product can rate it, so every star here is real.</p>
            </>
          )}
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = Number(s.breakdown?.[String(n)] || 0);
            const pct = s.count ? Math.round((c / s.count) * 100) : 0;
            return (
              <div key={n} className="flex items-center gap-3 text-xs" data-testid={`review-bar-${n}`}>
                <span className="w-10 shrink-0 text-charcoal/60">{n} star</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                  <span className="block h-full rounded-full bg-amber transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right text-charcoal/55">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* WRITE A REVIEW — verified buyers only */}
      {data.can_review ? (
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-forest/25 bg-cream/50 p-6" data-testid="review-form">
          <p className="inline-flex items-center gap-1.5 text-xs font-700 uppercase tracking-wider text-forest">
            <ShieldCheck className="h-4 w-4 text-amber" />{data.my_review ? "Update your review" : "Write a review"}
          </p>
          <div className="mt-3"><StarPicker value={rating} onChange={setRating} /></div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up in a line (optional)" data-testid="review-title"
            className="mt-4 w-full rounded-xl border border-sage/50 bg-white px-3 py-2 text-sm outline-none focus:border-forest" />
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How did it cook? How was the quality and packaging?" data-testid="review-body"
            className="mt-3 w-full rounded-xl border border-sage/50 bg-white px-3 py-2 text-sm outline-none focus:border-forest" />
          <div className="mt-4 flex gap-2">
            <PrimaryBtn type="submit" disabled={busy} data-testid="review-submit">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{data.my_review ? "Update review" : "Post review"}
            </PrimaryBtn>
            {data.my_review && <OutlineBtn type="button" onClick={() => remove(data.my_review.id)} data-testid="review-delete-mine">Delete</OutlineBtn>}
          </div>
        </form>
      ) : (
        <p className="mt-6 rounded-2xl bg-cream/60 p-4 text-sm text-charcoal/65" data-testid="review-gate">
          {isAuthed
            ? "Only customers who have ordered this product can review it. Once your order is placed, come back and share your experience."
            : <>Reviews come from verified buyers only. <LangLink to="/auth" className="font-600 text-forest hover:underline">Sign in</LangLink> to see whether you can review this product.</>}
        </p>
      )}

      {/* LIST */}
      <div className="mt-8 space-y-4" data-testid="review-list">
        {data.reviews.length === 0 ? (
          <p className="text-sm text-charcoal/55">Be the first verified buyer to review this product.</p>
        ) : data.reviews.map((r) => (
          <article key={r.id} className="rounded-2xl border border-sage/25 bg-white p-5" data-testid={`review-item-${r.id}`}>
            <div className="flex flex-wrap items-center gap-3">
              <StarRow value={r.rating} size="h-3.5 w-3.5" />
              <span className="text-sm font-600 text-charcoal">{r.user_name}</span>
              {r.verified_purchase && (
                <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-700 uppercase tracking-wide text-forest">
                  <BadgeCheck className="h-3 w-3" />Verified purchase
                </span>
              )}
              <span className="ml-auto text-xs text-charcoal/45">{new Date(r.created_at || r.updated_at).toLocaleDateString("en-IN")}</span>
            </div>
            {r.title && <p className="mt-2 font-600 text-charcoal">{r.title}</p>}
            {r.body && <p className="mt-1 text-sm leading-relaxed text-charcoal/70">{r.body}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

export { StarRow };
