"use client";

import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";
const RAZORPAY_KEY_ID = "rzp_test_TYJ9nvcKL8cbBm";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  description: string;
  features: string[];
};

type CartItem = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
};

type AuditEvent = {
  id: string;
  timestamp: string;
  event_type: string;
  session_id?: string;
  details: Record<string, any>;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendation, setRecommendation] =
    useState<Product | null>(null);

  const [message, setMessage] = useState(
    "Tell me what you want to buy."
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] =
    useState(false);

  const [approvalOpen, setApprovalOpen] =
    useState(false);

  const [auditOpen, setAuditOpen] =
    useState(false);

  const [paymentRequestId, setPaymentRequestId] =
    useState<string | null>(null);

  const [auditLogs, setAuditLogs] =
    useState<AuditEvent[]>([]);

  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    let id = localStorage.getItem(
      "razorboost_session"
    );

    if (!id) {
      id = `demo-user-${Date.now()}`;

      localStorage.setItem(
        "razorboost_session",
        id
      );
    }

    setSessionId(id);
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadAuditLogs();
    }
  }, [sessionId]);

  async function loadAuditLogs() {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/audit/${sessionId}`
      );

      if (!response.ok) return;

      const data = await response.json();

      setAuditLogs(data.logs || data || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function searchProducts(
    searchQuery = query
  ) {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setRecommendation(null);

    try {
      const response = await fetch(
        `${API_URL}/api/agent/recommend`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Search failed"
        );
      }

      setProducts(data.matches || []);

      if (
        data.recommendation?.success &&
        data.recommendation?.product
      ) {
        setRecommendation(
          data.recommendation.product
        );

        setMessage(
          data.recommendation.reason
        );
      } else {
        setMessage(
          "I couldn't find a suitable product."
        );
      }

      await loadAuditLogs();
    } catch (error) {
      console.error(error);

      setMessage(
        "I couldn't reach the AI sales agent. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function getUpsell(
    productId: string
  ) {
    try {
      const response = await fetch(
        `${API_URL}/api/upsell/${productId}`
      );

      if (!response.ok) return;

      const data = await response.json();

      if (
        data.success &&
        data.recommendations?.length
      ) {
        const upsell =
          data.recommendations[0];

        setMessage(
          `Complete your purchase with ${upsell.name} for ₹${upsell.price.toLocaleString(
            "en-IN"
          )}.`
        );
      }
    } catch (error) {
      console.error(
        "Upsell request failed:",
        error
      );
    }
  }

  async function addToCart(
    product: Product
  ) {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/cart/add`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            product_id: product.id,
            quantity: 1,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message ||
            "Unable to add product."
        );

        return;
      }

      setCart(data.cart || []);

      setMessage(
        `${product.name} added to your cart.`
      );

      await getUpsell(product.id);

      await loadAuditLogs();

      setCartOpen(true);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to add the product to cart."
      );
    }
  }

  async function calculateCart() {
    if (!sessionId) return null;

    try {
      const response = await fetch(
        `${API_URL}/api/cart/calculate`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
          }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();

      setCart(data.items || []);

      return data;
    } catch (error) {
      console.error(error);

      return null;
    }
  }

  async function requestPayment() {
    setCheckoutLoading(true);

    try {
      const cartData =
        await calculateCart();

      if (
        !cartData ||
        !cartData.items?.length
      ) {
        setMessage(
          "Your cart is empty."
        );

        return;
      }

      const total = Number(
        cartData.total || 0
      );

      const quantity =
        cartData.items.reduce(
          (
            sum: number,
            item: CartItem
          ) => sum + item.quantity,
          0
        );

      const policyResponse =
        await fetch(
          `${API_URL}/api/policy/check`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              session_id: sessionId,
              amount: total,
              total: total,
              quantity,
            }),
          }
        );

      const policy =
        await policyResponse.json();

      if (!policy.allowed) {
        setMessage(
          `Payment blocked: ${policy.reason}`
        );

        await loadAuditLogs();

        return;
      }

      const response = await fetch(
        `${API_URL}/api/payment/request`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            amount: total,
            total: total,
            quantity,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message ||
            "Unable to prepare payment."
        );

        return;
      }

      setPaymentRequestId(
        data.payment_request_id
      );

      setApprovalOpen(true);

      await loadAuditLogs();
    } catch (error) {
      console.error(error);

      setMessage(
        "Something went wrong while preparing checkout."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function cancelPayment() {
    if (!paymentRequestId) {
      setApprovalOpen(false);

      return;
    }

    try {
      await fetch(
        `${API_URL}/api/payment/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            payment_request_id:
              paymentRequestId,
          }),
        }
      );

      setApprovalOpen(false);

      setPaymentRequestId(null);

      setMessage(
        "Payment cancelled."
      );

      await loadAuditLogs();
    } catch (error) {
      console.error(error);
    }
  }

  async function approvePayment() {
    if (!paymentRequestId) return;

    setCheckoutLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/payment/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            payment_request_id:
              paymentRequestId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message ||
            "Payment approval failed."
        );

        return;
      }

      setApprovalOpen(false);

      await loadAuditLogs();

      openRazorpay(data);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to approve payment."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  function openRazorpay(
    paymentData: any
  ) {
    if (!window.Razorpay) {
      setMessage(
        "Razorpay Checkout is not loaded. Refresh the page."
      );

      return;
    }

    const order =
      paymentData.order ||
      paymentData.razorpay_order ||
      paymentData;

    const options = {
      key: RAZORPAY_KEY_ID,

      amount: order.amount,

      currency:
        order.currency || "INR",

      name: "RazorBoost",

      description:
        "AI-assisted merchant checkout",

      order_id: order.id,

      handler: async function (
        response: any
      ) {
        await verifyPayment(response);
      },

      prefill: {
        name: "Demo Customer",
        email: "demo@example.com",
        contact: "9999999999",
      },

      theme: {
        color: "#111827",
      },

      modal: {
        ondismiss: function () {
          setMessage(
            "Razorpay checkout was closed."
          );
        },
      },
    };

    const razorpay =
      new window.Razorpay(options);

    razorpay.open();
  }

  async function verifyPayment(
    razorpayResponse: any
  ) {
    try {
      const response = await fetch(
        `${API_URL}/api/payment/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            payment_request_id:
              paymentRequestId,

            razorpay_payment_id:
              razorpayResponse.razorpay_payment_id,

            razorpay_order_id:
              razorpayResponse.razorpay_order_id,

            razorpay_signature:
              razorpayResponse.razorpay_signature,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.message ||
            "Payment verification failed."
        );

        return;
      }

      setMessage(
        "Payment verified successfully. Order completed!"
      );

      setPaymentRequestId(null);

      await calculateCart();

      await loadAuditLogs();
    } catch (error) {
      console.error(error);

      setMessage(
        "Payment verification failed."
      );
    }
  }

  function formatEventName(
    event: string
  ) {
    return event
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      );
  }

  function formatTime(
    timestamp: string
  ) {
    try {
      return new Date(
        timestamp
      ).toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "";
    }
  }

  const cartTotal = cart.reduce(
    (sum, item) =>
      sum +
      item.price * item.quantity,
    0
  );

  const cartCount = cart.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#111827]">

      {/* RAZORPAY */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-bold text-white shadow-sm">
              R
            </div>

            <div>
              <div className="text-sm font-bold">
                RazorBoost
              </div>

              <div className="text-[11px] text-gray-500">
                AI Commerce Agent
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2 md:gap-5">

            <a
              href="/dashboard"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-black sm:block"
            >
              Merchant Dashboard
            </a>

            <button
              onClick={() =>
                setAuditOpen(true)
              }
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-black md:block"
            >
              Activity
            </button>

            <button
              onClick={() =>
                setCartOpen(true)
              }
              className="relative rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-gray-50"
            >
              Cart

              {cartCount > 0 && (
                <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                  {cartCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-5 pb-8 pt-10 md:px-8 md:pt-14">

        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_.75fr]">

          <div>

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">

              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />

              AI Sales Agent

              <span className="text-gray-300">
                /
              </span>

              Razorpay Test Mode

            </div>

            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
              Turn conversations
              <br />
              into{" "}
              <span className="text-gray-400">
                revenue.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-500 md:text-lg">
              RazorBoost understands customer intent,
              recommends the right products, increases
              cart value with contextual upsells, and
              enables safe AI-powered checkout.
            </p>

          </div>

          {/* SIDE STATUS CARD */}
          <div className="hidden lg:block">

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">

              <div className="flex items-center justify-between">

                <div>
                  <div className="text-xs font-medium text-gray-400">
                    AGENT STATUS
                  </div>

                  <div className="mt-1 text-lg font-bold">
                    Ready to sell
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                </div>

              </div>

              <div className="mt-6 space-y-3">

                <StatusRow
                  label="AI Recommendations"
                  value="Active"
                />

                <StatusRow
                  label="Upsell Engine"
                  value="Active"
                />

                <StatusRow
                  label="Payment Guard"
                  value="₹10,000"
                />

                <StatusRow
                  label="Audit Trail"
                  value="Enabled"
                />

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* AI SEARCH */}
      <section className="mx-auto max-w-5xl px-5 py-5 md:px-8">

        <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-lg shadow-gray-200/40">

          <div className="flex flex-col gap-2 sm:flex-row">

            <div className="flex flex-1 items-center">

              <div className="px-4 text-gray-400">
                ✦
              </div>

              <input
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter"
                  ) {
                    searchProducts();
                  }
                }}
                placeholder="Ask RazorBoost what you want to buy..."
                className="w-full bg-transparent px-2 py-4 text-sm outline-none md:text-base"
              />

            </div>

            <button
              onClick={() =>
                searchProducts()
              }
              disabled={loading}
              className="rounded-2xl bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading
                ? "Thinking..."
                : "Ask AI →"}
            </button>

          </div>

          <div className="flex flex-wrap gap-2 px-3 pb-2 pt-2">

            {[
              "Best running shoes",
              "Shoes under ₹3000",
              "Daily training shoes",
            ].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setQuery(item);
                  searchProducts(item);
                }}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-white hover:text-black"
              >
                {item}
              </button>
            ))}

          </div>

        </div>

      </section>

      {/* TRUST STRIP */}
      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">

        <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-3">

          <TrustCard
            number="01"
            title="AI Recommendations"
            description="Explainable product decisions"
          />

          <TrustCard
            number="02"
            title="Bounded Payments"
            description="₹10,000 maximum order value"
          />

          <TrustCard
            number="03"
            title="Audit Trail"
            description="Every important action recorded"
          />

        </div>

      </section>

      {/* AI RESULT */}
      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8">

        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">

          {/* AI MESSAGE */}
          <div className="rounded-3xl border border-gray-200 bg-black p-7 text-white shadow-xl">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-bold text-black">
                AI
              </div>

              <div>
                <div className="text-sm font-semibold">
                  RazorBoost
                </div>

                <div className="text-xs text-gray-400">
                  Sales Agent
                </div>
              </div>

            </div>

            <div className="mt-10">

              <div className="text-xs font-medium uppercase tracking-widest text-gray-500">
                Agent response
              </div>

              <p className="mt-4 text-lg font-medium leading-8">
                {message}
              </p>

            </div>

            <div className="mt-10 border-t border-white/10 pt-5">

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Payment protection
                </span>

                <span className="text-gray-300">
                  Enabled
                </span>
              </div>

            </div>

          </div>

          {/* PRODUCT AREA */}
          <div>

            {recommendation ? (
              <div>

                <div className="mb-4 flex items-center justify-between">

                  <div>
                    <div className="text-xs font-medium uppercase tracking-widest text-gray-400">
                      AI PICK
                    </div>

                    <div className="mt-1 text-xl font-bold">
                      Recommended for you
                    </div>
                  </div>

                  <div className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    Best match
                  </div>

                </div>

                <ProductCard
                  product={recommendation}
                  onAdd={() =>
                    addToCart(
                      recommendation
                    )
                  }
                  featured
                />

              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white">

                <div className="text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-xl">
                    ✦
                  </div>

                  <div className="mt-4 font-semibold">
                    Your AI shopping assistant
                  </div>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                    Tell RazorBoost what you need and
                    it will find the best product for you.
                  </p>

                </div>

              </div>
            )}

          </div>

        </div>

        {/* OTHER MATCHES */}
        {products.length > 0 && (
          <div className="mt-10">

            <div className="mb-4">

              <div className="text-xs font-medium uppercase tracking-widest text-gray-400">
                CATALOG
              </div>

              <div className="mt-1 text-xl font-bold">
                Other matches
              </div>

            </div>

            <div className="grid gap-5 md:grid-cols-3">

              {products
                .filter(
                  (product) =>
                    product.id !==
                    recommendation?.id
                )
                .map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={() =>
                      addToCart(product)
                    }
                  />
                ))}

            </div>

          </div>
        )}

      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-7 text-xs text-gray-400 sm:flex-row md:px-8">

          <div>
            RazorBoost · AI Commerce Agent
          </div>

          <div className="flex gap-5">
            <span>
              Razorpay Test Mode
            </span>

            <span>
              Bounded AI Commerce
            </span>
          </div>

        </div>

      </footer>

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">

          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() =>
              setCartOpen(false)
            }
          />

          <div className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">

            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-6 py-5 backdrop-blur">

              <div className="flex items-center justify-between">

                <div>
                  <div className="text-lg font-bold">
                    Your Cart
                  </div>

                  <div className="text-xs text-gray-500">
                    AI-assisted checkout
                  </div>
                </div>

                <button
                  onClick={() =>
                    setCartOpen(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  ✕
                </button>

              </div>

            </div>

            <div className="p-6">

              {cart.length === 0 ? (
                <div className="py-20 text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                    🛒
                  </div>

                  <div className="mt-4 font-semibold">
                    Your cart is empty
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    Ask RazorBoost to find something.
                  </div>

                </div>
              ) : (
                <>
                  <div className="space-y-3">

                    {cart.map((item) => (
                      <div
                        key={
                          item.product_id
                        }
                        className="flex items-center justify-between rounded-2xl border border-gray-200 p-4"
                      >

                        <div>

                          <div className="font-semibold">
                            {item.name}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            ₹
                            {item.price.toLocaleString(
                              "en-IN"
                            )}{" "}
                            ×{" "}
                            {item.quantity}
                          </div>

                        </div>

                        <div className="font-bold">
                          ₹
                          {(
                            item.price *
                            item.quantity
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </div>

                      </div>
                    ))}

                  </div>

                  {/* UPSELL NOTICE */}
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">

                    <div className="flex gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        ✦
                      </div>

                      <div>

                        <div className="text-sm font-semibold">
                          RazorBoost recommendation
                        </div>

                        <div className="mt-1 text-xs leading-5 text-gray-500">
                          AI-powered upsells help merchants
                          increase order value while keeping
                          recommendations relevant.
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* TOTAL */}
                  <div className="mt-6 border-t border-gray-200 pt-6">

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-gray-500">
                        Order total
                      </span>

                      <span className="text-2xl font-bold">
                        ₹
                        {cartTotal.toLocaleString(
                          "en-IN"
                        )}
                      </span>

                    </div>

                    <div className="mt-4 rounded-2xl bg-black p-4 text-xs leading-5 text-gray-300">

                      <div className="font-semibold text-white">
                        AI Payment Guard
                      </div>

                      <div className="mt-1">
                        Maximum order value ₹10,000 ·
                        Maximum quantity 2 per product
                      </div>

                    </div>

                    <button
                      onClick={
                        requestPayment
                      }
                      disabled={
                        checkoutLoading
                      }
                      className="mt-4 w-full rounded-2xl bg-black px-5 py-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {checkoutLoading
                        ? "Checking policy..."
                        : "Continue to Checkout →"}
                    </button>

                    <button
                      onClick={() =>
                        setAuditOpen(true)
                      }
                      className="mt-3 w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm font-semibold hover:bg-gray-50"
                    >
                      View Audit Trail
                    </button>

                  </div>
                </>
              )}

            </div>

          </div>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {approvalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                🔐
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Final authorization
                </div>

                <div className="font-bold">
                  Approve this purchase?
                </div>
              </div>

            </div>

            <div className="mt-6 rounded-2xl bg-gray-50 p-5">

              <div className="flex items-center justify-between">

                <span className="text-sm text-gray-500">
                  Order total
                </span>

                <span className="text-2xl font-bold">
                  ₹
                  {cartTotal.toLocaleString(
                    "en-IN"
                  )}
                </span>

              </div>

              <div className="mt-5 space-y-2 text-xs text-gray-500">

                <div>
                  ✓ AI recommendation completed
                </div>

                <div>
                  ✓ Policy validation passed
                </div>

                <div>
                  ✓ Order within ₹10,000 limit
                </div>

                <div>
                  ✓ Razorpay Test Mode
                </div>

              </div>

            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 p-4 text-xs leading-5 text-gray-500">
              <strong className="text-gray-900">
                Safety gate:
              </strong>{" "}
              RazorBoost cannot independently spend money.
              Your explicit approval is required before a
              Razorpay order is created.
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                onClick={
                  cancelPayment
                }
                className="rounded-2xl border border-gray-200 px-4 py-3.5 text-sm font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={
                  approvePayment
                }
                disabled={
                  checkoutLoading
                }
                className="rounded-2xl bg-black px-4 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {checkoutLoading
                  ? "Opening..."
                  : "Approve & Pay"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* AUDIT MODAL */}
      {auditOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-5 backdrop-blur-sm">

          <div className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

              <div>

                <div className="text-lg font-bold">
                  Audit Trail
                </div>

                <div className="text-xs text-gray-500">
                  Explainable AI commerce activity
                </div>

              </div>

              <button
                onClick={() =>
                  setAuditOpen(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                ✕
              </button>

            </div>

            <div className="max-h-[65vh] overflow-y-auto p-6">

              {auditLogs.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  No audit events yet.
                </div>
              ) : (
                <div className="space-y-3">

                  {[...auditLogs]
                    .reverse()
                    .map((event) => (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-gray-200 p-4"
                      >

                        <div className="flex items-center justify-between gap-4">

                          <div className="flex items-center gap-3">

                            <div className="h-2 w-2 rounded-full bg-black" />

                            <div className="text-sm font-semibold">
                              {formatEventName(
                                event.event_type
                              )}
                            </div>

                          </div>

                          <div className="text-[11px] text-gray-400">
                            {formatTime(
                              event.timestamp
                            )}
                          </div>

                        </div>

                        {Object.keys(
                          event.details || {}
                        ).length > 0 && (
                          <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-50 p-3 text-[10px] leading-5 text-gray-600">
                            {JSON.stringify(
                              event.details,
                              null,
                              2
                            )}
                          </pre>
                        )}

                      </div>
                    ))}

                </div>
              )}

            </div>

            <div className="border-t border-gray-200 p-5">

              <button
                onClick={() =>
                  setAuditOpen(false)
                }
                className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white"
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}

/* PRODUCT CARD */

function ProductCard({
  product,
  onAdd,
  featured = false,
}: {
  product: Product;
  onAdd: () => void;
  featured?: boolean;
}) {
  return (
    <div
      className={`group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        featured ? "p-6 md:p-7" : ""
      }`}
    >

      <div className="flex items-start justify-between gap-5">

        <div>

          <div className="mb-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {product.category.replaceAll(
              "_",
              " "
            )}
          </div>

          <h3
            className={`font-bold ${
              featured
                ? "text-2xl"
                : "text-lg"
            }`}
          >
            {product.name}
          </h3>

        </div>

        <div className="rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs font-bold">
          ★ {product.rating}
        </div>

      </div>

      <p className="mt-4 text-sm leading-6 text-gray-500">
        {product.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">

        {product.features.map(
          (feature) => (
            <span
              key={feature}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-medium text-gray-500"
            >
              {feature}
            </span>
          )
        )}

      </div>

      <div className="mt-7 flex items-end justify-between border-t border-gray-100 pt-5">

        <div>

          <div className="text-2xl font-bold">
            ₹
            {product.price.toLocaleString(
              "en-IN"
            )}
          </div>

          <div className="mt-1 text-xs text-gray-400">
            {product.stock} available
          </div>

        </div>

        <button
          onClick={onAdd}
          disabled={
            product.stock <= 0
          }
          className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-40"
        >
          Add to Cart
        </button>

      </div>

    </div>
  );
}

/* STATUS ROW */

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">

      <span className="text-xs text-gray-500">
        {label}
      </span>

      <span className="text-xs font-semibold">
        {value}
      </span>

    </div>
  );
}

/* TRUST CARD */

function TrustCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-gray-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">

      <div className="text-xs font-bold text-gray-300">
        {number}
      </div>

      <div>

        <div className="text-sm font-bold">
          {title}
        </div>

        <div className="mt-1 text-xs text-gray-500">
          {description}
        </div>

      </div>

    </div>
  );
}