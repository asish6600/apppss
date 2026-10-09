"""AaharNest organic catalogue: categories, ~85 products, 4 combo boxes, seeded Today's Deals and extra recipes.
Only food/wellness descriptions — no medical claims. Compliance fields use placeholders until supplier data arrives."""
import json
from pathlib import Path

from catalog_logic import price_from_mrp, combo_pricing, discount_pct

_raw = json.loads((Path(__file__).parent / "catalog_images.json").read_text())
_BASE = _raw.pop("_base")
IMG = {k: f"{_BASE}{v}.jpeg" for k, v in _raw.items()}

LAUNCH = "aaharnest-launch-offer"
CAMPAIGN_PCT = 20  # every product on the offer banner/page/home strip is EXACTLY this % off
BRAND = "AaharNest"
BRAND_FARM = "AaharNest Farm Direct"
FSSAI_PLACEHOLDER = "FSSAI licence number: to be updated by AaharNest"
MFG_PLACEHOLDER = "Marketed by AaharNest. Packer / manufacturer address: to be updated"

CATEGORIES = [
    ("organic-millets-grains", "Organic Millets & Grains", "Ragi, foxtail, kodo, bajra, jowar and heritage rices.", "foxtail_millet",
     ["Ragi", "Foxtail Millet", "Kodo Millet", "Little Millet", "Barnyard Millet", "Bajra", "Jowar", "Proso Millet", "Amaranth", "Quinoa", "Brown Rice", "Red Rice", "Black Rice", "Basmati Rice", "Sona Masuri", "Barley", "Oats", "Buckwheat"]),
    ("organic-pulses-dals", "Organic Pulses & Dals", "Everyday dals, whole beans and chickpeas.", "moong_dal",
     ["Moong Dal", "Whole Green Moong", "Masoor Dal", "Whole Masoor", "Toor Dal", "Chana Dal", "Whole Chana", "Urad Dal", "Whole Urad", "Kabuli Chana", "Rajma", "Kala Chana", "Lobia", "Moth Dal", "Mixed Dal"]),
    ("organic-super-seeds", "Organic Super Seeds", "Chia, flax, pumpkin, sunflower and more.", "chia",
     ["Chia", "Flax", "Pumpkin Seeds", "Sunflower Seeds", "Sesame", "Watermelon Seeds", "Muskmelon Seeds", "Hemp Seeds", "Basil Seeds", "Quinoa Seeds", "Amaranth Seeds"]),
    ("organic-spices", "Organic Spices", "Whole and ground single-origin spices.", "turmeric",
     ["Turmeric", "Black Pepper", "White Pepper", "Cumin", "Coriander", "Fennel", "Fenugreek", "Ajwain", "Mustard Seeds", "Kalonji", "Cardamom", "Cinnamon", "Cloves", "Nutmeg", "Mace", "Bay Leaf", "Red Chilli", "Long Pepper", "Ginger Powder", "Garlic Powder"]),
    ("cold-pressed-oils", "Organic Cold-Pressed Oils", "Wood-pressed cooking oils in glass.", "mustard_oil",
     ["Mustard Oil", "Groundnut Oil", "Sesame Oil", "Coconut Oil", "Sunflower Oil", "Safflower Oil", "Flaxseed Oil"]),
    ("natural-sweeteners", "Natural Sweeteners", "Jaggery, coconut sugar and date sugar.", "jaggery_powder",
     ["Jaggery", "Jaggery Powder", "Jaggery Cubes", "Coconut Sugar", "Brown Sugar", "Khand", "Date Sugar"]),
    ("organic-tea", "Organic Tea", "Loose-leaf and herbal teas.", "green_tea",
     ["Green Tea", "Black Tea", "Assam Tea", "Darjeeling Tea", "Tulsi Tea", "Lemongrass Tea", "Ginger Tea", "Herbal Tea", "Masala Tea", "Turmeric Herbal Tea"]),
    ("organic-nuts", "Organic Nuts", "Almonds, walnuts, cashews and peanuts.", "almonds",
     ["Almonds", "Walnuts", "Cashews", "Pistachios", "Peanuts", "Brazil Nuts", "Hazelnuts"]),
    ("organic-flours", "Organic Flours", "Stone-ground millet and pulse flours.", "ragi_flour",
     ["Ragi Flour", "Jowar Flour", "Bajra Flour", "Barley Flour", "Buckwheat Flour", "Amaranth Flour", "Besan", "Rice Flour", "Multigrain Flour", "Millet Flour", "Oat Flour", "Soybean Flour", "Lentil Flour"]),
    ("organic-breakfast", "Organic Breakfast", "Oats, dalia, porridge mixes, poha and sattu.", "rolled_oats",
     ["Rolled Oats", "Millet Dalia", "Ragi Porridge", "Millet Porridge", "Muesli", "Granola", "Poha", "Flattened Rice", "Puffed Rice", "Sattu", "Multigrain Breakfast Mix"]),
    ("healthy-snacks", "Healthy Organic Snacks", "Millet cookies, makhana, roasted chana and seed mixes.", "ragi_cookies",
     ["Millet Cookies", "Ragi Cookies", "Jowar Cookies", "Bajra Cookies", "Multigrain Cookies", "Millet Crackers", "Roasted Chana", "Roasted Makhana", "Seed Mix", "Trail Mix", "Roasted Seeds", "Millet Namkeen", "Millet Puffs", "Ragi Chips"]),
    ("coconut-products", "Organic Coconut Products", "Desiccated coconut, coconut flour and chips.", "desiccated_coconut",
     ["Coconut Oil", "Desiccated Coconut", "Dry Coconut", "Coconut Flour", "Coconut Sugar", "Coconut Chips"]),
    ("masala-blends", "Organic Masala Blends", "Small-batch garam masala, sambar and chaat masalas.", "garam_masala",
     ["Garam Masala", "Chana Masala", "Sambar Powder", "Rasam Powder", "Curry Masala", "Biryani Masala", "Panch Phoron", "Chaat Masala", "Tea Masala"]),
    ("wellness-foods", "Organic Wellness Foods", "Moringa, amla, wheatgrass and ashwagandha powders.", "moringa",
     ["Moringa Powder", "Amla Powder", "Turmeric Powder", "Wheatgrass Powder", "Brahmi Powder", "Ashwagandha Powder", "Shatavari Powder", "Triphala Powder", "Neem Leaf Powder", "Arjuna Powder"]),
    ("combos", "Combo Boxes", "Curated bundles that save more than buying separately.", "combo_millet_starter", []),
]

CAT_CODE = {"organic-millets-grains": "MLT", "organic-pulses-dals": "PUL", "organic-super-seeds": "SED", "organic-spices": "SPC",
            "cold-pressed-oils": "OIL", "natural-sweeteners": "SWT", "organic-tea": "TEA", "organic-nuts": "NUT",
            "organic-flours": "FLR", "organic-breakfast": "BRK", "healthy-snacks": "SNK", "coconut-products": "COC",
            "masala-blends": "MSB", "wellness-foods": "WEL", "combos": "CMB"}
_counter: dict[str, int] = {}


def _rating(slug: str):
    h = 0
    for ch in slug:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return round(4.1 + (h % 9) / 10, 1), 18 + (h % 243)


def N(energy, protein=None, fibre=None, fat=None, carbs=None):
    out = [{"label": "Energy", "value": energy}]
    if protein: out.append({"label": "Protein", "value": protein})
    if fibre: out.append({"label": "Fibre", "value": fibre})
    if fat: out.append({"label": "Fat", "value": fat})
    if carbs: out.append({"label": "Carbs", "value": carbs})
    return out


def P(slug, name, cat, sub, mrp, pack, img, short, desc, ingredients, nutrition, ptype, dietary,
      disc=0, offer=False, top=None, new=False, farm=False, region=None, recipes=(), shelf="12 months from packing",
      unit="g", weight=None, keywords="", storage="Store in an airtight container in a cool, dry place away from sunlight."):
    _counter[cat] = _counter.get(cat, 0) + 1
    pct = CAMPAIGN_PCT if offer else disc
    price = price_from_mrp(mrp, pct)
    rating, count = _rating(slug)
    if weight is None:
        num = "".join(ch for ch in pack.split()[0] if ch.isdigit() or ch == ".")
        pl = pack.lower()
        mult = 1000 if (pl.endswith("kg") or (pl.endswith("l") and not pl.endswith("ml"))) else 1
        weight = int(float(num) * mult) if num else 0
    return {
        "slug": slug, "sku": f"AN-{CAT_CODE[cat]}-{_counter[cat]:03d}", "name": name, "category": cat, "subcategory": sub,
        "brand": BRAND_FARM if farm else BRAND, "price": price, "mrp": mrp, "pack_size": pack, "net_quantity": pack,
        "weight": weight, "unit": unit, "stock": 60 + (count % 40), "image": img, "images": [img],
        "short_description": short, "description": desc, "ingredients": ingredients, "nutrition": nutrition,
        "storage": storage, "shelf_life": shelf, "country_of_origin": "India", "origin": "Sourced from organic farms in Odisha and packed in India.",
        "origin_region": region, "organic_status": False, "certification": "", "certification_number": "",
        "fssai_number": FSSAI_PLACEHOLDER, "manufacturer": MFG_PLACEHOLDER,
        "farmer_connected": farm, "product_type": ptype, "dietary": list(dietary),
        "rating": None, "rating_count": 0, "is_new": new, "featured": top is not None,
        "top_seller_rank": top, "sales_count": (600 - top * 40) if top else 40 + (count % 160),
        "is_combo": False, "combo_items": [], "combo_discount_pct": 0,
        "variant_group": slug, "variant_primary": True,
        "is_todays_deal": False, "deal_visible": False, "deal_order": 0, "deal_price": None, "deal_discount": 0,
        "deal_start_at": None, "deal_end_at": None, "deal_badge": "", "deal_stock": None,
        "badges": (["Made in India"] + (["Farmer Sourced"] if farm else []) + (["Gluten-free"] if "Gluten-free" in dietary else [])),
        "recipe_slugs": list(recipes), "campaign_slug": LAUNCH if offer else None,
        "seo_title": f"{name} ({pack}) | Buy Online at AaharNest",
        "seo_description": f"{short} {pack} pack. {ptype} from AaharNest — wholesome Indian organic food, delivered pan-India.",
        "search_keywords": keywords or f"{name.lower()}, {sub.lower()}, organic {sub.lower()}",
    }


