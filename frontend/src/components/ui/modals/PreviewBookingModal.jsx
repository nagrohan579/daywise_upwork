import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import Select from "../Input/Select";
import SingleCalendar from "../../Calendar/SingleCalendar";
import CroppedImage from "../CroppedImage/CroppedImage";
import { useState, useEffect } from "react";

const PreviewBookingModal = ({ 
  showPreviewBooking, 
  setShowPreviewBooking,
  logoUrl,
  profileUrl,
  userPicture,
  displayName,
  isShownName,
  isShownProfilePic,
  toggleDaywiseBranding,
  logoCropData,
  profileCropData,
  businessName = "Business Name Here",
  welcomeMessage = "Your business welcome message appears here.",
  appointmentTypes = ["30 Minute Appointment", "60 Minute Appointment", "90 Minute Appointment"],
  selectedAppointmentTypeName = "30 Minute Appointment",
  currentTimezone = null,
  timezoneOptions = [],
  primaryColor = "#0053F1",
  secondaryColor = "#64748B",
  accentColor = "#121212"
}) => {
  // Dummy service for preview (not using actual appointment types)
  const dummyService = {
    name: "Consultation Session",
    description: "A comprehensive consultation to discuss your needs and requirements."
  };

  // Generate mock time slots: 9:00 AM, 9:30 AM, 10:00 AM, 10:30 AM, 11:00 AM
  const mockTimeSlots = [
    { display: "9:00 AM", original: "09:00" },
    { display: "9:30 AM", original: "09:30" },
    { display: "10:00 AM", original: "10:00" },
    { display: "10:30 AM", original: "10:30" },
    { display: "11:00 AM", original: "11:00" }
  ];

  // Set a default selected date (tomorrow)
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  const [selectedDate] = useState(defaultDate);
  
  // Pre-select the third time slot (10:00 AM) to show the split view
  const [selectedTime] = useState("10:00");

  // Set CSS variables when colors change
  useEffect(() => {
    if (showPreviewBooking) {
      const root = document.documentElement;
      root.style.setProperty('--main-color', primaryColor);
      root.style.setProperty('--secondary-color', secondaryColor);
      root.style.setProperty('--text-color', accentColor);
    }
  }, [showPreviewBooking, primaryColor, secondaryColor, accentColor]);

  return (
    <Modal
      show={showPreviewBooking}
      onHide={() => setShowPreviewBooking(false)}
      centered
      backdrop="static"
      className="previewBookingModal"
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>This is a Preview</Modal.Title>
        </div>
        <button
          className="close-btn"
          onClick={() => setShowPreviewBooking(false)}
        >
          <IoClose size={20} color="var(--secondary-color)" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <div className="main-wrapper preview-main-wrapper">
          <div className="steps-one preview-steps-one">
            <div className="left preview-left">
              {toggleDaywiseBranding !== false && (
                <div className="daywise-branding">
                  <button className="powered-by-button">Powered by Daywise</button>
                </div>
              )}

              <div className="profile-con">
                {logoUrl && (
                  <div className="logo-wrapper">
                    <CroppedImage
                      src={logoUrl}
                      cropData={logoCropData}
                      alt="Logo"
                      className={`logo-image ${logoUrl.toLowerCase().endsWith('.gif') ? 'gif-logo' : ''}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {isShownProfilePic && (profileUrl || userPicture) && (
                  <div className="profile-picture-wrapper">
                    <CroppedImage
                      src={profileUrl || userPicture}
                      cropData={profileUrl ? profileCropData : null}
                      fallbackSrc={profileUrl && userPicture ? userPicture : null}
                      alt="Profile Picture"
                      className="profile-picture"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // If branding picture fails, try users table picture as fallback
                        if (profileUrl && userPicture && e.currentTarget.src !== userPicture) {
                          console.error('Failed to load branding profile picture, trying fallback:', userPicture);
                          e.currentTarget.src = userPicture;
                          e.currentTarget.onerror = () => {
                            e.currentTarget.style.display = 'none';
                          };
                        } else {
                          // If users table picture also fails or no fallback available, hide it
                          console.error('Failed to load profile picture');
                          e.currentTarget.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                )}
                
                {isShownName && displayName && (
                  <div className="profile-wrapper">
                    <h5>{displayName}</h5>
                  </div>
                )}

                <div className="business-wrapper">
                  <h2>{businessName}</h2>
                  {welcomeMessage && <p>{welcomeMessage}</p>}
                </div>

                <div className="select-con">
                  <h4>Select Appointment Type</h4>
                  <Select
                    value={dummyService.name}
                    placeholder="Choose a service"
                    style={{ backgroundColor: "#F9FAFF", borderRadius: "12px" }}
                    options={[dummyService.name]}
                  />
                </div>
                {dummyService.description && (
                  <p className="description">
                    {dummyService.description}
                  </p>
                )}
              </div>
            </div>
            <div className="right preview-right">
              <SingleCalendar
                onDateSelect={() => {}}
                onTimeSelect={() => {}}
                notShowTime={false}
                availableTimeSlots={mockTimeSlots}
                selectedAppointmentType={{ name: dummyService.name }}
                loadingTimeSlots={false}
                timezoneOptions={timezoneOptions}
                currentTimezone={currentTimezone}
                onTimezoneChange={() => {}}
                value={selectedDate}
                selectedTime={selectedTime}
              />
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default PreviewBookingModal;
