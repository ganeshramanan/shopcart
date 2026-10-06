"""Fetches a real photo URL for each item in the pharmacy sample catalog from
Wikipedia's public REST summary API. Reuses the wiki_term column already
present in the input CSV as the search term (more precise than name-guessing).
Falls back to a colored placeholder if no image is found.

Usage: python3 scripts/fetch_pharmacy_images.py
"""
import csv
import time
import urllib.request
import urllib.parse
import json

CATEGORY_COLORS = {
    "Pain Relief": "E63946", "Fever & Cold": "F4A261", "Antibiotics": "2A9D8F",
    "Digestive Care": "8D5A97", "Vitamins & Supplements": "F2C14E", "Diabetes Care": "5B7FBD",
    "Skin Care": "E8A0BF", "First Aid": "6C757D", "Baby Care": "70C1B3",
    "Personal Hygiene": "AF7AC5", "Ayurvedic": "6B8E23", "Medical Devices": "4A4E69",
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
                    thumb = thumb.split("?")[0]  # strip tracking params; keep working width
                return thumb
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None


def main():
    in_path = "sample_data/pharmacy_100_items.csv"
    out_path = "sample_data/pharmacy_100_items.csv"  # overwrite in place with images filled

    with open(in_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    found, fallback = 0, 0
    for row in rows:
        term = row.get("wiki_term") or row["Name"].split(" ")[0]
        thumb = fetch_thumbnail(term)
        if thumb:
            row["Image_URL"] = thumb
            found += 1
        else:
            color = CATEGORY_COLORS.get(row["Category"], "999999")
            encoded = urllib.parse.quote(row["Name"].replace(" ", "\n"))
            row["Image_URL"] = f"https://placehold.co/400x400/{color}/FFFFFF?text={encoded}&font=roboto"
            fallback += 1
        time.sleep(0.2)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Name", "Category", "Unit", "Price", "Image_URL", "requires_prescription", "wiki_term"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Done. Real photos found: {found}, fallback placeholders used: {fallback}")


if __name__ == "__main__":
    main()
