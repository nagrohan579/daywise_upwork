import { useState, useEffect } from "react";
import { AppLayout, Button, PricingTable } from "../../components";
import { toast } from "sonner";
import "./Billing.css";

const Billing = () => {
  const [currentPlan, setCurrentPlan] = useState(null); // null = not yet loaded, "free", "pro"
  const [isAnnual, setIsAnnual] = useState(false); // Is current plan annual
  const [isFetchingPlan, setIsFetchingPlan] = useState(true);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [selectingPlan, setSelectingPlan] = useState(null); // Track which plan is being selected (e.g., "pro-month", "pro-year")
  const [subscriptionData, setSubscriptionData] = useState(null); // Full subscription details

  // Fetch current subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      setIsFetchingPlan(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/user-subscriptions/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          const planId = data.subscription?.planId || "free";
          const annual = data.subscription?.isAnnual || false;
          setCurrentPlan(planId);
          setIsAnnual(annual);
          setSubscriptionData(data.subscription || null);
          console.log('Fetched subscription:', planId, annual ? '(Annual)' : '(Monthly)');
        } else {
          console.error('Failed to fetch subscription, defaulting to free');
          setCurrentPlan("free");
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setCurrentPlan("free");
      } finally {
        setIsFetchingPlan(false);
      }
    };
    fetchSubscription();
  }, []);

  // Fetch subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/subscription-plans`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans || []);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // Fetch payment method (only if user has a Stripe customer ID)
  useEffect(() => {
    const fetchPaymentMethod = async () => {
      if (currentPlan === "free") {
        setPaymentMethod(null);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/billing/payment-method`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setPaymentMethod(data.paymentMethod || null);
        }
      } catch (error) {
        console.error('Error fetching payment method:', error);
      }
    };

    if (currentPlan && !isFetchingPlan) {
      fetchPaymentMethod();
    }
  }, [currentPlan, isFetchingPlan]);

  // Handle success/cancel URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');

    if (success === '1') {
      toast.success('Subscription activated successfully!');
      // Clean URL
      window.history.replaceState({}, '', '/billing');
      // Refetch subscription to update UI
      setTimeout(() => window.location.reload(), 1000);
    } else if (canceled === '1') {
      toast.info('Checkout canceled. You can try again anytime.');
      // Clean URL
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  // Handle plan selection
  const handlePlanSelect = async (planId, interval) => {
    const planKey = `${planId}-${interval}`;
    if (selectingPlan) return;

    // Check if this is already the current plan
    const isCurrentPlan = currentPlan === planId && (planId === "free" || (isAnnual ? interval === "year" : interval === "month"));
    if (isCurrentPlan) {
      return; // Already on this plan
    }

    setSelectingPlan(planKey);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      if (planId === "free") {
        // Downgrade to free (requires cancellation via portal)
        toast.error("To cancel your subscription, please use the 'Manage Subscription' button.");
        setSelectingPlan(null);
        return;
      }

      // Redirect to Stripe Checkout
      const response = await fetch(`${apiUrl}/api/checkout/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ planId, interval }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start checkout');
      }

      const data = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast.error(error.message || 'Failed to start checkout');
      setSelectingPlan(null);
    }
  };

  // Handle Manage Subscription click
  const handleManageSubscription = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to open billing portal');
      }

      const data = await response.json();
      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error(error.message || 'Failed to open billing portal');
    }
  };

  // Helper: Check if a plan is the current one
  const isCurrentPlanCard = (planId, interval) => {
    if (planId === "free") {
      return currentPlan === "free";
    }
    // For pro plans, check both planId and interval
    return currentPlan === "pro" && (isAnnual ? interval === "year" : interval === "month");
  };

  return (
    <AppLayout>
      <div className="billing-page">
        <div className="top-con">
          <div>
            <h1>Billing & Subsciption</h1>
            <p>Manage your subscription and payment methods</p>
          </div>
        </div>
        <div className="subscription-plan-con">
          <div className="header">
            <h1>Subscription Plans</h1>
            <div className="subscription-card-box">
              {loadingPlans || isFetchingPlan ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                  Loading plans...
                </div>
              ) : (
                <>
                  {/* Free Plan Card */}
                  <div className="subs-card">
                    <div className="boxx">
                      <div className="top-content">
                        <div className="wrap">
                          <h3>Free Plan</h3>
                          <h5>$0/month</h5>
                        </div>
                        <p>
                          Perfect for getting started. Manage your first bookings
                          with all the essential tools at no cost.
                        </p>
                      </div>
                      <Button
                        text={isCurrentPlanCard("free", null) ? "Your Current Plan" : "Select"}
                        onClick={() => !isCurrentPlanCard("free", null) && handlePlanSelect("free", "month")}
                        disabled={isCurrentPlanCard("free", null) || selectingPlan}
                        style={{
                          backgroundColor: isCurrentPlanCard("free", null) ? "#64748B33" : "#0053F1",
                          color: isCurrentPlanCard("free", null) ? "#64748B" : "#fff",
                          cursor: isCurrentPlanCard("free", null) || selectingPlan ? "not-allowed" : "pointer",
                          opacity: selectingPlan ? 0.6 : 1,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pro Monthly Plan Card */}
                  <div className="subs-card">
                    <div className="boxx">
                      <div className="top-content">
                        <div className="wrap">
                          <h3>Pro Plan</h3>
                          <h5>$10/month</h5>
                        </div>
                        <p>
                          Unlock unlimited bookings, custom branding, payment
                          processing, and automated reminders to scale your
                          business.
                        </p>
                      </div>
                      <Button
                        text={isCurrentPlanCard("pro", "month") ? "Your Current Plan" : selectingPlan === "pro-month" ? "Processing..." : "Select"}
                        onClick={() => !isCurrentPlanCard("pro", "month") && handlePlanSelect("pro", "month")}
                        disabled={isCurrentPlanCard("pro", "month") || selectingPlan}
                        style={{
                          backgroundColor: isCurrentPlanCard("pro", "month") ? "#64748B33" : "#0053F1",
                          color: isCurrentPlanCard("pro", "month") ? "#64748B" : "#fff",
                          cursor: isCurrentPlanCard("pro", "month") || selectingPlan ? "not-allowed" : "pointer",
                          opacity: selectingPlan === "pro-month" ? 0.6 : 1,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pro Annual Plan Card */}
                  <div className="subs-card">
                    <div className="boxx">
                      <div className="top-content">
                        <div className="wrap">
                          <h3>Pro Plan</h3>
                          <h5>$96/year</h5>
                        </div>
                        <p>
                          Get the full power of Pro for only $96 a year and save
                          20%. Unlock unlimited bookings, custom branding, and
                          automated reminders while keeping more money in your
                          pocket.
                        </p>
                      </div>
                      <Button
                        text={isCurrentPlanCard("pro", "year") ? "Your Current Plan" : selectingPlan === "pro-year" ? "Processing..." : "Select"}
                        onClick={() => !isCurrentPlanCard("pro", "year") && handlePlanSelect("pro", "year")}
                        disabled={isCurrentPlanCard("pro", "year") || selectingPlan}
                        style={{
                          backgroundColor: isCurrentPlanCard("pro", "year") ? "#64748B33" : "#0053F1",
                          color: isCurrentPlanCard("pro", "year") ? "#64748B" : "#fff",
                          cursor: isCurrentPlanCard("pro", "year") || selectingPlan ? "not-allowed" : "pointer",
                          opacity: selectingPlan === "pro-year" ? 0.6 : 1,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <PricingTable />
        </div>

        {/* Payment Method Section - Only show for Pro users */}
        {currentPlan === "pro" && (
          <div className="add-update-billing-card">
            <h1>Payment Method</h1>
            {paymentMethod ? (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '1rem', color: '#334155', marginBottom: '0.5rem' }}>
                  <strong>{paymentMethod.brand.toUpperCase()}</strong> ending in <strong>••••{paymentMethod.last4}</strong>
                </p>
                <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                  Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                </p>
                <Button
                  text="Manage Subscription"
                  onClick={handleManageSubscription}
                  style={{
                    marginTop: '1rem',
                    backgroundColor: "#0053F1",
                    color: "#fff",
                  }}
                />
                <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.5rem' }}>
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            ) : (
              <div>
                <p className="no-card-text">Setting up payment method...</p>
                <Button
                  text="Manage Subscription"
                  onClick={handleManageSubscription}
                  style={{
                    marginTop: '1rem',
                    backgroundColor: "#0053F1",
                    color: "#fff",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Show message for Free users */}
        {currentPlan === "free" && (
          <div className="add-update-billing-card">
            <h1>Payment Method</h1>
            <p className="no-card-text">
              Upgrade to a Pro plan to add payment methods and start accepting payments.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Billing;
