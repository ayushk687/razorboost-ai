MAX_ORDER_VALUE = 10000
MAX_QUANTITY_PER_PRODUCT = 2
MAX_DISCOUNT_PERCENT = 15


def check_quantity(quantity: int):
    if quantity < 1:
        return {
            "allowed": False,
            "reason": "Quantity must be at least 1."
        }

    if quantity > MAX_QUANTITY_PER_PRODUCT:
        return {
            "allowed": False,
            "reason": (
                f"Maximum quantity allowed is "
                f"{MAX_QUANTITY_PER_PRODUCT}."
            )
        }

    return {
        "allowed": True,
        "reason": "Quantity is within the allowed limit."
    }


def check_order_value(total: float):
    if total <= 0:
        return {
            "allowed": False,
            "reason": "Order value must be greater than ₹0."
        }

    if total > MAX_ORDER_VALUE:
        return {
            "allowed": False,
            "reason": (
                f"Order value ₹{total:,.0f} exceeds "
                f"the maximum allowed value of "
                f"₹{MAX_ORDER_VALUE:,.0f}."
            )
        }

    return {
        "allowed": True,
        "reason": (
            f"Order value ₹{total:,.0f} is within "
            f"the ₹{MAX_ORDER_VALUE:,.0f} limit."
        )
    }


def check_discount(discount_percent: float):
    if discount_percent < 0:
        return {
            "allowed": False,
            "reason": "Discount cannot be negative."
        }

    if discount_percent > MAX_DISCOUNT_PERCENT:
        return {
            "allowed": False,
            "reason": (
                f"Discount of {discount_percent}% exceeds "
                f"the maximum allowed discount of "
                f"{MAX_DISCOUNT_PERCENT}%."
            )
        }

    return {
        "allowed": True,
        "reason": (
            f"Discount of {discount_percent}% "
            "is within the allowed limit."
        )
    }


def check_product(product):
    if not product:
        return {
            "allowed": False,
            "reason": "Product does not exist."
        }

    if product.get("stock", 0) <= 0:
        return {
            "allowed": False,
            "reason": (
                f"{product.get('name', 'Product')} "
                "is currently out of stock."
            )
        }

    return {
        "allowed": True,
        "reason": (
            f"{product.get('name', 'Product')} "
            "is available."
        )
    }


def check_order(items, total):
    reasons = []

    if not items:
        return {
            "allowed": False,
            "reasons": ["Cart is empty."]
        }

    # Check each product
    for item in items:
        quantity_result = check_quantity(
            item.get("quantity", 0)
        )

        if not quantity_result["allowed"]:
            reasons.append(
                f"{item.get('name', 'Product')}: "
                f"{quantity_result['reason']}"
            )

    # Check total order value
    value_result = check_order_value(total)

    if not value_result["allowed"]:
        reasons.append(value_result["reason"])

    if reasons:
        return {
            "allowed": False,
            "reasons": reasons
        }

    return {
        "allowed": True,
        "reasons": [
            "All policy checks passed.",
            f"Order value ₹{total:,.0f} is within limit.",
            "All product quantities are within limits."
        ]
    }