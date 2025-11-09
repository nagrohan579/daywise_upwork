import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ClockIcon, CalendarIcon2, GlobeIcon, DollarIcon, CancelledEventCrossIcon } from '../../components/SVGICONS/Svg';
import './CancelledEvent.css';
import { getTimezoneLabel } from '../../utils/timezones';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const CancelledEvent = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);
  const [error, setError] = useState(null);
  const [resolvedAppointmentType, setResolvedAppointmentType] = useState(null);

  useEffect(() => {
    // Try to get data from navigation state first
    if (location.state && location.state.booking) {
      setEventData(location.state);
      setLoading(false);
    }
    // Fallback to sessionStorage if navigation state is empty (page refresh)
    else {
      const storedData = sessionStorage.getItem('cancelledBookingData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setEventData(parsedData);
          setLoading(false);
          // Clear sessionStorage after use
          sessionStorage.removeItem('cancelledBookingData');
        } catch (err) {
          console.error('Error parsing stored data:', err);
          setError('Failed to load booking details');
          setLoading(false);
        }
      } else {
        setError('No booking data available');
        setLoading(false);
      }
    }
  }, [location.state]);

  // Once we have eventData, resolve appointment type (for price, duration, name) and set CSS variables
  useEffect(() => {
    const resolveApptType = async () => {
      if (!eventData) return;
      const { appointmentType, booking, user, branding } = eventData;
      
      // Set CSS variables for colors from branding
      const root = document.documentElement;
      if (branding) {
        root.style.setProperty('--main-color', branding?.primary || '#0053F1');
        root.style.setProperty('--secondary-color', branding?.secondary || '#64748B');
        root.style.setProperty('--text-color', branding?.accent || '#121212');
      } else {
        // If branding not in eventData, try to fetch it
        if (user?._id || user?.id) {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const userId = user?._id || user?.id;
            const brandingResp = await fetch(`${apiUrl}/api/branding?userId=${encodeURIComponent(userId)}`);
            if (brandingResp.ok) {
              const brandingData = await brandingResp.json();
              root.style.setProperty('--main-color', brandingData?.primary || '#0053F1');
              root.style.setProperty('--secondary-color', brandingData?.secondary || '#64748B');
              root.style.setProperty('--text-color', brandingData?.accent || '#121212');
            } else {
              // Set defaults if fetch fails
              root.style.setProperty('--main-color', '#0053F1');
              root.style.setProperty('--secondary-color', '#64748B');
              root.style.setProperty('--text-color', '#121212');
            }
          } catch (e) {
            // Set defaults on error
            root.style.setProperty('--main-color', '#0053F1');
            root.style.setProperty('--secondary-color', '#64748B');
            root.style.setProperty('--text-color', '#121212');
          }
        } else {
          // Set defaults if no user
          root.style.setProperty('--main-color', '#0053F1');
          root.style.setProperty('--secondary-color', '#64748B');
          root.style.setProperty('--text-color', '#121212');
        }
      }
      
      if (appointmentType && typeof appointmentType.price !== 'undefined') {
        setResolvedAppointmentType(appointmentType);
        return;
      }
      // Fallback: fetch user's appointment types and find the matching one
      if (booking?.appointmentTypeId && (user?._id || user?.id)) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const userId = user?._id || user?.id;
          const resp = await fetch(`${apiUrl}/api/appointment-types?userId=${encodeURIComponent(userId)}`);
          if (resp.ok) {
            const types = await resp.json();
            const match = types.find((t) => t._id === booking.appointmentTypeId);
            if (match) setResolvedAppointmentType(match);
          }
        } catch (e) {
          // swallow - page can still render without price
        }
      }
    };
    resolveApptType();
  }, [eventData]);

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
    return getTimezoneLabel(tz);
  };

  const handleBookNewAppointment = () => {
    if (slug) {
      navigate(`/${slug}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="cancelled-event-page">
        <div className="cancelled-event-loading">
          <div className="cancelled-event-spinner"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="cancelled-event-page">
        <div className="cancelled-event-error">
          <h2>Booking Not Found</h2>
          <p>{error || 'We couldn\'t find the booking you\'re looking for.'}</p>
          <button
            onClick={handleBookNewAppointment}
            className="cancelled-event-btn cancelled-event-btn-primary"
          >
            Book New Appointment
          </button>
        </div>
      </div>
    );
  }

  const { booking, appointmentType, user, branding } = eventData;
  const apptType = resolvedAppointmentType || appointmentType;
  const customerTz = booking?.customerTimezone;

  // Debug logging
  console.log('CancelledEvent - eventData:', eventData);
  console.log('CancelledEvent - appointmentType from state:', appointmentType);
  console.log('CancelledEvent - resolvedAppointmentType:', resolvedAppointmentType);
  console.log('CancelledEvent - apptType (final):', apptType);
  console.log('CancelledEvent - apptType?.price:', apptType?.price);
  console.log('CancelledEvent - booking?.price:', booking?.price);

  return (
    <div className="cancelled-event-page">
      <div className="cancelled-event-outer-container">
        <div className="cancelled-event-inner-card">
          <div className="cancelled-event-content">
            <div className="cancelled-event-header-wrapper">
        <div className="cancelled-event-header">
                <div className="cancelled-event-title-wrapper">
                  <CancelledEventCrossIcon width={24} height={24} />
                  <h1>Booking Cancelled</h1>
        </div>
                <p>Your appointment has been successfully canceled.</p>
              </div>

              <div className="cancelled-event-card-wrapper">
                <div className="cancelled-booking-details">
                  {branding?.usePlatformBranding !== false && (
                    <div className="daywise-branding">
                      <div className="powered-by-daywise">
                        Powered by Daywise
                      </div>
                    </div>
                  )}
                  <h2>{apptType?.name || appointmentType?.name || 'Appointment'}</h2>

              <div className="details-list">
                <div className="detail-row">
                  <ClockIcon />
                      <span>{(apptType?.duration || booking.duration)} min</span>
                </div>

                <div className="detail-row">
                  <CalendarIcon2 />
                      <span>{formatTimeRange(booking.appointmentDate, (apptType?.duration || booking.duration), customerTz)}, {formatDate(booking.appointmentDate, customerTz)}</span>
                </div>

                <div className="detail-row">
                  <GlobeIcon />
                  <span>{formatTimezone(customerTz)}</span>
                </div>

                    {(apptType?.price > 0 || booking?.price > 0) && (
                  <div className="detail-row">
                    <DollarIcon />
                        <span>${apptType?.price ?? booking?.price}</span>
                  </div>
                )}
              </div>
                </div>
              </div>

              <div className="cancelled-event-actions">
                <button
                  onClick={handleBookNewAppointment}
                  className="cancelled-event-btn"
                >
                  <span>Book New Appointment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelledEvent;