VG, GF, HP, HF, NS = "Vegan", "Gluten-free", "High Protein", "High Fibre", "No Added Sugar"
WG, DL, SD, WS, GS, OL, SW, TE, NU, FL, BM, SN, CO, MB, WP = ("Whole Grain", "Dal / Lentil", "Seeds", "Whole Spice", "Ground Spice", "Cold-Pressed Oil",
    "Natural Sweetener", "Tea", "Nuts", "Flour", "Breakfast Mix", "Snack", "Coconut", "Masala Blend", "Wellness Powder")

SINGLES = [
    # ---------- MILLETS & GRAINS ----------
    P("organic-ragi-whole", "Organic Ragi (Finger Millet)", "organic-millets-grains", "Ragi", 165, "1 kg", IMG["ragi_whole"],
      "Whole finger millet for malting, sprouting and porridge.", "Whole ragi grain that you can sprout, roast or mill at home. A traditional South Indian staple with a nutty, earthy flavour that suits porridge, laddoos and malted drinks.",
      "100% whole finger millet (ragi).", N("328 kcal", "7 g", "11 g"), WG, [VG, GF, HF], disc=10, farm=True, region="Odisha", recipes=["mandia-manda", "mandia-ambili"]),
    P("organic-foxtail-millet", "Organic Foxtail Millet", "organic-millets-grains", "Foxtail Millet", 160, "500 g", IMG["foxtail_millet"],
      "Light, quick-cooking millet — a natural rice swap.", "Foxtail millet cooks in about 15 minutes and works beautifully in pulao, upma, khichdi and lemon rice. Mild in taste and naturally gluten-free.",
      "100% foxtail millet.", N("331 kcal", "12 g", "8 g"), WG, [VG, GF, HF], offer=True, top=1, farm=True, region="Odisha", recipes=["kodo-khechedi", "dahi-pakhala"]),
    P("organic-kodo-millet", "Organic Kodo Millet", "organic-millets-grains", "Kodo Millet", 170, "500 g", IMG["kodo_millet"],
      "Fibre-rich millet with a soft, fluffy texture.", "Kodo millet turns soft and fluffy when cooked and makes a comforting khichdi, pongal or millet rice. One of the hardier traditional grains of central India.",
      "100% kodo millet.", N("353 kcal", "8 g", "9 g"), WG, [VG, GF, HF], offer=True, farm=True, region="Odisha", recipes=["kodo-khechedi", "chenchudi"]),
    P("organic-little-millet", "Organic Little Millet", "organic-millets-grains", "Little Millet", 165, "500 g", IMG["little_millet"],
      "Tiny, versatile millet for khichdi and pongal.", "Little millet is small in size but quick to cook and tender on the plate. Use it wherever you would use rice — pongal, bisi bele bath or a simple millet-dal bowl.",
      "100% little millet.", N("329 kcal", "10 g", "8 g"), WG, [VG, GF], disc=8, farm=True, region="Odisha", recipes=["kodo-khechedi", "dahi-pakhala"]),
    P("organic-barnyard-millet", "Organic Barnyard Millet", "organic-millets-grains", "Barnyard Millet", 175, "500 g", IMG["barnyard_millet"],
      "Fasting-friendly, fast-cooking millet.", "Barnyard millet (sanwa) is popular for vrat cooking and light weekday meals. It cooks fast, has a gentle flavour and pairs well with curd and vegetables.",
      "100% barnyard millet.", N("300 kcal", "11 g", "10 g"), WG, [VG, GF, HF], disc=5, farm=True, region="Odisha", recipes=["kodo-khechedi", "dahi-pakhala"]),
    P("organic-bajra", "Organic Bajra (Pearl Millet)", "organic-millets-grains", "Bajra", 110, "1 kg", IMG["bajra"],
      "Hearty pearl millet for rotis and winter khichdi.", "Whole bajra grain for home milling, khichdi and bajra-rice. A warming staple in Rajasthan and Gujarat with a robust, slightly sweet flavour.",
      "100% pearl millet (bajra).", N("347 kcal", "11 g", "11 g"), WG, [VG, GF, HF], disc=10, farm=True, region="Odisha", recipes=["kodo-khechedi", "mandia-manda"]),
    P("organic-jowar", "Organic Jowar (Sorghum)", "organic-millets-grains", "Jowar", 105, "1 kg", IMG["jowar"],
      "Pearly white sorghum for rotis, pops and salads.", "Whole jowar grain — mill it for soft bhakri, pop it as a snack or cook it like a hearty grain salad. Mild and slightly sweet.",
      "100% sorghum (jowar).", N("349 kcal", "10 g", "10 g"), WG, [VG, GF, HF], disc=12, farm=True, region="Odisha", recipes=["kodo-khechedi", "chenchudi"]),
    P("organic-brown-rice", "Organic Brown Rice", "organic-millets-grains", "Brown Rice", 150, "1 kg", IMG["brown_rice"],
      "Unpolished rice that keeps its bran and germ.", "Wholegrain brown rice with a nutty, chewy bite. Soak for 30 minutes before cooking for a softer texture.",
      "100% unpolished brown rice.", N("362 kcal", "7 g", "4 g"), WG, [VG, GF], disc=10, region="Odisha", recipes=["khechedi", "dahi-pakhala", "kanika"]),
    P("organic-red-rice", "Organic Red Rice", "organic-millets-grains", "Red Rice", 185, "1 kg", IMG["red_rice"],
      "Heritage red rice with a rich, earthy flavour.", "Traditional unpolished red rice from South India. Its bran gives it a reddish hue and a deeper flavour that suits kanji, pongal and simple rice-and-curry meals.",
      "100% unpolished red rice.", N("356 kcal", "7 g", "3 g"), WG, [VG, GF], disc=8, new=True, farm=True, region="Odisha", recipes=["dahi-pakhala", "podo-pitha", "chakuli-pitha"]),
    P("organic-quinoa", "Organic Quinoa", "organic-millets-grains", "Quinoa", 395, "500 g", IMG["quinoa"],
      "Fluffy white quinoa, Indian-grown.", "Light, fluffy quinoa that cooks in 15 minutes. Use it for khichdi, salads and grain bowls — rinse well before cooking.",
      "100% white quinoa.", N("368 kcal", "14 g", "7 g"), WG, [VG, GF, HP], disc=10, new=True, region="Odisha", recipes=["kodo-khechedi", "dahi-pakhala"]),

    # ---------- PULSES & DALS ----------
    P("organic-moong-dal", "Organic Moong Dal (Split Yellow)", "organic-pulses-dals", "Moong Dal", 170, "1 kg", IMG["moong_dal"],
      "Light, quick-cooking split yellow moong.", "Skinned and split green gram — the gentlest everyday dal. Cooks in minutes for khichdi, chilla batter and a light tadka dal.",
      "100% split yellow moong dal.", N("347 kcal", "24 g", "16 g"), DL, [VG, GF, HP], offer=True, top=3, farm=True, region="Odisha", recipes=["khechedi", "kodo-khechedi"]),
    P("organic-whole-green-moong", "Organic Whole Green Moong", "organic-pulses-dals", "Whole Green Moong", 160, "1 kg", IMG["green_moong"],
      "Whole green gram for sprouts and sabzi.", "Whole moong beans that sprout easily overnight. Cook them into a hearty sabut moong dal or use sprouts in salads and chaat.",
      "100% whole green moong.", N("347 kcal", "24 g", "16 g"), DL, [VG, GF, HP, HF], disc=10, farm=True, region="Odisha", recipes=["ghuguni", "dalma"]),
    P("organic-masoor-dal", "Organic Masoor Dal", "organic-pulses-dals", "Masoor Dal", 150, "1 kg", IMG["masoor_dal"],
      "Quick-cooking red lentils.", "Split red lentils that cook fast and turn soft and comforting — ideal for everyday dal, soups and lentil-based curries.",
      "100% split masoor dal.", N("352 kcal", "25 g", "11 g"), DL, [VG, GF, HP], disc=10, region="Odisha", recipes=["dalma", "khechedi"]),
    P("organic-toor-dal", "Organic Toor Dal", "organic-pulses-dals", "Toor Dal", 195, "1 kg", IMG["toor_dal"],
      "Golden pigeon peas for sambar and dal fry.", "Unpolished toor (arhar) dal — the backbone of sambar, dal tadka and amti. Pressure-cook with a pinch of turmeric for a creamy finish.",
      "100% split pigeon peas (toor dal).", N("343 kcal", "22 g", "15 g"), DL, [VG, GF, HP], disc=8, farm=True, region="Odisha", recipes=["dalma", "khechedi"]),
    P("organic-chana-dal", "Organic Chana Dal", "organic-pulses-dals", "Chana Dal", 145, "1 kg", IMG["chana_dal"],
      "Split Bengal gram for dals and tempering.", "Nutty, hearty chana dal for dal fry, dhokla batter and crunchy tempering. Soak for an hour to shorten cooking time.",
      "100% split Bengal gram.", N("364 kcal", "22 g", "12 g"), DL, [VG, GF, HP], disc=10, region="Odisha", recipes=["dalma", "chenchudi"]),
    P("organic-urad-dal-whole", "Organic Urad Dal (Whole Black)", "organic-pulses-dals", "Whole Urad", 190, "1 kg", IMG["urad_dal"],
      "Whole black gram for dal makhani and idli batter.", "Whole black urad with its skin on — slow-cook it for a creamy dal makhani or use it in traditional idli-dosa batters for extra softness.",
      "100% whole black urad.", N("341 kcal", "25 g", "18 g"), DL, [VG, GF, HP, HF], disc=8, farm=True, region="Odisha", recipes=["biri-bara", "chakuli-pitha", "enduri-pitha", "podo-pitha"]),
    P("organic-kabuli-chana", "Organic Kabuli Chana", "organic-pulses-dals", "Kabuli Chana", 185, "1 kg", IMG["kabuli_chana"],
      "Large, creamy chickpeas for chole and hummus.", "Plump kabuli chana that cook up buttery after an overnight soak. Perfect for chole, salads and homemade hummus.",
      "100% kabuli chana (chickpeas).", N("364 kcal", "19 g", "17 g"), DL, [VG, GF, HP, HF], disc=10, region="Odisha", recipes=["ghuguni", "chenchudi"]),
    P("organic-rajma", "Organic Rajma (Red Kidney Beans)", "organic-pulses-dals", "Rajma", 210, "1 kg", IMG["rajma"],
      "Red kidney beans for a classic rajma-chawal.", "Deep red kidney beans that hold their shape and turn creamy inside. Soak overnight and simmer slowly for the classic Sunday rajma.",
      "100% red kidney beans.", N("333 kcal", "24 g", "25 g"), DL, [VG, GF, HP, HF], disc=5, farm=True, region="Odisha", recipes=["dalma", "ghuguni"]),
    P("organic-kala-chana", "Organic Kala Chana", "organic-pulses-dals", "Kala Chana", 150, "1 kg", IMG["kala_chana"],
      "Small dark chickpeas for sundal and curries.", "Nutty kala chana for sundal, ghugni and chaat. Soak overnight; the cooking water makes a flavourful base for curries.",
      "100% kala chana (black chickpeas).", N("360 kcal", "20 g", "17 g"), DL, [VG, GF, HP, HF], disc=10, new=True, region="Odisha", recipes=["ghuguni", "chenchudi"]),

    # ---------- SUPER SEEDS ----------
    P("organic-chia-seeds", "Organic Chia Seeds", "organic-super-seeds", "Chia", 265, "250 g", IMG["chia"],
      "Fibre-rich black chia for puddings and smoothies.", "Chia seeds that swell into a gel when soaked — stir into overnight oats, lemon water, puddings and smoothies.",
      "100% chia seeds.", N("486 kcal", "17 g", "34 g"), SD, [VG, GF, HF], offer=True, top=6, region="Odisha", recipes=["chatua-pana", "mudhi-mishrana"]),
    P("organic-flax-seeds", "Organic Flax Seeds", "organic-super-seeds", "Flax", 135, "250 g", IMG["flax"],
      "Golden-brown flax for roasting and grinding.", "Roast lightly and grind for a nutty chutney powder, or add to rotis, smoothies and dosa batter.",
      "100% flax seeds (alsi).", N("534 kcal", "18 g", "27 g"), SD, [VG, GF, HF], offer=True, farm=True, region="Odisha", recipes=["mudhi-mishrana", "palli-chatani"]),
    P("organic-pumpkin-seeds", "Organic Pumpkin Seeds", "organic-super-seeds", "Pumpkin Seeds", 245, "250 g", IMG["pumpkin_seeds"],
      "Green shelled pepitas for snacking and salads.", "Mild, crunchy pumpkin seeds. Toast them lightly and sprinkle on salads, bowls, chaat and porridge.",
      "100% shelled pumpkin seeds.", N("559 kcal", "30 g", "6 g"), SD, [VG, GF, HP], disc=10, recipes=["mudhi-mishrana", "chuda-ghasa"]),
    P("organic-sunflower-seeds", "Organic Sunflower Seeds", "organic-super-seeds", "Sunflower Seeds", 165, "250 g", IMG["sunflower_seeds"],
      "Shelled sunflower kernels, mild and buttery.", "Soft, buttery sunflower kernels for trail mixes, granola, salads and baking.",
      "100% shelled sunflower seeds.", N("584 kcal", "21 g", "9 g"), SD, [VG, GF, HP], disc=10, recipes=["mudhi-mishrana", "chuda-ghasa"]),
    P("organic-white-sesame-seeds", "Organic White Sesame Seeds", "organic-super-seeds", "Sesame", 125, "250 g", IMG["sesame"],
      "Hulled white til for laddoos and tempering.", "Clean, hulled white sesame for til laddoos, chikki, tahini and tempering vegetables.",
      "100% hulled white sesame.", N("573 kcal", "18 g", "12 g"), SD, [VG, GF], disc=8, farm=True, region="Odisha", recipes=["til-nadia-ladoo", "arisa-pitha"]),
    P("organic-watermelon-seeds", "Organic Watermelon Seeds (Magaz)", "organic-super-seeds", "Watermelon Seeds", 215, "250 g", IMG["watermelon_seeds"],
      "Shelled magaz for gravies and snacking.", "Soft white watermelon seeds used in rich gravies, thandai and mithai, or simply roasted as a snack.",
      "100% shelled watermelon seeds.", N("557 kcal", "28 g", "4 g"), SD, [VG, GF, HP], disc=5, new=True, region="Odisha", recipes=["kanika", "nadia-ladoo"]),
    P("organic-basil-seeds", "Organic Basil Seeds (Sabja)", "organic-super-seeds", "Basil Seeds", 145, "200 g", IMG["basil_seeds"],
      "Sabja seeds for falooda and summer coolers.", "Tiny black sabja seeds that bloom in minutes. Classic in falooda, lemonade and summer sherbets.",
      "100% sweet basil (sabja) seeds.", N("442 kcal", "15 g", "22 g"), SD, [VG, GF, HF], disc=5, new=True, recipes=["chatua-pana"]),

    # ---------- SPICES ----------
    P("organic-turmeric-powder", "Organic Turmeric Powder", "organic-spices", "Turmeric", 110, "200 g", IMG["turmeric"],
      "Bright, aromatic single-origin haldi.", "Sun-dried and ground turmeric with a deep golden colour and warm aroma. A daily essential for curries, dals and haldi doodh.",
      "100% turmeric (haldi).", N("312 kcal", "10 g"), GS, [VG, GF], offer=True, top=4, farm=True, region="Odisha", recipes=["besara", "dalma", "ghuguni"]),
    P("organic-black-pepper-whole", "Organic Black Pepper (Whole)", "organic-spices", "Black Pepper", 220, "100 g", IMG["black_pepper"],
      "Bold Malabar peppercorns — grind fresh.", "Sun-dried whole peppercorns with a sharp, woody heat. Grind fresh over rasam, pongal and salads.",
      "100% black peppercorns.", N("251 kcal", "10 g"), WS, [VG, GF], disc=10, farm=True, region="Odisha", recipes=["biri-bara", "chatua-pana", "tulasi-chaha"]),
    P("organic-cumin-seeds", "Organic Cumin Seeds", "organic-spices", "Cumin", 115, "200 g", IMG["cumin"],
      "Fragrant whole jeera for tempering.", "Whole cumin for tadka, jeera rice and roasting into masala powders. Warm, earthy and essential.",
      "100% cumin seeds (jeera).", N("375 kcal", "18 g"), WS, [VG, GF], disc=10, region="Odisha", recipes=["dalma", "khechedi", "ghuguni"]),
    P("organic-coriander-powder", "Organic Coriander Powder", "organic-spices", "Coriander", 85, "200 g", IMG["coriander_powder"],
      "Freshly ground dhania powder.", "Mellow, citrusy coriander powder — the base of most Indian gravies and masalas.",
      "100% coriander seeds.", N("298 kcal", "12 g"), GS, [VG, GF], disc=12, region="Odisha", recipes=["chenchudi", "ghuguni", "dalma"]),
    P("organic-fennel-seeds", "Organic Fennel Seeds", "organic-spices", "Fennel", 120, "200 g", IMG["fennel"],
      "Sweet green saunf.", "Sweet, aromatic fennel seeds for after-meal mukhwas, pickles, tea and Kashmiri cooking.",
      "100% fennel seeds (saunf).", N("345 kcal", "16 g"), WS, [VG, GF], disc=8, region="Odisha", recipes=["tomato-khata", "dalma", "badi-chura"]),
    P("organic-fenugreek-seeds", "Organic Fenugreek Seeds", "organic-spices", "Fenugreek", 75, "200 g", IMG["fenugreek"],
      "Methi dana for pickles and dosa batter.", "Amber fenugreek seeds — a little goes a long way in pickles, sambar powder and dosa batter.",
      "100% fenugreek seeds (methi dana).", N("323 kcal", "23 g", "25 g"), WS, [VG, GF, HF], disc=10, region="Odisha", recipes=["tomato-khata", "dalma", "chenchudi"]),
    P("organic-green-cardamom", "Organic Green Cardamom", "organic-spices", "Cardamom", 395, "100 g", IMG["cardamom"],
      "Plump, fragrant Idukki elaichi.", "Whole green cardamom pods with an intense floral aroma. Crush for chai, kheer, biryani and masala blends.",
      "100% green cardamom.", N("311 kcal", "11 g"), WS, [VG, GF], disc=5, farm=True, region="Odisha", recipes=["kanika", "chhena-poda", "enduri-pitha", "tulasi-chaha"]),
    P("organic-cinnamon-sticks", "Organic Cinnamon Sticks", "organic-spices", "Cinnamon", 165, "100 g", IMG["cinnamon"],
      "True cinnamon bark (dalchini).", "Fragrant cinnamon bark for chai, biryani, kheer and spiced oats. Snap off a piece and let it infuse.",
      "100% cinnamon bark.", N("247 kcal", "4 g", "53 g"), WS, [VG, GF], disc=8, region="Odisha", recipes=["kanika", "tulasi-chaha", "kodo-khechedi"]),
    P("organic-cloves", "Organic Cloves", "organic-spices", "Cloves", 185, "100 g", IMG["cloves"],
      "Whole laung with a deep, warm aroma.", "Oil-rich cloves for garam masala, biryani, chai and pulao. Use sparingly — they are intensely aromatic.",
      "100% dried cloves.", N("274 kcal", "6 g"), WS, [VG, GF], disc=8, region="Odisha", recipes=["kanika", "kodo-khechedi"]),
    P("organic-red-chilli-powder", "Organic Red Chilli Powder", "organic-spices", "Red Chilli", 125, "200 g", IMG["red_chilli"],
      "Medium-hot Guntur chilli powder.", "Sun-dried Guntur chillies ground to a vibrant red powder with balanced heat and colour.",
      "100% red chilli.", N("282 kcal", "12 g"), GS, [VG, GF], disc=10, farm=True, region="Odisha", recipes=["chenchudi", "besara", "palli-chatani"]),

    # ---------- COLD-PRESSED OILS ----------
    P("cold-pressed-mustard-oil", "Cold-Pressed Mustard Oil", "cold-pressed-oils", "Mustard Oil", 320, "1 L", IMG["mustard_oil"],
      "Pungent kachi ghani mustard oil.", "Wood-pressed from whole mustard seeds, with the classic pungency that makes Bengali and North Indian cooking sing. Heat to smoking point before tempering.",
      "100% mustard seed oil.", N("900 kcal / 100 ml", fat="100 g"), OL, [VG, GF], offer=True, top=7, farm=True, region="Odisha", unit="ml", shelf="9 months from packing", recipes=["dalma", "besara", "mudhi-mishrana", "chenchudi"]),
    P("cold-pressed-groundnut-oil", "Cold-Pressed Groundnut Oil", "cold-pressed-oils", "Groundnut Oil", 315, "1 L", IMG["groundnut_oil"],
      "Nutty wood-pressed peanut oil.", "Traditional cold-pressed groundnut oil — a stable, everyday cooking oil with a gentle nutty aroma.",
      "100% groundnut (peanut) oil.", N("900 kcal / 100 ml", fat="100 g"), OL, [VG, GF], disc=10, farm=True, region="Odisha", unit="ml", shelf="9 months from packing", recipes=["kadali-manja-bara", "biri-bara"]),
    P("cold-pressed-sesame-oil", "Cold-Pressed Sesame Oil", "cold-pressed-oils", "Sesame Oil", 365, "1 L", IMG["sesame_oil"],
      "Aromatic gingelly (til) oil.", "Cold-pressed sesame oil — rich and aromatic, ideal for South Indian tempering, pickles and idli podi.",
      "100% sesame oil.", N("900 kcal / 100 ml", fat="100 g"), OL, [VG, GF], disc=10, farm=True, region="Odisha", unit="ml", shelf="9 months from packing", recipes=["til-nadia-ladoo", "arisa-pitha"]),
    P("cold-pressed-coconut-oil", "Cold-Pressed Coconut Oil", "cold-pressed-oils", "Coconut Oil", 295, "500 ml", IMG["coconut_oil"],
      "Clear virgin coconut oil.", "Cold-pressed from fresh coconut — clear, fragrant and solid in cooler weather. For Kerala cooking, baking and hair care.",
      "100% coconut oil.", N("900 kcal / 100 ml", fat="100 g"), OL, [VG, GF], disc=8, farm=True, region="Odisha", unit="ml", shelf="12 months from packing", recipes=["mandia-manda", "kakara-pitha"]),
    P("cold-pressed-sunflower-oil", "Cold-Pressed Sunflower Oil", "cold-pressed-oils", "Sunflower Oil", 285, "1 L", IMG["sunflower_oil"],
      "Light, neutral sunflower oil.", "Light cold-pressed sunflower oil with a neutral taste — a versatile everyday oil for sautéing and shallow frying.",
      "100% sunflower oil.", N("900 kcal / 100 ml", fat="100 g"), OL, [VG, GF], disc=10, region="Odisha", unit="ml", shelf="9 months from packing", recipes=["kadali-manja-bara", "biri-bara"]),

    # ---------- NATURAL SWEETENERS ----------
    P("organic-jaggery-block", "Organic Jaggery Block", "natural-sweeteners", "Jaggery", 110, "500 g", IMG["jaggery_block"],
      "Traditional unrefined cane gur.", "Chemical-free cane jaggery made the traditional way. Grate into chai, payasam and chikki.",
      "100% sugarcane jaggery.", N("383 kcal", carbs="98 g"), SW, [VG, GF], disc=10, farm=True, region="Odisha", recipes=["arisa-pitha", "chuda-ghasa", "podo-pitha", "mandia-manda"]),
    P("organic-jaggery-powder", "Organic Jaggery Powder", "natural-sweeteners", "Jaggery Powder", 135, "500 g", IMG["jaggery_powder"],
      "Fine, free-flowing jaggery powder.", "Granulated jaggery that dissolves quickly — swap it 1:1 for sugar in porridge, laddoos, chai and baking.",
      "100% sugarcane jaggery.", N("383 kcal", carbs="98 g"), SW, [VG, GF], offer=True, top=8, farm=True, region="Odisha", recipes=["chatua-pana", "chuda-kadali", "til-nadia-ladoo", "nadia-ladoo"]),
    P("organic-coconut-sugar", "Organic Coconut Sugar", "natural-sweeteners", "Coconut Sugar", 265, "400 g", IMG["coconut_sugar"],
      "Caramel-like sugar from coconut blossom.", "Made from coconut flower sap, with a soft caramel note. Lovely in coffee, baking and granola.",
      "100% coconut blossom sugar.", N("375 kcal", carbs="94 g"), SW, [VG, GF], disc=5, region="Odisha", recipes=["chhena-poda", "chuda-ghasa"]),
    P("organic-date-sugar", "Organic Date Sugar", "natural-sweeteners", "Date Sugar", 315, "400 g", IMG["date_sugar"],
      "Ground dried dates — nothing else.", "Whole dried dates ground into a sugar. Rich, fruity and fibre-containing; ideal for laddoos, smoothies and baking.",
      "100% dried dates.", N("282 kcal", "2 g", "8 g", carbs="75 g"), SW, [VG, GF, HF], disc=5, new=True, recipes=["chhena-poda", "kanika"]),

    # ---------- TEA ----------
    P("organic-green-tea", "Organic Green Tea", "organic-tea", "Green Tea", 345, "200 g", IMG["green_tea"],
      "Fresh, grassy whole-leaf green tea.", "Whole-leaf green tea from high-elevation gardens. Brew at 80°C for 2–3 minutes for a smooth, grassy cup.",
      "100% green tea leaves.", N("0 kcal"), TE, [VG, GF], offer=True, farm=True, region="Odisha", shelf="18 months from packing", recipes=["tulasi-chaha"]),
    P("organic-tulsi-tea", "Organic Tulsi Tea", "organic-tea", "Tulsi Tea", 295, "100 g", IMG["tulsi_tea"],
      "Caffeine-free holy basil infusion.", "Dried tulsi leaves for a calming, caffeine-free herbal infusion. Steep 5 minutes; add jaggery or ginger if you like.",
      "100% dried tulsi (holy basil) leaves.", N("0 kcal"), TE, [VG, GF], disc=10, new=True, shelf="18 months from packing", recipes=["tulasi-chaha", "moringa-rasa"]),
    P("organic-masala-chai", "Organic Masala Chai Blend", "organic-tea", "Masala Tea", 325, "250 g", IMG["masala_tea"],
      "Assam tea with whole spices.", "Strong Assam leaf tea blended with cardamom, cinnamon, dried ginger, cloves and black pepper. Simmer with milk for a proper masala chai.",
      "Black tea, cardamom, cinnamon, ginger, cloves, black pepper.", N("0 kcal"), TE, [VG, GF], disc=10, region="Odisha", shelf="18 months from packing", recipes=["tulasi-chaha"]),
    P("organic-darjeeling-tea", "Organic Darjeeling Tea", "organic-tea", "Darjeeling Tea", 495, "200 g", IMG["darjeeling_tea"],
      "Muscatel whole-leaf Darjeeling.", "Second-flush Darjeeling with a bright, muscatel character. Brew without milk at 90°C for 3 minutes.",
      "100% Darjeeling black tea.", N("0 kcal"), TE, [VG, GF], disc=5, new=True, farm=True, region="Odisha", shelf="18 months from packing", recipes=["tulasi-chaha"]),

    # ---------- NUTS ----------
    P("organic-almonds", "Organic Almonds", "organic-nuts", "Almonds", 595, "500 g", IMG["almonds"],
      "Crunchy raw California-style almonds.", "Plump, crunchy raw almonds — soak overnight for breakfast, or roast lightly for snacking and baking.",
      "100% raw almonds.", N("579 kcal", "21 g", "12 g", fat="50 g"), NU, [VG, GF, HP], offer=True, top=10, shelf="6 months from packing", recipes=["kanika", "chhena-poda", "mudhi-mishrana"]),
    P("organic-walnuts", "Organic Walnut Kernels", "organic-nuts", "Walnuts", 745, "500 g", IMG["walnuts"],
      "Kashmiri walnut halves.", "Fresh, light-coloured walnut kernels. Great in salads, oats, laddoos and baking.",
      "100% walnut kernels.", N("654 kcal", "15 g", "7 g", fat="65 g"), NU, [VG, GF], disc=10, farm=True, region="Odisha", shelf="6 months from packing", recipes=["chhena-poda", "mudhi-mishrana"]),
    P("organic-cashews", "Organic Cashews", "organic-nuts", "Cashews", 695, "500 g", IMG["cashews"],
      "Whole W320 cashews.", "Creamy whole cashews for snacking, kaju curry, payasam and dairy-free creams.",
      "100% whole cashew nuts.", N("553 kcal", "18 g", "3 g", fat="44 g"), NU, [VG, GF, HP], disc=10, farm=True, region="Odisha", shelf="6 months from packing", recipes=["kanika", "chuda-ghasa", "kodo-khechedi"]),
    P("organic-peanuts", "Organic Raw Peanuts", "organic-nuts", "Peanuts", 185, "1 kg", IMG["peanuts"],
      "Red-skin raw groundnuts.", "Raw peanuts with skin for chikki, chutney, poha and roasting at home.",
      "100% raw peanuts.", N("567 kcal", "26 g", "9 g", fat="49 g"), NU, [VG, GF, HP], disc=12, farm=True, region="Odisha", recipes=["palli-chatani", "mudhi-mishrana"], shelf="6 months from packing"),

    # ---------- FLOURS ----------
    P("organic-ragi-flour", "Organic Ragi Flour", "organic-flours", "Ragi Flour", 185, "1 kg", IMG["ragi_flour"],
      "Stone-ground finger millet flour.", "Finely milled ragi for soft rotis, dosas, mudde and porridge. Naturally gluten-free and deeply nourishing in everyday Indian cooking.",
      "100% finger millet (ragi).", N("328 kcal", "7 g", "11 g"), FL, [VG, GF, HF], offer=True, top=2, farm=True, region="Odisha", recipes=["mandia-manda", "mandia-ambili"], shelf="6 months from packing"),
    P("organic-jowar-flour", "Organic Jowar Flour", "organic-flours", "Jowar Flour", 125, "1 kg", IMG["jowar_flour"],
      "Soft sorghum flour for bhakri.", "Freshly milled jowar flour for soft bhakri and rotis. Knead with warm water for the best pliability.",
      "100% sorghum (jowar).", N("349 kcal", "10 g", "10 g"), FL, [VG, GF, HF], disc=10, farm=True, region="Odisha", recipes=["mandia-manda", "arisa-pitha"], shelf="6 months from packing"),
    P("organic-bajra-flour", "Organic Bajra Flour", "organic-flours", "Bajra Flour", 120, "1 kg", IMG["bajra_flour"],
      "Pearl millet flour for winter rotis.", "Stone-ground bajra flour for hearty winter rotis, thepla and bajra khichdi thickening.",
      "100% pearl millet (bajra).", N("347 kcal", "11 g", "11 g"), FL, [VG, GF, HF], disc=10, farm=True, region="Odisha", recipes=["mandia-manda", "arisa-pitha"], shelf="4 months from packing"),
    P("organic-besan", "Organic Besan (Gram Flour)", "organic-flours", "Besan", 160, "1 kg", IMG["besan"],
      "Fine chana dal flour.", "Finely milled besan for chilla, pakoda, kadhi and laddoos. Sift before use for a lump-free batter.",
      "100% Bengal gram (chana dal).", N("387 kcal", "22 g", "11 g"), FL, [VG, GF, HP], disc=10, region="Odisha", recipes=["kadali-manja-bara"], shelf="6 months from packing"),
    P("organic-multigrain-flour", "Organic Multigrain Atta", "organic-flours", "Multigrain Flour", 210, "1 kg", IMG["multigrain_flour"],
      "Seven-grain atta for everyday rotis.", "Wheat blended with jowar, bajra, ragi, chana, oats and soy for softer, more wholesome everyday rotis.",
      "Wheat, jowar, bajra, ragi, chana dal, oats, soybean.", N("340 kcal", "13 g", "9 g"), FL, [VG, HF, HP], disc=10, shelf="4 months from packing", recipes=["kadali-manja-bara", "mandia-manda"]),
    P("organic-buckwheat-flour", "Organic Buckwheat Flour (Kuttu)", "organic-flours", "Buckwheat Flour", 225, "500 g", IMG["buckwheat_flour"],
      "Kuttu atta for vrat puris and pancakes.", "Nutty buckwheat flour for fasting-day puris, pakodas and savoury pancakes.",
      "100% buckwheat (kuttu).", N("335 kcal", "13 g", "10 g"), FL, [VG, GF, HF], disc=5, new=True, region="Odisha", shelf="4 months from packing", recipes=["kakara-pitha", "arisa-pitha"]),

    # ---------- BREAKFAST ----------
    P("organic-rolled-oats", "Organic Rolled Oats", "organic-breakfast", "Rolled Oats", 245, "1 kg", IMG["rolled_oats"],
      "Thick-cut rolled oats, no additives.", "Wholegrain rolled oats for porridge, overnight oats, granola and savoury oats upma.",
      "100% rolled oats.", N("389 kcal", "17 g", "11 g"), BM, [VG, HF, HP], offer=True, top=9, recipes=["chuda-ghasa", "mudhi-mishrana"]),
    P("organic-millet-dalia", "Organic Millet Dalia", "organic-breakfast", "Millet Dalia", 185, "500 g", IMG["millet_dalia"],
      "Cracked multi-millet dalia.", "Coarsely cracked foxtail, little and kodo millet for a quick savoury dalia or sweet porridge.",
      "Foxtail millet, little millet, kodo millet.", N("340 kcal", "10 g", "9 g"), BM, [VG, GF, HF], disc=10, recipes=["kodo-khechedi", "mandia-ambili"]),
    P("organic-ragi-porridge-mix", "Organic Ragi Porridge Mix", "organic-breakfast", "Ragi Porridge", 195, "500 g", IMG["ragi_porridge"],
      "Sprouted ragi porridge, no added sugar.", "Sprouted and roasted ragi with a touch of cardamom — whisk into milk or water for a 5-minute porridge. No added sugar.",
      "Sprouted finger millet, cardamom.", N("330 kcal", "8 g", "11 g"), BM, [VG, GF, HF, NS], disc=10, farm=True, region="Odisha", recipes=["mandia-ambili", "mandia-manda"]),
    P("organic-muesli", "Organic Nut & Seed Muesli", "organic-breakfast", "Muesli", 345, "500 g", IMG["muesli"],
      "Oats, almonds, seeds and raisins.", "Toasted oats and millet flakes with almonds, pumpkin seeds, flax and raisins. Sweetened only with jaggery.",
      "Oats, millet flakes, almonds, pumpkin seeds, flax, raisins, jaggery.", N("410 kcal", "12 g", "9 g"), BM, [VG, HF], disc=10, recipes=["chuda-ghasa", "mudhi-mishrana"]),
    P("organic-poha", "Organic Thick Poha", "organic-breakfast", "Poha", 95, "500 g", IMG["poha"],
      "Thick flattened rice for kanda poha.", "Thick-cut poha that stays fluffy after rinsing — for kanda poha, chivda and poha cutlets.",
      "100% flattened rice.", N("346 kcal", "7 g", "2 g"), BM, [VG, GF], disc=10, region="Odisha", recipes=["chuda-kadali", "chuda-ghasa"]),
    P("organic-sattu", "Organic Chana Sattu", "organic-breakfast", "Sattu", 150, "500 g", IMG["sattu"],
      "Roasted gram flour for drinks and parathas.", "Stone-ground roasted chana sattu — stir into cold water with lemon and jeera for a cooling drink, or stuff into parathas.",
      "100% roasted Bengal gram.", N("406 kcal", "20 g", "18 g"), BM, [VG, GF, HP, HF], disc=10, farm=True, region="Odisha", recipes=["chatua-pana"]),

    # ---------- SNACKS ----------
    P("organic-ragi-cookies", "Organic Ragi Cookies", "healthy-snacks", "Ragi Cookies", 165, "200 g", IMG["ragi_cookies"],
      "Jaggery-sweetened finger millet cookies.", "Crisp ragi cookies sweetened with jaggery and baked with cold-pressed oil. No maida, no refined sugar.",
      "Ragi flour, jaggery, cold-pressed oil, cardamom.", N("450 kcal", "7 g", "6 g"), SN, [VG, GF], offer=True, top=11, recipes=["mandia-manda", "chuda-ghasa"], shelf="4 months from packing"),
    P("organic-millet-cookies", "Organic Multi-Millet Cookies", "healthy-snacks", "Millet Cookies", 165, "200 g", IMG["millet_cookies"],
      "Jowar, bajra and foxtail cookies.", "Golden cookies made from a blend of millets with seeds on top. Lightly sweet, perfectly dunkable.",
      "Jowar, bajra, foxtail millet flour, jaggery, seeds, cold-pressed oil.", N("455 kcal", "8 g", "6 g"), SN, [VG, GF], disc=10, shelf="4 months from packing", recipes=["mandia-manda", "chuda-ghasa"]),
    P("organic-roasted-makhana", "Organic Roasted Makhana", "healthy-snacks", "Roasted Makhana", 245, "200 g", IMG["makhana"],
      "Lightly salted fox nuts.", "Fox nuts roasted in a little ghee and sea salt — light, crunchy and satisfying.",
      "Fox nuts (makhana), ghee, sea salt.", N("350 kcal", "9 g", "14 g"), SN, [GF], disc=10, farm=True, region="Odisha", shelf="4 months from packing", recipes=["mudhi-mishrana", "chuda-ghasa"]),
    P("organic-roasted-chana", "Organic Roasted Chana", "healthy-snacks", "Roasted Chana", 120, "400 g", IMG["roasted_chana"],
      "Crunchy roasted Bengal gram.", "Dry-roasted chana with a pinch of salt — a protein-packed snack for the 4pm slump.",
      "Roasted Bengal gram, salt.", N("369 kcal", "22 g", "17 g"), SN, [VG, GF, HP, HF], disc=12, region="Odisha", shelf="6 months from packing", recipes=["mudhi-mishrana", "palli-chatani"]),
    P("organic-seed-mix", "Organic Roasted Seed Mix", "healthy-snacks", "Seed Mix", 275, "250 g", IMG["seed_mix"],
      "Five-seed roasted mix.", "Pumpkin, sunflower, flax, white sesame and watermelon seeds, lightly roasted. Sprinkle on everything.",
      "Pumpkin, sunflower, flax, sesame, watermelon seeds.", N("560 kcal", "26 g", "9 g"), SN, [VG, GF, HP], disc=10, recipes=["mudhi-mishrana", "chuda-ghasa"], shelf="4 months from packing"),
    P("organic-millet-puffs", "Organic Millet Puffs", "healthy-snacks", "Millet Puffs", 110, "150 g", IMG["millet_puffs"],
      "Light, airy puffed jowar and bajra.", "Puffed millets with a touch of rock salt — a light snack or a crunchy chaat base.",
      "Puffed jowar, puffed bajra, rock salt.", N("360 kcal", "9 g", "7 g"), SN, [VG, GF], disc=10, new=True, shelf="4 months from packing", recipes=["mudhi-mishrana"]),

    # ---------- COCONUT ----------
    P("organic-desiccated-coconut", "Organic Desiccated Coconut", "coconut-products", "Desiccated Coconut", 175, "250 g", IMG["desiccated_coconut"],
      "Fine unsweetened coconut.", "Finely grated, unsweetened dried coconut for laddoos, chutneys, curries and baking.",
      "100% desiccated coconut.", N("660 kcal", "7 g", "16 g", fat="65 g"), CO, [VG, GF], disc=10, farm=True, region="Odisha", shelf="9 months from packing", recipes=["nadia-ladoo", "podo-pitha", "til-nadia-ladoo"]),
    P("organic-coconut-flour", "Organic Coconut Flour", "coconut-products", "Coconut Flour", 265, "400 g", IMG["coconut_flour"],
      "Gluten-free, high-fibre baking flour.", "Fine coconut flour for gluten-free pancakes, cakes and thickening gravies. Very absorbent — use less than wheat flour.",
      "100% coconut flour.", N("400 kcal", "18 g", "38 g"), CO, [VG, GF, HF], disc=8, shelf="9 months from packing", recipes=["kakara-pitha", "nadia-ladoo"]),
    P("organic-coconut-chips", "Organic Toasted Coconut Chips", "coconut-products", "Coconut Chips", 195, "150 g", IMG["coconut_chips"],
      "Golden toasted coconut slices.", "Thin coconut slices toasted till golden with a hint of jaggery. Eat straight from the pack or over porridge.",
      "Coconut, jaggery.", N("590 kcal", "6 g", "14 g"), CO, [VG, GF], disc=5, new=True, shelf="6 months from packing", recipes=["chuda-kadali", "mudhi-mishrana"]),

    # ---------- MASALA BLENDS ----------
    P("organic-garam-masala", "Organic Garam Masala", "masala-blends", "Garam Masala", 165, "100 g", IMG["garam_masala"],
      "Twelve-spice small-batch blend.", "Whole spices slow-roasted and ground in small batches — cardamom, cinnamon, cloves, pepper, cumin, coriander and more.",
      "Coriander, cumin, black pepper, cinnamon, cardamom, cloves, bay leaf, nutmeg, mace, fennel, star anise, dried ginger.", N("330 kcal", "13 g"), MB, [VG, GF], offer=True, top=12, recipes=["kanika", "ghuguni", "kodo-khechedi"]),
    P("organic-sambar-powder", "Organic Sambar Powder", "masala-blends", "Sambar Powder", 145, "200 g", IMG["sambar_powder"],
      "Tamil-style roasted sambar podi.", "Red chillies, coriander, dals and fenugreek roasted and ground the Tamil way for a fragrant, balanced sambar.",
      "Coriander, red chilli, toor dal, chana dal, fenugreek, cumin, black pepper, turmeric, curry leaves.", N("340 kcal", "14 g"), MB, [VG, GF], disc=10, region="Odisha", recipes=["dalma", "ghuguni"]),
    P("organic-chana-masala", "Organic Chana Masala", "masala-blends", "Chana Masala", 135, "100 g", IMG["chana_masala"],
      "Tangy Punjabi chole masala.", "A tangy, dark blend with dried pomegranate seeds, black salt and roasted spices for proper Punjabi chole.",
      "Coriander, cumin, dried pomegranate, black salt, dried mango, red chilli, black pepper, cinnamon, cloves.", N("320 kcal", "12 g"), MB, [VG, GF], disc=10, recipes=["ghuguni", "chenchudi"]),
    P("organic-chaat-masala", "Organic Chaat Masala", "masala-blends", "Chaat Masala", 115, "100 g", IMG["chaat_masala"],
      "Zesty sprinkle for fruits, salads and chaat.", "Dried mango, black salt, roasted cumin and pepper — the tangy sprinkle every chaat, sprout salad and lemonade needs.",
      "Dried mango, black salt, cumin, coriander, black pepper, dried ginger, ajwain, red chilli.", N("290 kcal", "10 g"), MB, [VG, GF], disc=12, recipes=["mudhi-mishrana", "palli-chatani"]),

    # ---------- WELLNESS ----------
    P("organic-moringa-powder", "Organic Moringa Leaf Powder", "wellness-foods", "Moringa Powder", 295, "200 g", IMG["moringa"],
      "Shade-dried drumstick leaf powder.", "Moringa leaves shade-dried and ground to a deep green powder. Stir a teaspoon into smoothies, dal or chutney for a mild, spinach-like flavour.",
      "100% moringa (drumstick) leaf powder.", N("205 kcal", "27 g", "19 g"), WP, [VG, GF], offer=True, farm=True, region="Odisha", recipes=["moringa-rasa", "chenchudi"]),
    P("organic-amla-powder", "Organic Amla Powder", "wellness-foods", "Amla Powder", 195, "200 g", IMG["amla"],
      "Sun-dried Indian gooseberry powder.", "Tart amla fruit dried and ground. Traditionally taken with warm water, mixed into chutneys or used in hair-care packs.",
      "100% amla (Indian gooseberry) powder.", N("300 kcal", "4 g", "22 g"), WP, [VG, GF], disc=10, farm=True, region="Odisha", recipes=["amla-chatani", "chatua-pana", "tomato-khata"]),
    P("organic-wheatgrass-powder", "Organic Wheatgrass Powder", "wellness-foods", "Wheatgrass Powder", 345, "200 g", IMG["wheatgrass"],
      "Young wheatgrass, low-temperature dried.", "Tender wheatgrass harvested young and dried gently to keep its bright colour. Blend into juices and smoothies.",
      "100% wheatgrass powder.", N("312 kcal", "25 g", "29 g"), WP, [VG, GF], disc=5, new=True, recipes=["moringa-rasa", "chatua-pana"]),
    P("organic-ashwagandha-powder", "Organic Ashwagandha Root Powder", "wellness-foods", "Ashwagandha Powder", 325, "200 g", IMG["ashwagandha"],
      "Traditional root powder for warm milk.", "Finely ground ashwagandha root, traditionally stirred into warm milk with a little jaggery before bed.",
      "100% ashwagandha root powder.", N("245 kcal", "4 g", "32 g"), WP, [VG, GF], disc=5, region="Odisha", recipes=["ashwa-pana"]),
]

