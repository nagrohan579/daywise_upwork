import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { getTimezoneOptions, getTimezoneLabel, getTimezoneValue, mapToSupportedTimezone } from '../../utils/timezones';
import CroppedImage from "../../components/CroppedImage/CroppedImage";
import "../PublicBooking/PublicBooking.css";

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

const RescheduleBooking = () => {
  const { token } = useParams();
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
  const [originalBooking, setOriginalBooking] = useState(null);

  // Get timezone options from utility (limited to 20 supported timezones)
  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
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

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reschedule link");
      navigate("/");
      return;
    }
    fetchBookingData();
  }, [token]);

  const fetchBookingData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Fetch existing booking by token
      const bookingResponse = await fetch(`${apiUrl}/api/bookings/token/${token}`);

      if (!bookingResponse.ok) {
        if (bookingResponse.status === 404) {
          toast.error("Booking not found");
          navigate("/");
        } else {
          throw new Error("Failed to load booking");
        }
        return;
      }

      const bookingData = await bookingResponse.json();
      const { booking, user, appointmentType, branding: brandingData } = bookingData;

      console.log('RescheduleBooking - Loaded booking:', booking);
      console.log('RescheduleBooking - User:', user);
      console.log('RescheduleBooking - Appointment Type:', appointmentType);
      console.log('RescheduleBooking - Branding data:', brandingData);

      // Store original booking
      setOriginalBooking(booking);
      // Normalize user data structure to match PublicBooking (ensure id field exists)
      const normalizedUser = {
        ...user,
        id: user._id || user.id, // Ensure id field exists for consistency
      };
      setUserData(normalizedUser);
      setBranding(brandingData || null);
      
      // Set CSS variables for colors
      const root = document.documentElement;
      root.style.setProperty('--main-color', brandingData?.primary || '#0053F1');
      root.style.setProperty('--secondary-color', brandingData?.secondary || '#64748B');
      root.style.setProperty('--text-color', brandingData?.accent || '#121212');

      // Pre-fill customer details (these will be disabled)
      setCustomerName(booking.customerName || "");
      setCustomerEmail(booking.customerEmail || "");
      setComments(booking.notes || "");

      // Pre-fill timezone - normalize to supported timezone (handles Asia/Calcutta -> Asia/Kolkata)
      const bookingTz = booking.customerTimezone || user.timezone;
      const normalizedTz = mapToSupportedTimezone(bookingTz);
      setCustomerTimezone(normalizedTz);
      console.log('RescheduleBooking - Pre-filled timezone:', bookingTz, '-> normalized:', normalizedTz);

      // Pre-fill date from booking
      const bookingDate = new Date(booking.appointmentDate);
      setSelectedDate(bookingDate);
      console.log('RescheduleBooking - Pre-filled date:', bookingDate);

      // Fetch appointment types (include all, not just active)
      const typesResponse = await fetch(`${apiUrl}/api/appointment-types?userId=${user._id}`);
      if (typesResponse.ok) {
        const types = await typesResponse.json();
        setAppointmentTypes(types);

        // Determine booked type id (fallbacks)
        const bookedTypeId = booking.appointmentTypeId || appointmentType?._id;

        // Pre-select the booked appointment type if present in list
        if (bookedTypeId) {
          const matchingType = types.find(t => t._id === bookedTypeId) || (appointmentType ? types.find(t => t.name === appointmentType.name) : null);
          if (matchingType) {
            setSelectedAppointmentType(matchingType);
            console.log('RescheduleBooking - Pre-selected appointment type:', matchingType);

            // Fetch available slots for the pre-selected date and type
            await fetchAvailableTimeSlots(user._id, matchingType._id, bookingDate);
          }
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching booking data:", error);
      toast.error("Failed to load booking");
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

    // Use the currently selected date or today's date
    const dateToUse = selectedDate || new Date();
    if (!selectedDate) {
      setSelectedDate(dateToUse);
    }

    console.log('Using date:', dateToUse);
    console.log('User data:', userData);

    if (userData && selected?._id) {
      console.log('Calling fetchAvailableTimeSlots with:', { userId: userData._id, appointmentTypeId: selected._id, date: dateToUse });
      await fetchAvailableTimeSlots(userData._id, selected._id, dateToUse);
    } else {
      console.warn('Cannot fetch time slots - missing user data or appointment type ID');
    }
  };

  const handleDateSelect = async (date) => {
    setSelectedDate(date);
    setSelectedTime(null);

    if (selectedAppointmentType?._id && userData) {
      console.log('Calling fetchAvailableTimeSlots for date change with:', { userId: userData._id, appointmentTypeId: selectedAppointmentType._id, date });
      await fetchAvailableTimeSlots(userData._id, selectedAppointmentType._id, date);
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

  const handleCompleteReschedule = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (submitting) {
      console.log("RescheduleBooking - Already submitting, ignoring duplicate request");
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

    console.log("RescheduleBooking - Starting reschedule");
    setSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // selectedTime is always a UTC ISO string from the backend
      console.log("RescheduleBooking - selectedTime UTC ISO string:", selectedTime);
      const appointmentTimestamp = dayjs.utc(selectedTime).valueOf();
      console.log("RescheduleBooking - Appointment timestamp:", appointmentTimestamp);

      // Reschedule booking using API endpoint
      const reschedulePayload = {
        appointmentTypeId: selectedAppointmentType._id,
        appointmentDate: selectedTime, // Send ISO string directly
        customerTimezone: customerTimezone,
      };

      console.log("RescheduleBooking - Rescheduling with payload:", reschedulePayload);

      const response = await fetch(`${apiUrl}/api/bookings/reschedule/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reschedulePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reschedule booking');
      }

      const result = await response.json();
      console.log("RescheduleBooking - Rescheduled successfully:", result);

      toast.success("Booking rescheduled! Check your email for updated details.");
      goToNext();
    } catch (error) {
      console.error("RescheduleBooking - Error rescheduling booking:", error);
      toast.error(error.message || "Failed to reschedule booking");
    } finally {
      console.log("RescheduleBooking - Resetting submitting state");
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
    console.log('RescheduleBooking - Customer timezone changed to:', timezoneValue);
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
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!userData || !originalBooking) {
    return (
      <div className="booking-steps-container">
        <div className="error-container">
          <h2>Booking Not Found</h2>
          <p>The booking you're trying to reschedule doesn't exist.</p>
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
                {branding?.logoUrl && (
                  <div className="logo-wrapper">
                    <CroppedImage
                      src={branding.logoUrl}
                      cropData={branding.logoCropData}
                      alt={`${userData.businessName || userData.name} logo`}
                      className={`logo-image ${branding.logoUrl.toLowerCase().endsWith('.gif') ? 'gif-logo' : ''}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error('Failed to load logo:', branding.logoUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {branding?.showProfilePicture && (branding?.profilePictureUrl || userData.picture) && (
                  <div className="profile-picture-wrapper">
                    <CroppedImage
                      src={branding?.profilePictureUrl || userData.picture}
                      cropData={branding?.profilePictureUrl ? branding?.profileCropData : null}
                      fallbackSrc={branding?.profilePictureUrl && userData.picture ? userData.picture : null}
                      alt={`${userData.name || "User"} profile picture`}
                      className="profile-picture"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // If branding picture fails, try users table picture as fallback
                        if (branding?.profilePictureUrl && userData.picture && e.currentTarget.src !== userData.picture) {
                          console.error('Failed to load branding profile picture, trying fallback:', userData.picture);
                          e.currentTarget.src = userData.picture;
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
                {branding?.showDisplayName && (
                  <div className="profile-wrapper">
                    <h5>{branding?.displayName || userData.name}</h5>
                  </div>
                )}

                <div className="business-wrapper">
                  <h2>{userData.businessName || "Business Name Here"}</h2>
                  <p style={{ marginTop: '8px', color: 'var(--main-color)', fontWeight: '500' }}>
                    Rescheduling your appointment
                  </p>
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
                    <Select
                      value={getTimezoneLabel(customerTimezone || mapToSupportedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone))}
                      onChange={(value) => {
                        console.log('RescheduleBooking - Timezone dropdown changed:', value);
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
              <h1>Confirm Details</h1>
              <p style={{ marginBottom: '20px', color: 'var(--secondary-color)' }}>
                Your contact information cannot be changed when rescheduling.
              </p>
              <form className="booking-detail" onSubmit={handleCompleteReschedule}>
                <Input
                  label="Name*"
                  placeholder="Enter name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={true}
                  required
                  style={{ backgroundColor: '#F5F5F5', cursor: 'not-allowed' }}
                />
                <Input
                  label="Email*"
                  placeholder="Enter email address"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={true}
                  required
                  style={{ backgroundColor: '#F5F5F5', cursor: 'not-allowed' }}
                />
                <Textarea
                  label="Comments (optional)"
                  placeholder="Original comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={true}
                  style={{ borderRadius: "12px", backgroundColor: '#F5F5F5', cursor: 'not-allowed' }}
                />
                <Button
                  text={submitting ? "Rescheduling..." : "Confirm Reschedule"}
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
                  <h3>Success! Your booking has been rescheduled</h3>
                </div>
                <p>A confirmation with updated details has been sent to your email.</p>
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
                  text="View Event Details"
                  onClick={() => {
                    // Navigate back to the event page
                    navigate(`/event/${token}`);
                  }}
                  style={{
                    width: '186px',
                    height: '40px',
                    backgroundColor: 'var(--main-color)',
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

export default RescheduleBooking;
