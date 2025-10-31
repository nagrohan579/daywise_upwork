import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import SingleCalendar from "../../components/Calendar/SingleCalendar";
import {
  BackArrowIcon,
  CalendarIcon2,
  ClockIcon,
  GlobeIcon,
  TickIcon,
  DollarIcon,
} from "../../components/SVGICONS/Svg";
import { useMobile } from "../../hooks";
import { Input, Button, Textarea } from "../../components/index";
import Select from "../../components/ui/Input/Select";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { detectUserLocation } from "../../utils/locationDetection";
import { getTimezoneOptions, getTimezoneLabel, getTimezoneValue, mapToSupportedTimezone } from '../../utils/timezones';
import "./PublicBooking.css";

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const PublicBooking = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isMobile = useMobile(999);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [branding, setBranding] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [selectedAppointmentType, setSelectedAppointmentType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [comments, setComments] = useState("");
  const [step, setStep] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customerTimezone, setCustomerTimezone] = useState(null);
  const [bookingEventUrl, setBookingEventUrl] = useState(null);

  // Get timezone options from utility (limited to 20 supported timezones)
  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
    console.log('PublicBooking - Generated timezone options:', options.length, 'timezones');
    console.log('PublicBooking - First 5 timezones:', options.slice(0, 5));
    // Return just the labels for the Select component
    return options.map(([label]) => label);
  }, []);
  
  const goToNext = (data) => {
    // Validate appointment type is selected before proceeding to step 2
    if (step === 1 && !selectedAppointmentType) {
      toast.error("Please select an appointment type to continue");
      return;
    }
    
    // Validate date and time are selected before proceeding to step 3 (on desktop)
    if (step === 2 && !isMobile && (!selectedDate || !selectedTime)) {
      toast.error("Please select a date and time");
      return;
    }
    
    // If data is passed from SingleCalendar, extract date and time
    if (data && typeof data === 'object') {
      if (data.date) setSelectedDate(data.date);
      if (data.time) setSelectedTime(data.time);
    }
    setStep((prev) => prev + 1);
  };
  const goToPrev = () => setStep((prev) => prev - 1);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-detect customer's timezone on mount (same as signup flow)
  useEffect(() => {
    const location = detectUserLocation();
    setCustomerTimezone(location.timezone);
    console.log('PublicBooking - Customer timezone auto-detected:', location.timezone);
    console.log('PublicBooking - Customer country auto-detected:', location.country);
  }, []);

  useEffect(() => {
    if (!slug) {
      toast.error("Invalid booking link");
      navigate("/");
      return;
    }
    fetchUserData();
  }, [slug]);

  const fetchUserData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const userResponse = await fetch(`${apiUrl}/api/users/by-slug/${slug}`);
      
      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          toast.error("Booking page not found");
          navigate("/");
        } else {
          throw new Error("Failed to load booking page");
        }
        return;
      }
      
      const user = await userResponse.json();
      setUserData(user);
      console.log('PublicBooking - Business user data:', user);
      console.log('PublicBooking - Business timezone:', user.timezone);

      // Fetch branding for this user (public access)
      try {
        const brandingResponse = await fetch(`${apiUrl}/api/branding?userId=${encodeURIComponent(user.id)}`);
        if (brandingResponse.ok) {
          const brandingData = await brandingResponse.json();
          console.log('PublicBooking - Branding data:', brandingData);
          console.log('PublicBooking - usePlatformBranding value:', brandingData?.usePlatformBranding);
          console.log('PublicBooking - usePlatformBranding type:', typeof brandingData?.usePlatformBranding);
          console.log('PublicBooking - Will show badge?', brandingData?.usePlatformBranding !== false);
          setBranding(brandingData);
        } else {
          console.warn('PublicBooking - Branding fetch failed with status', brandingResponse.status);
        }
      } catch (e) {
        console.warn('PublicBooking - Error fetching branding:', e);
      }

      const typesResponse = await fetch(`${apiUrl}/api/appointment-types?userId=${user.id}`);
      if (typesResponse.ok) {
        const types = await typesResponse.json();
        setAppointmentTypes(types.filter(type => type.isActive !== false));
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching booking page data:", error);
      toast.error("Failed to load booking page");
      setLoading(false);
    }
  };

  const fetchAvailableTimeSlots = async (userId, appointmentTypeId, selectedDate) => {
    if (!userId || !appointmentTypeId || !selectedDate) {
      console.error('Missing required params for time slots:', { userId, appointmentTypeId, selectedDate });
      setLoadingTimeSlots(false);
      setAvailableTimeSlots([]);
      return [];
    }
    
    setLoadingTimeSlots(true);
    setAvailableTimeSlots([]); // Clear previous slots
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Format date as YYYY-MM-DD in LOCAL timezone (not UTC)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Get the timezone name from the customer's selected timezone or auto-detected
      const customerTz = customerTimezone || mapToSupportedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      console.log('Fetching time slots with params:', {
        userId,
        appointmentTypeId,
        date: dateStr,
        customerTimezone: customerTz,
        selectedDateLocal: selectedDate.toString(),
        url: `${apiUrl}/api/availability/slots?userId=${userId}&appointmentTypeId=${appointmentTypeId}&date=${dateStr}&customerTimezone=${encodeURIComponent(customerTz)}`
      });
      
      const response = await fetch(
        `${apiUrl}/api/availability/slots?userId=${userId}&appointmentTypeId=${appointmentTypeId}&date=${dateStr}&customerTimezone=${encodeURIComponent(customerTz)}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error('Failed to fetch available slots');
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      const slots = data.slots || [];
      console.log('Setting available slots:', slots);
      setAvailableTimeSlots(slots);
      return slots;
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Failed to load available time slots');
      setAvailableTimeSlots([]);
      return [];
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleAppointmentTypeChange = async (typeName) => {
    console.log('Appointment type changed to:', typeName);
    const selected = appointmentTypes.find(t => t.name === typeName);
    console.log('Selected appointment type:', selected);
    
    if (!selected) {
      console.error('Appointment type not found:', typeName);
      return;
    }
    
    setSelectedAppointmentType(selected);
    setSelectedTime(null);
    
    // Set today's date as default if no date is selected
    const dateToUse = selectedDate || new Date();
    if (!selectedDate) {
      setSelectedDate(dateToUse);
    }
    
    console.log('Using date:', dateToUse);
    console.log('User data:', userData);
    
    if (userData && selected?._id) {
      console.log('Calling fetchAvailableTimeSlots with:', { userId: userData.id, appointmentTypeId: selected._id, date: dateToUse });
      await fetchAvailableTimeSlots(userData.id, selected._id, dateToUse);
      // Note: fetchAvailableTimeSlots now sets availableTimeSlots internally
    } else {
      console.warn('Cannot fetch time slots - missing user data or appointment type ID');
    }
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    
    if (selectedAppointmentType?._id && userData) {
      console.log('Calling fetchAvailableTimeSlots for date change with:', { userId: userData.id, appointmentTypeId: selectedAppointmentType._id, date });
      await fetchAvailableTimeSlots(userData.id, selectedAppointmentType._id, date);
      // Note: fetchAvailableTimeSlots now sets availableTimeSlots internally
    } else {
      console.warn('Cannot fetch time slots for date change - missing appointment type or user data');
    }
  };

  const handleTimeSelect = (timeSlot) => {
    // timeSlot can be either a UTC ISO string or an object {display, original}
    const utcTime = typeof timeSlot === 'string' ? timeSlot : timeSlot.original;
    setSelectedTime(utcTime);
    console.log('handleTimeSelect - Selected UTC time:', utcTime);
  };

  const handleCompleteBooking = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (submitting) {
      console.log("PublicBooking - Already submitting, ignoring duplicate request");
      return;
    }
    
    // Validate all required fields
    if (!selectedAppointmentType) {
      toast.error("Please select an appointment type");
      return;
    }
    
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }
    
    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    console.log("PublicBooking - Starting booking creation");
    setSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // selectedTime is always a UTC ISO string from the backend
      console.log("PublicBooking - selectedTime UTC ISO string:", selectedTime);
      const appointmentTimestamp = dayjs.utc(selectedTime).valueOf();
      console.log("PublicBooking - Appointment timestamp:", appointmentTimestamp);

      // Generate booking token
      const generateBookingToken = () => {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
      };

      // Create booking using API endpoint (like AddAppointmentModal but without session)
      const bookingPayload = {
        userId: userData.id,
        appointmentTypeId: selectedAppointmentType._id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerTimezone: customerTimezone,
        appointmentDate: appointmentTimestamp,
        duration: selectedAppointmentType.duration,
        status: "confirmed",
        notes: comments.trim() || "",
        bookingToken: generateBookingToken(),
      };

      console.log("PublicBooking - Creating booking with payload:", bookingPayload);

      const response = await fetch(`${apiUrl}/api/public-bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      const result = await response.json();
      console.log("PublicBooking - Booking created successfully:", result);

      // Store the event URL for the "View Details" button
      if (result.booking && result.booking.bookingToken) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
        const eventUrl = `${frontendUrl}/event/${result.booking.bookingToken}`;
        setBookingEventUrl(eventUrl);
        console.log("PublicBooking - Event URL stored:", eventUrl);
      }

      toast.success("Booking confirmed! Check your email for details.");
      goToNext();
    } catch (error) {
      console.error("PublicBooking - Error creating booking:", error);
      toast.error(error.message || "Failed to complete booking");
    } finally {
      console.log("PublicBooking - Resetting submitting state");
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeRange = () => {
    if (!selectedTime || !selectedAppointmentType || !customerTimezone) return "";

    // selectedTime is a UTC ISO string, convert to customer timezone
    const startTimeUTC = dayjs.utc(selectedTime);
    const startTimeLocal = startTimeUTC.tz(customerTimezone);
    const endTimeLocal = startTimeLocal.add(selectedAppointmentType.duration, 'minute');

    return `${startTimeLocal.format('h:mm A')}-${endTimeLocal.format('h:mm A')}`;
  };

  const getCurrentTimeString = () => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTimezoneName = () => {
    if (!customerTimezone) return "";
    return getTimezoneLabel(customerTimezone);
  };

  const handleTimezoneChange = (label) => {
    const timezoneValue = getTimezoneValue(label);
    setCustomerTimezone(timezoneValue);
    console.log('PublicBooking - Customer timezone changed to:', timezoneValue);
    console.log('PublicBooking - Business timezone:', userData?.timezone);
    console.log('PublicBooking - Will convert slots from', userData?.timezone, 'to', timezoneValue);
  };

  // Convert and sort available time slots for display
  const displayTimeSlots = useMemo(() => {
    if (!customerTimezone || availableTimeSlots.length === 0) {
      return [];
    }

    // Slots are UTC ISO strings from backend
    // 1. Sort chronologically
    // 2. Convert to customer timezone
    // 3. Return as objects with {display, original}
    const sortedSlots = [...availableTimeSlots].sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedSlots.map(utcIsoString => {
      const utcTime = dayjs.utc(utcIsoString);
      const customerTime = utcTime.tz(customerTimezone);
      const displayTime = customerTime.format('h:mm A');

      return {
        display: displayTime,
        original: utcIsoString
      };
    });
  }, [availableTimeSlots, customerTimezone]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  if (loading) {
    return (
      <div className="booking-steps-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="booking-steps-container">
        <div className="error-container">
          <h2>Booking Page Not Found</h2>
          <p>The booking page you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-steps-container">
      <div className={`main-wrapper ${(isMobile && step === 2) || step === 4 ? "border-hide" : ""}`}>
        {step === 1 && (
          <div className="steps-one">
            <div className="left">
              {branding?.usePlatformBranding !== false && (
                <div className="daywise-branding">
                  <button className="powered-by-button">Powered by Daywise</button>
                </div>
              )}

              <div className="profile-con">
                {((branding && branding.profilePictureUrl) || userData.picture) && (
                  <div className="profile-picture-wrapper">
                    <img
                      src={(branding && branding.profilePictureUrl) ? branding.profilePictureUrl : userData.picture}
                      alt={`${userData.name || "User"} profile picture`}
                      className="profile-picture"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error('Failed to load profile picture:', (branding && branding.profilePictureUrl) ? branding.profilePictureUrl : userData.picture);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="profile-wrapper">
                  {userData.logoUrl && (
                    <img
                      src={userData.logoUrl}
                      alt={`${userData.businessName || userData.name} logo`}
                    />
                  )}
                  <h5>{userData.name || "User"}</h5>
                </div>

                <div className="business-wrapper">
                  <h2>{userData.businessName || "Business Name Here"}</h2>
                  {userData.welcomeMessage && (
                    <p>{userData.welcomeMessage}</p>
                  )}
                </div>

                <div className="select-con">
                  <h4>Select Appointment Type</h4>
                  <Select
                    value={selectedAppointmentType?.name || ""}
                    onChange={handleAppointmentTypeChange}
                    options={appointmentTypes.map(t => t.name)}
                    placeholder="Choose a service"
                  />
                </div>

                {selectedAppointmentType && selectedAppointmentType.description && (
                  <p className="description">
                    {selectedAppointmentType.description}
                  </p>
                )}
              </div>
            </div>

            <div className="right">
              <SingleCalendar
                onNext={goToNext}
                notShowTime={isMobile}
                availableTimeSlots={displayTimeSlots}
                onDateSelect={handleDateSelect}
                onTimeSelect={handleTimeSelect}
                loadingTimeSlots={loadingTimeSlots}
                selectedAppointmentType={selectedAppointmentType}
                selectedTime={selectedTime}
                timezoneOptions={timezoneOptions}
                currentTimezone={getTimezoneLabel(customerTimezone || mapToSupportedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone))}
                onTimezoneChange={(value) => {
                  console.log('SingleCalendar - Timezone changed:', value);
                  handleTimezoneChange(value);
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && isMobile && (
          <div className="step-two-mobile">
            <div className="containerr">
              <div className="top">
                <div className="back-arrow">
                  <BackArrowIcon
                    onClick={goToPrev}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div className="heading-con">
                  {branding?.usePlatformBranding !== false && (
                    <div className="daywise-branding">
                      <button className="powered-by-button">Powered by Daywise</button>
                    </div>
                  )}
                  <h1 className="appoint-name">{selectedAppointmentType?.name || "30 Minute Appointment"}</h1>
                  <p>{formatDate(selectedDate)}</p>
                  <div style={{ marginTop: '10px' }}>
                    {console.log('PublicBooking - Rendering timezone dropdown with options:', timezoneOptions.length)}
                    {console.log('PublicBooking - Current timezone value:', customerTimezone)}
                    {console.log('PublicBooking - Display value:', getTimezoneLabel(customerTimezone || mapToSupportedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)))}
                    <Select
                      value={getTimezoneLabel(customerTimezone || mapToSupportedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone))}
                      onChange={(value) => {
                        console.log('PublicBooking - Timezone dropdown changed:', value);
                        handleTimezoneChange(value);
                      }}
                      options={timezoneOptions}
                      placeholder="Select timezone"
                      style={{ backgroundColor: '#F9FAFF', borderRadius: '50px' }}
                    />
                  </div>
                </div>
              </div>
              <div className="bottom">
                <div className="time-slot-wrapper">
                  <div className="time-slot-container">
                    {loadingTimeSlots ? (
                      <div className="time-slots-loading">
                        <div className="time-slots-loading-content">
                          <div className="time-slots-spinner"></div>
                          <p className="time-slots-loading-text">Loading time slots...</p>
                        </div>
                      </div>
                    ) : displayTimeSlots.length > 0 ? (
                      displayTimeSlots.map((timeSlot) => {
                        const displayTime = typeof timeSlot === 'string' ? timeSlot : timeSlot.display;
                        const originalTime = typeof timeSlot === 'string' ? timeSlot : timeSlot.original;
                        return (
                          <div key={originalTime} className="time-slot-row">
                            {selectedTime === originalTime ? (
                              <div className="time-slot-selected">
                                <div className="selected-time-text">{displayTime}</div>
                                <button className="next-btn" onClick={goToNext}>
                                  Next
                                </button>
                              </div>
                            ) : (
                              <button
                                className="time-slot-btn"
                                onClick={() => handleTimeSelect(originalTime)}
                              >
                                {displayTime}
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-slots-message">
                        <p>{selectedAppointmentType ? "No available time slots for this date" : "Select an appointment type to see available time slots"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {((step === 2 && !isMobile) || (step === 3 && isMobile)) && (
          <div className="step-two">
            <div className="left">
              <div className="back-arrow">
                <BackArrowIcon
                  onClick={goToPrev}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              {branding?.usePlatformBranding !== false && (
                <div className="daywise-branding">
                  <button className="powered-by-button">Powered by Daywise</button>
                </div>
              )}
              <div className="appointment-wrapper">
                <h2>{selectedAppointmentType?.name || "Appointment Name Here"}</h2>
                {selectedAppointmentType?.description && (
                  <p>{selectedAppointmentType.description}</p>
                )}
              </div>
              <div className="booking-details">
                <div className="wrap">
                  <ClockIcon />
                  <h4>{selectedAppointmentType?.duration} min</h4>
                </div>
                <div className="wrap">
                  <CalendarIcon2 />
                  <h4>{formatTimeRange()}, {formatDate(selectedDate)}</h4>
                </div>
                <div className="wrap">
                  <GlobeIcon />
                  <h4>{getTimezoneName()}</h4>
                </div>
                {selectedAppointmentType?.price !== undefined && selectedAppointmentType?.price > 0 && (
                  <div className="wrap">
                    <DollarIcon />
                    <h4>${selectedAppointmentType.price}</h4>
                  </div>
                )}
              </div>
            </div>
            <div className="right">
              <h1>Enter Detail</h1>
              <form className="booking-detail" onSubmit={handleCompleteBooking}>
                <Input 
                  label="Name*" 
                  placeholder="Enter name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
                <Input 
                  label="Email*" 
                  placeholder="Enter email address"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
                <Textarea
                  label="Comments (optional)"
                  placeholder="Please share any comments or questions if needed"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  style={{ borderRadius: "12px" }}
                />
                <p className="terms-con-desc">
                  By continuing, you confirm that you have read and agree
                  to Daywise's <Link to="/terms">Terms of Use</Link> and{" "}
                  <Link to="/privacy-policy">Privacy Notice</Link>.
                </p>
                <Button 
                  text={submitting ? "Booking..." : "Complete Booking"} 
                  disabled={submitting}
                  type="submit"
                />
              </form>
            </div>
          </div>
        )}

        {((step === 3 && !isMobile) || (step === 4 && isMobile)) && (
          <div className="step-three">
            <div className="containerr">
              <div className="heading-container">
                <div className="wrap">
                  <TickIcon />
                  <h3>Success! You are booked in</h3>
                </div>
                <p>A confirmation has been sent to your email.</p>
              </div>
              <div className="appointment-container">
                {branding?.usePlatformBranding !== false && (
                  <div className="daywise-branding">
                    <button className="powered-by-button">Powered by Daywise</button>
                  </div>
                )}
                <div className="booking-details">
                  <h1>{selectedAppointmentType?.name || "Appointment Name Here"}</h1>
                  <div className="wrap">
                    <ClockIcon />
                    <h4>{selectedAppointmentType?.duration} min</h4>
                  </div>
                  <div className="wrap">
                    <CalendarIcon2 />
                    <h4>{formatTimeRange()}, {formatDate(selectedDate)}</h4>
                  </div>
                  <div className="wrap">
                    <GlobeIcon />
                    <h4>{getTimezoneName()}</h4>
                  </div>
                  {selectedAppointmentType?.price > 0 && (
                    <div className="wrap">
                      <DollarIcon />
                      <h4>${selectedAppointmentType.price}</h4>
                    </div>
                  )}
                </div>
              </div>
              <div className="success-buttons">
                <Button
                  text="View Details"
                  onClick={() => {
                    if (bookingEventUrl) {
                      // Navigate to the event details page
                      const eventPath = bookingEventUrl.replace(/^https?:\/\/[^\/]+/, '');
                      navigate(eventPath);
                    } else {
                      navigate('/bookings');
                    }
                  }}
                  style={{
                    width: '186px',
                    height: '40px',
                    backgroundColor: '#0053F1',
                    borderRadius: '50px',
                    padding: '10px 12px',
                    color: '#FFFFFF',
                    border: 'none'
                  }}
                />
                <Button
                  text="Book Another"
                  onClick={() => window.location.reload()}
                  style={{
                    width: '186px',
                    height: '40px',
                    backgroundColor: '#64748B',
                    borderRadius: '50px',
                    padding: '10px 12px',
                    color: '#FFFFFF',
                    border: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;
