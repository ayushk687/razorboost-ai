from app.services.catalog import get_product


# Temporary in-memory carts
carts = {}


def get_cart(session_id: str):
    return carts.get(session_id, [])


def add_to_cart(
    session_id: str,
    product_id: str,
    quantity: int = 1
):
    product = get_product(product_id)

    if not product:
        return {
            "success": False,
            "message": "Product not found"
        }

    if product["stock"] <= 0:
        return {
            "success": False,
            "message": "Product is out of stock"
        }

    if quantity < 1:
        return {
            "success": False,
            "message": "Quantity must be at least 1"
        }

    if quantity > 2:
        return {
            "success": False,
            "message": "Maximum quantity allowed is 2"
        }

    cart = carts.setdefault(session_id, [])

    # Check if product already exists in cart
    for item in cart:

        if item["product_id"] == product_id:

            new_quantity = item["quantity"] + quantity

            if new_quantity > 2:
                return {
                    "success": False,
                    "message": "Maximum quantity allowed is 2"
                }

            item["quantity"] = new_quantity

            return {
                "success": True,
                "cart": cart
            }

    # Add new product
    cart.append({
        "product_id": product_id,
        "name": product["name"],
        "price": product["price"],
        "quantity": quantity
    })

    return {
        "success": True,
        "cart": cart
    }


def calculate_cart(session_id: str):

    cart = get_cart(session_id)

    total = sum(
        item["price"] * item["quantity"]
        for item in cart
    )

    return {
        "session_id": session_id,
        "items": cart,
        "total": total,
        "currency": "INR"
    }