"""Authentic Odia recipe collection for the AaharNest Kitchen.

Scope: **Odisha only.** The previous collection was pan-Indian (masala dosa, methi
thepla, ven pongal, bajra/sabudana khichdi, palak paneer, chole bhature, jowar bhakri,
sattu, quinoa bowls) and was replaced wholesale on request.

Every dish here is a genuine Odia preparation, grouped by the meal it is actually eaten
at in Odia homes. Methods follow commonly documented traditional practice — panch
phutana tempering, mustard paste for besara, overnight fermentation for pitha batter,
jaggery one-string syrup for arisa.

`category` is the meal group (Breakfast / Lunch / Dinner / Snacks) because the existing
recipe schema and the "related recipes" query already key off that field.
`healthy=True` marks the light, low-oil, high-fibre or fermented dishes.

Note on ghee: it appears only as an ordinary home-kitchen ingredient in dishes where it
is genuinely traditional (Khechedi, Kanika, Chuda Ghasa). AaharNest does not sell ghee,
and rewriting these to omit it would make them inauthentic.
"""

BREAKFAST = "Breakfast"
LUNCH = "Lunch"
DINNER = "Dinner"
SNACKS = "Snacks"


def R(slug, title, category, summary, minutes, prep, cook, servings, difficulty,
      ingredients, steps, notes, tags, nutrition, healthy=False, popular=False,
      festive=None, image_alt=""):
    return {
        "slug": slug, "id": slug, "kind": "recipe", "title": title,
        "category": category, "meal": category,
        "summary": summary, "sections": [{"type": "p", "text": summary}],
        "minutes": minutes, "prep": prep, "cook": cook,
        "total": f"{minutes} min", "servings": servings,
        "difficulty": difficulty, "easy": difficulty == "Easy",
        "ingredients": ingredients, "steps": steps, "notes": notes,
        "tags": tags + ["odia", "odisha"],
        "nutrition": nutrition,
        "healthy": healthy, "popular": popular, "festive": festive,
        "region": "Odisha", "cuisine": "Odia", "indian": True,
        "author": "AaharNest Kitchen", "status": "PUBLISHED",
        "imageAlt": image_alt or title,
    }


def N(energy, protein=None, fibre=None, carbs=None):
    out = [{"label": "Energy", "value": energy}]
    if protein:
        out.append({"label": "Protein", "value": protein})
    if fibre:
        out.append({"label": "Fibre", "value": fibre})
    if carbs:
        out.append({"label": "Carbs", "value": carbs})
    return out


