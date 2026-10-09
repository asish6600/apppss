import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Lock, Clock, Users, ChefHat, Bookmark, Leaf } from "lucide-react";
import { toast } from "sonner";
import api, { apiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/context/AuthContext";
import { Container, Section, SectionHeading, GridSkeleton, PageLoader, useSEO, GreenBtn, OutlineBtn } from "@/components/common";
import { RecipeCard, ProductCard } from "@/components/cards";
import { AuthForm } from "@/components/AuthForm";
import { LangLink, useLangNavigate } from "@/components/LangLink";

const MEAL_GROUPS = [
  ["Breakfast", "Sunrise", "Pitha, chuda and ghuguni — how Odisha actually starts the day."],
  ["Lunch", "Madhyahna", "Pakhala, dalma and the greens that make up the everyday Odia plate."],
  ["Dinner", "Ratri", "Light, low-oil evening cooking — santula, besara and temple-style khechedi."],
  ["Snacks", "Jalakhia", "Pitha and prasad sweets made for festivals and long afternoons."],
];

export function Recipes() {
  const { t } = useI18n();
  const { ready, isAuthed, refresh } = useAuth();
  const [recipes, setRecipes] = useState(null);
  const [preview, setPreview] = useState(0);
  const [meal, setMeal] = useState("All");
  const [healthyOnly, setHealthyOnly] = useState(false);
  useSEO({
    title: "Authentic Odia Recipes · AaharNest",
    description: "Traditional recipes from Odisha — chakuli pitha, ghuguni, dahi pakhala, dalma, santula, besara, khechedi, chhena poda — grouped by breakfast, lunch, dinner and snacks.",
  });

  useEffect(() => {
    if (!ready) return;
    if (isAuthed) api.get("/recipes").then((r) => setRecipes(r.data.recipes)).catch(() => setRecipes([]));
    else api.get("/recipes-count").then((r) => setPreview(r.data.count)).catch(() => {});
  }, [ready, isAuthed]);

  if (!ready) return <PageLoader />;

  if (!isAuthed) return (
    <Section>
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Lock className="h-10 w-10 text-amber" />
          <h1 className="mt-4 font-serif text-3xl text-charcoal md:text-4xl">{t("recipes.gateTitle")}</h1>
          <p className="mt-4 max-w-lg text-charcoal/70">{t("recipes.gateBody")}</p>
          <p className="mt-3 text-sm font-600 text-forest">{preview > 0 ? `${preview} authentic Odia recipes waiting inside.` : ""}</p>
          <ul className="mt-5 space-y-2 text-sm text-charcoal/70">
            <li>• Traditional Odia cooking, grouped by breakfast, lunch, dinner and snacks</li>
            <li>• Step-by-step methods, from chakuli pitha to chhena poda</li>
            <li>• Nutrition notes, with the lighter dishes marked</li>
            <li>• Save your favourite recipes to your account</li>
          </ul>
        </div>
        <div className="flex justify-center"><AuthForm onSuccess={() => refresh()} /></div>
      </Container>
    </Section>
  );

  const all = recipes || [];
  const shown = all.filter((r) => (meal === "All" || r.category === meal) && (!healthyOnly || r.healthy));
  const groups = meal === "All" ? MEAL_GROUPS : MEAL_GROUPS.filter(([k]) => k === meal);
  const countFor = (k) => all.filter((r) => r.category === k && (!healthyOnly || r.healthy)).length;

  return (
    <Section>
      <Container>
        <SectionHeading eyebrow="Odia Kitchen"
          title="Authentic Recipes from Odisha"
          sub="Only Odia cooking — the pitha, dalma, pakhala and besara that belong to this state, grouped by the meal they are actually eaten at." />

        {/* meal filter + healthy toggle */}
        <div className="mb-8 flex flex-wrap items-center gap-2" data-testid="recipe-filters">
          {["All", ...MEAL_GROUPS.map(([k]) => k)].map((k) => (
            <button key={k} onClick={() => setMeal(k)} data-testid={`recipe-meal-${k.toLowerCase()}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-600 transition-colors duration-200 ${
                meal === k ? "bg-forest text-cream" : "bg-white text-charcoal ring-1 ring-sage/40 hover:bg-cream"}`}>
              {k === "All" ? "All meals" : k}
              <span className={`text-[11px] ${meal === k ? "text-cream/70" : "text-charcoal/45"}`}>
                {k === "All" ? all.filter((r) => !healthyOnly || r.healthy).length : countFor(k)}
              </span>
            </button>
          ))}
          <button onClick={() => setHealthyOnly((v) => !v)} data-testid="recipe-healthy-toggle"
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-600 transition-colors duration-200 ${
              healthyOnly ? "bg-amber text-charcoal" : "bg-white text-charcoal ring-1 ring-sage/40 hover:bg-cream"}`}>
            <Leaf className="h-4 w-4" />Healthy only
          </button>
        </div>

        {!recipes ? <GridSkeleton /> : shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sage/50 bg-white/50 py-14 text-center text-sm text-charcoal/55"
            data-testid="recipes-empty">No recipes match this filter yet. Try a different meal or turn off the healthy-only filter.</p>
        ) : (
          <div className="space-y-14">
            {groups.map(([key, odia, blurb]) => {
              const items = shown.filter((r) => r.category === key);
              if (!items.length) return null;
              return (
                <div key={key} data-testid={`recipe-group-${key.toLowerCase()}`}>
                  <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-sage/30 pb-3">
                    <h2 className="font-serif text-2xl text-charcoal md:text-3xl">{key}</h2>
                    <span className="text-xs font-700 uppercase tracking-[0.2em] text-amber">{odia}</span>
                    <span className="text-xs text-charcoal/45">{items.length} {items.length === 1 ? "recipe" : "recipes"}</span>
                    <p className="w-full text-sm text-charcoal/60 md:w-auto md:flex-1 md:text-right">{blurb}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 2xl:grid-cols-5">
                    {items.map((r) => <RecipeCard key={r.slug} r={r} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </Section>
  );
}

export function RecipeDetail() {
  const { slug } = useParams();
  const [d, setD] = useState(null);
  const [saved, setSaved] = useState(false);
  const navigate = useLangNavigate();

  useEffect(() => { api.get(`/recipes/${slug}`).then((r) => setD(r.data)).catch(() => setD(false)); }, [slug]);
  useEffect(() => { api.get("/me/saved-recipes").then((r) => setSaved(r.data.saved.some((x) => x.slug === slug))).catch(() => {}); }, [slug]);
  useSEO(d && d.recipe ? {
    title: `${d.recipe.title} · AaharNest`, description: d.recipe.summary,
    jsonLd: { "@context": "https://schema.org", "@type": "Recipe", name: d.recipe.title, image: window.location.origin + d.recipe.image, description: d.recipe.summary, recipeIngredient: d.recipe.ingredients, totalTime: d.recipe.total },
  } : {});

  if (d === null) return <PageLoader />;
  if (d === false) return <Section><Container><p>Recipe not found.</p></Container></Section>;
  const r = d.recipe;

  const toggleSave = async () => {
    try {
      if (saved) { await api.delete(`/me/saved-recipes/${slug}`); setSaved(false); toast("Removed from saved"); }
      else { await api.post("/me/saved-recipes", { recipe_slug: slug }); setSaved(true); toast.success("Saved"); }
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <Section data-testid="recipe-detail"><Container className="max-w-4xl">
      <p className="text-xs font-700 uppercase tracking-widest text-amber">{r.category}</p>
      <h1 className="mt-2 font-serif text-4xl text-charcoal">{r.title}</h1>
      <p className="mt-3 text-charcoal/70">{r.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-charcoal/65">
        {r.total && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{r.total}</span>}
        {r.servings && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{r.servings} servings</span>}
        {r.difficulty && <span className="inline-flex items-center gap-1"><ChefHat className="h-4 w-4" />{r.difficulty}</span>}
        <button onClick={toggleSave} data-testid="recipe-save-btn" className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-600 ${saved ? "bg-forest text-cream" : "border border-forest text-forest"}`}>
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />{saved ? "Saved" : "Save"}
        </button>
      </div>
      <img src={r.image} alt={r.title} className="mt-6 aspect-[16/9] w-full rounded-3xl object-cover" />

      <p className="mt-4 text-xs text-charcoal/50">Recipe by {r.author}</p>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_1.4fr]">
        {r.ingredients && (
          <div>
            <h2 className="font-serif text-2xl text-forest">Ingredients</h2>
            <ul className="mt-4 space-y-2">{r.ingredients.map((i, idx) => <li key={idx} className="flex gap-2 text-charcoal/80"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />{i}</li>)}</ul>
          </div>
        )}
        {r.steps && (
          <div>
            <h2 className="font-serif text-2xl text-forest">Method</h2>
            <ol className="mt-4 space-y-4">{r.steps.map((s, idx) => <li key={idx} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest font-700 text-cream">{idx + 1}</span><p className="text-charcoal/80">{s}</p></li>)}</ol>
          </div>
        )}
      </div>

      {r.nutrition && (
        <div className="mt-10">
          <h2 className="font-serif text-2xl text-forest">Nutrition</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{r.nutrition.map((n) => <div key={n.label} className="rounded-xl border border-sage/30 bg-white p-4 text-center"><p className="text-xs text-charcoal/55">{n.label}</p><p className="font-700 text-forest">{n.value}</p></div>)}</div>
        </div>
      )}
      {r.notes && <p className="mt-6 rounded-2xl bg-cream p-4 text-sm text-charcoal/70"><strong>Notes:</strong> {r.notes}</p>}

      {d.products?.length > 0 && (
        <div className="mt-12" data-testid="recipe-shop-ingredients">
          <h2 className="font-serif text-2xl text-charcoal">Shop ingredients</h2>
          <p className="mt-1 text-sm text-charcoal/60">Pantry staples from our catalogue that match this recipe.</p>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">{d.products.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        </div>
      )}
      {d.related?.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif text-2xl text-charcoal">More recipes</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">{d.related.map((rr) => <RecipeCard key={rr.slug} r={rr} />)}</div>
        </div>
      )}
    </Container></Section>
  );
}
