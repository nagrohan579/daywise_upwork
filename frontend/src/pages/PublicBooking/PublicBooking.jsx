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
import CroppedImage from "../../components/CroppedImage/CroppedImage";
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
  const [intakeForm, setIntakeForm] = useState(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [formSessionId, setFormSessionId] = useState(null);
  const [uploadedFileUrls, setUploadedFileUrls] = useState({}); // Map of fieldId -> [fileUrls]
  const [submittingForm, setSubmittingForm] = useState(false);

  // Get timezone options from utility (limited to 20 supported timezones)
  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
    console.log('PublicBooking - Generated timezone options:', options.length, 'timezones');
    console.log('PublicBooking - First 5 timezones:', options.slice(0, 5));
    // Return just the labels for the Select component
    return options.map(([label]) => label);
  }, []);
  
  // Helper to get the actual step considering form
  const getActualStep = () => {
    const hasIntakeForm = selectedAppointmentType?.intakeFormId;
    // Step mapping:
    // 1 = Service selection
    // 2 = Calendar/time selection
    // 3 = Form (if exists) OR Enter Detail (if no form)
    // 4 = Enter Detail (if form existed) OR Success (if no form)
    // 5 = Success (if form existed)
    return step;
  };

  // Note: Form responses are now saved manually when Continue button is clicked

  const goToNext = (data) => {
    // Validate appointment type is selected before proceeding
    if (step === 1 && !selectedAppointmentType) {
      toast.error("Please select an appointment type to continue");
      return;
    }
    
    // If data is passed from SingleCalendar, extract date and time
    let timeFromData = null;
    let dateFromData = null;
    if (data && typeof data === 'object') {
      if (data.date) {
        setSelectedDate(data.date);
        dateFromData = data.date;
      }
      if (data.time) {
        setSelectedTime(data.time);
        timeFromData = data.time;
      }
    }
    
    // Check if we have date and time (from data param or state)
    const hasDate = dateFromData || selectedDate;
    const hasTime = timeFromData || selectedTime;
    
    // On desktop: Step 1 has calendar + time slots, so after selecting time, go directly to step 3 (form or Enter Detail)
    // On mobile: Step 1 is service selection, Step 2 is time selection, Step 3 is form/Enter Detail
    let nextStep;
    if (step === 1 && !isMobile && hasDate && hasTime) {
      // Desktop: Skip step 2, go directly to step 3
      nextStep = 3;
      console.log('Desktop: Step 1 -> Step 3 (skipping step 2)');
    } else if (step === 1 && !isMobile && (!hasDate || !hasTime)) {
      // Desktop: Validate date and time are selected
      toast.error("Please select a date and time");
      return;
    } else if (step === 2 && !isMobile) {
      // Desktop: Shouldn't reach here, but if we do, go to step 3
      nextStep = 3;
      console.log('Desktop: Step 2 -> Step 3');
    } else if (step === 2 && isMobile && (!hasDate || !hasTime)) {
      // Mobile: Validate date and time are selected
      toast.error("Please select a date and time");
      return;
    } else {
      // Normal increment
      nextStep = step + 1;
      console.log('Normal increment:', step, '->', nextStep);
    }
    
    console.log('PublicBooking - Moving to step:', nextStep);
    console.log('PublicBooking - Has intake form?', !!intakeForm);
    console.log('PublicBooking - Intake form data:', intakeForm);
    console.log('PublicBooking - Selected appointment type:', selectedAppointmentType);
    console.log('PublicBooking - Intake form ID:', selectedAppointmentType?.intakeFormId);
    console.log('PublicBooking - Has date:', hasDate, 'Has time:', hasTime);
    
    setStep(nextStep);
  };
  
  const goToPrev = () => {
    // On desktop: Step 3 goes back to step 1 (skip step 2)
    // On mobile: Normal decrement
    if (step === 3 && !isMobile) {
      setStep(1);
    } else if (step === 4 && !isMobile && intakeForm) {
      // If we're on Enter Detail (step 4) and there was a form, go back to form (step 3)
      setStep(3);
    } else {
      setStep((prev) => prev - 1);
    }
  };

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

  // Handle Stripe payment callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const sessionId = params.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      // Payment successful, complete the booking
      const handlePaymentSuccess = async () => {
        try {
          const pendingBooking = sessionStorage.getItem('pendingBooking');
          const storedSessionId = sessionStorage.getItem('checkoutSessionId');

          if (!pendingBooking || !storedSessionId) {
            toast.error("Booking data not found. Please try again.");
            window.location.href = `/${slug}`;
            return;
          }

          const bookingData = JSON.parse(pendingBooking);
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

          // Complete the booking
          const response = await fetch(`${apiUrl}/api/public-bookings/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: storedSessionId,
              bookingData,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to complete booking');
          }

          const result = await response.json();
          console.log("PublicBooking - Booking completed after payment:", result);

          // Clean up sessionStorage
          sessionStorage.removeItem('pendingBooking');
          sessionStorage.removeItem('checkoutSessionId');

          // Store the event URL for the "View Details" button
          if (result.booking && result.booking.bookingToken) {
            const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
            const eventUrl = `${frontendUrl}/event/${result.booking.bookingToken}`;
            setBookingEventUrl(eventUrl);
          }

          // Restore booking state from the bookingData
          // Find the appointment type from the result or fetch it
          if (result.appointmentType) {
            setSelectedAppointmentType(result.appointmentType);
          }

          // Set the selected date and time from booking data
          const appointmentDate = new Date(bookingData.appointmentDate);
          setSelectedDate(appointmentDate);
          setSelectedTime(appointmentDate.toISOString());

          // Set customer details
          setCustomerName(bookingData.customerName);
          setCustomerEmail(bookingData.customerEmail);
          setComments(bookingData.notes || '');

          // Clean URL
          window.history.replaceState({}, '', `/${slug}`);

          toast.success("Payment successful! Booking confirmed. Check your email for details.");

          // Always go to step 4 (success page) after payment
          // The intake form was already filled before payment
          setStep(4);
        } catch (error) {
          console.error("PublicBooking - Error completing booking after payment:", error);
          toast.error(error.message || "Failed to complete booking after payment");
          // Clean up and refresh
          sessionStorage.removeItem('pendingBooking');
          sessionStorage.removeItem('checkoutSessionId');
          window.location.href = `/${slug}`;
        }
      };

      handlePaymentSuccess();
    } else if (paymentStatus === 'canceled') {
      // Payment canceled
      toast.error("Payment was canceled. Please try again.");
      // Clean up sessionStorage
      sessionStorage.removeItem('pendingBooking');
      sessionStorage.removeItem('checkoutSessionId');
      // Clean URL and refresh
      window.location.href = `/${slug}`;
    }
  }, [slug]);

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
          
          // Set CSS variables for colors
          const root = document.documentElement;
          root.style.setProperty('--main-color', brandingData?.primary || '#0053F1');
          root.style.setProperty('--secondary-color', brandingData?.secondary || '#64748B');
          root.style.setProperty('--text-color', brandingData?.accent || '#121212');
        } else {
          console.warn('PublicBooking - Branding fetch failed with status', brandingResponse.status);
          // Set default CSS variables
          const root = document.documentElement;
          root.style.setProperty('--main-color', '#0053F1');
          root.style.setProperty('--secondary-color', '#64748B');
          root.style.setProperty('--text-color', '#121212');
        }
      } catch (e) {
        console.warn('PublicBooking - Error fetching branding:', e);
        // Set default CSS variables
        const root = document.documentElement;
        root.style.setProperty('--main-color', '#0053F1');
        root.style.setProperty('--secondary-color', '#64748B');
        root.style.setProperty('--text-color', '#121212');
      }

      const typesResponse = await fetch(`${apiUrl}/api/appointment-types?userId=${user.id}`);
      if (typesResponse.ok) {
        const types = await typesResponse.json();
        const filteredTypes = types.filter(type => type.isActive !== false);
        
        // Check if business user is on free plan and disable requirePayment for all services
        try {
          const featuresResponse = await fetch(`${apiUrl}/api/user-features/${user.id}`);
          if (featuresResponse.ok) {
            const featuresData = await featuresResponse.json();
            const hasCustomBranding = featuresData.customBranding || false;
            
            // If business user is on free plan, set requirePayment to false for all services
            if (!hasCustomBranding) {
              const updatedTypes = filteredTypes.map(type => ({
                ...type,
                requirePayment: false
              }));
              console.log('PublicBooking - Business user is on free plan, disabled requirePayment for all services');
              setAppointmentTypes(updatedTypes);
            } else {
              console.log('PublicBooking - Appointment types loaded:', filteredTypes);
              console.log('PublicBooking - Appointment types with intakeFormId:', filteredTypes.filter(t => t.intakeFormId));
              setAppointmentTypes(filteredTypes);
            }
          } else {
            // If we can't check features, assume free plan and disable payment
            const updatedTypes = filteredTypes.map(type => ({
              ...type,
              requirePayment: false
            }));
            setAppointmentTypes(updatedTypes);
          }
        } catch (error) {
          console.error('PublicBooking - Error checking user features:', error);
          // On error, assume free plan and disable payment
          const updatedTypes = filteredTypes.map(type => ({
            ...type,
            requirePayment: false
          }));
          setAppointmentTypes(updatedTypes);
        }
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
    setIntakeForm(null); // Reset form when changing appointment type
    setFormSessionId(null); // Clear form session ID

    // Fetch intake form if it exists
    if (selected.intakeFormId && userData) {
      console.log('PublicBooking - Fetching intake form:', selected.intakeFormId, 'for user:', userData.id);
      setLoadingForm(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const formResponse = await fetch(`${apiUrl}/api/intake-forms/${selected.intakeFormId}?userId=${userData.id}`);
        console.log('PublicBooking - Form response status:', formResponse.status);
        if (formResponse.ok) {
          const formData = await formResponse.json();
          console.log('PublicBooking - Intake form loaded successfully:', formData);
          console.log('PublicBooking - Form fields:', formData.fields);
          setIntakeForm(formData);

          // Generate unique session ID for form submission tracking
          const sessionId = `form_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          setFormSessionId(sessionId);
          console.log('PublicBooking - Generated form session ID:', sessionId);
        } else {
          const errorText = await formResponse.text();
          console.warn('PublicBooking - Failed to load intake form:', formResponse.status, errorText);
          setIntakeForm(null);
          setFormSessionId(null);
        }
      } catch (error) {
        console.error('PublicBooking - Error fetching intake form:', error);
        setIntakeForm(null);
        setFormSessionId(null);
      } finally {
        setLoadingForm(false);
      }
    } else {
      console.log('PublicBooking - No intake form ID or userData:', { intakeFormId: selected.intakeFormId, hasUserData: !!userData });
      setIntakeForm(null);
      setFormSessionId(null);
    }
    
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

  const handleDateSelect = (date) => {
    if (!selectedAppointmentType?._id) {
      toast.error("Please select a service first");
      return false;
    }

    setSelectedDate(date);
    setSelectedTime(null);
    
    if (selectedAppointmentType?._id && userData) {
      console.log('Calling fetchAvailableTimeSlots for date change with:', { userId: userData.id, appointmentTypeId: selectedAppointmentType._id, date });
      fetchAvailableTimeSlots(userData.id, selectedAppointmentType._id, date).catch((error) => {
        console.error('Error fetching time slots:', error);
      });
    } else {
      console.warn('Cannot fetch time slots for date change - missing appointment type or user data');
    }

    return true;
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

      // Create booking payload
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
        ...(formSessionId && { formSessionId }), // Include formSessionId only if it exists
      };

      // Check if payment is required
      if (selectedAppointmentType.requirePayment) {
        console.log("PublicBooking - Payment required, redirecting to Stripe checkout");
        
        // Create Stripe checkout session
        const checkoutResponse = await fetch(`${apiUrl}/api/public-bookings/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userData.id,
            appointmentTypeId: selectedAppointmentType._id,
            bookingData: bookingPayload,
          }),
        });

        if (!checkoutResponse.ok) {
          const errorData = await checkoutResponse.json();
          throw new Error(errorData.message || 'Failed to create checkout session');
        }

        const checkoutData = await checkoutResponse.json();
        
        // Store booking data in sessionStorage for after payment
        sessionStorage.setItem('pendingBooking', JSON.stringify(bookingPayload));
        sessionStorage.setItem('checkoutSessionId', checkoutData.sessionId);
        
        // Redirect to Stripe checkout
        window.location.href = checkoutData.url;
        return; // Don't continue with normal booking flow
      }

      // No payment required, proceed with normal booking creation
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

  // Debug: Log form state changes
  useEffect(() => {
    console.log('PublicBooking - Intake form state changed:', intakeForm);
    console.log('PublicBooking - Current step:', step);
    console.log('PublicBooking - Is mobile:', isMobile);
    console.log('PublicBooking - Should show form?', ((step === 3 && !isMobile && intakeForm) || (step === 3 && isMobile && intakeForm)));
  }, [intakeForm, step, isMobile]);

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
                  <div className="top-row">
                    <button className="back-arrow-btn" onClick={goToPrev}>
                      <BackArrowIcon />
                    </button>
                    {branding?.usePlatformBranding !== false && (
                      <div className="daywise-branding">
                        <button className="powered-by-button">Powered by Daywise</button>
                      </div>
                    )}
                  </div>
                  <div className="heading-con">
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
                      style={{ borderRadius: '50px' }}
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

        {/* Intake Form Step - Show when step 3 and form exists (after slot selection) */}
        {step === 3 && intakeForm && intakeForm.fields && Array.isArray(intakeForm.fields) && intakeForm.fields.length > 0 && (
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
              <h1 style={{ color: 'var(--text-color)' }}>{intakeForm.name || "Intake Form"}</h1>
              {intakeForm.description && (
                <p className="intake-form-description">{intakeForm.description}</p>
              )}
              {loadingForm ? (
                <div className="forms-loading">
                  <div className="forms-spinner"></div>
                  <p className="forms-loading-text">Loading form...</p>
                </div>
              ) : (
                <div className="intake-form-fields">
                  {intakeForm.fields && intakeForm.fields.length > 0 ? (
                    intakeForm.fields.map((field, index) => (
                      <div key={field.id || index} className="intake-form-field" data-field-id={field.id}>
                        <label className="intake-form-label">
                          {field.question || "Your question"}
                          {field.required && <span className="required-asterisk"> *</span>}
                        </label>
                        {field.type === "text" && (
                          field.answerSize === "single" ? (
                            <Input
                              placeholder="Your answer"
                              value={formResponses[field.id] || ""}
                              onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                            />
                          ) : (
                            <Textarea
                              placeholder="Your answer"
                              value={formResponses[field.id] || ""}
                              onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                              style={{ borderRadius: "12px", minHeight: "80px" }}
                            />
                          )
                        )}
                        {field.type === "dropdown" && (
                          <Select
                            value={formResponses[field.id] || ""}
                            onChange={(value) => setFormResponses({ ...formResponses, [field.id]: value })}
                            options={field.options || []}
                            placeholder="Select an option"
                          />
                        )}
                        {field.type === "checkbox" && (
                          <div className="intake-form-checkbox">
                            <input
                              type="checkbox"
                              checked={formResponses[field.id] || false}
                              onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.checked })}
                            />
                            <label>{field.checkboxLabel || "I agree"}</label>
                          </div>
                        )}
                        {field.type === "checkbox-list" && (
                          <div className="intake-form-checkbox-list">
                            {field.options && field.options.map((option, optIndex) => (
                              <div key={optIndex} className="intake-form-checkbox">
                                <input
                                  type="checkbox"
                                  checked={(formResponses[field.id] || []).includes(option)}
                                  onChange={(e) => {
                                    const current = formResponses[field.id] || [];
                                    if (e.target.checked) {
                                      setFormResponses({ ...formResponses, [field.id]: [...current, option] });
                                    } else {
                                      setFormResponses({ ...formResponses, [field.id]: current.filter(v => v !== option) });
                                    }
                                  }}
                                />
                                <label>{option}</label>
                              </div>
                            ))}
                          </div>
                        )}
                        {field.type === "yes-no" && (
                          <div className="intake-form-yes-no">
                            <label>
                              <input
                                type="radio"
                                name={`yes-no-${field.id}`}
                                value="yes"
                                checked={formResponses[field.id] === "yes"}
                                onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                              />
                              <span>Yes</span>
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`yes-no-${field.id}`}
                                value="no"
                                checked={formResponses[field.id] === "no"}
                                onChange={(e) => setFormResponses({ ...formResponses, [field.id]: e.target.value })}
                              />
                              <span>No</span>
                            </label>
                          </div>
                        )}
                        {(field.type === "file" || field.type === "file-upload") && (
                          <div className="intake-form-file-upload-wrapper">
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.heic,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setFormResponses({ ...formResponses, [field.id]: file });
                                }
                              }}
                              className="intake-form-file-input"
                            />
                            <p className="intake-form-file-types">accepted file types: PNG, JPG, HEIC, PDF.</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No form fields available.</p>
                  )}
                  <Button
                    text={submittingForm ? "Saving..." : "Continue"}
                    disabled={submittingForm}
                    onClick={async () => {
                      // Prevent multiple clicks
                      if (submittingForm) {
                        return;
                      }

                      // Handle form submission before proceeding
                      if (!formSessionId || !intakeForm || !selectedAppointmentType) {
                        toast.error("Please fill out the form");
                        return;
                      }

                      // Validate required fields
                      if (intakeForm.fields && intakeForm.fields.length > 0) {
                        const firstEmptyRequiredField = intakeForm.fields.find((field) => {
                          if (!field.required) return false;
                          
                          const fieldId = field.id;
                          const responseValue = formResponses[fieldId];
                          
                          // Check based on field type
                          if (field.type === 'file' || field.type === 'file-upload') {
                            // File fields: check if file is uploaded
                            return !responseValue || !(responseValue instanceof File);
                          } else if (field.type === 'checkbox') {
                            // Checkbox: must be checked
                            return !responseValue || responseValue === false;
                          } else if (field.type === 'checkbox-list') {
                            // Checkbox list: must have at least one selected
                            const selected = Array.isArray(responseValue) ? responseValue : [];
                            return selected.length === 0;
                          } else if (field.type === 'yes-no') {
                            // Yes-no: must have a value
                            return !responseValue || responseValue === '';
                          } else if (field.type === 'dropdown') {
                            // Dropdown: must have a selected value
                            return !responseValue || responseValue === '';
                          } else {
                            // Text fields: must have non-empty value
                            return !responseValue || (typeof responseValue === 'string' && responseValue.trim() === '');
                          }
                        });

                        if (firstEmptyRequiredField) {
                          const fieldQuestion = firstEmptyRequiredField.question || 'This field';
                          toast.error(`Please fill in the required field: ${fieldQuestion}`);
                          
                          // Focus on the first empty required field
                          setTimeout(() => {
                            const fieldId = firstEmptyRequiredField.id;
                            const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
                            
                            if (fieldElement) {
                              // Scroll to the field
                              fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              
                              // Focus on the appropriate input element based on field type
                              let inputElement = null;
                              
                              if (firstEmptyRequiredField.type === 'file' || firstEmptyRequiredField.type === 'file-upload') {
                                inputElement = fieldElement.querySelector('input[type="file"]');
                              } else if (firstEmptyRequiredField.type === 'checkbox') {
                                inputElement = fieldElement.querySelector('input[type="checkbox"]');
                              } else if (firstEmptyRequiredField.type === 'checkbox-list') {
                                inputElement = fieldElement.querySelector('input[type="checkbox"]');
                              } else if (firstEmptyRequiredField.type === 'yes-no') {
                                inputElement = fieldElement.querySelector('input[type="radio"]');
                              } else if (firstEmptyRequiredField.type === 'dropdown') {
                                inputElement = fieldElement.querySelector('.select-box, select');
                              } else {
                                // Text fields (single or multi-line)
                                inputElement = fieldElement.querySelector('input[type="text"], textarea, .input-field');
                              }
                              
                              if (inputElement) {
                                inputElement.focus();
                                // For select boxes, we might need to click to open dropdown
                                if (firstEmptyRequiredField.type === 'dropdown' && inputElement.classList.contains('select-box')) {
                                  inputElement.click();
                                }
                              }
                            }
                          }, 100);
                          
                          return;
                        }
                      }

                      setSubmittingForm(true);
                      try {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                        
                        // Step 1: Upload all files first
                        const fileUploadPromises = [];
                        const fieldFileUrls = {};

                        intakeForm.fields?.forEach((field) => {
                          if ((field.type === 'file' || field.type === 'file-upload') && formResponses[field.id]) {
                            const file = formResponses[field.id];
                            if (file instanceof File) {
                              const uploadPromise = (async () => {
                                try {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('sessionId', formSessionId);

                                  const uploadResponse = await fetch(`${apiUrl}/api/public/intake-forms/upload`, {
                                    method: 'POST',
                                    body: formData,
                                  });

                                  if (uploadResponse.ok) {
                                    const uploadData = await uploadResponse.json();
                                    if (!fieldFileUrls[field.id]) {
                                      fieldFileUrls[field.id] = [];
                                    }
                                    fieldFileUrls[field.id].push(uploadData.fileUrl);
                                    console.log(`Uploaded file for field ${field.id}:`, uploadData.fileUrl);
                                  } else {
                                    console.error(`Failed to upload file for field ${field.id}`);
                                    toast.error(`Failed to upload file: ${file.name}`);
                                  }
                                } catch (error) {
                                  console.error(`Error uploading file for field ${field.id}:`, error);
                                  toast.error(`Error uploading file: ${file.name}`);
                                }
                              })();
                              fileUploadPromises.push(uploadPromise);
                            }
                          }
                        });

                        // Wait for all file uploads to complete
                        await Promise.all(fileUploadPromises);

                        // Step 2: Convert formResponses from object to array format
                        const responsesArray = intakeForm.fields?.map((field) => {
                          const fieldId = field.id;
                          const responseValue = formResponses[fieldId];
                          const fileUrls = fieldFileUrls[fieldId] || [];

                          const responseObj = {
                            fieldId: typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId,
                          };

                          if (field.type === 'file' || field.type === 'file-upload') {
                            if (fileUrls.length > 0) {
                              responseObj.answer = 'file_uploaded';
                              responseObj.fileUrls = fileUrls;
                            } else {
                              responseObj.answer = '';
                            }
                          } else if (field.type === 'checkbox') {
                            responseObj.answer = responseValue === true || responseValue === 'true' ? true : false;
                          } else if (field.type === 'checkbox-list') {
                            responseObj.answer = Array.isArray(responseValue) ? responseValue : (responseValue ? [responseValue] : []);
                          } else if (field.type === 'yes-no') {
                            responseObj.answer = responseValue || 'no';
                          } else {
                            responseObj.answer = responseValue || '';
                          }

                          return responseObj;
                        }) || [];

                        // Step 3: Save temp form submission
                        const saveResponse = await fetch(`${apiUrl}/api/public/intake-forms/save-temp`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sessionId: formSessionId,
                            intakeFormId: intakeForm._id,
                            appointmentTypeId: selectedAppointmentType._id,
                            responses: responsesArray,
                            fileUrls: Object.values(fieldFileUrls).flat(),
                          }),
                        });

                        if (saveResponse.ok) {
                          console.log('Form responses saved successfully');
                          // Update uploaded file URLs state
                          setUploadedFileUrls(fieldFileUrls);
                          // Proceed to next step
                          goToNext();
                        } else {
                          const errorText = await saveResponse.text();
                          console.error('Failed to save form responses:', errorText);
                          toast.error('Failed to save form. Please try again.');
                        }
                      } catch (error) {
                        console.error('Error submitting form:', error);
                        toast.error('Error submitting form. Please try again.');
                      } finally {
                        setSubmittingForm(false);
                      }
                    }}
                    type="button"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enter Detail Step - Show when step 4 (if form exists) or step 3 (if no form) */}
        {((step === 4 && intakeForm && intakeForm.fields && Array.isArray(intakeForm.fields) && intakeForm.fields.length > 0) || (step === 3 && (!intakeForm || !intakeForm.fields || !Array.isArray(intakeForm.fields) || intakeForm.fields.length === 0))) && (
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
                  text={
                    submitting 
                      ? (selectedAppointmentType?.requirePayment ? "Continuing to Payment..." : "Booking...")
                      : (selectedAppointmentType?.requirePayment ? "Continue to Payment" : "Complete Booking")
                  } 
                  disabled={submitting}
                  type="submit"
                />
              </form>
            </div>
          </div>
        )}

        {/* Debug: Log step state */}
        {step === 3 && console.log('Step 3 Debug:', { 
          hasIntakeForm: !!intakeForm, 
          hasFields: !!(intakeForm?.fields), 
          fieldsLength: intakeForm?.fields?.length,
          fieldsIsArray: Array.isArray(intakeForm?.fields)
        })}

        {/* Success Step - Show when step 5 (if form exists) or step 4 (if no form) */}
        {((step === 5 && intakeForm) || (step === 4 && !intakeForm)) && (
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
                    backgroundColor: 'var(--main-color)',
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
                    backgroundColor: 'var(--secondary-color)',
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