# ---------- COMBO BOXES: price = sum of member prices less bundle % (computed, never hand-typed) ----------
COMBOS = [
    ("millet-starter-box", "Millet Starter Box", "combo_millet_starter", 15, [("organic-ragi-whole", 1), ("organic-foxtail-millet", 1), ("organic-kodo-millet", 1), ("organic-jowar-flour", 1)],
     "Four everyday millets to start your switch.", "Everything you need to start cooking with millets — whole ragi, foxtail, kodo and soft jowar flour. Enough for a fortnight of rotis, pulao and khichdi.", ["kodo-khechedi", "mandia-manda"]),
    ("super-seeds-box", "Super Seeds Box", "combo_super_seeds", 15, [("organic-chia-seeds", 1), ("organic-flax-seeds", 1), ("organic-pumpkin-seeds", 1), ("organic-sunflower-seeds", 1), ("organic-white-sesame-seeds", 1)],
     "Five seeds for bowls, rotis and snacking.", "Chia, flax, pumpkin, sunflower and white sesame — a seed pantry in one box. Sprinkle, soak, roast or grind.", ["til-nadia-ladoo", "mudhi-mishrana"]),
    ("healthy-breakfast-box", "Healthy Breakfast Box", "combo_breakfast_box", 18, [("organic-rolled-oats", 1), ("organic-millet-dalia", 1), ("organic-ragi-porridge-mix", 1), ("organic-jaggery-powder", 1), ("organic-seed-mix", 1)],
     "A week of wholesome mornings, sorted.", "Rolled oats, millet dalia, sprouted ragi porridge mix, jaggery powder and a roasted seed mix — rotate them through the week for breakfast without the rush.", ["mandia-ambili", "chuda-ghasa", "mudhi-mishrana"]),
    ("organic-kitchen-essentials", "Organic Kitchen Essentials", "combo_kitchen_essentials", 12, [("organic-turmeric-powder", 1), ("organic-cumin-seeds", 1), ("organic-coriander-powder", 1), ("cold-pressed-mustard-oil", 1), ("organic-moong-dal", 1)],
     "The five things every Indian kitchen opens daily.", "Turmeric, whole cumin, coriander powder, cold-pressed mustard oil and moong dal — restock the essentials in one go and save.", ["dalma", "khechedi", "ghuguni"]),
]