ODIA_RECIPES = [

    # ============================ BREAKFAST ============================
    R("chakuli-pitha", "Chakuli Pitha", BREAKFAST,
      "The everyday Odia breakfast crepe — soaked rice and biri dal, fermented overnight and "
      "spread thin on a hot tawa. Soft in the middle, lacy at the edges.",
      35, "20 min (plus soaking)", "15 min", "4", "Medium",
      ["1 cup raw rice (arua chaula)", "⅓ cup husked black gram (biri / urad dal)",
       "½ tsp salt", "Mustard oil, for the tawa", "Water, as needed"],
      ["Rinse the rice and biri dal well, then soak them together for 6-8 hours or overnight.",
       "Grind to a smooth, pourable batter with just enough water — it should coat the back of a spoon.",
       "Cover and leave to ferment in a warm spot for 5-8 hours, until it smells faintly sour and looks airy.",
       "Stir in the salt gently; do not beat the air out of the batter.",
       "Heat a tawa, rub it with a little mustard oil, pour a ladle of batter and spread it thin.",
       "Cover and cook 1-2 minutes until the edges lift, flip briefly, and serve hot with ghuguni."],
      "Fermentation time is the whole recipe. In cold weather keep the batter somewhere warm and give it the full 8 hours.",
      ["chakuli", "pitha", "fermented", "breakfast", "rice"],
      N("150 kcal", "5 g", "2 g", "28 g"), healthy=True, popular=True,
      image_alt="Thin Odia chakuli pitha cooking on a hot tawa"),

    R("ghuguni", "Ghuguni", BREAKFAST,
      "Slow-cooked dried yellow peas, mashed just enough to thicken their own gravy. The standing "
      "partner to chakuli and bara, and a protein-heavy start to the day.",
      45, "10 min (plus soaking)", "35 min", "4", "Easy",
      ["1 cup dried yellow or white peas", "1 medium potato, cubed", "1 onion, finely chopped",
       "1 tomato, chopped", "1 tsp ginger-garlic paste", "½ tsp cumin seeds",
       "½ tsp turmeric", "1 tsp cumin-coriander powder", "½ tsp red chilli powder",
       "½ tsp garam masala", "2 tbsp mustard oil", "Salt", "Coriander leaves"],
      ["Soak the peas 6-8 hours, then pressure-cook with the potato, turmeric and salt for 4-5 whistles until soft.",
       "Heat mustard oil, splutter the cumin seeds, then fry the onion until golden.",
       "Add the ginger-garlic paste and cook until it no longer smells raw; add the tomato and cook to a pulp.",
       "Stir in the cumin-coriander and chilli powders for 30 seconds.",
       "Tip in the cooked peas with their water. Mash a few against the side of the pan to thicken the gravy.",
       "Simmer 8-10 minutes, finish with garam masala and coriander, and serve with chakuli or bara."],
      "The gravy should thicken from the mashed peas themselves — resist adding flour or besan.",
      ["ghuguni", "peas", "protein", "breakfast", "curry"],
      N("210 kcal", "11 g", "9 g", "32 g"), healthy=True, popular=True,
      image_alt="Bowl of Odia ghuguni, a dried yellow pea curry"),

    R("chuda-kadali", "Chuda Kadali", BREAKFAST,
      "No stove, no sugar syrup, five minutes: flattened rice softened in water, mashed banana, "
      "fresh coconut and a little jaggery. The lightest breakfast in the Odia repertoire.",
      10, "10 min", "No cooking", "2", "Easy",
      ["1 cup flattened rice (chuda / poha), thick variety", "2 ripe bananas",
       "3 tbsp freshly grated coconut", "2-3 tbsp grated jaggery",
       "A pinch of cardamom powder", "A pinch of salt"],
      ["Rinse the chuda once, then soak it in just enough water for 5-10 minutes until it softens. Drain well.",
       "Mash the bananas coarsely in a bowl.",
       "Add the softened chuda, coconut, jaggery, cardamom and salt.",
       "Rub everything together with your fingers until the jaggery dissolves into the banana.",
       "Serve immediately, while the chuda still has a little bite."],
      "Use thick chuda — the thin kind turns to paste. Eat it straight away; it does not keep.",
      ["chuda", "no-cook", "breakfast", "jaggery", "quick"],
      N("240 kcal", "4 g", "4 g", "52 g"), healthy=True,
      image_alt="Chuda kadali — flattened rice with banana, coconut and jaggery"),

    R("biri-bara", "Biri Bara", BREAKFAST,
      "Fluffy black-gram fritters, crisp outside and almost hollow inside. Fried fresh in the "
      "morning and eaten with ghuguni across Odisha.",
      30, "15 min (plus soaking)", "15 min", "4", "Medium",
      ["1 cup husked black gram (biri / urad dal)", "1 inch ginger, grated",
       "2 green chillies, chopped", "6-8 curry leaves, chopped", "½ tsp whole black pepper",
       "Salt", "Mustard oil or any neutral oil, for frying"],
      ["Soak the biri dal for 4-6 hours, then drain thoroughly.",
       "Grind to a thick, fluffy paste using as little water as possible — it should hold its shape on a spoon.",
       "Beat the batter by hand for 3-4 minutes to aerate it; this is what makes the bara light.",
       "Fold in the ginger, green chillies, curry leaves, pepper and salt.",
       "Heat oil to a medium-high. Wet your palm, shape a portion into a disc and slide it in.",
       "Fry until deep golden on both sides, drain, and serve hot with ghuguni."],
      "A dollop of batter dropped into water should float — that is the sign it has enough air to fry light.",
      ["bara", "biri", "urad dal", "fritter", "breakfast"],
      N("190 kcal", "9 g", "4 g", "22 g"),
      image_alt="Golden Odia biri bara fritters served with ghuguni"),

    R("enduri-pitha", "Enduri Pitha", BREAKFAST,
      "Fermented rice-and-biri batter spread on a turmeric leaf, filled with coconut and jaggery, "
      "then steamed. Made for Prathamastami — the leaf perfumes the whole pitha.",
      60, "25 min (plus soaking and fermenting)", "20 min", "6", "Hard",
      ["1½ cups raw rice", "1 cup husked black gram (biri dal)", "Fresh turmeric leaves (or banana leaves)",
       "1 cup freshly grated coconut", "¾ cup grated jaggery", "¼ cup chhena (fresh cottage cheese), optional",
       "½ tsp cardamom powder", "¼ tsp crushed black pepper", "A pinch of salt"],
      ["Soak the rice and biri dal together for 5-6 hours, then grind to a slightly coarse, thick batter.",
       "Add salt, cover and ferment 5-8 hours until risen and lightly sour.",
       "For the filling, cook the coconut and jaggery in a pan until thick and glossy, 8-10 minutes.",
       "Stir in the chhena, cardamom and pepper; cool completely.",
       "Wipe the turmeric leaves clean and grease lightly. Spread a thin layer of batter on each.",
       "Spoon the filling along the centre, fold the leaf over to enclose, and arrange in a steamer.",
       "Steam 10-15 minutes until the batter is set and comes away from the leaf. Serve warm, in the leaf."],
      "Turmeric leaf is what makes this enduri rather than any other pitha. If you must substitute banana leaf, "
      "the texture holds but the aroma does not.",
      ["enduri", "pitha", "steamed", "festive", "prathamastami", "coconut"],
      N("260 kcal", "6 g", "4 g", "48 g"), festive="Prathamastami",
      image_alt="Enduri pitha steamed in turmeric leaves"),

    # ============================== LUNCH ==============================
    R("dahi-pakhala", "Dahi Pakhala", LUNCH,
      "Odisha's answer to summer: cooked rice left in water to ferment, loosened with sour curd and "
      "a little salt. Cooling, probiotic, and the centre of the Odia summer plate.",
      20, "10 min (plus 8-10 hours fermenting)", "No cooking", "4", "Easy",
      ["3 cups cooked rice, completely cooled", "4 cups water",
       "1 cup sour curd, whisked", "Salt", "1 tsp cumin seeds, dry-roasted and crushed",
       "2 green chillies, slit", "1 inch ginger, grated", "Curry leaves",
       "Fresh coriander", "1 tsp mustard oil (optional)"],
      ["Put the cooled rice in an earthen or glass pot and pour in the water. Cover loosely.",
       "Leave to ferment 8-10 hours at room temperature, or overnight — it will smell pleasantly tangy.",
       "Whisk in the sour curd and salt until the liquid turns milky and the grains loosen.",
       "Add the crushed roasted cumin, ginger, green chillies, curry leaves and coriander.",
       "Finish with a few drops of mustard oil if you like, and serve cool with badi chura and saga bhaja."],
      "Saja pakhala is eaten the same day; basi pakhala is fermented overnight and is the more cooling of the two. "
      "Never refrigerate before it has fermented.",
      ["pakhala", "fermented", "summer", "probiotic", "rice", "lunch"],
      N("190 kcal", "5 g", "1 g", "40 g"), healthy=True, popular=True,
      image_alt="Dahi pakhala in an earthen pot with green chilli and curry leaves"),

    R("dalma", "Dalma", LUNCH,
      "The signature Odia one-pot: arhar dal cooked with chunks of seasonal vegetable, no onion or "
      "garlic, finished with roasted cumin-chilli powder and a panch phutana tempering.",
      45, "15 min", "30 min", "4", "Easy",
      ["1 cup arhar (toor) dal", "1 raw banana, thickly sliced", "1 cup pumpkin, cubed",
       "1 brinjal, cubed", "1 small piece raw papaya, cubed", "½ tsp turmeric",
       "1 tsp panch phutana (mustard, cumin, fenugreek, fennel, nigella)",
       "2 dry red chillies", "1 tsp cumin seeds", "1 bay leaf",
       "1 tbsp ghee or mustard oil", "3 tbsp grated coconut", "Salt", "Coriander leaves"],
      ["Rinse the dal and pressure-cook it with the vegetables, turmeric and salt for 3-4 whistles — "
       "the vegetables should be tender but still holding their shape.",
       "Dry-roast the cumin seeds and one red chilli, then grind to a coarse powder (bhaja masala).",
       "Heat the ghee or mustard oil in a small pan. Add the bay leaf, the remaining red chilli and the panch phutana.",
       "When the seeds crackle, pour the tempering over the dal.",
       "Stir in the roasted bhaja masala and most of the coconut; simmer 5 minutes.",
       "Garnish with the remaining coconut and coriander. Serve with plain rice."],
      "Temple-style dalma is strictly satvik — no onion, no garlic. The freshly roasted cumin-chilli powder at the "
      "end is not optional; it is where the flavour comes from.",
      ["dalma", "dal", "satvik", "one-pot", "lunch", "protein"],
      N("230 kcal", "12 g", "8 g", "34 g"), healthy=True, popular=True,
      image_alt="Odia dalma — lentils cooked with vegetables and panch phutana"),

    R("saga-bhaja", "Saga Bhaja", LUNCH,
      "Seasonal greens stir-fried fast and hot in mustard oil with garlic and dry chilli. Barely a "
      "recipe, and the dish that makes a pakhala plate complete.",
      15, "10 min", "5 min", "4", "Easy",
      ["4 cups chopped greens (leutia, amaranth, spinach or koshala saga)",
       "4 garlic cloves, crushed", "2 dry red chillies, broken", "½ tsp mustard seeds",
       "½ tsp panch phutana", "1 tbsp mustard oil", "Salt"],
      ["Wash the greens thoroughly in several changes of water, then chop and drain well.",
       "Heat the mustard oil until it just begins to smoke, then lower the heat.",
       "Splutter the mustard seeds and panch phutana, add the garlic and red chillies and fry until fragrant.",
       "Add the greens and salt. Toss on a high flame 3-4 minutes — no lid, no water.",
       "Take it off the heat while the greens are still bright. Serve with pakhala or rice."],
      "Greens release plenty of their own water, so keep the flame high and the pan uncovered or they will stew.",
      ["saga", "greens", "iron", "quick", "lunch", "low-oil"],
      N("70 kcal", "3 g", "4 g", "6 g"), healthy=True,
      image_alt="Odia saga bhaja — stir-fried greens with garlic and dry chilli"),

    R("badi-chura", "Badi Chura", LUNCH,
      "Sun-dried biri badi, roasted until it crackles and then crushed with raw onion, garlic, "
      "green chilli and mustard oil. The sharp, crunchy counterpoint to a bowl of pakhala.",
      15, "5 min", "10 min", "4", "Easy",
      ["8-10 biri badi (sun-dried lentil dumplings)", "1 small onion, finely chopped",
       "3 garlic cloves", "2 green chillies", "1 tbsp raw mustard oil", "Salt"],
      ["Dry-roast the badi on a tawa over a medium flame, turning often, until deeply browned and brittle. "
       "(They can also be shallow-fried.)",
       "Cool slightly, then crush them coarsely — a mortar, or simply your hands.",
       "Pound the garlic and green chillies to a rough paste with a little salt.",
       "Mix the crushed badi, garlic-chilli paste and onion together.",
       "Work in the raw mustard oil and taste for salt. Serve alongside pakhala."],
      "The mustard oil goes in raw — that pungency is the point. Roast the badi slowly or they will brown outside "
      "and stay soft inside.",
      ["badi", "chura", "pakhala", "side", "mustard oil"],
      N("130 kcal", "6 g", "3 g", "12 g"),
      image_alt="Badi chura — crushed roasted lentil dumplings with onion and mustard oil"),

    R("tomato-khata", "Tomato Khata", LUNCH,
      "The sweet-sour relish that closes an Odia meal — tomato simmered with jaggery, a panch "
      "phutana tempering and nothing else pretending to be in charge.",
      25, "5 min", "20 min", "4", "Easy",
      ["4 ripe tomatoes, roughly chopped", "3 tbsp grated jaggery",
       "1 tsp panch phutana", "2 dry red chillies", "½ tsp turmeric",
       "1 tbsp mustard oil", "Salt", "A few raisins or dates (optional)"],
      ["Heat the mustard oil, splutter the panch phutana and the broken red chillies.",
       "Add the tomatoes, turmeric and salt. Cover and cook until completely collapsed, 10-12 minutes.",
       "Stir in the jaggery and the raisins or dates if using.",
       "Simmer uncovered until it thickens to a loose, glossy relish, 6-8 minutes.",
       "Cool slightly — khata is served warm or at room temperature, never hot."],
      "Traditionally made with ou (elephant apple) or raw mango when in season; tomato is the year-round version.",
      ["khata", "chutney", "jaggery", "sweet-sour", "lunch"],
      N("95 kcal", "1 g", "2 g", "22 g"), healthy=True,
      image_alt="Odia tomato khata, a sweet and sour jaggery relish"),

    # ============================== DINNER =============================
    R("santula", "Santula", DINNER,
      "Vegetables boiled soft, then barely tempered — the lightest thing on an Odia table and the "
      "dish Odia households fall back on when the body wants a rest.",
      30, "10 min", "20 min", "4", "Easy",
      ["1 potato, cubed", "1 brinjal, cubed", "1 cup raw papaya, cubed",
       "1 cup pumpkin, cubed", "1 tomato, chopped", "2 green chillies, slit",
       "½ tsp panch phutana", "½ tsp turmeric", "1 tbsp mustard oil",
       "2 crushed roasted badi (optional)", "Salt", "Coriander leaves"],
      ["Boil the potato, brinjal, papaya and pumpkin with the turmeric, salt and just enough water to cover, "
       "until soft but not falling apart.",
       "Add the tomato in the last 3 minutes so it softens without disappearing.",
       "Heat the mustard oil in a small pan, splutter the panch phutana with the green chillies.",
       "Pour the tempering over the vegetables and fold through gently, mashing a little for body.",
       "Scatter the crushed badi and coriander over the top. Serve with rice or pakhala."],
      "This is the boiled version. For bhaja santula the same vegetables are sautéed instead — more flavour, "
      "a little more oil.",
      ["santula", "light", "boiled", "low-oil", "dinner", "vegetables"],
      N("120 kcal", "3 g", "5 g", "22 g"), healthy=True, popular=True,
      image_alt="Odia santula — lightly boiled and tempered mixed vegetables"),

    R("besara", "Besara", DINNER,
      "Seasonal vegetables in a ground mustard paste — pungent, thin-gravied and unmistakably Odia. "
      "The mustard is the dish; everything else supports it.",
      35, "15 min", "20 min", "4", "Medium",
      ["2 tbsp mustard seeds", "1 tsp cumin seeds", "2 dry red chillies", "3 garlic cloves (optional)",
       "1 raw banana, sliced", "1 cup pumpkin, cubed", "1 cup yam or potato, cubed",
       "1 brinjal, cubed", "½ tsp turmeric", "½ tsp panch phutana",
       "2 tbsp mustard oil", "Salt"],
      ["Soak the mustard seeds 15 minutes, then grind with the cumin, one red chilli and the garlic to a smooth paste.",
       "Boil the vegetables with the turmeric and salt until just tender; keep the cooking water.",
       "Heat the mustard oil, splutter the panch phutana and the second red chilli.",
       "Lower the heat and add the mustard paste. Fry gently for 2-3 minutes — never on a high flame.",
       "Add the vegetables with enough of their water to make a thin gravy. Simmer 5-6 minutes.",
       "Rest 5 minutes off the heat before serving with rice."],
      "Mustard paste turns bitter if it is fried hard or boiled long. Keep the flame low and the simmer short.",
      ["besara", "mustard", "curry", "dinner", "vegetables"],
      N("160 kcal", "4 g", "6 g", "20 g"), healthy=True,
      image_alt="Odia besara — vegetables in a ground mustard paste gravy"),

    R("dahi-baigana", "Dahi Baigana", DINNER,
      "Pan-fried brinjal slices sunk into whisked curd and finished with a crackling mustard-seed "
      "tempering. Cool, tangy and ready in twenty minutes.",
      25, "10 min", "15 min", "4", "Easy",
      ["2 medium brinjals, sliced into rounds", "1½ cups thick curd, whisked smooth",
       "½ tsp turmeric", "½ tsp sugar", "½ tsp roasted cumin powder",
       "½ tsp mustard seeds", "6-8 curry leaves", "2 green chillies, slit",
       "1 dry red chilli", "2 tbsp mustard oil", "Salt", "Coriander leaves"],
      ["Rub the brinjal rounds with turmeric and salt; rest 10 minutes.",
       "Shallow-fry them in mustard oil until golden on both sides. Drain on paper.",
       "Whisk the curd with the salt, sugar and roasted cumin powder until completely smooth.",
       "Lay the fried brinjal in a shallow dish and pour the seasoned curd over to cover.",
       "Heat the remaining oil, splutter the mustard seeds with the curry leaves and both chillies, and pour over the top.",
       "Garnish with coriander and serve at room temperature with rice."],
      "Let the brinjal cool a little before it meets the curd, or the curd will split.",
      ["dahi baigana", "brinjal", "curd", "dinner", "no-onion"],
      N("150 kcal", "6 g", "4 g", "14 g"), healthy=True,
      image_alt="Dahi baigana — fried brinjal in whisked curd with tempering"),

    R("khechedi", "Khechedi", DINNER,
      "The Jagannath temple's rice-and-moong khichdi: roasted dal, soft rice, turmeric, ghee and "
      "cumin. Satvik, buttery and deeply comforting.",
      40, "10 min", "30 min", "4", "Easy",
      ["1 cup raw rice", "½ cup moong dal", "½ tsp turmeric", "1 tsp cumin seeds",
       "1 bay leaf", "2 cloves", "1 inch cinnamon", "1 inch ginger, grated",
       "2 green chillies, slit", "1 cup mixed vegetables (optional)",
       "2 tbsp ghee", "Salt", "4 cups water"],
      ["Dry-roast the moong dal until it smells nutty and turns a shade darker; this is what gives khechedi its aroma.",
       "Rinse the roasted dal with the rice and drain.",
       "Heat the ghee in a pressure cooker. Add the cumin, bay leaf, cloves and cinnamon.",
       "Add the ginger, green chillies and vegetables if using; sauté 2 minutes.",
       "Stir in the rice, dal, turmeric, salt and water. Pressure-cook 3 whistles.",
       "Open, stir to a soft porridge-like consistency, add a last spoon of ghee and serve hot."],
      "Temple khechedi has no onion or garlic. Roasting the moong dal first is the step most people skip and the "
      "one that matters most.",
      ["khechedi", "khichdi", "satvik", "mahaprasad", "comfort", "dinner"],
      N("280 kcal", "11 g", "5 g", "48 g"), healthy=True, popular=True,
      image_alt="Odia khechedi — temple-style rice and moong dal khichdi"),

    R("kanika", "Kanika", DINNER,
      "Fragrant sweet ghee rice with cardamom, cashew and raisin — the festive rice of the Odia "
      "table and part of the Jagannath temple abadha.",
      35, "10 min", "25 min", "4", "Medium",
      ["1½ cups basmati rice", "3 tbsp ghee", "⅓ cup sugar or grated jaggery",
       "4 green cardamoms, crushed", "2 cloves", "1 inch cinnamon", "1 bay leaf",
       "2 tbsp cashews", "2 tbsp raisins", "A pinch of saffron (optional)",
       "A pinch of salt", "2¾ cups water"],
      ["Rinse the rice gently and soak 20 minutes, then drain.",
       "Heat the ghee and fry the cashews and raisins until golden; lift them out and set aside.",
       "In the same ghee, add the bay leaf, cardamom, cloves and cinnamon until fragrant.",
       "Add the drained rice and toss carefully for 2 minutes, keeping the grains whole.",
       "Pour in the water with the salt and saffron. Cover and cook on a low flame until the rice is just done.",
       "Fold in the sugar or jaggery off the heat so it melts without breaking the grains, scatter the fried "
       "cashews and raisins over, and rest 5 minutes before serving."],
      "Add the sweetener at the end. Cooking rice in sugar from the start makes the grains firm and stops them softening.",
      ["kanika", "sweet rice", "festive", "mahaprasad", "dinner"],
      N("340 kcal", "5 g", "2 g", "62 g"), festive="Rath Yatra",
      image_alt="Kanika — Odia sweet ghee rice with cashew and raisin"),

    # ============================== SNACKS =============================
    R("chuda-ghasa", "Chuda Ghasa", SNACKS,
      "Beaten rice rubbed by hand with ghee and jaggery until it softens into a crumbly sweet. "
      "A Ganesh and Saraswati Puja offering that takes no cooking at all.",
      30, "30 min", "No cooking", "6", "Easy",
      ["2 cups beaten rice (chuda), thin variety", "¾ cup grated jaggery",
       "3 tbsp ghee", "½ cup freshly grated coconut", "½ tsp cardamom powder",
       "¼ tsp crushed black pepper", "Chopped cashews, for garnish"],
      ["Grind the chuda to a coarse meal — some texture should remain.",
       "Add the jaggery and ghee and begin rubbing the mixture between your palms.",
       "Keep rubbing for about 20 minutes. The jaggery will melt from the friction and the mixture will soften and clump.",
       "Work in the coconut, cardamom and crushed pepper.",
       "Press into a bowl or shape into rough rounds, garnish with cashews and serve."],
      "No heat and no water — only hand friction. It looks dry for a long while, then comes together all at once, "
      "so do not be tempted to add liquid.",
      ["chuda ghasa", "prasad", "no-cook", "jaggery", "festive", "snack"],
      N("290 kcal", "3 g", "3 g", "54 g"), festive="Ganesh Puja"),

    R("arisa-pitha", "Arisa Pitha", SNACKS,
      "Ground rice stirred into one-string jaggery syrup, pressed into discs, coated in sesame and "
      "fried crisp at the edges. Made for Manabasa Gurubara and Rath Yatra, and it keeps for months.",
      75, "45 min (plus soaking)", "30 min", "8", "Hard",
      ["2 cups raw rice", "1 cup grated jaggery", "½ cup water",
       "3 tbsp white sesame seeds", "¼ tsp cardamom powder", "A pinch of salt",
       "Oil, for deep-frying"],
      ["Soak the rice 4-8 hours, drain, and spread it on a cloth until just barely damp.",
       "Grind to a fine flour and sieve it. It should feel slightly moist, not dry.",
       "Melt the jaggery with the water and boil to a one-string consistency — a drop should form a single thread "
       "between your fingers.",
       "Lower the heat and stir the rice flour into the syrup a little at a time until it forms a soft dough. "
       "Add the cardamom and salt.",
       "Cool until handleable, then grease your palms and flatten portions into discs.",
       "Press both sides into the sesame seeds.",
       "Deep-fry on a medium flame, one or two at a time, until golden and crisp at the rim. Drain well and cool "
       "completely before storing."],
      "The one-string syrup stage decides everything — too soft and the pitha will not hold, too hard and it turns "
      "brittle. Fry on a medium flame so the inside cooks through.",
      ["arisa", "pitha", "jaggery", "festive", "manabasa", "snack"],
      N("230 kcal", "3 g", "2 g", "44 g"), festive="Manabasa Gurubara"),

    R("kakara-pitha", "Kakara Pitha", SNACKS,
      "A fried semolina parcel with a coconut, jaggery and poppy-seed filling, scented with fennel. "
      "Crisp at the seam, soft in the middle.",
      50, "25 min", "25 min", "6", "Medium",
      ["1 cup semolina (suji)", "2 cups water", "2 tbsp ghee", "A pinch of salt",
       "½ tsp fennel seed powder", "1 cup freshly grated coconut",
       "½ cup grated jaggery", "1 tbsp poppy seeds", "¼ tsp cardamom powder",
       "¼ tsp crushed black pepper", "Chopped cashews and raisins",
       "Oil, for deep-frying"],
      ["For the filling, cook the coconut, jaggery and poppy seeds together until thick, then add the cardamom, "
       "pepper, cashews and raisins. Cool.",
       "Bring the water to a boil with the ghee, salt and fennel powder.",
       "Lower the heat and rain in the semolina, stirring constantly until it pulls away from the pan.",
       "Cover and rest 10 minutes, then knead the warm dough smooth with greased palms.",
       "Take a portion, flatten it, place a spoon of filling in the centre and seal into a disc.",
       "Deep-fry on a medium flame until golden on both sides. Drain and serve warm."],
      "Knead the dough while it is still warm or it will crack when you shape it. Seal the edges firmly so the "
      "filling does not leak into the oil.",
      ["kakara", "pitha", "suji", "coconut", "festive", "snack"],
      N("270 kcal", "4 g", "3 g", "46 g")),

    R("chhena-poda", "Chhena Poda", SNACKS,
      "Odisha's baked cheese cake, born in Dashapalla: fresh chhena kneaded with sugar and semolina, "
      "then baked until the top caramelises almost black.",
      75, "20 min", "45 min", "8", "Medium",
      ["500 g fresh chhena (from 2 litres full-fat milk)", "¾ cup sugar or grated jaggery",
       "3 tbsp semolina (suji)", "½ tsp cardamom powder", "2 tbsp chopped cashews",
       "2 tbsp raisins", "1 tbsp ghee, for greasing", "A pinch of baking soda (optional)"],
      ["Crumble the chhena and knead it with your palm for 8-10 minutes until completely smooth and no grain remains.",
       "Work in the sugar, semolina, cardamom and baking soda. Rest 15 minutes for the semolina to absorb moisture.",
       "Fold in the cashews and raisins.",
       "Grease a tin generously with ghee and line the base with a sal or banana leaf if you have one.",
       "Spread the mixture in and level the top.",
       "Bake at 180°C for 35-45 minutes, until the surface is dark brown and well caramelised.",
       "Cool completely in the tin before slicing — it sets as it cools."],
      "The dark top is the whole character of the dish; pull it out pale and it is just a cheese cake. Knead the "
      "chhena far longer than feels necessary.",
      ["chhena poda", "dessert", "baked", "sweet", "snack", "dashapalla"],
      N("310 kcal", "11 g", "1 g", "38 g"), popular=True,
      image_alt="Chhena poda — Odia baked cheese dessert with a caramelised top"),
]

