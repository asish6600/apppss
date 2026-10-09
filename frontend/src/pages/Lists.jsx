import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Flame, Boxes, Sparkle, PackageSearch } from "lucide-react";
import api from "@/lib/api";
import { Container, Section, GridSkeleton, useSEO, EmptyState } from "@/components/common";
import { ProductCard, ComboCard } from "@/components/cards";
import { PromoBanner } from "@/components/PromoBanner";

function ListPage({ param, title, eyebrow, sub, Icon, testid, showBanner = false, Card = ProductCard, cols = "md:grid-cols-4 lg:grid-cols-5", note }) {
  const [products, setProducts] = useState(null);
  useSEO({ title: `${title} · AaharNest`, description: sub });
  useEffect(() => {
    const qs = new URLSearchParams();
    qs.set(param, "true");
    api.get(`/products?${qs.toString()}`).then((r) => setProducts(r.data.products)).catch(() => setProducts([]));
  }, [param]);
  return (
    <Section data-testid={testid}>
      <Container>
        <div className="mb-10 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-[0.22em] text-forest">
              <Icon className="h-4 w-4 text-amber" />{eyebrow}
            </p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-charcoal md:text-5xl">{title}</h1>
            {sub && <p className="mt-3 text-charcoal/65">{sub}</p>}
            {note && <p className="mt-3 inline-block rounded-full bg-cream px-3 py-1.5 text-xs font-600 text-forest ring-1 ring-sage/40">{note}</p>}
          </div>
        </div>
        {showBanner && <div className="mb-8"><PromoBanner compact /></div>}
        {!products ? <GridSkeleton /> : products.length === 0 ? (
          <EmptyState icon={PackageSearch} title="Nothing to show here yet. Check back soon." />
        ) : (
          <>
            <p className="mb-4 text-xs text-charcoal/55">{products.length} {products.length === 1 ? "item" : "items"}</p>
            <div className={`grid grid-cols-2 gap-4 ${cols}`}>
              {products.map((p) => <Card key={p.slug} p={p} />)}
            </div>
          </>
        )}
      </Container>
    </Section>
  );
}

export function DailyDeals() {
  return <ListPage param="todays_deal" title="Today's Deals" eyebrow="Today only" testid="daily-deals-page"
    sub="A small, hand-picked set of flash prices chosen by our team. These deal prices are exclusive to this page — you won't find them on Shop or Categories."
    note="Deal prices reset at midnight. When a deal ends, the item simply returns to its regular price."
    Icon={Flame} />;
}

export function TopPicks() {
  return <ListPage param="bestseller" title="Customer Favourites" eyebrow="Most loved" testid="top-picks-page"
    sub="The staples our customers reorder every month. Only products our team has marked as genuine top sellers appear here — this is not the full catalogue."
    Icon={Sparkle} showBanner />;
}

export function FreshArrivals() {
  return <ListPage param="new_arrival" title="Fresh Arrivals" eyebrow="Newly stocked" testid="fresh-arrivals-page"
    sub="Only the newest additions to the AaharNest shelves — small-batch sourcing and seasonal picks you haven't tried yet."
    Icon={Sparkles} />;
}

export function ComboPacks() {
  return <ListPage param="combo" title="Combo Boxes" eyebrow="Bundle & save" testid="combo-packs-page"
    sub="Every item on this page is a complete bundle, never a single product. Each box groups complementary staples at a kinder price than buying each one separately."
    note="You are purchasing the entire box — all items ship together."
    Icon={Boxes} Card={ComboCard} cols="md:grid-cols-2 lg:grid-cols-3" />;
}
