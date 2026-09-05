from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.catalog import (
    get_all_products,
    get_product,
    search_products,
)

from app.agent.sales_agent import agent

from app.services.cart import (
    add_to_cart,
    calculate_cart,
)

from app.agent.upsell import (
    recommend_upsell,
)

from app.services.policy import (
    check_order,
    check_product,
    check_quantity,
    check_order_value,
    check_discount,
)

from app.services.payment import (
    create_payment_request,
    get_payment_request,
    approve_payment_request,
    cancel_payment_request,
    verify_payment,
)

from app.services.audit import (
    get_audit_logs,
    log_event,
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="RazorBoost AI",
    description="AI-powered merchant sales and commerce agent",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class AgentRequest(BaseModel):
    query: str
    category: str | None = None
    max_price: float | None = None


class CartRequest(BaseModel):
    session_id: str
    product_id: str
    quantity: int = 1


class CartCalculateRequest(BaseModel):
    session_id: str


class PaymentRequest(BaseModel):
    session_id: str
    amount: float
    total: float
    quantity: int


class PaymentApprovalRequest(BaseModel):
    payment_request_id: str


class PaymentCancelRequest(BaseModel):
    payment_request_id: str


class PaymentVerificationRequest(BaseModel):
    payment_request_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


# Independent policy model
class PolicyCheckRequest(BaseModel):
    session_id: str
    amount: float
    total: float
    quantity: int


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "success": True,
        "message": "RazorBoost AI backend is running.",
        "docs": "/docs",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    return {
        "success": True,
        "status": "healthy",
        "service": "razorboost-ai",
    }


# ============================================================
# CATALOG
# ============================================================

@app.get("/api/products")
def products():
    return {
        "success": True,
        "products": get_all_products(),
    }


@app.get("/api/products/{product_id}")
def product(product_id: str):
    result = get_product(product_id)

    if not result:
        return {
            "success": False,
            "message": "Product not found.",
        }

    return {
        "success": True,
        "product": result,
    }


# ============================================================
# AI PRODUCT SEARCH
# ============================================================

@app.post("/api/agent/search")
def agent_search(request: AgentRequest):

    products = agent.search(
        query=request.query,
        category=request.category,
        max_price=request.max_price,
    )

    recommendation = agent.recommend(products)

    # Audit search
    log_event(
        event_type="PRODUCT_SEARCH",
        session_id="demo-user-1",
        details={
            "query": request.query,
            "results_count": len(products),
        },
    )

    # Audit recommendation
    if recommendation.get("product"):

        log_event(
            event_type="PRODUCT_RECOMMENDED",
            session_id="demo-user-1",
            details={
                "product_id": recommendation["product"]["id"],
                "product_name": recommendation["product"]["name"],
                "reason": recommendation["reason"],
            },
        )

    return {
        "success": True,
        "query": request.query,
        "products": products,
        "recommendation": recommendation,
    }

@app.post("/api/agent/recommend")
def agent_recommend(request: AgentRequest):

    result = agent.recommend_for_query(
        query=request.query,
        category=request.category,
        max_price=request.max_price
    )

    if result["recommendation"].get("success"):
        log_event(
            event_type="PRODUCT_RECOMMENDED",
            details={
                "query": request.query,
                "product_id": result["recommendation"]["product"]["id"],
                "product_name": result["recommendation"]["product"]["name"],
                "reason": result["recommendation"]["reason"]
            }
        )

    return result

# ============================================================
# CART
# ============================================================

@app.post("/api/cart/add")
def cart_add(request: CartRequest):

    result = add_to_cart(
        request.session_id,
        request.product_id,
        request.quantity,
    )

    if result.get("success"):

        product = get_product(request.product_id)

        # Audit cart addition
        log_event(
            event_type="PRODUCT_ADDED",
            session_id=request.session_id,
            details={
                "product_id": request.product_id,
                "product_name": (
                    product["name"]
                    if product
                    else "Unknown"
                ),
                "quantity": request.quantity,
            },
        )

        # Generate upsell recommendations
        upsell = recommend_upsell(
            request.product_id
        )

        if (
            upsell.get("success")
            and upsell.get("recommendations")
        ):

            log_event(
                event_type="UPSELL_RECOMMENDED",
                session_id=request.session_id,
                details={
                    "base_product": (
                        product["name"]
                        if product
                        else "Unknown"
                    ),
                    "recommendations": [
                        item["name"]
                        for item in upsell[
                            "recommendations"
                        ]
                    ],
                },
            )

            result["upsell"] = upsell

    return result


@app.post("/api/cart/calculate")
def cart_calculate(
    request: CartCalculateRequest
):

    return {
        "success": True,
        "cart": calculate_cart(
            request.session_id
        ),
    }


# ============================================================
# POLICY ENGINE
# ============================================================

@app.post("/api/policy/check")
def policy_check(
    request: PolicyCheckRequest
):

    # --------------------------------------------------------
    # Amount validation
    # --------------------------------------------------------

    if request.amount <= 0:

        log_event(
            event_type="PAYMENT_BLOCKED",
            session_id=request.session_id,
            details={
                "amount": request.amount,
                "total": request.total,
                "quantity": request.quantity,
                "reason": "Payment amount must be greater than ₹0.",
            },
        )

        return {
            "success": True,
            "allowed": False,
            "amount": request.amount,
            "reason": "Payment amount must be greater than ₹0.",
        }

    # --------------------------------------------------------
    # Quantity validation
    # --------------------------------------------------------

    if request.quantity < 1:

        log_event(
            event_type="PAYMENT_BLOCKED",
            session_id=request.session_id,
            details={
                "amount": request.amount,
                "total": request.total,
                "quantity": request.quantity,
                "reason": "Quantity must be at least 1.",
            },
        )

        return {
            "success": True,
            "allowed": False,
            "amount": request.amount,
            "reason": "Quantity must be at least 1.",
        }

    # --------------------------------------------------------
    # Maximum quantity
    # --------------------------------------------------------

    if request.quantity > 2:

        log_event(
            event_type="PAYMENT_BLOCKED",
            session_id=request.session_id,
            details={
                "amount": request.amount,
                "total": request.total,
                "quantity": request.quantity,
                "reason": "Maximum quantity allowed is 2.",
            },
        )

        return {
            "success": True,
            "allowed": False,
            "amount": request.amount,
            "reason": "Maximum quantity allowed is 2.",
        }

    # --------------------------------------------------------
    # Maximum order value
    # --------------------------------------------------------

    if request.total > 10000:

        log_event(
            event_type="PAYMENT_BLOCKED",
            session_id=request.session_id,
            details={
                "amount": request.amount,
                "total": request.total,
                "quantity": request.quantity,
                "reason": "Order value exceeds ₹10,000.",
            },
        )

        return {
            "success": True,
            "allowed": False,
            "amount": request.amount,
            "reason": (
                f"Order value ₹{request.total:,.0f} "
                "exceeds the maximum allowed value "
                "of ₹10,000."
            ),
        }

    # --------------------------------------------------------
    # Policy approved
    # --------------------------------------------------------

    log_event(
        event_type="POLICY_APPROVED",
        session_id=request.session_id,
        details={
            "amount": request.amount,
            "total": request.total,
            "quantity": request.quantity,
        },
    )

    return {
        "success": True,
        "allowed": True,
        "amount": request.amount,
        "reason": (
            f"Order value ₹{request.total:,.0f} "
            "is within the ₹10,000 limit."
        ),
    }


# ============================================================
# PAYMENT REQUEST
# ============================================================

@app.post("/api/payment/request")
def payment_request(
    request: PaymentRequest
):

    # First run policy check
    policy = check_order_value(
        request.total
    )

    if not policy["allowed"]:

        log_event(
            event_type="PAYMENT_BLOCKED",
            session_id=request.session_id,
            details={
                "amount": request.amount,
                "total": request.total,
                "quantity": request.quantity,
                "reason": policy["reason"],
            },
        )

        return {
            "success": False,
            "allowed": False,
            "message": policy["reason"],
        }

    # Quantity safety check
    quantity_check = check_quantity(
        request.quantity
    )

    if not quantity_check["allowed"]:

        log_event(
            event_type="PAYMENT_BLOCKED",
            session_id=request.session_id,
            details={
                "amount": request.amount,
                "total": request.total,
                "quantity": request.quantity,
                "reason": quantity_check["reason"],
            },
        )

        return {
            "success": False,
            "allowed": False,
            "message": quantity_check["reason"],
        }

    # Create bounded payment request
    result = create_payment_request(
        request.session_id,
        request.amount,
    )

    if result.get("success"):

        log_event(
            event_type="PAYMENT_REQUESTED",
            session_id=request.session_id,
            details={
                "amount": request.amount,
                "currency": "INR",
                "payment_request_id": (
                    result[
                        "payment_request"
                    ]["id"]
                ),
            },
        )

    return result


# ============================================================
# GET PAYMENT REQUEST
# ============================================================

@app.get(
    "/api/payment/request/{payment_request_id}"
)
def payment_request_get(
    payment_request_id: str
):

    result = get_payment_request(
        payment_request_id
    )

    if not result:

        return {
            "success": False,
            "message": "Payment request not found.",
        }

    return {
        "success": True,
        "payment_request": result,
    }


# ============================================================
# USER APPROVES PAYMENT
# ============================================================

@app.post("/api/payment/approve")
def payment_approve(
    request: PaymentApprovalRequest
):

    result = approve_payment_request(
        request.payment_request_id
    )

    payment_request = result.get(
        "payment_request"
    )

    if payment_request:

        session_id = payment_request.get(
            "session_id"
        )

        # Explicit user approval
        log_event(
            event_type="USER_APPROVED",
            session_id=session_id,
            details={
                "payment_request_id": (
                    request.payment_request_id
                ),
                "amount": payment_request.get(
                    "amount"
                ),
                "currency": payment_request.get(
                    "currency"
                ),
            },
        )

        # Razorpay order created
        if payment_request.get(
            "razorpay_order_id"
        ):

            log_event(
                event_type="RAZORPAY_ORDER_CREATED",
                session_id=session_id,
                details={
                    "payment_request_id": (
                        request.payment_request_id
                    ),
                    "razorpay_order_id": (
                        payment_request[
                            "razorpay_order_id"
                        ]
                    ),
                },
            )

    return result


# ============================================================
# CANCEL PAYMENT
# ============================================================

@app.post("/api/payment/cancel")
def payment_cancel(
    request: PaymentCancelRequest
):

    result = cancel_payment_request(
        request.payment_request_id
    )

    payment_request = result.get(
        "payment_request"
    )

    if payment_request:

        log_event(
            event_type="PAYMENT_CANCELLED",
            session_id=payment_request.get(
                "session_id"
            ),
            details={
                "payment_request_id": (
                    request.payment_request_id
                ),
                "amount": payment_request.get(
                    "amount"
                ),
                "currency": payment_request.get(
                    "currency"
                ),
            },
        )

    return result


# ============================================================
# VERIFY RAZORPAY PAYMENT
# ============================================================

@app.post("/api/payment/verify")
def payment_verify(
    request: PaymentVerificationRequest
):

    result = verify_payment(
        payment_request_id=(
            request.payment_request_id
        ),
        razorpay_payment_id=(
            request.razorpay_payment_id
        ),
        razorpay_order_id=(
            request.razorpay_order_id
        ),
        razorpay_signature=(
            request.razorpay_signature
        ),
    )

    payment_request = result.get(
        "payment_request"
    )

    if payment_request:

        session_id = payment_request.get(
            "session_id"
        )

        # ----------------------------------------------------
        # SUCCESSFUL PAYMENT
        # ----------------------------------------------------

        if result.get("success"):

            log_event(
                event_type="PAYMENT_VERIFIED",
                session_id=session_id,
                details={
                    "payment_request_id": (
                        request.payment_request_id
                    ),
                    "razorpay_payment_id": (
                        request.razorpay_payment_id
                    ),
                    "razorpay_order_id": (
                        request.razorpay_order_id
                    ),
                    "amount": payment_request.get(
                        "amount"
                    ),
                    "currency": payment_request.get(
                        "currency"
                    ),
                    "signature_verified": True,
                },
            )

        # ----------------------------------------------------
        # FAILED PAYMENT
        # ----------------------------------------------------

        else:

            log_event(
                event_type="PAYMENT_VERIFICATION_FAILED",
                session_id=session_id,
                details={
                    "payment_request_id": (
                        request.payment_request_id
                    ),
                    "razorpay_payment_id": (
                        request.razorpay_payment_id
                    ),
                    "razorpay_order_id": (
                        request.razorpay_order_id
                    ),
                    "reason": result.get(
                        "message"
                    ),
                },
            )

    return result


# ============================================================
# AUDIT TRAIL
# ============================================================

@app.get("/api/audit/{session_id}")
def audit(session_id: str):

    return {
        "success": True,
        "session_id": session_id,
        "events": get_audit_logs(
            session_id
        ),
    }


# ============================================================
# GLOBAL AUDIT LOG
# ============================================================

@app.get("/api/audit")
def all_audit():

    return {
        "success": True,
        "events": get_audit_logs(),
    }


# ============================================================
# POLICY HELPER ENDPOINTS
# ============================================================

@app.get("/api/policy/limits")
def policy_limits():

    return {
        "success": True,
        "limits": {
            "max_order_value": 10000,
            "max_quantity_per_product": 2,
            "max_discount_percent": 15,
        },
    }


@app.post("/api/policy/quantity")
def policy_quantity(
    quantity: int
):

    return {
        "success": True,
        **check_quantity(quantity),
    }


@app.post("/api/policy/order-value")
def policy_order_value(
    total: float
):

    return {
        "success": True,
        **check_order_value(total),
    }


@app.post("/api/policy/discount")
def policy_discount(
    discount_percent: float
):

    return {
        "success": True,
        **check_discount(discount_percent),
    }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    print("=" * 60)
    print("RazorBoost AI backend started")
    print("API: http://127.0.0.1:8000")
    print("Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)