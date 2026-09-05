# 🚀 RazorBoost AI

### AI-Powered Sales & Agentic Commerce for Razorpay Merchants

**RazorBoost AI** is a bounded AI commerce agent that helps merchants turn customer conversations into revenue.

It understands customer intent, searches the merchant catalog, recommends products, suggests contextual upsells/cross-sells, builds the cart, validates transaction policies, and creates a Razorpay test-mode payment — **but only after explicit customer approval**.

> **The AI can recommend and sell, but it cannot independently spend money.**

---

## 🎯 Problem

Traditional online stores require customers to:

1. Browse products
2. Compare options
3. Add products to cart
4. Discover complementary products
5. Proceed to checkout
6. Make payment

AI agents can simplify this journey, but giving an AI agent direct payment capabilities introduces major risks:

* Unauthorized purchases
* Unbounded transaction amounts
* Excessive quantities
* Lack of transparency
* Difficult-to-audit AI decisions

Merchants need an AI agent that can **increase revenue while keeping financial actions bounded, explainable, and user-controlled.**

---

## 💡 Solution

RazorBoost AI combines:

* 🤖 AI-powered product discovery
* 🎯 Intent-based recommendations
* 📈 Contextual upselling & cross-selling
* 🛒 Conversational cart management
* 🛡️ Transaction policy enforcement
* ✅ Explicit payment approval
* 💳 Razorpay Test Mode checkout
* 🔐 Payment verification
* 📋 Complete audit trail

The system separates **recommendation** from **financial execution**.

---

## 🔄 End-to-End Flow

```text
Customer
   │
   ▼
AI Commerce Agent
   │
   ├── Understand Intent
   │
   ▼
Product Catalog
   │
   ├── Search
   ├── Filter
   └── Recommend
   │
   ▼
Upsell / Cross-sell Agent
   │
   ▼
Shopping Cart
   │
   ▼
Policy Engine
   │
   ├── Quantity Limit
   ├── Order Value Limit
   └── Product Availability
   │
   ▼
Explicit Customer Approval
   │
   ▼
Razorpay Test Mode
   │
   ▼
Payment Verification
   │
   ▼
Audit Trail
```

---

## ✨ Key Features

### 🤖 AI Sales Agent

Customers can interact using natural language.

Example:

> "Find me the best running shoes under ₹4000."

RazorBoost searches the catalog and recommends the best matching product.

---

### 🎯 Intelligent Recommendations

Products are ranked using factors such as:

* Customer query
* Product relevance
* Rating
* Price
* Availability

Example:

**StrideX Runner Pro**

⭐ 4.6 rating
💰 ₹3,499

---

### 📈 Contextual Upselling

After a customer selects a product, RazorBoost identifies relevant complementary products.

Example:

```text
Running Shoes
      +
Performance Socks
      +
Sports Bottle
```

This increases average order value without using irrelevant recommendations.

---

### 🛒 Conversational Cart

Customers can add products directly through the AI-powered shopping experience.

The system calculates:

* Products
* Quantities
* Individual prices
* Total order value

---

### 🛡️ Bounded AI Transactions

Every transaction passes through a policy engine.

Current demo policies:

```text
Maximum order value: ₹10,000

Maximum quantity/product: 2

Payment amount: Must be > ₹0

Product: Must be in stock
```

Example:

```text
Cart Total: ₹12,097

        ↓

Policy Engine

        ↓

❌ BLOCKED

Reason:
Order value exceeds ₹10,000 limit.
```

---

### ✅ Explicit Customer Approval

The AI cannot silently create a payment.

The flow is:

```text
AI Recommendation
       ↓
Cart
       ↓
Policy Check
       ↓
Payment Request
       ↓
USER APPROVAL
       ↓
Razorpay Order
```

This creates a clear human-in-the-loop boundary.

---

### 💳 Razorpay Test Mode

RazorBoost integrates with Razorpay Test Mode to demonstrate the complete payment lifecycle.

```text
Payment Request
      ↓
Razorpay Order
      ↓
Checkout
      ↓
Payment
      ↓
Signature Verification
      ↓
Payment Verified
```

No real money is involved in the demo.

---

### 📋 Audit Trail

Every important action is logged.

Example:

```text
PRODUCT_RECOMMENDED
       ↓
UPSELL_RECOMMENDED
       ↓
POLICY_APPROVED
       ↓
PAYMENT_REQUESTED
       ↓
USER_APPROVED
       ↓
RAZORPAY_ORDER_CREATED
       ↓
PAYMENT_VERIFIED
```

This makes AI-driven commerce more transparent and explainable.

---

# 🏗️ Architecture

```text
                         RAZORBOOST AI
                              │
                              ▼
                    ┌──────────────────┐
                    │   Sales Agent    │
                    │ Intent + Search  │
                    │ Recommendation   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Product Catalog  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Upsell Engine   │
                    │ Cross-sell Logic │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Shopping Cart   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Policy Engine   │
                    │                  │
                    │ ₹10K Order Limit │
                    │ Qty ≤ 2          │
                    │ Stock Check      │
                    └────────┬─────────┘
                             │
                       APPROVAL
                             │
                             ▼
                    ┌──────────────────┐
                    │     Razorpay     │
                    │    Test Mode     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Payment Verify   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Audit Trail    │
                    └──────────────────┘
```

---

# 🧰 Tech Stack

## Frontend

* Next.js
* TypeScript
* React
* Tailwind CSS

## Backend

* Python
* FastAPI
* Pydantic

## Payments

* Razorpay Test Mode

## AI

