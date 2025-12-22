import React, { useState } from 'react';
import { CheckmarkIcon, ShieldCheckIcon, RefreshArrowsIcon, PadlockUnlockedIcon } from '../../SVGICONS/Svg';
import { toast } from 'sonner';
import './modal.css';

const UpgradeModal = ({ show, onClose }) => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!show) return null;

  const features = [
    "1 booking calendar",
    "Unlimited bookings per month",
    "Unlimited appointment/service types",
    "Unlimited intake forms",
    "Email confirmations",
    "24-hour email reminders",
    "Custom booking link",
    "Google Calendar integration",
    "Custom branding",
    "Payment processing (Stripe)",
    "Priority support"
  ];

  const handleUpgrade = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    const planId = "pro";
    const interval = isAnnual ? "year" : "month";
    const planKey = `${planId}-${interval}`;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      // Store flag in sessionStorage to detect browser back button
      sessionStorage.setItem('selectingPlan', planKey);
      // Close modal and redirect to Stripe Checkout
      onClose();
      window.location.href = data.url;
    } catch (error) {
      console.error('Error starting checkout:', error);
      toast.error(error.message || 'Failed to start checkout');
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="upgrade-modal-close-btn" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="upgrade-modal-container">
          {/* Left Column - Features and Pricing */}
          <div className="upgrade-modal-left">
            {/* Header */}
            <div className="upgrade-modal-header">
              <h2>Upgrade to<span className="gradient-text">Daywise Pro</span></h2>
              <p>Get unlimited access to all features</p>
            </div>

            {/* Features List */}
            <div className="upgrade-modal-features">
              {features.map((feature, index) => (
                <div key={index} className="upgrade-modal-feature-item">
                  <div className="upgrade-modal-check-icon">
                    <CheckmarkIcon />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Pricing Options */}
            <div className="upgrade-modal-pricing">
              <div className="upgrade-modal-pricing-buttons">
                <button
                  className={`upgrade-pricing-btn ${isAnnual ? 'active' : ''}`}
                  onClick={() => setIsAnnual(true)}
                >
                  <span>Yearly $96</span>
                  <span className={`saving-badge ${isAnnual ? 'show' : 'hide'}`}>
                    SAVING 20%
                  </span>
                </button>
                <button
                  className={`upgrade-pricing-btn ${!isAnnual ? 'active' : ''}`}
                  onClick={() => setIsAnnual(false)}
                >
                  <span>Monthly $10</span>
                </button>
              </div>

              {/* Upgrade Button */}
              <div className="upgrade-modal-cta">
                <button 
                  className="upgrade-now-btn" 
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  style={{ opacity: isProcessing ? 0.6 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
                >
                  <span>{isProcessing ? 'Processing...' : 'Upgrade Now'}</span>
                </button>
                <p className="upgrade-no-risk">No risk, no payment today</p>
              </div>
            </div>
          </div>

          {/* Right Column - Control Card */}
          <div className="upgrade-modal-right">
            <div className="upgrade-control-card">
              {/* Icon */}
              <div className="upgrade-control-icon">
                <svg width="129" height="118" viewBox="0 0 129 118" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M126.095 48.1161L104.684 10.8839C100.811 4.15152 93.6575 0 85.9116 0H43.0884C35.3425 0 28.1892 4.15152 24.3163 10.8839L2.90472 48.1161C-0.968241 54.8485 -0.968241 63.1446 2.90472 69.8839L24.3163 107.116C28.1892 113.848 35.3425 118 43.0884 118H85.9116C93.6575 118 100.811 113.848 104.684 107.116L126.095 69.8839C129.968 63.1515 129.968 54.8554 126.095 48.1161ZM112.754 65.9192C112.712 66.0161 112.685 66.1129 112.636 66.2098C112.567 66.362 112.478 66.5073 112.402 66.6526C112.402 66.6665 112.388 66.6803 112.381 66.6872C112.264 66.9156 112.147 67.1508 112.016 67.3791L103.54 82.124L95.4975 96.1007C92.5135 101.297 86.9935 104.494 81.0187 104.494H47.9951C42.0203 104.494 36.5003 101.297 33.5163 96.1007L17.0045 67.3861C14.0205 62.1898 14.0205 55.7964 17.0045 50.6001L33.5163 21.8854C35.7767 17.9484 39.498 15.1669 43.7638 14.0391C46.0242 13.2503 48.4293 12.8213 50.8964 12.8213H59.4762C62.2534 12.8213 64.5069 15.0838 64.5069 17.8723V53.9559C64.5069 56.7374 66.7604 58.9931 69.5376 58.9931H77.3456H98.509L108.095 58.9862C111.685 58.9862 114.077 62.6326 112.76 65.9123L112.754 65.9192Z" fill="#0053F1"/>
                </svg>
              </div>

              {/* Content */}
              <div className="upgrade-control-content">
                <h3>You're always in control</h3>
                <div className="upgrade-control-items">
                  <div className="upgrade-control-item">
                    <div className="upgrade-control-item-icon">
                      <ShieldCheckIcon />
                    </div>
                    <div className="upgrade-control-item-text">
                      <div className="upgrade-control-item-title">Today</div>
                      <div className="upgrade-control-item-desc">Pro features unlock instantly</div>
                    </div>
                  </div>
                  <div className="upgrade-control-item">
                    <div className="upgrade-control-item-icon">
                      <RefreshArrowsIcon />
                    </div>
                    <div className="upgrade-control-item-text">
                      <div className="upgrade-control-item-title">Any time</div>
                      <div className="upgrade-control-item-desc">Switch back to Free</div>
                    </div>
                  </div>
                  <div className="upgrade-control-item">
                    <div className="upgrade-control-item-icon">
                      <PadlockUnlockedIcon />
                    </div>
                    <div className="upgrade-control-item-text">
                      <div className="upgrade-control-item-title">No commitment</div>
                      <div className="upgrade-control-item-desc">You're in control of your plan</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;