# Dish photography, generated to brief for each recipe (slug -> image hash).
BASE = "https://static.prod-images.emergentagent.com/jobs/142048f6-0d3a-4554-a93b-8e86b9a55fde/images/"
_IMG = {
 "chakuli-pitha":"0d73d737cde49c8783237b603b23145919e846700c601d66364e444ca2045893",
 "ghuguni":"d35cb2858a3f2feb527390f7a8aa72b9e68a7915d1e37f7a06e52a3d296582c1",
 "chuda-kadali":"499dc4888c89c6f6314934ce344c6a079650c3301f7a9b42f7724edaee4f1982",
 "biri-bara":"8b53e9673324258f92a40c1999fc92262ae92ff3e634be35e0edb01c2319f219",
 "enduri-pitha":"b5175b563dabc4a490075240edcdc197608b6200ef84ae6f318d0b43f892ca19",
 "dahi-pakhala":"6915c28d38f0ea74d433754c53ad3dff4528cba80cdd012ef494b5a4a299b209",
 "dalma":"d83656cffa50b5e597c4e4b26aebbec5617fa720e1ee77d57966de3caa1be0ea",
 "saga-bhaja":"6e6d46b02312f7e4e87a3ae2da27e6233677713b27db94edc7592c7c36bc821d",
 "badi-chura":"2a8823c345b91cdace582f82f12f957e6df69096c2f635309431a7ce786c7858",
 "tomato-khata":"5414bdeb86a18d84ec5c6a09f5ef02bb11a499fc4ac9bd7d005a21a90906ad8b",
 "santula":"def02a70d95f3ca3775f7dd01921792167c2f4c7a8e5aacf55b5fc87737db78e",
 "besara":"9e7e665ab3027f3c73820b79fa68aab2b2430fbf3b2f2c51f1f87b40ed267ded",
 "dahi-baigana":"b91af9b6fd24afdc7c707aa958af98d498ca7e67af1c26f1029fcce23813419f",
 "khechedi":"91516444181be46e1c9b9afcbfcec8bff94e98014b60b993e38c0aba2155b8d9",
 "kanika":"a97e7bdcc9ac212069eda8b8bd2ec7a0003031ac52e2811b71f85d7b4f3e1236",
 "chuda-ghasa":"ddaf25d6e6dac014fa39ad7c7aa84993fd6f043a59cf4906b414265cc86edbd9",
 "arisa-pitha":"a286bcc7ff1f197fedf2dae6d7931fac0ee1f625102996bfe1f8e2ed3ea519d2",
 "kakara-pitha":"bab30c628ba74a932ab460dbf2e8e0a325ec36ef5e13ec332facf38bc7b5863b",
 "chhena-poda":"dab9c4393113ca4dec2a0049f6606e2116e3039853433ebc9651fc0318bf4055",
}

ODIA_RECIPE_IMAGES = {slug: BASE + h + ".jpeg" for slug, h in _IMG.items()}

_missing = [r["slug"] for r in ODIA_RECIPES if r["slug"] not in ODIA_RECIPE_IMAGES]
assert not _missing, f"odia_recipes: no image mapped for {_missing}"

MEAL_ORDER = [BREAKFAST, LUNCH, DINNER, SNACKS]