# ---------- SEEDED TODAY'S DEALS (admin can reshuffle / hide / reprice from Admin Studio) ----------
DEALS = [
    ("cold-pressed-sesame-oil", 25, "Today Only", None, True),
    ("organic-multigrain-flour", 30, "Flash Deal", None, True),
    ("organic-roasted-makhana", 35, "Limited Stock", 25, True),
    ("organic-cashews", 20, "Weekend Deal", None, False),  # hidden → shows in Shop at its normal price
]


def build_products() -> list[dict]:
    products = [dict(p) for p in SINGLES]
    by_slug = {p["slug"]: p for p in products}
    for order, (slug, pct, badge, stock, visible) in enumerate(DEALS, start=1):
        p = by_slug[slug]
        p.update({"is_todays_deal": True, "deal_visible": visible, "deal_order": order, "deal_discount": pct,
                  "deal_price": price_from_mrp(p["mrp"], pct), "deal_badge": badge, "deal_stock": stock})
    for slug, name, img, pct, items, short, desc, recipes in COMBOS:
        members = [{**by_slug[s], "qty": q} for s, q in items]
        pr = combo_pricing(members, pct)
        rating, count = _rating(slug)
        products.append({
            "slug": slug, "sku": f"AN-CMB-{len([x for x in products if x['is_combo']]) + 1:03d}", "name": name,
            "category": "combos", "subcategory": "Combo Box", "brand": BRAND, "price": pr["combo_price"], "mrp": pr["items_total"],
            "pack_size": f"{len(items)} products", "net_quantity": ", ".join(f"{by_slug[s]['name']} ({by_slug[s]['pack_size']})" for s, _ in items),
            "weight": sum(by_slug[s]["weight"] for s, _ in items), "unit": "g", "stock": 40, "image": IMG[img], "images": [IMG[img]],
            "short_description": short, "description": desc,
            "ingredients": "; ".join(f"{by_slug[s]['name']} — {by_slug[s]['ingredients']}" for s, _ in items),
            "nutrition": [{"label": "Items", "value": f"{len(items)} products"}, {"label": "You save", "value": f"₹{pr['savings']}"}],
            "storage": "Store each pouch in an airtight container in a cool, dry place.", "shelf_life": "See individual products",
            "country_of_origin": "India", "origin": "Sourced from organic farms in Odisha and packed in India.", "origin_region": None,
            "organic_status": False, "certification": "", "certification_number": "", "fssai_number": FSSAI_PLACEHOLDER, "manufacturer": MFG_PLACEHOLDER,
            "farmer_connected": False, "product_type": "Combo Box", "dietary": sorted(set.intersection(*[set(by_slug[s]["dietary"]) for s, _ in items])),
            "rating": None, "rating_count": 0, "is_new": False, "featured": False, "top_seller_rank": None, "sales_count": 60 + (count % 90),
            "is_combo": True, "combo_items": [{"slug": s, "qty": q} for s, q in items], "combo_discount_pct": pct,
            "variant_group": slug, "variant_primary": True,
            "is_todays_deal": False, "deal_visible": False, "deal_order": 0, "deal_price": None, "deal_discount": 0,
            "deal_start_at": None, "deal_end_at": None, "deal_badge": "", "deal_stock": None,
            "badges": ["Combo Box", "Made in India"], "recipe_slugs": recipes, "campaign_slug": None,
            "seo_title": f"{name} | Combo Box at AaharNest", "seo_description": f"{short} Save ₹{pr['savings']} vs buying separately.",
            "search_keywords": f"{name.lower()}, combo, bundle, gift box, " + ", ".join(by_slug[s]["name"].lower() for s, _ in items),
        })
    # pack-size siblings last, so they never affect combo SKU numbering or deal ordering
    for base in list(by_slug.values()):
        products.extend(_variant_siblings(base))
    return products


