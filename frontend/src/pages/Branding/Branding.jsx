import React, { useState, useEffect } from "react";
import {
  AppLayout,
  Button,
  Input,
  PremiumIcon,
  PreviewBookingModal,
  ToggleSwitch,
} from "../../components";
import { RiDeleteBin5Line } from "react-icons/ri";
import { toast } from "sonner";

import "./Branding.css";

const Branding = () => {
  const [showPreviewBooking, setShowPreviewBooking] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [profileUrl, setProfileUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [isShownName, setIsShownName] = useState(true);
  const [isShownProfilePic, setIsShownProfilePic] = useState(true);
  const [toggleDaywiseBranding, setToggleDayWiseBranding] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [deletingProfilePic, setDeletingProfilePic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingProfilePic, setSavingProfilePic] = useState(false);
  const [savingDaywiseBranding, setSavingDaywiseBranding] = useState(false);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [hasCustomBranding, setHasCustomBranding] = useState(false); // Pro plan feature

  // Fetch existing branding data and user features on mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        // Fetch both branding data and features in parallel
        const [brandingResponse, featuresResponse] = await Promise.all([
          fetch(`${apiUrl}/api/branding`, {
            credentials: 'include',
          }),
          fetch(`${apiUrl}/api/user-subscriptions/me`, {
            credentials: 'include',
          })
        ]);

        // Process features first
        let customBranding = false;
        if (featuresResponse.ok) {
          const featuresData = await featuresResponse.json();
          customBranding = featuresData.features?.customBranding || false;
          setHasCustomBranding(customBranding);
          
          // For free plan users, force daywise branding to be ON
          if (!customBranding) {
            setToggleDayWiseBranding(true);
          }
        } else {
          // On error, assume free plan and force branding ON
          customBranding = false;
          setHasCustomBranding(false);
          setToggleDayWiseBranding(true);
        }

        // Process branding data
        if (brandingResponse.ok) {
          const data = await brandingResponse.json();
          console.log('Fetched branding data:', data);
          if (data.logoUrl) {
            console.log('Setting logo URL:', data.logoUrl);
            setLogoUrl(data.logoUrl);
          }
          if (data.profilePictureUrl) {
            console.log('Setting profile URL:', data.profilePictureUrl);
            setProfileUrl(data.profilePictureUrl);
          }
          if (data.displayName !== undefined) {
            setDisplayName(data.displayName || "");
          }
          if (data.showDisplayName !== undefined) setIsShownName(data.showDisplayName);
          if (data.showProfilePicture !== undefined) setIsShownProfilePic(data.showProfilePicture);
          
          // Only set usePlatformBranding from data if user has custom branding feature
          // Otherwise, it's already forced to true above
          if (data.usePlatformBranding !== undefined && customBranding) {
            setToggleDayWiseBranding(data.usePlatformBranding);
          }
        } else {
          console.error('Failed to fetch branding:', brandingResponse.status);
        }
      } catch (error) {
        console.error('Error fetching branding or features:', error);
        // On error, assume free plan and force branding ON
        setHasCustomBranding(false);
        setToggleDayWiseBranding(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Auto-save function for branding settings
  const saveBrandingSettings = async (updates) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Get current branding to preserve colors and other settings
      const currentBrandingResponse = await fetch(`${apiUrl}/api/branding`, {
        credentials: 'include',
      });
      
      let primary = '#ef4444';
      let secondary = '#f97316';
      let accent = '#3b82f6';
      
      if (currentBrandingResponse.ok) {
        const currentBranding = await currentBrandingResponse.json();
        primary = currentBranding.primary || primary;
        secondary = currentBranding.secondary || secondary;
        accent = currentBranding.accent || accent;
      }

      const response = await fetch(`${apiUrl}/api/branding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          primary,
          secondary,
          accent,
          ...updates,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save branding settings');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving branding settings:', error);
      throw error;
    }
  };

  const toggleHandlerShowName = async () => {
    if (savingName) return; // Prevent clicks while saving
    const newValue = !isShownName;
    setSavingName(true);
    
    try {
      // Don't update UI yet - keep toggle in current position while saving
      await saveBrandingSettings({
        displayName: displayName,
        showDisplayName: newValue,
        showProfilePicture: isShownProfilePic,
        usePlatformBranding: toggleDaywiseBranding,
      });
      
      // Only update UI after successful save
      setIsShownName(newValue);
      toast.success(newValue ? "Display name is now shown" : "Display name is now hidden");
    } catch (error) {
      toast.error(error.message || 'Failed to update display name setting');
    } finally {
      setSavingName(false);
    }
  };

  const toggleHandlerShowProfile = async () => {
    if (savingProfilePic) return; // Prevent clicks while saving
    const newValue = !isShownProfilePic;
    setSavingProfilePic(true);
    
    try {
      // Don't update UI yet - keep toggle in current position while saving
      await saveBrandingSettings({
        displayName: displayName,
        showDisplayName: isShownName,
        showProfilePicture: newValue,
        usePlatformBranding: toggleDaywiseBranding,
      });
      
      // Only update UI after successful save
      setIsShownProfilePic(newValue);
      toast.success(newValue ? "Profile picture is now shown" : "Profile picture is now hidden");
    } catch (error) {
      toast.error(error.message || 'Failed to update profile picture setting');
    } finally {
      setSavingProfilePic(false);
    }
  };

  const toggleHandlerDayWiseBranding = async () => {
    // Free plan users cannot disable daywise branding
    if (!hasCustomBranding) {
      toast.error("This feature is available in Pro plan.");
      return;
    }
    
    if (savingDaywiseBranding) return; // Prevent clicks while saving
    const newValue = !toggleDaywiseBranding;
    setSavingDaywiseBranding(true);
    
    try {
      // Don't update UI yet - keep toggle in current position while saving
      await saveBrandingSettings({
        displayName: displayName,
        showDisplayName: isShownName,
        showProfilePicture: isShownProfilePic,
        usePlatformBranding: newValue,
      });
      
      // Only update UI after successful save
      setToggleDayWiseBranding(newValue);
      toast.success(newValue ? "Daywise branding is now shown" : "Daywise branding is now hidden");
    } catch (error) {
      toast.error(error.message || 'Failed to update Daywise branding setting');
    } finally {
      setSavingDaywiseBranding(false);
    }
  };

  // Debounced auto-save for display name
  useEffect(() => {
    if (loading) return; // Don't save on initial load
    
    const timeoutId = setTimeout(async () => {
      if (displayName === undefined || displayName === null) return; // Don't save if not initialized
      
      setSavingDisplayName(true);
      try {
        await saveBrandingSettings({
          displayName: displayName,
          showDisplayName: isShownName,
          showProfilePicture: isShownProfilePic,
          usePlatformBranding: toggleDaywiseBranding,
        });
        toast.success("Display name saved");
      } catch (error) {
        toast.error(error.message || 'Failed to save display name');
      } finally {
        setSavingDisplayName(false);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      toast.error('Only PNG, JPG, and GIF files are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setLogoUploading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/api/branding/logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('Logo upload response:', data);
      setLogoUrl(data.logoUrl);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!logoUrl || deletingLogo) return;

    const previous = logoUrl;
    setDeletingLogo(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/branding/logo`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Delete failed');
      }

      toast.success('Logo removed');
      // Only clear logoUrl after successful deletion and toast
      setLogoUrl(null);
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error(error.message || 'Failed to delete logo');
      // logoUrl stays as previous since we didn't clear it
    } finally {
      setDeletingLogo(false);
    }
  };

  // We use a hidden file input and trigger it with a visible button click.
  const triggerFileInput = () => {
    // Free plan users cannot upload logo
    if (!hasCustomBranding) {
      toast.error("Logo upload is available in Pro plan.");
      return;
    }
    document.getElementById("logo-upload-input").click();
  };

  // Set Profile Picture
  const handleFileUploadAvatar = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
      toast.error('Only PNG, JPG, and GIF files are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setProfileUploading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiUrl}/api/branding/profile`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('Profile picture upload response:', data);
      setProfileUrl(data.profilePictureUrl);
      toast.success('Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setProfileUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profileUrl || deletingProfilePic) return;

    const previous = profileUrl;
    setDeletingProfilePic(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/branding/profile`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Delete failed');
      }

      toast.success('Profile picture removed');
      // Only clear profileUrl after successful deletion and toast
      setProfileUrl(null);
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      toast.error(error.message || 'Failed to delete profile picture');
      // profileUrl stays as previous since we didn't clear it
    } finally {
      setDeletingProfilePic(false);
    }
  };

  // We use a hidden file input and trigger it with a visible button click.
  const triggerFileInputAvatar = () => {
    document.getElementById("profile-upload-input").click();
  };


  return (
    <AppLayout>
      <div className="branding-page">
        <div className="top-con-wrap">
          <div className="top-con">
            <h1>
              <PremiumIcon />
              Branding
            </h1>
            <p>
              Customize your brand colors, logo and visual identity. Custom
              branding appears on your booking form
            </p>
          </div>
          <Button
            text={"Preview Booking Form"}
            icon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1.52698 9.2415C1.47522 9.08594 1.47522 8.91781 1.52698 8.76225C2.56723 5.6325 5.51998 3.375 8.99998 3.375C12.4785 3.375 15.4297 5.63025 16.4722 8.7585C16.5247 8.91375 16.5247 9.08175 16.4722 9.23775C15.4327 12.3675 12.48 14.625 8.99998 14.625C5.52148 14.625 2.56948 12.3697 1.52698 9.2415Z"
                  stroke="white"
                  stroke-width="1.125"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M11.25 9C11.25 9.59674 11.0129 10.169 10.591 10.591C10.169 11.0129 9.59674 11.25 9 11.25C8.40326 11.25 7.83097 11.0129 7.40901 10.591C6.98705 10.169 6.75 9.59674 6.75 9C6.75 8.40326 6.98705 7.83097 7.40901 7.40901C7.83097 6.98705 8.40326 6.75 9 6.75C9.59674 6.75 10.169 6.98705 10.591 7.40901C11.0129 7.83097 11.25 8.40326 11.25 9Z"
                  stroke="white"
                  stroke-width="1.125"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            }
            onClick={() => setShowPreviewBooking(true)}
          />
        </div>

        {loading ? (
          <div className="branding-loading">
            <div className="branding-spinner"></div>
            <p className="branding-loading-text">Loading branding data...</p>
          </div>
        ) : (
          <div className="main-wrapper">
          <div className="logo-con">
            <h3>
              <PremiumIcon />
              Logo
            </h3>
            <div className="upload-con">
              <div className="logo-display-box">
                {logoUrl ? (
                  // State: Logo uploaded
                  <img
                    src={logoUrl}
                    alt="Uploaded Logo"
                    className="uploaded-logo"
                  />
                ) : (
                  // State: No logo
                  <div className="no-logo-placeholder">No Logo</div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                id="logo-upload-input"
                accept="image/jpeg,image/gif,image/png"
                onChange={handleFileUpload}
                style={{ display: "none" }} // Hide the default input
              />

              <div className="upload-controls">
                {/* Button to trigger the file input */}
                <button
                  type="button"
                  className="upload-btn"
                  onClick={triggerFileInput}
                  disabled={logoUploading || !hasCustomBranding}
                  style={{
                    opacity: !hasCustomBranding ? 0.6 : 1,
                    cursor: !hasCustomBranding ? "not-allowed" : "pointer",
                    backgroundColor: !hasCustomBranding ? "#ccc" : undefined,
                  }}
                >
                  {logoUploading ? "Uploading..." : (logoUrl ? "Update Logo" : "Upload logo")}
                </button>

                {/* Delete button shown only when a logo is uploaded */}
                {logoUrl && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={handleDelete}
                    disabled={deletingLogo}
                  >
                    {deletingLogo ? (
                      "Deleting..."
                    ) : (
                      <>
                        <RiDeleteBin5Line size={18} />
                        Delete
                      </>
                    )}
                  </button>
                )}

                {!logoUrl && (
                  <span className="file-info">
                    JPG, GIF, or PNG. Max size of 5MB
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="user-display-name-con">
            <div className="top">
              <h3>User Display Name</h3>
              <div className="toggle-con">
                <span
                  className="toggle-label "
                  style={{ color: isShownName ? "#64748B33" : "#64748B" }}
                >
                  Hide
                </span>

                <ToggleSwitch
                  checked={isShownName}
                  onchange={toggleHandlerShowName}
                  disabled={savingName}
                />
                <span
                  className="toggle-label "
                  style={{ color: isShownName ? "#64748B" : "#64748B33" }}
                >
                  Show
                </span>
              </div>
            </div>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={savingDisplayName ? "Saving..." : "Type your name here"}
              style={{ boxShadow: "0px 1px 2px 0px #0000000D", opacity: savingDisplayName ? 0.6 : 1 }}
              readOnly={savingDisplayName}
            />
          </div>

          <div className="user-display-name-con user-picture">
            <div className="top">
              <h3>User Profile Picture</h3>
              <div className="toggle-con">
                <span
                  className="toggle-label "
                  style={{ color: isShownProfilePic ? "#64748B33" : "#64748B" }}
                >
                  Hide
                </span>

                <ToggleSwitch
                  checked={isShownProfilePic}
                  onchange={toggleHandlerShowProfile}
                  disabled={savingProfilePic}
                />
                <span
                  className="toggle-label "
                  style={{ color: isShownProfilePic ? "#64748B" : "#64748B33" }}
                >
                  Show
                </span>
              </div>
            </div>
            <div className="upload-picture-con">
              <div className="left">
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt="Uploaded Logo"
                    className="uploaded-logo"
                  />
                ) : (
                  <img src="/assets/images/avatar.png" alt="avatar" />
                )}
              </div>
              <div className="right">
                {/* Hidden File Input */}
                <input
                  type="file"
                  id="profile-upload-input"
                  accept="image/jpeg,image/gif,image/png"
                  onChange={handleFileUploadAvatar}
                  style={{ display: "none" }}
                />
                <div className="btn-wrap">
                  <button
                    onClick={triggerFileInputAvatar}
                    disabled={profileUploading}
                  >
                    {profileUploading ? "Uploading..." : (profileUrl ? "Update Picture" : "Upload Picture")}
                  </button>
                  {/* Delete button shown only when a logo is uploaded */}
                  {profileUrl && (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={handleDeleteAvatar}
                      disabled={deletingProfilePic}
                    >
                      {deletingProfilePic ? (
                        "Deleting..."
                      ) : (
                        <>
                          <RiDeleteBin5Line size={18} />
                          Delete
                        </>
                      )}
                    </button>
                  )}
                </div>
                <span>JPG, GIF, or PNG. Max size of 5MB</span>
              </div>
            </div>
            <div className="info-text">
              <p>
                Make your bookings feel more personal by uploading a profile
                photo so clients know who they’re meeting.
              </p>
            </div>
          </div>

          <div className="user-display-name-con daywise-branding">
            <div className="top">
              <h3>
                <PremiumIcon /> Use Daywise branding
              </h3>
              <div className="toggle-con">
                <span
                  className="toggle-label "
                  style={{ color: toggleDaywiseBranding ? "#64748B33" : "#64748B" }}
                >
                  Hide
                </span>

                <ToggleSwitch
                  checked={toggleDaywiseBranding}
                  onchange={toggleHandlerDayWiseBranding}
                  disabled={savingDaywiseBranding || !hasCustomBranding}
                />
                <span
                  className="toggle-label "
                  style={{ color: toggleDaywiseBranding ? "#64748B" : "#64748B33" }}
                >
                  Show
                </span>
              </div>
            </div>

            <div className="info-text">
              <p>
                Daywise’s branding will be displayed on your scheduling page,
                notifications, and confirmations.
              </p>
            </div>
          </div>

          <div className="user-display-name-con brand-color-con">
            <div className="top">
              <h3>
                <PremiumIcon /> Your Brand Colors
              </h3>
            </div>
            <div 
              className="selection-color-con"
              style={{
                opacity: !hasCustomBranding ? 0.6 : 1,
                pointerEvents: !hasCustomBranding ? "none" : "auto",
                cursor: !hasCustomBranding ? "not-allowed" : "pointer",
              }}
              onClick={() => {
                if (!hasCustomBranding) {
                  toast.error("Brand colors customization is available in Pro plan.");
                }
              }}
            >
              <div className="color-box">
                <span
                  style={{ backgroundColor: "#CC0B0B" }}
                  className="active"
                />
                <h4>Main color</h4>
              </div>
              <div className="color-box">
                <span style={{ backgroundColor: "#611212" }} />
                <h4>Secondary Color</h4>
              </div>
              <div className="color-box">
                <span style={{ backgroundColor: "#000000" }} />
                <h4>Text Color</h4>
              </div>
            </div>
          </div>

          <div className="btn-preview-form">
            <Button
              text={"Preview Booking Form"}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1.52698 9.2415C1.47522 9.08594 1.47522 8.91781 1.52698 8.76225C2.56723 5.6325 5.51998 3.375 8.99998 3.375C12.4785 3.375 15.4297 5.63025 16.4722 8.7585C16.5247 8.91375 16.5247 9.08175 16.4722 9.23775C15.4327 12.3675 12.48 14.625 8.99998 14.625C5.52148 14.625 2.56948 12.3697 1.52698 9.2415Z"
                    stroke="#64748B"
                    stroke-width="1.125"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M11.25 9C11.25 9.59674 11.0129 10.169 10.591 10.591C10.169 11.0129 9.59674 11.25 9 11.25C8.40326 11.25 7.83097 11.0129 7.40901 10.591C6.98705 10.169 6.75 9.59674 6.75 9C6.75 8.40326 6.98705 7.83097 7.40901 7.40901C7.83097 6.98705 8.40326 6.75 9 6.75C9.59674 6.75 10.169 6.98705 10.591 7.40901C11.0129 7.83097 11.25 8.40326 11.25 9Z"
                    stroke="#64748B"
                    stroke-width="1.125"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              }
              style={{
                width: "100%",
                backgroundColor: "transparent",
                color: "#64748B",
                border: "1px solid #64748B33",
              }}
              onClick={() => setShowPreviewBooking(true)}
            />
          </div>
        </div>
        )}
      </div>
      <PreviewBookingModal
        showPreviewBooking={showPreviewBooking}
        setShowPreviewBooking={setShowPreviewBooking}
      />
    </AppLayout>
  );
};

export default Branding;
