import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ClockIcon, CalendarIcon2, GlobeIcon, DollarIcon, CopyIcon } from '../../components/SVGICONS/Svg';
import { FaCheck } from 'react-icons/fa';
import './Event.css';
import { getTimezoneLabel } from '../../utils/timezones';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import RescheduleConfirmationModal from '../../components/ui/modals/RescheduleConfirmationModal';
import CancelConfirmationModal from '../../components/ui/modals/CancelConfirmationModal';

dayjs.extend(utc);
dayjs.extend(timezone);

const Event = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetchEventDetails();
    }
  }, [token]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/bookings/token/${token}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Event not found. Please check your link and try again.');
        }
        throw new Error('Failed to load event details');
      }

      const data = await response.json();
      console.log('Event data:', data);
      setEventData(data);
      
      // Set CSS variables for colors from branding data
      if (data.branding) {
        const root = document.documentElement;
        root.style.setProperty('--main-color', data.branding?.primary || '#0053F1');
        root.style.setProperty('--secondary-color', data.branding?.secondary || '#64748B');
        root.style.setProperty('--text-color', data.branding?.accent || '#121212');
      } else {
        // Set default CSS variables if no branding data
        const root = document.documentElement;
        root.style.setProperty('--main-color', '#0053F1');
        root.style.setProperty('--secondary-color', '#64748B');
        root.style.setProperty('--text-color', '#121212');
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err.message || 'Failed to load event details');
      toast.error(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp, tz) => {
    const local = dayjs.utc(timestamp).tz(tz);
    return local.format('MMMM D, YYYY');
  };

  const formatTimeRange = (timestamp, duration, tz) => {
    const startLocal = dayjs.utc(timestamp).tz(tz);
    const endLocal = startLocal.add(duration, 'minute');
    return `${startLocal.format('h:mm A')}-${endLocal.format('h:mm A')}`;
  };

  const formatTimezone = (tz) => {
    if (!tz) return '';
    // Use the same formatting as in PublicBooking to get exact same label
    return getTimezoneLabel(tz);
  };

  const copyEventLink = async () => {
    try {
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
      const eventUrl = `${frontendUrl}/event/${eventData?.booking?.bookingToken}`;
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      toast.success('Event link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  };

  const handleReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleCancelEvent = () => {
    setShowCancelModal(true);
  };

  const handleCancelSuccess = () => {
    // Redirect to home page after successful cancellation
    navigate('/');
  };

  if (loading) {
    return (
      <div className="event-page">
        <div className="event-loading">
          <div className="event-spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="event-page">
        <div className="event-error">
          <h2>Event Not Found</h2>
          <p>{error || 'We couldn\'t find the event you\'re looking for.'}</p>
        </div>
      </div>
    );
  }

  const { booking, appointmentType, user, branding } = eventData;
  const customerTz = booking?.customerTimezone || user?.timezone;
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  const eventUrl = `${frontendUrl}/event/${booking.bookingToken}`;
  
  // Format booking date and time for modal display
  const bookingDateFormatted = formatDate(booking.appointmentDate, customerTz);
  // Get start time in lowercase format (e.g., "4:00pm")
  const startLocal = dayjs.utc(booking.appointmentDate).tz(customerTz);
  const bookingTimeFormatted = startLocal.format('h:mma').toLowerCase(); // e.g., "4:00pm"

  return (
    <div className="event-page">
      <div className="event-outer-container">
        <div className="event-header">
          <h1>Event Details</h1>
          <p>Review your confirmed appointment details.</p>
        </div>

        <div className="event-card-wrapper">
          <div className="event-card">
            {branding?.usePlatformBranding !== false && (
              <div className="daywise-branding">
                <div className="powered-by-daywise">
                  Powered by Daywise
                </div>
              </div>
            )}

            <div className="booking-details">
              <h2>{appointmentType?.name || 'Appointment'}</h2>
              
              <div className="details-list">
                <div className="detail-row">
                  <ClockIcon />
                  <span>{appointmentType?.duration || booking.duration} min</span>
                </div>

                <div className="detail-row">
                  <CalendarIcon2 />
                  <span>{formatTimeRange(booking.appointmentDate, appointmentType?.duration || booking.duration, customerTz)}, {formatDate(booking.appointmentDate, customerTz)}</span>
                </div>

                <div className="detail-row">
                  <GlobeIcon />
                  <span>{formatTimezone(customerTz)}</span>
                </div>

                {appointmentType?.price > 0 && (
                  <div className="detail-row">
                    <DollarIcon />
                    <span>${appointmentType.price}</span>
                  </div>
                )}
              </div>

              <div className="event-link-section">
                <h3>Unique Event Link</h3>
                <div className="event-link-input-wrapper">
                  <input
                    type="text"
                    value={eventUrl}
                    readOnly
                    className="event-link-input"
                  />
                <button
                  onClick={copyEventLink}
                  className="event-link-copy-btn"
                  title="Copy link"
                >
                  {copied ? <FaCheck className="copy-tick-icon" /> : <CopyIcon />}
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="event-actions">
          <button
            onClick={handleReschedule}
            className="event-btn event-btn-primary"
          >
            <svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.375 6.5997H1.35V12.3003C1.35 12.7557 1.719 13.1247 2.1753 13.1247H11.5497C12.0051 13.1247 12.375 12.7557 12.375 12.3003V6.5997ZM12.375 3.6747C12.3748 3.45597 12.2877 3.24629 12.133 3.09171C11.9782 2.93713 11.7684 2.8503 11.5497 2.8503H2.1753C1.95657 2.8503 1.74679 2.93713 1.59204 3.09171C1.43729 3.24629 1.35024 3.45597 1.35 3.6747V5.2497H12.375V3.6747ZM13.725 12.3003C13.7248 12.8771 13.4955 13.4301 13.0876 13.8379C12.6796 14.2456 12.1265 14.4747 11.5497 14.4747H2.1753C1.59853 14.4747 1.04537 14.2456 0.637449 13.8379C0.229527 13.4301 0.00023863 12.8771 0 12.3003V3.6747C0.00023863 3.09793 0.229527 2.54487 0.637449 2.13711C1.04537 1.72936 1.59853 1.5003 2.1753 1.5003H2.9997V0.675C2.9997 0.495979 3.07082 0.32429 3.1974 0.197703C3.32399 0.0711158 3.49568 0 3.6747 0C3.85372 0 4.02541 0.0711158 4.152 0.197703C4.27858 0.32429 4.3497 0.495979 4.3497 0.675V1.5003H9.3753V0.675C9.3753 0.495979 9.44642 0.32429 9.573 0.197703C9.69959 0.0711158 9.87128 0 10.0503 0C10.2293 0 10.401 0.0711158 10.5276 0.197703C10.6542 0.32429 10.7253 0.495979 10.7253 0.675V1.5003H11.5497C12.1265 1.5003 12.6796 1.72936 13.0876 2.13711C13.4955 2.54487 13.7248 3.09793 13.725 3.6747V12.3003Z" fill="white"/>
            </svg>
            <span>Reschedule</span>
          </button>
          <button
            onClick={handleCancelEvent}
            className="event-btn event-btn-secondary"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.875 7.5C13.875 5.80925 13.2034 4.18774 12.0078 2.99219C10.8123 1.79665 9.19075 1.125 7.5 1.125C5.80925 1.125 4.18774 1.79665 2.99219 2.99219C1.79665 4.18774 1.125 5.80925 1.125 7.5C1.125 9.19075 1.79665 10.8123 2.99219 12.0078C4.18774 13.2034 5.80925 13.875 7.5 13.875C9.19075 13.875 10.8123 13.2034 12.0078 12.0078C13.2034 10.8123 13.875 9.19075 13.875 7.5ZM9.3525 4.8525C9.404 4.79724 9.4661 4.75291 9.5351 4.72216C9.6041 4.69142 9.67858 4.67489 9.75411 4.67356C9.82964 4.67222 9.90466 4.68612 9.9747 4.71441C10.0447 4.7427 10.1084 4.78481 10.1618 4.83822C10.2152 4.89164 10.2573 4.95526 10.2856 5.0253C10.3139 5.09534 10.3278 5.17036 10.3264 5.24589C10.3251 5.32142 10.3086 5.3959 10.2778 5.4649C10.2471 5.5339 10.2028 5.596 10.1475 5.6475L8.295 7.5L10.1475 9.3525L10.1865 9.3945C10.2758 9.50238 10.3217 9.63971 10.3151 9.77962C10.3086 9.91953 10.25 10.052 10.151 10.151C10.052 10.25 9.91953 10.3086 9.77962 10.3151C9.63971 10.3217 9.50238 10.2758 9.3945 10.1865L9.3525 10.1475L7.5 8.295L5.6475 10.1475C5.596 10.2028 5.5339 10.2471 5.4649 10.2778C5.3959 10.3086 5.32142 10.3251 5.24589 10.3264C5.17036 10.3278 5.09534 10.3139 5.0253 10.2856C4.95526 10.2573 4.89164 10.2152 4.83822 10.1618C4.78481 10.1084 4.7427 10.0447 4.71441 9.9747C4.68612 9.90466 4.67222 9.82964 4.67356 9.75411C4.67489 9.67858 4.69142 9.6041 4.72216 9.5351C4.75291 9.4661 4.79724 9.404 4.8525 9.3525L6.705 7.5L4.8525 5.6475L4.8135 5.6055C4.72417 5.49762 4.6783 5.36029 4.68486 5.22038C4.69143 5.08047 4.74996 4.94804 4.849 4.849C4.94804 4.74996 5.08047 4.69143 5.22038 4.68486C5.36029 4.6783 5.49762 4.72417 5.6055 4.8135L5.6475 4.8525L7.5 6.705L9.3525 4.8525ZM15 7.5C15 11.6423 11.6423 15 7.5 15C3.35775 15 0 11.6423 0 7.5C0 3.35775 3.35775 0 7.5 0C11.6423 0 15 3.35775 15 7.5Z" fill="white"/>
            </svg>
            <span>Cancel Event</span>
          </button>
        </div>
      </div>
      
      <RescheduleConfirmationModal
        show={showRescheduleModal}
        setShow={setShowRescheduleModal}
        bookingDate={bookingDateFormatted}
        bookingTime={bookingTimeFormatted}
        bookingToken={booking.bookingToken}
      />
      
      <CancelConfirmationModal
        show={showCancelModal}
        setShow={setShowCancelModal}
        bookingDate={bookingDateFormatted}
        bookingTime={bookingTimeFormatted}
        bookingToken={booking.bookingToken}
        userSlug={user?.slug}
        onDeleteSuccess={handleCancelSuccess}
      />
    </div>
  );
};

export default Event;
