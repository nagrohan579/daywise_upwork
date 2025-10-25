import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import SingleCalendar from "../../components/Calendar/SingleCalendar";
import {
  CalendarIcon2,
  ClockIcon,
  GlobeIcon,
  TickIcon,
} from "../../components/SVGICONS/Svg";
import { useMobile } from "../../hooks";
import { Input, Button, Textarea } from "../../components/index";
import Select from "../../components/ui/Input/Select";
import "./PublicBooking.css";

const PublicBooking = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isMobile = useMobile(999);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
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
    setLoadingTimeSlots(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Format date as YYYY-MM-DD in LOCAL timezone (not UTC)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('Fetching time slots with params:', {
        userId,
        appointmentTypeId,
        date: dateStr,
        selectedDateLocal: selectedDate.toString(),
        url: `${apiUrl}/api/availability/slots?userId=${userId}&appointmentTypeId=${appointmentTypeId}&date=${dateStr}`
      });
      
      const response = await fetch(
        `${apiUrl}/api/availability/slots?userId=${userId}&appointmentTypeId=${appointmentTypeId}&date=${dateStr}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error('Failed to fetch available slots');
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      return data.slots || [];
    } catch (error) {
      console.error('Error fetching time slots:', error);
      toast.error('Failed to load available time slots');
      return [];
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleAppointmentTypeChange = async (typeName) => {
    console.log('Appointment type changed to:', typeName);
    const selected = appointmentTypes.find(t => t.name === typeName);
    console.log('Selected appointment type:', selected);
    setSelectedAppointmentType(selected);
    setSelectedTime(null);
    
    // Set today's date as default if no date is selected
    const dateToUse = selectedDate || new Date();
    if (!selectedDate) {
      setSelectedDate(dateToUse);
    }
    
    console.log('Using date:', dateToUse);
    console.log('User data:', userData);
    
    if (userData) {
      const slots = await fetchAvailableTimeSlots(userData.id, selected._id, dateToUse);
      console.log('Fetched slots:', slots);
      setAvailableTimeSlots(slots);
    }
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    
    if (selectedAppointmentType && userData) {
      const slots = await fetchAvailableTimeSlots(userData.id, selectedAppointmentType._id, date);
      setAvailableTimeSlots(slots);
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
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
      const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/);
      
      if (!timeMatch) {
        throw new Error("Invalid time format");
      }
      
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3];
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(hour, minute, 0, 0);
      const appointmentTimestamp = appointmentDateTime.getTime();

      console.log("PublicBooking - Appointment date/time:", appointmentDateTime);
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
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeRange = () => {
    if (!selectedTime || !selectedAppointmentType) return "";
    
    const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!timeMatch) return selectedTime;
    
    let hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);
    const period = timeMatch[3];
    
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    const startTime = new Date();
    startTime.setHours(hour, minute, 0, 0);
    
    const endTime = new Date(startTime.getTime() + selectedAppointmentType.duration * 60000);
    
    const formatTime = (date) => {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };
    
    return `${formatTime(startTime)}-${formatTime(endTime)}`;
  };

  const getCurrentTimeString = () => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTimezoneName = () => {
    // Get user's timezone or use the business owner's timezone
    const timezone = userData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Convert timezone to readable format (e.g., "America/Los_Angeles" -> "Pacific Time - US & Canada")
    const timezoneMap = {
      'America/Los_Angeles': 'Pacific Time - US & Canada',
      'America/Denver': 'Mountain Time - US & Canada',
      'America/Chicago': 'Central Time - US & Canada',
      'America/New_York': 'Eastern Time - US & Canada',
      'America/Phoenix': 'Arizona',
      'America/Anchorage': 'Alaska',
      'Pacific/Honolulu': 'Hawaii',
    };
    
    return timezoneMap[timezone] || timezone.replace(/_/g, ' ');
  };

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
              <div className="daywise-branding">
                <button className="powered-by-button">Powered by Daywise</button>
              </div>

              <div className="profile-con">
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
                availableTimeSlots={availableTimeSlots}
                onDateSelect={handleDateSelect}
                loadingTimeSlots={loadingTimeSlots}
                selectedAppointmentType={selectedAppointmentType}
              />
            </div>
          </div>
        )}

        {step === 2 && isMobile && (
          <div className="step-two-mobile">
            <div className="containerr">
              <div className="top">
                <div className="back-arrow">
                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 25 25"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    onClick={goToPrev}
                    style={{ cursor: 'pointer' }}
                  >
                    <path
                      d="M15.5 18.5L9.5 12.5L15.5 6.5"
                      stroke="#121212"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="heading-con">
                  <div className="daywise-branding">
                    <button className="powered-by-button">Powered by Daywise</button>
                  </div>
                  <h1 className="appoint-name">{selectedAppointmentType?.name || "30 Minute Appointment"}</h1>
                  <p>{formatDate(selectedDate)}</p>
                  <select
                    style={{ backgroundColor: '#F9FAFF', borderRadius: '50px' }}
                    value={getTimezoneName()}
                    readOnly
                  >
                    <option>{getTimezoneName()} {getCurrentTimeString()}</option>
                  </select>
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
                    ) : availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map((time) => (
                        <div key={time} className="time-slot-row">
                          {selectedTime === time ? (
                            <div className="time-slot-selected">
                              <div className="selected-time-text">{time}</div>
                              <button className="next-btn" onClick={goToNext}>
                                Next
                              </button>
                            </div>
                          ) : (
                            <button
                              className="time-slot-btn"
                              onClick={() => handleTimeSelect(time)}
                            >
                              {time}
                            </button>
                          )}
                        </div>
                      ))
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
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={goToPrev}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    d="M15.5 18.5L9.5 12.5L15.5 6.5"
                    stroke="#121212"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="daywise-branding">
                <button className="powered-by-button">Powered by Daywise</button>
              </div>
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
                <div className="daywise-branding">
                  <button className="powered-by-button">Powered by Daywise</button>
                </div>
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
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;