# ---------- PACK-SIZE VARIANTS: extra sizes become sibling products sharing a variant_group ----------
# Only the primary variant appears in listings; the product page switches between siblings in place.
# (slug, [(pack_size, weight_multiplier_vs_base, bulk_discount_on_unit_price)])
VARIANTS = {
    "organic-ragi-whole": [("500 g", 0.5, 0), ("2 kg", 2, 6)],
    "organic-foxtail-millet": [("250 g", 0.5, 0), ("1 kg", 2, 6)],
    "organic-bajra": [("500 g", 0.5, 0), ("5 kg", 5, 10)],
    "organic-jowar": [("500 g", 0.5, 0), ("5 kg", 5, 10)],
    "organic-moong-dal": [("500 g", 0.5, 0), ("2 kg", 2, 6)],
    "organic-toor-dal": [("500 g", 0.5, 0), ("2 kg", 2, 6)],
    "organic-chia-seeds": [("100 g", 0.4, 0), ("500 g", 2, 8)],
    "organic-turmeric-powder": [("100 g", 0.5, 0), ("500 g", 2.5, 8)],
    "organic-ragi-flour": [("500 g", 0.5, 0), ("2 kg", 2, 6)],
    "organic-rolled-oats": [("500 g", 0.5, 0), ("2 kg", 2, 6)],
    "cold-pressed-mustard-oil": [("500 ml", 0.5, 0), ("2 L", 2, 7)],
    "cold-pressed-coconut-oil": [("1 L", 2, 7)],
    "organic-almonds": [("250 g", 0.5, 0), ("1 kg", 2, 8)],
    "organic-cashews": [("250 g", 0.5, 0)],
}


