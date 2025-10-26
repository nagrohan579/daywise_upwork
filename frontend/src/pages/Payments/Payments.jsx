import AppLayout from "../../components/Sidebar/Sidebar";
import { IoAdd } from "react-icons/io5";
import { PremiumIcon, StripeIcon } from "../../components/SVGICONS/Svg";
import "./Payments.css";

const Payments = () => {
  const handleConnect = () => {
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

        <div className="stripe-card-container">
          <div className="stripe-card-content">
            <div className="stripe-card-header">
              <StripeIcon />
              <button className="stripe-connect-button" onClick={handleConnect}>
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
      </div>
    </AppLayout>
  );
};

export default Payments;

