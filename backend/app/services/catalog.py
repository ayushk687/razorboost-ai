import json
from pathlib import Path


PRODUCT_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "products.json"


def load_products():
    with open(PRODUCT_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def get_all_products():
    return load_products()


def get_product(product_id: str):
    products = load_products()

    for product in products:
        if product["id"] == product_id:
            return product

    return None

def search_products(
    query: str | None = None,
    category: str | None = None,
    max_price: float | None = None
):
    products = load_products()

    if query:
        import re

        query_lower = query.lower()

        # -----------------------------
        # Detect price
        # -----------------------------

        price_match = re.search(
            r"(?:under|below|less than|upto|up to)\s*₹?\s*(\d+)",
            query_lower
        )

        if price_match:
            max_price = float(
                price_match.group(1)
            )

        # -----------------------------
        # Detect category
        # -----------------------------

        if (
            "running shoes" in query_lower
            or "running shoe" in query_lower
        ):
            category = "running_shoes"

    results = []

    for product in products:

        # Category filter
        if category:
            if product["category"].lower() != category.lower():
                continue

        # Price filter
        if max_price is not None:
            if product["price"] > max_price:
                continue

        # Only perform text search when
        # the query isn't a known intent phrase.
        if query:
            query_lower = query.lower()

            known_intent = (
                "running shoes" in query_lower
                or "running shoe" in query_lower
                or price_match is not None
            )

            if not known_intent:
                search_text = (
                    product["name"]
                    + " "
                    + product["description"]
                    + " "
                    + " ".join(product["features"])
                ).lower()

                if query_lower not in search_text:
                    continue

        results.append(product)

    return results
