import os

import razorpay
from dotenv import load_dotenv


load_dotenv()


RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")


if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
    raise RuntimeError(
        "Razorpay credentials are missing. "
        "Please configure RAZORPAY_KEY_ID and "
        "RAZORPAY_KEY_SECRET in .env"
    )


client = razorpay.Client(
    auth=(
        RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET
    )
)


def create_razorpay_order(
    amount: float,
    receipt: str
):
    """
    Create a Razorpay Test Mode order.

    Razorpay expects the amount in the smallest
    currency unit, so ₹3499 becomes 349900.
    """

    if amount <= 0:
        return {
            "success": False,
            "message": "Amount must be greater than ₹0."
        }

    amount_in_paise = int(round(amount * 100))

    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": receipt
    }

    try:
        order = client.order.create(
            data=order_data
        )

        return {
            "success": True,
            "order": order
        }

    except Exception as error:
        return {
            "success": False,
            "message": "Failed to create Razorpay order.",
            "error": str(error)
        }
def verify_razorpay_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str
):
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        })

        return {
            "success": True,
            "message": "Payment signature is valid."
        }

    except Exception:
        return {
            "success": False,
            "message": "Payment signature verification failed."
        }    