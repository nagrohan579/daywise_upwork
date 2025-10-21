import { useState, useEffect } from "react";
import {
  AppLayout,
  Button,
  GoogleButton,
  Input,
  Select,
} from "../../components";
import { useMobile } from "../../hooks";
import { toast } from "sonner";
import "./Account.css";

const Account = () => {
  const isMobile = useMobile(991);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    country: "",
    timezone: "",
    googleId: null,
  });

  // Country mapping
  const countryMap = {
    "US": "United States",
    "CA": "Canada",
    "GB": "United Kingdom",
    "AU": "Australia",
    "DE": "Germany",
    "FR": "France",
    "IN": "India",
    "JP": "Japan",
    "CN": "China",
    "BR": "Brazil",
  };

  // Timezone mapping
  const timezoneMap = {
    "America/Los_Angeles": "Pacific Time (US & Canada)",
    "America/Denver": "Mountain Time (US & Canada)",
    "America/Chicago": "Central Time (US & Canada)",
    "America/New_York": "Eastern Time (US & Canada)",
    "America/Halifax": "Atlantic Time (Canada)",
    "UTC": "Greenwich Mean Time (GMT)",
    "Europe/Paris": "Central European Time (CET)",
    "Europe/Athens": "Eastern European Time (EET)",
    "Asia/Kolkata": "India Standard Time (IST)",
    "Asia/Shanghai": "China Standard Time (CST)",
    "Asia/Tokyo": "Japan Standard Time (JST)",
    "Australia/Sydney": "Australia Eastern Standard Time (AEST)",
  };

  const getCountryLabel = (code) => countryMap[code] || code;
  const getCountryCode = (label) => {
    const entry = Object.entries(countryMap).find(([_, v]) => v === label);
    return entry ? entry[0] : label;
  };

  const getTimezoneLabel = (value) => timezoneMap[value] || value;
  const getTimezoneValue = (label) => {
    const entry = Object.entries(timezoneMap).find(([_, v]) => v === label);
    return entry ? entry[0] : label;
  };

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        // Not authenticated, redirect to login
        toast.error('Please log in to access your account');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUserData({
        name: data.user.name || "",
        email: data.user.email || "",
        country: data.user.country || "US",
        timezone: data.user.timezone || "UTC",
        googleId: data.user.googleId || null,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Get current user ID
      const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      });
      const meData = await meResponse.json();
      const userId = meData.user.id;

      // Update user data
      const response = await fetch(`${apiUrl}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          businessName: userData.name,
          country: userData.country,
          timezone: userData.timezone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save changes');
      }

      toast.success('Account settings saved successfully!');
      fetchUserData(); // Refresh data
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    fetchUserData(); // Reset to original data
    toast.info('Changes discarded');
  };

  const handleDeleteAccount = async () => {
    // Validate confirmation text
    if (deleteConfirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setDeleting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Get current user ID
      const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (!meResponse.ok) {
        throw new Error('Unable to verify user identity. Please log in again.');
      }

      const meData = await meResponse.json();

      if (!meData || !meData.user || !meData.user.id) {
        throw new Error('Unable to get user information. Please log in again.');
      }

      const userId = meData.user.id;

      // Delete user account
      const response = await fetch(`${apiUrl}/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <AppLayout>
      <div className="account-page">
        <div className="top-con">
          <h1>Account</h1>
          <p>Configure your account settings and information</p>
        </div>
        
        {loading ? (
          <div className="account-loading">
            <div className="account-loading-content">
              <div className="account-spinner"></div>
              <p className="account-loading-text">Loading your business information...</p>
            </div>
          </div>
        ) : (
          <form className="form-my-account" onSubmit={handleSaveChanges}>
          <div className="form-wrap">
            <Input
              label={"Your Name"}
              placeholder={"Enter your name"}
              value={userData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{ boxShadow: "0px 1px 2px 0px #0000000D" }}
            />
            <div className="email-con">
              <Input
                label={"Email Address"}
                placeholder={"Enter your email"}
                type="email"
                value={userData.email}
                disabled={true}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  paddingLeft: "0px",
                  opacity: 0.7,
                }}
              />
              <Button
                text={"Change Email"}
                type="button"
                onClick={() => toast.info('Email change feature coming soon!')}
                style={{
                  border: "1px solid #E0E9FE",
                  background: "transparent",
                  color: "#64748B",
                  width: isMobile ? "150px " : "",
                }}
              />
            </div>
            <div className="email-con">
              <Input
                label={"Password"}
                placeholder={"***************"}
                type="password"
                disabled={true}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  paddingLeft: "0px",
                  opacity: 0.7,
                }}
              />
              <Button
                text={"Change Password"}
                type="button"
                onClick={() => toast.info('Password change feature coming soon!')}
                style={{
                  border: "1px solid #E0E9FE",
                  background: "transparent",
                  color: "#64748B",
                  width: isMobile ? "200px " : "",
                }}
              />
            </div>
            {!userData.googleId && (
              <div className="google-btn-con">
                <GoogleButton 
                  text={"Switch to Google Login"}
                  onClick={() => {
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                    window.location.href = `${apiUrl}/api/auth/google`;
                  }}
                />
              </div>
            )}
            {userData.googleId && (
              <div className="google-btn-con">
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#F0FDF4', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm5.03 7.47l-5.5 5.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 111.06-1.06l1.97 1.97 4.97-4.97a.75.75 0 111.06 1.06z" fill="#10B981"/>
                  </svg>
                  <span style={{ color: '#059669', fontWeight: '500' }}>
                    Connected with Google
                  </span>
                </div>
              </div>
            )}
            <div className="select-con">
              <Select
                placeholder="Select your country"
                label={"Country"}
                value={getCountryLabel(userData.country)}
                onChange={(value) => handleInputChange('country', getCountryCode(value))}
                style={{ backgroundColor: "#F9FAFF", borderRadius: "12px" }}
                options={[
                  "United States",
                  "Canada",
                  "United Kingdom",
                  "Australia",
                  "Germany",
                  "France",
                  "India",
                  "Japan",
                  "China",
                  "Brazil",
                ]}
              />
            </div>
            <div className="select-con">
              <Select
                placeholder="Select your timezone"
                label={"Timezone"}
                value={getTimezoneLabel(userData.timezone)}
                onChange={(value) => handleInputChange('timezone', getTimezoneValue(value))}
                showCurrentTime={true}
                style={{ backgroundColor: "#F9FAFF", borderRadius: "12px" }}
                options={[
                  "Pacific Time (US & Canada)",
                  "Mountain Time (US & Canada)",
                  "Central Time (US & Canada)",
                  "Eastern Time (US & Canada)",
                  "Atlantic Time (Canada)",
                  "Greenwich Mean Time (GMT)",
                  "Central European Time (CET)",
                  "Eastern European Time (EET)",
                  "India Standard Time (IST)",
                  "China Standard Time (CST)",
                  "Japan Standard Time (JST)",
                  "Australia Eastern Standard Time (AEST)",
                ]}
              />
            </div>
          </div>

          <div className="btn-wrap-con">
            <div className="btn-wrap">
              <Button
                text={"Cancel"}
                type="button"
                onClick={handleCancel}
                disabled={saving}
                style={{
                  border: "1px solid #E0E9FE",
                  color: "#64748B",
                  backgroundColor: "transparent",
                }}
              />
              <Button 
                text={saving ? "Saving..." : "Save Changes"} 
                type="submit"
                disabled={saving}
              />
            </div>
            <Button
              text={"Delete Account"}
              type="button"
              onClick={() => setShowDeleteModal(true)}
              style={{ backgroundColor: "#DF0404" }}
            />
          </div>
        </form>
        )}

        {showDeleteModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !deleting) {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
              }
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#FEE2E2',
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="2"
                  >
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: '#1F2937' }}>
                  Delete Account
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
                  This action cannot be undone. This will permanently delete your account and remove all your data including:
                </p>
                <ul style={{ textAlign: 'left', fontSize: '14px', color: '#6B7280', marginLeft: '20px', marginBottom: '24px' }}>
                  <li>All appointment types and bookings</li>
                  <li>Availability schedules and patterns</li>
                  <li>Google Calendar integration</li>
                  <li>Branding and customization settings</li>
                  <li>All other associated data</li>
                </ul>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  disabled={deleting}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                  onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  text="Cancel"
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    border: '1px solid #D1D5DB',
                    backgroundColor: 'white',
                    color: '#374151',
                  }}
                />
                <Button
                  text={deleting ? "Deleting..." : "Delete Account"}
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== "DELETE"}
                  style={{
                    flex: 1,
                    backgroundColor: '#DC2626',
                    opacity: deleteConfirmText !== "DELETE" ? 0.5 : 1,
                    cursor: deleteConfirmText !== "DELETE" ? 'not-allowed' : 'pointer',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Account;
