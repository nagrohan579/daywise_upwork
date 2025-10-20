import React, { useState } from "react";
import {
  AppLayout,
  Button,
  Input,
  PremiumIcon,
  PreviewBookingModal,
  ToggleSwitch,
} from "../../components";
import { RiDeleteBin5Line } from "react-icons/ri";

import "./Branding.css";

const Branding = () => {
  const [showPreviewBooking, setShowPreviewBooking] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [profileUrl, setProfileUrl] = useState(null);
  const [isShownName, setIsShownName] = useState(true);
  const [isShownProfilePic, setIsShownProfilePic] = useState(true);
  const [toggleDaywiseBranding, setToggleDayWiseBranding] = useState(true);

  const toggleHandlerShowName = () => {
    setIsShownName((prev) => !prev);
  };
  const toggleHandlerShowProfile = () => {
    setIsShownProfilePic((prev) => !prev);
  };
  const toggleHandlerDayWiseBranding = () => {
    setToggleDayWiseBranding((pre) => !pre);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // In a real application, you would upload this file to a server,
      // get a public URL back, and then set the state.
      // For this example, we'll use a local URL for display:
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      console.log("File selected:", file.name);
    }
  };

  const handleDelete = () => {
    // Logic to delete the logo on the server, then clear the state
    setLogoUrl(null);
    console.log("Logo deleted.");
  };

  // We use a hidden file input and trigger it with a visible button click.
  const triggerFileInput = () => {
    document.getElementById("logo-upload-input").click();
  };

  // Set Profile Picture
  const handleFileUploadAvatar = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileUrl(url);
      console.log("File selected:", file.name);
    }
  };
  const handleDeleteAvatar = () => {
    // Logic to delete the logo on the server, then clear the state
    setProfileUrl(null);
    console.log("Logo deleted.");
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
                >
                  {logoUrl ? "Update Logo" : "Upload logo"}
                </button>

                {/* Delete button shown only when a logo is uploaded */}
                {logoUrl && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={handleDelete}
                  >
                    <RiDeleteBin5Line size={18} />
                    Delete
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
              placeholder={"Type your name here"}
              style={{ boxShadow: "0px 1px 2px 0px #0000000D" }}
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
                  <button onClick={triggerFileInputAvatar}>
                    {profileUrl ? "Update Picture" : "Upload Picture"}
                  </button>
                  {/* Delete button shown only when a logo is uploaded */}
                  {profileUrl && (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={handleDeleteAvatar}
                    >
                      <RiDeleteBin5Line size={18} />
                      Delete
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
                  style={{ color: isShownProfilePic ? "#64748B33" : "#64748B" }}
                >
                  Hide
                </span>

                <ToggleSwitch
                  checked={toggleDaywiseBranding}
                  onchange={toggleHandlerDayWiseBranding}
                />
                <span
                  className="toggle-label "
                  style={{ color: isShownProfilePic ? "#64748B" : "#64748B33" }}
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
            <div className="selection-color-con">
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
          <div className="btn-submit-con">
            <Button
              text={"Cancel"}
              style={{
                backgroundColor: "transparent",
                color: "#64748B",
                border: "1px solid #E0E9FE",
              }}
              onClick={() => setShowServiceModal(false)}
            />
            <Button text={"Save Changes"} type="submit" />
          </div>
        </div>
      </div>
      <PreviewBookingModal
        showPreviewBooking={showPreviewBooking}
        setShowPreviewBooking={setShowPreviewBooking}
      />
    </AppLayout>
  );
};

export default Branding;
