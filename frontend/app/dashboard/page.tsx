"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://127.0.0.1:8000";

type AuditEvent = {
  id: string;
  timestamp: string;
  event_type: string;
  session_id: string;
  details: Record<string, any>;
};

export default function Dashboard() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const sessionId = "demo-user-1";

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const response = await fetch(
        `${API_URL}/api/audit/${sessionId}`
      );

      const data = await response.json();

      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }

  const paymentEvents = events.filter(
    (event) =>
      event.event_type === "PAYMENT_VERIFIED"
  );

  const upsellEvents = events.filter(
    (event) =>
      event.event_type === "UPSELL_RECOMMENDED"
  );

  const recommendationEvents = events.filter(
    (event) =>
      event.event_type === "PRODUCT_RECOMMENDED"
  );

  const totalRevenue = paymentEvents.reduce(
    (sum, event) =>
      sum + Number(event.details?.amount || 0),
    0
  );

  const orderCount = paymentEvents.length;

  const averageOrderValue =
    orderCount > 0
      ? Math.round(totalRevenue / orderCount)
      : 0;

  const aiRecommendations =
    recommendationEvents.length;

  function formatEventName(eventType: string) {
    return eventType
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function getEventIcon(eventType: string) {
    switch (eventType) {
      case "PRODUCT_SEARCH":
        return "🔎";

      case "PRODUCT_RECOMMENDED":
        return "🤖";

      case "PRODUCT_ADDED":
        return "🛒";

      case "UPSELL_RECOMMENDED":
        return "📈";

      case "PAYMENT_REQUESTED":
        return "💳";

      case "USER_APPROVED":
        return "✅";

      case "RAZORPAY_ORDER_CREATED":
        return "⚡";

      case "PAYMENT_VERIFIED":
        return "💰";

      case "PAYMENT_VERIFICATION_FAILED":
        return "⚠️";

      default:
        return "•";
    }
  }

  function formatTime(timestamp: string) {
    try {
      return new Date(timestamp).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );
    } catch {
      return timestamp;
    }
  }

  if (loading) {
    return (
      <main className="dashboardPage">
        <div className="dashboardLoading">
          Loading merchant dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="dashboardPage">
      {/* HEADER */}

      <header className="dashboardHeader">
        <div>
          <span className="eyebrow">
            RAZORBOOST AI
          </span>

          <h1>Merchant Dashboard</h1>

          <p>
            Monitor AI-powered selling activity,
            payments and revenue.
          </p>
        </div>

        <Link
          href="/"
          className="backButton"
        >
          ← Back to Store
        </Link>
      </header>

      {/* METRICS */}

      <section className="metricsGrid">
        <div className="metricCard">
          <span>💰 Total Revenue</span>

          <strong>
            ₹{totalRevenue.toLocaleString("en-IN")}
          </strong>

          <small>
            Verified payments
          </small>
        </div>

        <div className="metricCard">
          <span>🛒 Orders</span>

          <strong>
            {orderCount}
          </strong>

          <small>
            Completed payments
          </small>
        </div>

        <div className="metricCard">
          <span>📊 Average Order Value</span>

          <strong>
            ₹
            {averageOrderValue.toLocaleString(
              "en-IN"
            )}
          </strong>

          <small>
            Revenue per order
          </small>
        </div>

        <div className="metricCard">
          <span>🤖 AI Recommendations</span>

          <strong>
            {aiRecommendations}
          </strong>

          <small>
            Products recommended by AI
          </small>
        </div>
      </section>

      {/* AI GROWTH */}

      <section className="growthCard">
        <div>
          <span className="eyebrow">
            AI SALES ENGINE
          </span>

          <h2>
            AI-powered selling activity
          </h2>

          <p>
            RazorBoost continuously helps customers
            discover relevant products and increases
            basket size through intelligent
            recommendations.
          </p>
        </div>

        <div className="growthNumber">
          <strong>
            {upsellEvents.length}
          </strong>

          <span>
            Upsell opportunities
          </span>
        </div>
      </section>

      {/* ACTIVITY */}

      <section className="dashboardSection">
        <div className="sectionTitle">
          <div>
            <span className="eyebrow">
              AUDIT TRAIL
            </span>

            <h2>
              Recent AI actions
            </h2>
          </div>

          <span>
            {events.length} events
          </span>
        </div>

        {events.length === 0 ? (
          <div className="emptyDashboard">
            <h3>
              No activity yet
            </h3>

            <p>
              Start shopping from the store to
              generate AI sales activity.
            </p>

            <Link
              href="/"
              className="backButton"
            >
              Go to Store
            </Link>
          </div>
        ) : (
          <div className="dashboardEvents">
            {[...events]
              .reverse()
              .map((event) => (
                <div
                  className="dashboardEvent"
                  key={event.id}
                >
                  <div className="eventIcon">
                    {getEventIcon(
                      event.event_type
                    )}
                  </div>

                  <div className="eventBody">
                    <strong>
                      {formatEventName(
                        event.event_type
                      )}
                    </strong>

                    <span>
                      {formatTime(
                        event.timestamp
                      )}
                    </span>

                    <div className="eventDetail">
                      {event.event_type ===
                        "PRODUCT_SEARCH" && (
                        <>
                          Search:{" "}
                          <b>
                            {event.details?.query}
                          </b>
                          {" · "}
                          {
                            event.details
                              ?.results_count
                          }{" "}
                          results
                        </>
                      )}

                      {event.event_type ===
                        "PRODUCT_RECOMMENDED" && (
                        <>
                          Recommended:{" "}
                          <b>
                            {
                              event.details
                                ?.product_name
                            }
                          </b>
                        </>
                      )}

                      {event.event_type ===
                        "PRODUCT_ADDED" && (
                        <>
                          Added{" "}
                          <b>
                            {
                              event.details
                                ?.product_name
                            }
                          </b>
                          {" × "}
                          {
                            event.details
                              ?.quantity
                          }
                        </>
                      )}

                      {event.event_type ===
                        "UPSELL_RECOMMENDED" && (
                        <>
                          AI suggested{" "}
                          <b>
                            {Array.isArray(
                              event.details
                                ?.recommendations
                            )
                              ? event.details.recommendations.join(
                                  ", "
                                )
                              : "additional products"}
                          </b>
                        </>
                      )}

                      {event.event_type ===
                        "PAYMENT_REQUESTED" && (
                        <>
                          Payment requested:{" "}
                          <b>
                            ₹
                            {Number(
                              event.details
                                ?.amount || 0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </b>
                        </>
                      )}

                      {event.event_type ===
                        "USER_APPROVED" && (
                        <>
                          Customer approved payment
                          of{" "}
                          <b>
                            ₹
                            {Number(
                              event.details
                                ?.amount || 0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </b>
                        </>
                      )}

                      {event.event_type ===
                        "RAZORPAY_ORDER_CREATED" && (
                        <>
                          Razorpay order created:{" "}
                          <b>
                            {
                              event.details
                                ?.razorpay_order_id
                            }
                          </b>
                        </>
                      )}

                      {event.event_type ===
                        "PAYMENT_VERIFIED" && (
                        <>
                          Payment verified:{" "}
                          <b>
                            ₹
                            {Number(
                              event.details
                                ?.amount || 0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </b>
                        </>
                      )}

                      {event.event_type ===
                        "PAYMENT_VERIFICATION_FAILED" && (
                        <>
                          Verification failed:{" "}
                          <b>
                            {
                              event.details
                                ?.reason
                            }
                          </b>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}