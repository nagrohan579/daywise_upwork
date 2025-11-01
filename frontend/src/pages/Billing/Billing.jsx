import { useState, useEffect } from "react";
import { AppLayout, Button, PricingTable } from "../../components";
import { toast } from "sonner";
import "./Billing.css";

const Billing = () => {
  // FOR TESTING PURPOSES - REMOVE ONCE TESTED
  const [currentPlan, setCurrentPlan] = useState(null); // null = not yet loaded
  const [isToggling, setIsToggling] = useState(false);
  const [isFetchingPlan, setIsFetchingPlan] = useState(true);

  useEffect(() => {
    // Fetch current subscription
    const fetchSubscription = async () => {
      setIsFetchingPlan(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/user-subscriptions/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          // Set planId from subscription, default to "free" if no subscription exists
          const planId = data.subscription?.planId || "free";
          setCurrentPlan(planId);
          console.log('Fetched subscription plan:', planId); // Debug log
        } else {
          // If endpoint fails, default to free
          console.error('Failed to fetch subscription, defaulting to free');
          setCurrentPlan("free");
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        // On error, default to free
        setCurrentPlan("free");
      } finally {
        setIsFetchingPlan(false);
      }
    };
    fetchSubscription();
  }, []);

  // FOR TESTING PURPOSES - REMOVE ONCE TESTED
  const handleTogglePlan = async () => {
    if (isToggling) return;
    setIsToggling(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const newPlan = currentPlan === "free" ? "pro" : "free";
      
      const response = await fetch(`${apiUrl}/api/subscription/test-toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ planId: newPlan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to toggle plan');
      }

      const result = await response.json();
      // Update plan from response or use the newPlan we sent
      const updatedPlanId = result.subscription?.planId || newPlan;
      setCurrentPlan(updatedPlanId);
      console.log('Plan toggled to:', updatedPlanId); // Debug log
      toast.success(`Successfully switched to ${updatedPlanId === "pro" ? "Pro" : "Free"} plan`);
    } catch (error) {
      console.error('Error toggling plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle plan';
      toast.error(errorMessage);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <AppLayout>
      <div className="billing-page">
        <div className="top-con">
          <div>
            <h1>Billing & Subsciption</h1>
            <p>Manage your subscription and payment methods</p>
          </div>
          {/* FOR TESTING PURPOSES - REMOVE ONCE TESTED */}
          <Button
            text={
              isFetchingPlan 
                ? "Fetching..." 
                : isToggling 
                  ? "Toggling..." 
                  : currentPlan === null 
                    ? "Fetching..." 
                    : currentPlan === "free" 
                      ? "Turn On Pro Plan" 
                      : "Switch to Free Plan"
            }
            onClick={handleTogglePlan}
            disabled={isToggling || isFetchingPlan || currentPlan === null}
            style={{
              backgroundColor: (isToggling || isFetchingPlan || currentPlan === null) ? "#ccc" : "#0053F1",
              color: "#fff",
              opacity: (isToggling || isFetchingPlan || currentPlan === null) ? 0.6 : 1,
              cursor: (isToggling || isFetchingPlan || currentPlan === null) ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          />
        </div>
        <div className="subscription-plan-con">
          <div className="header">
            <h1>Subscription Plans</h1>
            <div className="subscription-card-box">
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
                    text={"Your Current Plan"}
                    style={{ backgroundColor: "#64748B33", color: "#64748B" }}
                  />
                </div>
              </div>
              <div className="subs-card">
                <div className="boxx">
                  <div className="top-content">
                    <div className="wrap">
                      <h3>Pro Plan</h3>
                      <h5>$10/month</h5>
                    </div>
                    <p>
                      Perfect for getting started. Manage your first bookings
                      with all the essential tools at no cost.
                    </p>
                  </div>
                  <Button
                    text={"Select"}
                    style={{ backgroundColor: "#0053F1", color: "#fff" }}
                  />
                </div>
              </div>
              <div className="subs-card">
                <div className="boxx">
                  <div className="top-content">
                    <div className="wrap">
                      <h3>Pro Plan</h3>
                      <h5>$96/month</h5>
                    </div>
                    <p>
                      Get the full power of Pro for only $96 a year and save
                      20%. Unlock unlimited bookings, custom branding, and
                      automated reminders while keeping more money in your
                      pocket.
                    </p>
                  </div>
                  <Button
                    text={"Select"}
                    style={{ backgroundColor: "#0053F1", color: "#fff" }}
                  />
                </div>
              </div>
            </div>
          </div>
          <PricingTable />
        </div>
        <div className="add-update-billing-card">
          <h1>Add/Update Your Payment Method</h1>
          <p className="no-card-text">You have no payment methods added.</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Billing;