def _variant_siblings(base: dict) -> list[dict]:
    """Build sibling products for each extra pack size, priced from the base unit price."""
    out = []
    specs = VARIANTS.get(base["slug"], [])
    base_weight = base["weight"] or 1
    base_disc = discount_pct(base["mrp"], base["price"])
    for idx, (pack, mult, bulk) in enumerate(specs, start=1):
        mrp = int(round(base["mrp"] * mult * (100 - bulk) / 100 / 5) * 5)
        price = price_from_mrp(mrp, base_disc)
        suffix = pack.lower().replace(" ", "")
        out.append({
            **base,
            "slug": f"{base['slug']}-{suffix}",
            "sku": f"{base['sku']}-{suffix.upper()}",
            "name": base["name"],
            "pack_size": pack, "net_quantity": pack,
            "weight": int(round(base_weight * mult)),
            "mrp": mrp, "price": price,
            "stock": max(12, int(base["stock"]) - idx * 7),
            "variant_group": base["slug"], "variant_primary": False,
            # curation + deals belong to the primary variant only
            "featured": False, "top_seller_rank": None, "is_new": False,
            "is_todays_deal": False, "deal_visible": False, "deal_order": 0, "deal_price": None,
            "deal_discount": 0, "deal_badge": "", "deal_stock": None,
            "seo_title": f"{base['name']} ({pack}) | Buy Online at AaharNest",
        })
    return out


