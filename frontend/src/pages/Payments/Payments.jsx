import { useState, useEffect } from "react";
import AppLayout from "../../components/Sidebar/Sidebar";
import { IoAdd } from "react-icons/io5";
import { PremiumIcon, StripeIcon } from "../../components/SVGICONS/Svg";
import { toast } from "sonner";
import "./Payments.css";

const Payments = () => {
  const [hasCustomBranding, setHasCustomBranding] = useState(false); // Pro plan feature
  const [loading, setLoading] = useState(true);

  // Fetch user features to check plan
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/user-subscriptions/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setHasCustomBranding(data.features?.customBranding || false);
        }
      } catch (error) {
        console.error('Error fetching features:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatures();
  }, []);

  const handleConnect = () => {
    // Free plan users cannot connect Stripe
    if (!hasCustomBranding) {
      toast.error("Stripe integration is available in Pro plan.");
      return;
    }
    // TODO: Implement Stripe connection
    console.log("Connect to Stripe");
  };

  return (
    <AppLayout>
      <div className="payments-page">
        <div className="payments-header">
          <div className="wrap">
            <div className="payments-header-title-wrap">
              <PremiumIcon />
              <h1>Payments</h1>
            </div>
            <p>Connect to Stripe to accept payments</p>
          </div>
        </div>

        {loading ? (
          <div className="payments-loading">
            <div className="payments-spinner"></div>
            <p className="payments-loading-text">Loading payment settings...</p>
          </div>
        ) : (
          <div 
            className="stripe-card-container"
            style={{
              opacity: !hasCustomBranding ? 0.6 : 1,
              pointerEvents: !hasCustomBranding ? "none" : "auto",
              cursor: !hasCustomBranding ? "not-allowed" : "pointer",
            }}
          >
          <div className="stripe-card-content">
            <div className="stripe-card-header">
              <StripeIcon />
              <button 
                className="stripe-connect-button" 
                onClick={handleConnect}
                disabled={!hasCustomBranding}
                style={{
                  backgroundColor: !hasCustomBranding ? "#ccc" : "#0053F1",
                  cursor: !hasCustomBranding ? "not-allowed" : "pointer",
                }}
              >
                <IoAdd size={16} color="#FFFFFF" />
                <span>Connect</span>
              </button>
            </div>

            <div className="stripe-details">
              <h2>Stripe</h2>
              <p>Connect your Stripe account to start accepting payments securely through your bookings.</p>
            </div>

            <div className="stripe-status">
              <div className="status-dot"></div>
              <span>Not Connected</span>
            </div>
          </div>
        </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Payments;

