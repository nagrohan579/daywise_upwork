import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import { Input, Button } from "../../index";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ChangePasswordModal = ({
  show,
  onClose,
  userEmail,
  onPasswordChanged,
}) => {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [passwordValue, setPasswordValue] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return { strength: "none", percentage: 0, label: "" };

    let score = 0;
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    if (checks.length) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    if (score <= 20) return { strength: "weak", percentage: 25, label: "Weak" };
    if (score <= 40) return { strength: "poor", percentage: 50, label: "Poor" };
    if (score <= 60) return { strength: "fair", percentage: 75, label: "Fair" };
    if (score <= 80) return { strength: "good", percentage: 87.5, label: "Good" };
    return { strength: "strong", percentage: 100, label: "Excellent" };
  };

  // Get missing password requirements
  const getMissingRequirements = (password) => {
    const requirements = [];
    
    if (!password || password.length < 12) {
      requirements.push("Password must be at least 12 characters long");
    }
    if (!password || !/[A-Z]/.test(password)) {
      requirements.push("You need at least one capital letter");
    }
    if (!password || !/[a-z]/.test(password)) {
      requirements.push("You need at least one lowercase letter");
    }
    if (!password || !/[0-9]/.test(password)) {
      requirements.push("You need at least one number");
    }
    if (!password || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      requirements.push("You need at least one special character");
    }

    return requirements;
  };

  const passwordStrength = calculatePasswordStrength(passwordValue);
  const missingRequirements = getMissingRequirements(passwordValue);

  // Reset form when modal closes
  useEffect(() => {
    if (!show) {
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpSent(false);
      setOtpVerified(false);
      setCountdown(0);
      setPasswordValue("");
      setIsPasswordFocused(false);
    }
  }, [show]);

  // Reset password focus if password becomes empty
  useEffect(() => {
    if (!passwordValue) {
      setIsPasswordFocused(false);
    }
  }, [passwordValue]);

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
    setSendingOtp(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/change-password/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send OTP');
      }

      toast.success('OTP has been sent to your email address');
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
      const response = await fetch(`${apiUrl}/api/users/change-password/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify OTP');
      }

      toast.success('OTP verified successfully');
      setOtpVerified(true);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters long");
      return;
    }

    // Check password requirements
    const missing = getMissingRequirements(newPassword);
    if (missing.length > 0) {
      toast.error("Password does not meet all requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/users/change-password/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      toast.success('Password changed successfully!');
      onClose();
      
      // Refresh page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      className="changePasswordModal"
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>Change Password</Modal.Title>
          <p>Verify your email with the OTP sent to your email address, then set a new password</p>
        </div>
        <button className="close-btn" onClick={onClose}>
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <div className="content-wrap">
          {!otpSent ? (
            <div className="btn-wrap" style={{ marginTop: 0 }}>
              <Button
                text="Cancel"
                type="button"
                onClick={onClose}
                disabled={sendingOtp}
                style={{
                  backgroundColor: "transparent",
                  color: "#64748B",
                  border: "1px solid #E0E9FE",
                }}
              />
              <Button
                text={sendingOtp ? "Sending..." : "Send OTP"}
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || countdown > 0}
              />
            </div>
          ) : (
            <>
              {!otpVerified ? (
                <>
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
                      disabled={verifyingOtp || otpVerified}
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

                  <div className="btn-wrap">
                    <Button
                      text="Cancel"
                      type="button"
                      onClick={onClose}
                      disabled={verifyingOtp}
                      style={{
                        backgroundColor: "transparent",
                        color: "#64748B",
                        border: "1px solid #E0E9FE",
                      }}
                    />
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
                  </div>
                </>
              ) : (
                <>
                  <div className="input-wrap">
                    <Input
                      label="New Password"
                      placeholder="Enter new password (min 12 characters)"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordValue(e.target.value);
                      }}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => {
                        // Keep it visible if there's content, hide if empty
                        if (!passwordValue) {
                          setIsPasswordFocused(false);
                        }
                      }}
                      disabled={changingPassword}
                    />
                    {isPasswordFocused && passwordValue && (
                      <div className="password-strength-container">
                        <div className="password-strength-row">
                          <div className="password-strength-bar">
                            <div 
                              className={`password-strength-fill password-strength-${passwordStrength.strength}`}
                              style={{ width: `${passwordStrength.percentage}%` }}
                            />
                          </div>
                          {passwordStrength.label && (
                            <div className={`password-strength-label password-strength-${passwordStrength.strength}`}>
                              {passwordStrength.label}
                            </div>
                          )}
                        </div>
                        {missingRequirements.length > 0 && (
                          <div className="password-requirements">
                            {missingRequirements.map((req, index) => (
                              <div key={index} className="password-requirement-item">
                                {req}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="input-wrap">
                    <Input
                      label="Confirm New Password"
                      placeholder="Confirm new password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={changingPassword}
                    />
                  </div>

                  <div className="btn-wrap">
                    <Button
                      text="Cancel"
                      type="button"
                      onClick={onClose}
                      disabled={changingPassword}
                      style={{
                        backgroundColor: "transparent",
                        color: "#64748B",
                        border: "1px solid #E0E9FE",
                      }}
                    />
                    <Button
                      text={changingPassword ? "Changing..." : "Change Password"}
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || missingRequirements.length > 0}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ChangePasswordModal;

