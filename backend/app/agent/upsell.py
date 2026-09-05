from app.services.catalog import get_product


UPSELL_MAP = {
    "shoe_001": ["sock_001", "bag_001"],
    "shoe_002": ["sock_001", "bottle_001"],
    "shoe_003": ["sock_001", "bottle_001"]
}


def recommend_upsell(product_id: str):

    product = get_product(product_id)

    if not product:
        return {
            "success": False,
            "message": "Product not found"
        }

    recommendations = []

    for recommended_id in UPSELL_MAP.get(product_id, []):

        item = get_product(recommended_id)

        if item and item["stock"] > 0:
            recommendations.append(item)

    return {
        "success": True,
        "base_product": product,
        "recommendations": recommendations
    }