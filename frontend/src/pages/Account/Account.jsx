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
              onClick={() => toast.error('Account deletion feature coming soon!')}
              style={{ backgroundColor: "#DF0404" }}
            />
          </div>
        </form>
        )}
      </div>
    </AppLayout>
  );
};

export default Account;
