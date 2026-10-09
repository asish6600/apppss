import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import { Container, Section, SectionHeading, GridSkeleton, PageLoader, useSEO } from "@/components/common";
import { ArticleCard } from "@/components/cards";

export function Articles() {
  const [articles, setArticles] = useState(null);
  const [cat, setCat] = useState("");
  useSEO({ title: "Articles · AaharNest", description: "Nutrition, wellness and Indian food guides from AaharNest." });
  useEffect(() => { api.get("/articles").then((r) => setArticles(r.data.articles)).catch(() => setArticles([])); }, []);
  const cats = articles ? [...new Set(articles.map((a) => a.category))] : [];
  const shown = articles ? (cat ? articles.filter((a) => a.category === cat) : articles) : null;

  return (
    <Section><Container>
      <SectionHeading eyebrow="Learn" title="Articles & Guides" sub="Nutrition, wellness and healthy eating — written by the AaharNest Editorial Team." />
      {cats.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button onClick={() => setCat("")} className={`rounded-full px-4 py-2 text-sm font-600 ${!cat ? "bg-forest text-cream" : "bg-white ring-1 ring-sage/40"}`}>All</button>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} data-testid={`article-filter-${c}`} className={`rounded-full px-4 py-2 text-sm font-600 ${cat === c ? "bg-forest text-cream" : "bg-white ring-1 ring-sage/40"}`}>{c}</button>)}
        </div>
      )}
      {!shown ? <GridSkeleton /> : (
        <div className="grid gap-5 md:grid-cols-3">{shown.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
      )}
    </Container></Section>
  );
}

export function ArticleDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/articles/${slug}`).then((r) => setD(r.data)).catch(() => setD(false)); }, [slug]);
  useSEO(d && d.article ? {
    title: `${d.article.title} · AaharNest`, description: d.article.summary,
    jsonLd: { "@context": "https://schema.org", "@type": "Article", headline: d.article.title, image: window.location.origin + d.article.image, author: { "@type": "Organization", name: d.article.author } },
  } : {});

  if (d === null) return <PageLoader />;
  if (d === false) return <Section><Container><p>Article not found.</p></Container></Section>;
  const a = d.article;

  return (
    <Section data-testid="article-detail"><Container className="max-w-3xl">
      <p className="text-xs font-700 uppercase tracking-widest text-amber">{a.category}</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal">{a.title}</h1>
      <p className="mt-2 text-sm text-charcoal/55">{a.author} · {a.date} · {a.minutes} min read</p>
      <img src={a.image} alt={a.title} className="mt-6 aspect-[16/9] w-full rounded-3xl object-cover" />
      <div className="prose mt-8 max-w-none">
        {(a.sections || []).map((b, i) => {
          if (b.type === "h") return <h2 key={i} className="mt-8 font-serif text-2xl text-forest">{b.text}</h2>;
          if (b.type === "ul") return <ul key={i} className="mt-4 space-y-2">{b.items.map((it, j) => <li key={j} className="flex gap-2 text-charcoal/80"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />{it}</li>)}</ul>;
          return <p key={i} className="mt-4 leading-relaxed text-charcoal/80">{b.text}</p>;
        })}
      </div>
      {d.related?.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-2xl text-charcoal">Related reading</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">{d.related.map((r) => <ArticleCard key={r.slug} a={r} />)}</div>
        </div>
      )}
    </Container></Section>
  );
}
