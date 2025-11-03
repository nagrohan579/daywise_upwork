import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import { Input, Button } from "../../index";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ChangeEmailModal = ({
  show,
  onClose,
  currentEmail,
  onEmailChanged,
}) => {
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      setNewEmail("");
      setOtp("");
      setOtpSent(false);
      setCountdown(0);
    }
  }, [show]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!newEmail) {
      toast.error("Please enter a new email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (newEmail.toLowerCase() === currentEmail?.toLowerCase()) {
      toast.error("New email must be different from your current email");
      return;
    }

    setSendingOtp(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/change-email/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      toast.success('OTP has been sent to your new email address');
      setOtpSent(true);
      setCountdown(20); // 20 second countdown
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }

    setVerifyingOtp(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/change-email/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newEmail, otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify OTP');
      }

      toast.success('Email changed successfully!');
      onClose();
      
      // Refresh page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      className="changeEmailModal"
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>Change Email Address</Modal.Title>
          <p>Enter your new email address and verify it with the OTP sent to your email</p>
        </div>
        <button className="close-btn" onClick={onClose}>
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <div className="content-wrap">
          <div className="input-wrap">
            <Input
              label="New Email Address"
              placeholder="Enter new email address"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={otpSent || sendingOtp || verifyingOtp}
            />
          </div>

          {otpSent && (
            <div className="input-wrap">
              <Input
                label="Enter OTP"
                placeholder="Enter 6-digit OTP"
                type="text"
                value={otp}
                onChange={(e) => {
                  // Only allow numbers and limit to 6 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                maxLength={6}
                disabled={verifyingOtp}
              />
              {countdown > 0 && (
                <p style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  marginTop: '8px',
                  textAlign: 'center'
                }}>
                  Resend OTP available in {countdown} seconds
                </p>
              )}
            </div>
          )}

          <div className="btn-wrap">
            <Button
              text="Cancel"
              type="button"
              onClick={onClose}
              disabled={sendingOtp || verifyingOtp}
              style={{
                backgroundColor: "transparent",
                color: "#64748B",
                border: "1px solid #E0E9FE",
              }}
            />
            {!otpSent ? (
              <Button
                text={sendingOtp ? "Sending..." : "Send OTP"}
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !newEmail || countdown > 0}
              />
            ) : (
              <>
                <Button
                  text={countdown > 0 ? `Resend OTP (${countdown}s)` : "Resend OTP"}
                  type="button"
                  onClick={handleSendOtp}
                  disabled={countdown > 0 || sendingOtp || verifyingOtp}
                  style={{
                    backgroundColor: "#64748B",
                  }}
                />
                <Button
                  text={verifyingOtp ? "Verifying..." : "Verify OTP"}
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || !otp || otp.length !== 6}
                />
              </>
            )}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ChangeEmailModal;

