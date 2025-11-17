import { useState, useEffect } from "react";
import AppLayout from "../../components/Sidebar/Sidebar";
import { IoAdd } from "react-icons/io5";
import { PremiumIcon, StripeIcon, ConnectedCheckIcon } from "../../components/SVGICONS/Svg";
import { toast } from "sonner";
import HowThisWorksButton from "../../components/HowThisWorksButton";
import "./Payments.css";

const Payments = () => {
  const [hasCustomBranding, setHasCustomBranding] = useState(false); // Pro plan feature
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState(null);

  // Check for OAuth return params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected === 'true') {
      toast.success('Successfully connected to Stripe!');
      // Clean URL
      window.history.replaceState({}, '', '/payments');
      // Refresh status
      fetchStripeStatus();
    } else if (error) {
      toast.error(`Failed to connect: ${decodeURIComponent(error)}`);
      // Clean URL
      window.history.replaceState({}, '', '/payments');
    }
  }, []);

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
      }
    };
    fetchFeatures();
  }, []);

  // Fetch Stripe connection status
  const fetchStripeStatus = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/stripe/status`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.isConnected);
        setStripeAccountId(data.stripeAccountId);
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Stripe status on mount
  useEffect(() => {
    fetchStripeStatus();
  }, []);

  const handleConnect = async () => {
    // Free plan users cannot connect Stripe
    if (!hasCustomBranding) {
      toast.error("Stripe integration is available in Pro plan.");
      return;
    }

    // Redirect to backend OAuth route
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/stripe/connect`;
  };

  const handleVisitDashboard = () => {
    // Open user's Stripe Dashboard in new tab
    if (stripeAccountId) {
      window.open(`https://dashboard.stripe.com/${stripeAccountId}`, "_blank");
    } else {
      // Fallback to generic dashboard
      window.open("https://dashboard.stripe.com", "_blank");
    }
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
        ) : isConnecting ? (
          <div className="payments-loading">
            <div className="payments-spinner"></div>
            <p className="payments-loading-text">Connecting to Stripe...</p>
          </div>
        ) : (
          <div 
            className="stripe-card-container"
            style={{
              opacity: !hasCustomBranding && !isConnected ? 0.6 : 1,
              pointerEvents: !hasCustomBranding && !isConnected ? "none" : "auto",
              cursor: !hasCustomBranding && !isConnected ? "not-allowed" : "pointer",
            }}
          >
          <div className="stripe-card-content">
            <div className="stripe-card-header">
              <StripeIcon />
              {!isConnected ? (
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
              ) : (
                <button 
                  className="stripe-connected-button" 
                  disabled
                >
                  <ConnectedCheckIcon />
                  <span>Connected</span>
                </button>
              )}
            </div>

            <div className="stripe-details">
              <h2>Stripe</h2>
              <p>
                {isConnected 
                  ? "Your Stripe account is connected and ready to accept payments. You can manage payouts, customers, and transactions directly in your Stripe Dashboard."
                  : "Connect your Stripe account to start accepting payments securely through your bookings."
                }
              </p>
            </div>

            {!isConnected ? (
              <div className="stripe-status">
                <div className="status-dot status-dot-red"></div>
                <span className="status-text-red">Not Connected</span>
              </div>
            ) : (
              <>
                <div className="stripe-status">
                  <div className="status-dot status-dot-green"></div>
                  <span className="status-text-green">Connected</span>
                </div>
                <div className="stripe-manage-section">
                  <h3 className="stripe-manage-heading">Manage your payments</h3>
                  <button 
                    className="stripe-visit-dashboard-button"
                    onClick={handleVisitDashboard}
                  >
                    <span>Visit Stripe Dashboard</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>
      <HowThisWorksButton title="How Payments Works" />
    </AppLayout>
  );
};

export default Payments;

