"""Fetches a real product photo URL for each item in our sample catalog from
Wikipedia's public REST summary API (free, no API key, no rate-limit issues
for this volume). Falls back to the existing placehold.co colored placeholder
if no image is found for a given search term.

Usage: python3 scripts/fetch_real_images.py
Reads:  sample_data/provision_store_100_items.csv
Writes: sample_data/provision_store_100_items_with_photos.csv
"""
import csv
import time
import urllib.request
import urllib.parse
import json

# Map our item names to a good Wikipedia page title / search term.
# Using specific, well-known titles avoids ambiguous/wrong images.
SEARCH_TERMS = {
    "Basmati Rice": "Basmati", "Sona Masoori Rice": "Rice", "Idli Rice": "Rice",
    "Broken Wheat (Dalia)": "Bulgur", "Wheat Flour (Atta)": "Flour", "Maida (All Purpose Flour)": "Flour",
    "Rava (Semolina)": "Semolina", "Poha (Flattened Rice)": "Flattened_rice", "Vermicelli": "Vermicelli",
    "Ragi Flour": "Finger_millet", "Toor Dal": "Pigeon_pea", "Moong Dal": "Mung_bean",
    "Chana Dal": "Chickpea", "Urad Dal": "Vigna_mungo", "Masoor Dal": "Lentil",
    "Rajma (Kidney Beans)": "Kidney_bean", "Chickpeas (Kabuli Chana)": "Chickpea",
    "Green Peas (Dried)": "Pea", "Black Eyed Peas": "Black-eyed_pea", "Horse Gram": "Macrotyloma_uniflorum",
    "Sunflower Oil": "Sunflower_oil", "Groundnut Oil": "Peanut_oil", "Coconut Oil": "Coconut_oil",
    "Mustard Oil": "Mustard_oil", "Sesame Oil (Gingelly)": "Sesame_oil", "Olive Oil": "Olive_oil",
    "Vanaspati (Dalda)": "Vegetable_oil", "Ghee (Cow)": "Ghee",
    "Turmeric Powder": "Turmeric", "Red Chilli Powder": "Chili_powder", "Coriander Powder": "Coriander",
    "Cumin Seeds (Jeera)": "Cumin", "Mustard Seeds": "Mustard_seed", "Garam Masala": "Garam_masala",
    "Sambar Powder": "Sambar_(dish)", "Rasam Powder": "Rasam", "Black Pepper Whole": "Black_pepper",
    "Cardamom (Elaichi)": "Cardamom", "Cloves (Laung)": "Clove", "Cinnamon Stick": "Cinnamon",
    "Salt (Iodised)": "Salt",
    "Onion": "Onion", "Potato": "Potato", "Tomato": "Tomato", "Carrot": "Carrot", "Beans": "Green_bean",
    "Cabbage": "Cabbage", "Cauliflower": "Cauliflower", "Brinjal": "Eggplant",
    "Ladies Finger (Okra)": "Okra", "Green Chilli": "Chili_pepper", "Ginger": "Ginger", "Garlic": "Garlic",
    "Cucumber": "Cucumber", "Bottle Gourd": "Calabash", "Pumpkin": "Pumpkin", "Beetroot": "Beetroot",
    "Spinach (Palak)": "Spinach", "Coriander Leaves": "Coriander", "Mint Leaves": "Mentha",
    "Banana": "Banana", "Apple": "Apple", "Orange": "Orange_(fruit)", "Mango": "Mango",
    "Papaya": "Papaya", "Watermelon": "Watermelon", "Grapes": "Grape", "Pomegranate": "Pomegranate",
    "Guava": "Guava", "Pineapple": "Pineapple",
    "Milk (Full Cream)": "Milk", "Curd (Yogurt)": "Yogurt", "Paneer": "Paneer", "Butter": "Butter",
    "Cheese Slices": "Cheese", "Buttermilk": "Buttermilk", "Cream": "Cream",
    "Potato Chips": "Potato_chip", "Banana Chips": "Banana_chip", "Mixture": "Chevdo",
    "Murukku": "Murukku", "Biscuits (Glucose)": "Biscuit", "Cream Biscuits": "Biscuit",
    "Namkeen": "Namkeen", "Popcorn": "Popcorn",
    "Tea Powder": "Tea", "Coffee Powder": "Coffee", "Sugar": "Sugar", "Jaggery": "Jaggery",
    "Soft Drink (Cola)": "Cola", "Fruit Juice": "Juice", "Mineral Water": "Bottled_water",
    "Bread (White)": "White_bread", "Bread (Brown)": "Brown_bread", "Rusk": "Rusk", "Cake (Plain)": "Cake",
    "Detergent Powder": "Laundry_detergent", "Dish Wash Liquid": "Dishwashing_liquid",
    "Floor Cleaner": "Cleaning_agent", "Toilet Cleaner": "Cleaning_agent",
    "Soap (Bathing)": "Soap", "Shampoo": "Shampoo", "Toothpaste": "Toothpaste", "Hand Wash": "Hand_washing",
}

CATEGORY_COLORS = {
    "Grains and Rice": "8B5E3C", "Pulses and Dals": "C9A227", "Cooking Oil": "E8B923",
    "Spices and Masala": "D2691E", "Vegetables": "3CB043", "Fruits": "E4572E",
    "Dairy": "6C757D", "Snacks": "F4A300", "Beverages": "2E86AB", "Bakery": "C68E17",
    "Cleaning Supplies": "5DADE2", "Personal Care": "AF7AC5",
}


def fetch_thumbnail(title: str, retries: int = 3) -> str | None:
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "CartbiLearningProject/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.load(resp)
                thumb = data.get("thumbnail", {}).get("source")
                if thumb:
                    # Strip tracking query params; keep the original working width variant
                    # (resizing via /Npx- replacement is unreliable — not all widths exist)
                    thumb = thumb.split("?")[0]
                return thumb
        except Exception:
            time.sleep(1.5 * (attempt + 1))  # back off and retry — handles transient 429s
    return None


def main():
    in_path = "sample_data/provision_store_100_items.csv"
    out_path = "sample_data/provision_store_100_items_with_photos.csv"

    with open(in_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    found, fallback = 0, 0
    for row in rows:
        name = row["Name"]
        term = SEARCH_TERMS.get(name, name.split(" (")[0].replace(" ", "_"))
        thumb = fetch_thumbnail(term)
        if thumb:
            row["Image_URL"] = thumb
            found += 1
        else:
            color = CATEGORY_COLORS.get(row["Category"], "999999")
            encoded = urllib.parse.quote(name.replace(" ", "\n"))
            row["Image_URL"] = f"https://placehold.co/400x400/{color}/FFFFFF?text={encoded}&font=roboto"
            fallback += 1
        time.sleep(0.2)  # be polite to Wikipedia's API and avoid rate-limit fallbacks

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Name", "Category", "Unit", "Price", "Image_URL"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Done. Real photos found: {found}, fallback placeholders used: {fallback}")
    print(f"Output: {out_path}")


if __name__ == "__main__":
    main()