CAMPAIGN = {
    "campaign_id": LAUNCH, "campaign_slug": LAUNCH, "campaign_name": "AaharNest Launch Offer",
    "description": "Good Food. Better Prices. Flat 20% off a curated set of organic staples — the same price everywhere on the site.",
    "banner_image": IMG["turmeric"], "discount_type": "percentage", "discount_value": CAMPAIGN_PCT,
    "cta_text": "Shop the 20% Offer", "status": "active", "theme": "launch", "emoji": "🌾",
    "max_discount_label": f"flat {CAMPAIGN_PCT}% OFF",
}


def _recipe(slug, title, cat, minutes, img, summary, prep, cook, servings, difficulty, ingredients, steps, nutrition, notes, tags, alt):
    return {"slug": slug, "kind": "recipe", "title": title, "summary": summary, "category": cat, "date": "1 June 2026", "minutes": minutes,
            "image": img, "imageAlt": alt, "author": "AaharNest Kitchen", "prep": prep, "cook": cook, "total": f"{minutes} min",
            "servings": servings, "difficulty": difficulty, "ingredients": ingredients, "steps": steps,
            "nutrition": [{"label": k, "value": v} for k, v in nutrition], "notes": notes, "tags": tags,
            "popular": True, "easy": difficulty == "Easy", "indian": True,
            "sections": [{"type": "p", "text": summary}]}


