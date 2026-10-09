import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search as SearchIcon } from "lucide-react";
import api, { inr } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLangNavigate } from "@/components/LangLink";

export function SearchDialog({ open, onOpenChange }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [res, setRes] = useState({ products: [], recipes: [], articles: [] });
  const navigate = useLangNavigate();

  useEffect(() => {
    if (!q || q.length < 2) { setRes({ products: [], recipes: [], articles: [] }); return; }
    const t = setTimeout(async () => {
      try { const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`); setRes(data); } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (to) => { onOpenChange(false); setQ(""); navigate(to); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] translate-y-0 gap-0 overflow-hidden bg-cream p-0 sm:max-w-xl" data-testid="search-dialog">
        <DialogTitle className="sr-only">Search AaharNest</DialogTitle>
        <div className="flex items-center gap-3 border-b border-sage/30 px-4 py-3">
          <SearchIcon className="h-5 w-5 text-forest" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            data-testid="search-input"
            placeholder="Search products, recipes, articles…"
            className="w-full bg-transparent text-charcoal outline-none placeholder:text-charcoal/40"
          />
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {q.length >= 2 && res.products.length === 0 && res.recipes.length === 0 && res.articles.length === 0 && (
            <p className="p-6 text-center text-sm text-charcoal/60">No matching results found.</p>
          )}
          {res.products.length > 0 && <Group label="Products">
            {res.products.map((p) => (
              <Row key={p.slug} onClick={() => go(`/product/${p.slug}`)} testid={`search-product-${p.slug}`} img={p.image} title={p.name} meta={inr(p.price)} />
            ))}
          </Group>}
          {res.recipes.length > 0 && <Group label="Recipes">
            {res.recipes.map((r) => (
              <Row key={r.slug} onClick={() => go(`/recipes/${r.slug}`)} testid={`search-recipe-${r.slug}`} img={r.image} title={r.title} meta={`${r.minutes} min`} />
            ))}
          </Group>}
          {res.articles.length > 0 && <Group label="Articles">
            {res.articles.map((a) => (
              <Row key={a.slug} onClick={() => go(`/articles/${a.slug}`)} testid={`search-article-${a.slug}`} img={a.image} title={a.title} meta={a.category} />
            ))}
          </Group>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, children }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-xs font-700 uppercase tracking-widest text-forest/70">{label}</p>
      {children}
    </div>
  );
}
function Row({ onClick, img, title, meta, testid }) {
  return (
    <button onClick={onClick} data-testid={testid} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white">
      <img src={img} alt="" className="h-10 w-10 rounded-md object-cover" />
      <span className="flex-1 font-500 text-charcoal">{title}</span>
      <span className="text-sm text-charcoal/50">{meta}</span>
    </button>
  );
}