* AI-powered recommendation architecture
* Extensible to Gemini / OpenAI-compatible LLMs

## Data

* JSON product catalog
* In-memory cart/payment state for demo

## Deployment

* Vercel — Frontend
* Render / Cloud Run — Backend

---

# 📁 Project Structure

```text
razorboost/
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── public/
│   ├── package.json
│   └── next.config.ts
│
└── backend/
    │
    ├── app/
    │   ├── main.py
    │   │
    │   ├── agent/
    │   │   └── sales_agent.py
    │   │
    │   ├── services/
    │   │   ├── catalog.py
    │   │   ├── cart.py
    │   │   ├── upsell.py
    │   │   ├── policy.py
    │   │   ├── payment.py
    │   │   └── audit.py
    │   │
    │   └── models/
    │
    ├── data/
    │   └── products.json
    │
    ├── requirements.txt
    └── venv/
```

---

# 🚀 Running Locally

## 1. Clone the Repository

```bash
git clone https://github.com/ayushk687/razorboost-ai.git
cd razorboost-ai
```

---

# ⚙️ Backend Setup

Navigate to the backend:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

---

## 🔐 Environment Variables

Create:

```text
backend/.env
```

Add your Razorpay **test-mode** credentials:

```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

> Never commit your Razorpay secret to GitHub.

---

## ▶️ Start Backend

```powershell
python -m uvicorn app.main:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

# 🌐 Frontend Setup

Open another terminal:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🧪 Demo Scenario

## ✅ Successful Transaction

Search:

```text
best running shoes under ₹4000
```

RazorBoost recommends:

```text
StrideX Runner Pro
₹3,499
```

Then it suggests:

```text
StrideX Performance Socks
₹399
```

Cart:

```text
StrideX Runner Pro       ₹3,499
Performance Socks          ₹399
--------------------------------
Total                    ₹3,898
```

Policy:

```text
✓ Quantity allowed
✓ Product available
✓ Order value < ₹10,000
✓ Payment amount valid
```

Customer approves.

Razorpay Test Mode opens.

Payment is verified.

Audit trail records the complete flow.

---

# ❌ Blocked Transaction

Example cart:

```text
StrideX Speed Max × 2      ₹8,598
StrideX Runner Pro × 1     ₹3,499
----------------------------------
Total                     ₹12,097
```

Policy Engine:

```text
❌ BLOCKED

Order value ₹12,097
exceeds maximum limit of ₹10,000.
```

No Razorpay order is created.

This demonstrates that the AI cannot bypass transaction boundaries.

---

# 🔐 Safety Principles

RazorBoost follows four core principles:

### 1. Bounded

Every financial action has predefined limits.

### 2. Explainable

The system records why products were recommended and why transactions were approved or blocked.

### 3. Gated

Money-related actions require explicit customer approval.

### 4. Auditable

Important AI and payment actions are recorded in an audit trail.

---

# 💰 Merchant Value

RazorBoost helps merchants:

* Increase Average Order Value
* Improve product discovery
* Automate sales conversations
* Increase cross-sell opportunities
* Reduce checkout friction
* Make their catalog AI-readable
* Enable agentic commerce safely

Instead of simply showing products, RazorBoost actively assists the customer in completing a purchase.

---

# 🏆 USP

Traditional chatbot:

```text
Customer → Question → Answer
```

RazorBoost:

```text
Customer
   ↓
Intent
   ↓
Recommendation
   ↓
Upsell
   ↓
Cart
   ↓
Policy
   ↓
Approval
   ↓
Payment
   ↓
Verification
```

### The key difference

**RazorBoost connects AI sales intelligence directly to a controlled payment execution layer.**

---

# 🔮 Future Roadmap

### AI-Powered Merchant Intelligence

Use transaction and catalog data to identify:

* Best-selling products
* Customer segments
* Conversion opportunities
* Upsell opportunities

### Autonomous Campaign Agent

Allow merchants to define goals such as:

```text
"Increase weekend revenue by 15%."
```

The agent could generate and optimize campaigns within merchant-defined limits.

### Agent-Readable Catalog

Expose structured product information optimized for AI buyers and commerce agents.

### Personalized Offers

Generate contextual discounts while respecting:

```text
Maximum discount
Merchant budget
Product margin
Customer eligibility
```

### Persistent Database

Move demo state from in-memory storage to:

* PostgreSQL
* Redis
* Persistent payment/order records

---

# 🎤 Hackathon Pitch

> **RazorBoost AI turns conversations into commerce.**
>
> It understands what customers want, recommends the right products, increases basket size through contextual upsells, and takes the customer all the way to Razorpay checkout.
>
> But unlike an unrestricted AI agent, RazorBoost cannot independently spend money.
>
> Every transaction is policy-checked, explicitly approved by the customer, verified through Razorpay, and recorded in an audit trail.
>
> **AI can recommend. AI can sell. But the customer stays in control.**

---

# 📊 Current Status

```text
✅ AI Product Search
✅ Product Recommendation
✅ Upsell / Cross-sell
✅ Cart Management
✅ Policy Engine
✅ Payment Approval Gate
✅ Razorpay Test Mode
✅ Payment Verification
✅ Audit Trail
✅ Merchant Dashboard
✅ Failure Handling
```

---

# 👨‍💻 Built For

**Razorpay Hackathon — AI Growth & Agentic Commerce**

### RazorBoost AI

**Turn conversations into revenue.**

---

## ⭐ Support

If you find the project interesting, consider giving the repository a ⭐ on GitHub.

Built with ❤️ for agentic commerce.