EXTRA_RECIPES = [
    _recipe("ragi-dosa", "Ragi Dosa", "Breakfast", 25, IMG["r_ragi_dosa"],
            "A crisp, lacy finger-millet dosa made with an instant batter — no fermentation needed. Serve with coconut chutney and sambar.",
            "10 min", "15 min", "3", "Easy",
            ["1 cup ragi flour", "¼ cup rice flour", "¼ cup curd", "1 green chilli, chopped", "1 tsp cumin", "A few curry leaves", "Salt", "1¾ cups water", "Oil for the tawa"],
            ["Whisk ragi flour, rice flour, curd, salt and water into a thin, pourable batter. Rest 10 minutes.", "Stir in chilli, cumin and curry leaves.",
             "Heat a tawa, pour the batter from the edges inward in a lacy pattern, drizzle oil.", "Cook on medium-high until crisp and the edges lift. Fold and serve hot."],
            [("Energy", "210 kcal"), ("Protein", "5 g"), ("Fibre", "6 g"), ("Carbs", "38 g")],
            "A thin batter is the secret to crispness. Add finely chopped onion for a rava-dosa feel.", ["ragi", "millet", "breakfast", "gluten-free", "dosa"], "Crisp brown ragi dosa with coconut chutney and sambar"),
    _recipe("millet-khichdi", "Millet Khichdi", "Dinner", 35, "/images/khichdi.webp",
            "A comforting one-pot khichdi with kodo millet and moong dal, finished with a cumin-ghee tadka. Light enough for a weeknight dinner.",
            "10 min", "25 min", "3", "Easy",
            ["¾ cup kodo millet", "½ cup moong dal", "1 tsp cumin", "½ tsp turmeric", "1 small onion", "1 tomato", "1 cup mixed vegetables", "1 tbsp ghee", "Salt", "4 cups water"],
            ["Rinse millet and dal, soak 15 minutes.", "Heat ghee, splutter cumin, sauté onion till soft. Add tomato, turmeric and vegetables.",
             "Add millet, dal, salt and water. Pressure-cook 3 whistles (or simmer 25 minutes covered).", "Rest 5 minutes, fluff, finish with a spoon of ghee and serve with curd."],
            [("Energy", "320 kcal"), ("Protein", "12 g"), ("Fibre", "9 g"), ("Carbs", "55 g")],
            "Any millet works here — foxtail or little millet give a softer texture.", ["millet", "khichdi", "dinner", "one-pot"], "Bowl of millet khichdi topped with ghee"),
    _recipe("foxtail-millet-upma", "Foxtail Millet Upma", "Breakfast", 25, "/images/dish-upma.webp",
            "Everyday upma made with foxtail millet instead of rava — fluffy, savoury and ready in under half an hour.",
            "10 min", "15 min", "2", "Easy",
            ["1 cup foxtail millet", "1 tsp mustard seeds", "1 tsp urad dal", "1 tbsp peanuts", "1 onion, chopped", "1 green chilli", "Curry leaves", "½ cup carrot & peas", "2 tsp oil", "Salt", "2 cups water", "Lemon"],
            ["Rinse millet well and drain.", "Heat oil; pop mustard, add urad dal, peanuts, curry leaves, chilli and onion. Sauté till soft.",
             "Add vegetables and millet; stir 2 minutes.", "Add hot water and salt, cover and cook on low 12–15 minutes till the water is absorbed. Rest, fluff, finish with lemon."],
            [("Energy", "290 kcal"), ("Protein", "9 g"), ("Fibre", "7 g"), ("Carbs", "50 g")],
            "Toast the rinsed millet dry for a minute before adding water for extra fluffiness.", ["millet", "upma", "breakfast", "gluten-free"], "Foxtail millet upma with vegetables"),
    _recipe("jowar-roti", "Jowar Roti (Bhakri)", "Lunch", 30, IMG["r_jowar_roti"],
            "Soft, gluten-free sorghum flatbreads patted by hand the Maharashtrian way. Pairs with any sabzi, pithla or a dollop of white butter.",
            "15 min", "15 min", "4", "Medium",
            ["2 cups jowar flour", "1 cup hot water", "Salt", "Extra flour for dusting"],
            ["Add salt to the flour, pour in hot water gradually and knead while warm into a smooth, soft dough.", "Divide into balls. Dust a board and pat each ball out with your palm, turning as you go.",
             "Cook on a hot tawa; brush water on top, flip when the underside is spotted.", "Press gently with a cloth or finish over an open flame so it puffs."],
            [("Energy", "170 kcal"), ("Protein", "5 g"), ("Fibre", "5 g"), ("Carbs", "35 g")],
            "Hot water is what makes jowar dough pliable. Roll between plastic sheets if patting feels tricky.", ["jowar", "roti", "lunch", "gluten-free"], "Stack of soft jowar rotis with sabzi"),
    _recipe("bajra-khichdi", "Bajra Khichdi", "Dinner", 45, IMG["r_bajra_khichdi"],
            "A warming Rajasthani winter khichdi of cracked pearl millet and moong dal, finished with ghee and cumin.",
            "15 min", "30 min", "3", "Easy",
            ["¾ cup bajra (soaked 6 hours)", "½ cup moong dal", "1 tsp cumin", "A pinch of asafoetida", "½ tsp turmeric", "1 tbsp ghee", "Salt", "4 cups water"],
            ["Drain soaked bajra and pulse briefly in a mixer to crack the grains.", "Pressure-cook bajra, dal, turmeric, salt and water for 4–5 whistles until soft and creamy.",
             "Heat ghee, splutter cumin and asafoetida, pour over the khichdi.", "Serve hot with curd, kadhi or a spoon of extra ghee."],
            [("Energy", "340 kcal"), ("Protein", "13 g"), ("Fibre", "10 g"), ("Carbs", "56 g")],
            "Soaking is essential — bajra is a hard grain. Overnight is even better.", ["bajra", "millet", "khichdi", "winter"], "Bajra khichdi with ghee and cumin tempering"),
    _recipe("millet-pulao", "Millet Vegetable Pulao", "Lunch", 35, IMG["r_millet_pulao"],
            "A fragrant pulao with foxtail millet, whole spices and seasonal vegetables — a lighter take on the lunchbox classic.",
            "15 min", "20 min", "3", "Easy",
            ["1 cup foxtail millet", "1 bay leaf", "2 cloves", "1 cinnamon stick", "1 tsp cumin", "1 onion, sliced", "1 cup carrot, beans, peas", "1 tsp ginger-garlic paste", "2 tsp oil or ghee", "Salt", "2 cups water", "Coriander & mint"],
            ["Rinse and soak millet 15 minutes.", "Heat oil, add whole spices and cumin, then onion; sauté golden. Add ginger-garlic paste and vegetables.",
             "Add drained millet, salt and water. Cover and cook on low 15 minutes.", "Rest 5 minutes, fluff with a fork and finish with herbs. Serve with raita."],
            [("Energy", "310 kcal"), ("Protein", "9 g"), ("Fibre", "7 g"), ("Carbs", "54 g")],
            "Keep the water ratio at 1:2 for separate, fluffy grains.", ["millet", "pulao", "lunch", "gluten-free"], "Millet vegetable pulao with raita"),
    _recipe("ragi-idli", "Ragi Idli", "Breakfast", 30, IMG["r_ragi_idli"],
            "Soft, spongy idlis with finger millet folded into a classic fermented batter — the same comfort, more wholegrain.",
            "15 min", "15 min", "4", "Medium",
            ["1 cup idli rice", "½ cup whole urad dal", "1 cup ragi flour", "½ tsp fenugreek seeds", "Salt"],
            ["Soak rice, urad dal and fenugreek separately for 6 hours; grind to a smooth batter.", "Whisk in ragi flour and salt; ferment 8–10 hours in a warm spot.",
             "Grease idli moulds, fill and steam 12–14 minutes.", "Rest 2 minutes, unmould and serve with coconut chutney and sambar."],
            [("Energy", "90 kcal"), ("Protein", "3 g"), ("Fibre", "3 g"), ("Carbs", "18 g")],
            "Add the ragi flour after grinding so the batter still rises well.", ["ragi", "idli", "breakfast", "fermented"], "Soft brown ragi idlis with chutney and sambar"),
    _recipe("moong-dal-chilla", "Moong Dal Chilla", "Breakfast", 25, "/images/dish-chilla.webp",
            "Golden, protein-rich savoury pancakes made from soaked yellow moong dal — a weekday breakfast that keeps you full till lunch.",
            "10 min", "15 min", "3", "Easy",
            ["1 cup moong dal (soaked 3 hours)", "1-inch ginger", "1 green chilli", "½ tsp cumin", "A pinch of asafoetida", "Salt", "Chopped onion, coriander", "Oil for the tawa"],
            ["Drain the dal and grind with ginger, chilli, cumin and a little water to a smooth, spreadable batter.", "Stir in salt, asafoetida, onion and coriander.",
             "Spread a ladle on a hot, lightly oiled tawa and cook till the edges turn golden; flip once.", "Serve with green chutney or curd."],
            [("Energy", "180 kcal"), ("Protein", "11 g"), ("Fibre", "6 g"), ("Carbs", "28 g")],
            "Fill with crumbled paneer or grated vegetables for a heartier version.", ["moong", "chilla", "breakfast", "high-protein"], "Golden moong dal chilla with chutney"),
    _recipe("oats-millet-breakfast-bowl", "Oats & Millet Breakfast Bowl", "Breakfast", 15, "/images/dish-oats.webp",
            "A warm porridge bowl of rolled oats and millet dalia sweetened with jaggery and topped with roasted seeds and nuts.",
            "5 min", "10 min", "2", "Easy",
            ["½ cup rolled oats", "¼ cup millet dalia", "1½ cups milk or water", "1 tbsp jaggery powder", "¼ tsp cardamom", "2 tbsp roasted seed mix", "A few almonds", "Seasonal fruit"],
            ["Simmer millet dalia in the liquid for 5 minutes.", "Add oats and cook another 4–5 minutes, stirring, till creamy.",
             "Stir in jaggery and cardamom.", "Top with seed mix, almonds and fruit."],
            [("Energy", "330 kcal"), ("Protein", "11 g"), ("Fibre", "8 g"), ("Carbs", "50 g")],
            "Make it overnight: soak oats and cooked dalia in curd with jaggery and chill.", ["oats", "millet", "porridge", "breakfast"], "Oats and millet porridge bowl with seeds"),
    _recipe("quinoa-khichdi", "Quinoa Khichdi", "Dinner", 30, IMG["r_quinoa_khichdi"],
            "A light, protein-rich khichdi with quinoa and moong dal, vegetables and a simple ghee-cumin tadka.",
            "10 min", "20 min", "3", "Easy",
            ["¾ cup quinoa (rinsed well)", "½ cup moong dal", "1 tsp cumin", "½ tsp turmeric", "1 cup carrot, peas, beans", "1 tsp ginger, grated", "1 tbsp ghee", "Salt", "3 cups water", "Lemon"],
            ["Heat ghee, splutter cumin, add ginger and vegetables; sauté 2 minutes.", "Add quinoa, dal, turmeric, salt and water.",
             "Pressure-cook 2 whistles or simmer covered 18–20 minutes.", "Rest, fluff, squeeze lemon and serve with curd."],
            [("Energy", "300 kcal"), ("Protein", "14 g"), ("Fibre", "8 g"), ("Carbs", "45 g")],
            "Rinse quinoa in a fine sieve until the water runs clear to remove bitterness.", ["quinoa", "khichdi", "dinner", "high-protein"], "Quinoa khichdi with vegetables and lemon"),
    _recipe("millet-pongal", "Millet Ven Pongal", "Breakfast", 35, IMG["r_millet_pongal"],
            "A creamy savoury pongal with little millet and moong dal, tempered with black pepper, cumin, cashews and curry leaves.",
            "10 min", "25 min", "3", "Easy",
            ["¾ cup little millet", "½ cup moong dal", "1 tsp whole black pepper", "1 tsp cumin", "1-inch ginger, chopped", "10 cashews", "Curry leaves", "A pinch of asafoetida", "2 tbsp ghee", "Salt", "4 cups water"],
            ["Dry-roast the dal till fragrant. Rinse with the millet.", "Pressure-cook millet, dal, salt and water for 3 whistles till soft and mashable.",
             "Heat ghee; fry cashews, then pepper, cumin, ginger, curry leaves and asafoetida.", "Pour the tadka over the pongal, mix well and serve with coconut chutney."],
            [("Energy", "350 kcal"), ("Protein", "12 g"), ("Fibre", "7 g"), ("Carbs", "52 g")],
            "Crush the pepper coarsely for bursts of heat.", ["millet", "pongal", "breakfast", "south-indian"], "Creamy millet pongal with pepper and cashew tempering"),
    _recipe("sattu-drink", "Healthy Sattu Drink", "Drinks", 5, IMG["r_sattu_drink"],
            "The Bihari summer cooler — roasted gram flour whisked into cold water with lemon, roasted cumin, black salt and mint.",
            "5 min", "0 min", "1", "Easy",
            ["3 tbsp chana sattu", "1 glass chilled water", "½ lemon", "¼ tsp roasted cumin powder", "A pinch of black salt", "Mint leaves", "Optional: 1 tsp jaggery powder for a sweet version"],
            ["Whisk sattu with a little water into a smooth paste so it does not lump.", "Top up with chilled water.",
             "Add lemon, cumin, black salt (or jaggery for a sweet version).", "Stir well, add mint and serve immediately."],
            [("Energy", "130 kcal"), ("Protein", "7 g"), ("Fibre", "5 g"), ("Carbs", "20 g")],
            "Sattu settles — give it a stir between sips.", ["sattu", "drink", "summer", "high-protein"], "Glass of sattu drink with lemon and mint"),
]

RECIPE_IMAGE_OVERRIDES = {"methi-thepla": IMG["r_methi_thepla"]}
REMOVED_RECIPES = ["chicken-cucumber-salad"]
