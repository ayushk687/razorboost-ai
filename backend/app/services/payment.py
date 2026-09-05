from datetime import datetime
import uuid

from app.services.razorpay_service import (
    create_razorpay_order,
    verify_razorpay_payment
)

payment_requests = {}


def create_payment_request(session_id: str, amount: float):
    if amount <= 0:
        return {
            "success": False,
            "message": "Payment amount must be greater than ₹0."
        }

    payment_request_id = str(uuid.uuid4())

    payment_request = {
        "id": payment_request_id,
        "session_id": session_id,
        "amount": amount,
        "currency": "INR",
        "status": "AWAITING_USER_CONFIRMATION",
        "created_at": datetime.utcnow().isoformat(),
        "message": "User confirmation required before payment."
    }

    payment_requests[payment_request_id] = payment_request

    return {
        "success": True,
        "payment_request": payment_request
    }


def get_payment_request(payment_request_id: str):
    return payment_requests.get(payment_request_id)


def approve_payment_request(payment_request_id: str):
    payment_request = payment_requests.get(payment_request_id)

    if not payment_request:
        return {
            "success": False,
            "message": "Payment request not found."
        }

    if payment_request["status"] != "AWAITING_USER_CONFIRMATION":
        return {
            "success": False,
            "message": "Payment request is not awaiting confirmation."
        }

    payment_request["status"] = "USER_APPROVED"
    payment_request["approved_at"] = datetime.utcnow().isoformat()

    receipt = f"rzb_{payment_request_id[:12]}"

    razorpay_result = create_razorpay_order(
        amount=payment_request["amount"],
        receipt=receipt
    )

    if not razorpay_result["success"]:
        payment_request["status"] = "RAZORPAY_ORDER_FAILED"
        payment_request["failure_reason"] = razorpay_result.get(
            "message",
            "Razorpay order creation failed."
        )

        return {
            "success": False,
            "payment_request": payment_request,
            "razorpay": razorpay_result
        }

    razorpay_order = razorpay_result["order"]

    payment_request["status"] = "RAZORPAY_ORDER_CREATED"
    payment_request["razorpay_order_id"] = razorpay_order["id"]
    payment_request["razorpay_order"] = razorpay_order

    return {
        "success": True,
        "message": "User approved payment and Razorpay Test Order was created.",
        "payment_request": payment_request,
        "razorpay": razorpay_result
    }


def verify_payment(
    payment_request_id: str,
    razorpay_payment_id: str,
    razorpay_order_id: str,
    razorpay_signature: str
):
    payment_request = payment_requests.get(payment_request_id)

    if not payment_request:
        return {
            "success": False,
            "message": "Payment request not found."
        }

    if payment_request.get("razorpay_order_id") != razorpay_order_id:
        return {
            "success": False,
            "message": "Razorpay order ID does not match."
        }

    verification = verify_razorpay_payment(
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature
    )

    if not verification["success"]:
        payment_request["status"] = "PAYMENT_VERIFICATION_FAILED"
        payment_request["failure_reason"] = verification["message"]

        return {
            "success": False,
            "message": verification["message"],
            "payment_request": payment_request
        }

    payment_request["status"] = "PAYMENT_VERIFIED"
    payment_request["payment_id"] = razorpay_payment_id
    payment_request["signature_verified"] = True
    payment_request["verified_at"] = datetime.utcnow().isoformat()

    return {
        "success": True,
        "message": "Payment signature verified successfully.",
        "payment_request": payment_request
    }


def cancel_payment_request(payment_request_id: str):
    payment_request = payment_requests.get(payment_request_id)

    if not payment_request:
        return {
            "success": False,
            "message": "Payment request not found."
        }

    if payment_request["status"] != "AWAITING_USER_CONFIRMATION":
        return {
            "success": False,
            "message": "Payment request cannot be cancelled."
        }

    payment_request["status"] = "CANCELLED"
    payment_request["cancelled_at"] = datetime.utcnow().isoformat()

    return {
        "success": True,
        "payment_request": payment_request,
        "message": "Payment request cancelled."
    }
