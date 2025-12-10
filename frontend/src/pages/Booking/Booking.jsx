import {
  ActionMenu,
  AddAppointmentModal,
  AppLayout,
  Button,
  GoogleButton,
} from "../../components";
import { FaPlus } from "react-icons/fa6";
import { FaTimes } from "react-icons/fa";
import { MessageIcon, FormIcon, DownloadIcon, ViewIcon, EditIconAdmin, DeleteIcon, CancelIcon, CrossIcon } from "../../components/SVGICONS/Svg";
import "./Booking.css";
import React, { useState, useEffect } from "react";
import { useMobile } from "../../hooks";
import useAccountStatus from "../../hooks/useAccountStatus";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import CalendarApp from "../../components/Calendar/CalendarTest";
import { getTimeComponents, formatDate, formatTime, toLocalDateString } from "../../utils/dateFormatting";
import { Modal } from "react-bootstrap";
import HowThisWorksButton from "../../components/HowThisWorksButton";
import VideoModal from "../../components/ui/modals/VideoModal";
import GoogleCalendarDisconnectModal from "../../components/ui/modals/GoogleCalendarDisconnectModal";

const BookingsPage = () => {
  const [showBookingList, setShowBookingList] = useState(true);
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [combinedEvents, setCombinedEvents] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [isModalBouncing, setIsModalBouncing] = useState(false);
  const [formSubmissions, setFormSubmissions] = useState({}); // Map of bookingId -> formSubmission
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedFormSubmission, setSelectedFormSubmission] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [downloadState, setDownloadState] = useState('idle');
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isCheckingCalendarStatus, setIsCheckingCalendarStatus] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showGoogleCalendarDisconnectModal, setShowGoogleCalendarDisconnectModal] = useState(false);
  const [bookingLimit, setBookingLimit] = useState(null); // null = unlimited
  const [userTimezone, setUserTimezone] = useState('Etc/UTC'); // Default to UTC
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const { accountStatus } = useAccountStatus();
  const isInactive = accountStatus === 'inactive';
  const [showOnboardingVideo, setShowOnboardingVideo] = useState(false);
  const [hasCustomBranding, setHasCustomBranding] = useState(false); // Track if user is on paid plan

  const isMobile = useMobile(991);
  
  // Video URL for onboarding
  const onboardingVideoUrl = "https://jumpshare.com/embed/frFIIrxdkLcqTD3VmcSP";

  // Fetch current user and timezone
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Booking - User data from /api/auth/me:', data);
          console.log('Booking - User ID type:', typeof data.user.id);
          console.log('Booking - User ID value:', data.user.id);
          setUserId(data.user.id);
          // Set user timezone
          if (data.user && data.user.timezone) {
            setUserTimezone(data.user.timezone);
          }
        } else {
          console.error('Booking - Failed to fetch user, status:', response.status);
        }
      } catch (error) {
        console.error('Booking - Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Check if we should show onboarding video modal (only once after onboarding)
  useEffect(() => {
    const shouldShowVideo = sessionStorage.getItem('showOnboardingVideo');
    if (shouldShowVideo === 'true') {
      // Clear the flag immediately so it never shows again
      sessionStorage.removeItem('showOnboardingVideo');
      // Show the modal after a short delay to ensure page is loaded
      setTimeout(() => {
        setShowOnboardingVideo(true);
      }, 500);
    }
  }, []);

  // Helper function to get current month bookings count
  const getCurrentMonthBookingsCount = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.appointmentDate);
      return bookingDate.getMonth() === currentMonth && 
             bookingDate.getFullYear() === currentYear;
    }).length;
  };

  // Fetch bookings and user features together
  const fetchBookings = async () => {
    if (!userId) return;

    // Don't fetch bookings if account is inactive
    if (accountStatus === 'inactive') {
      setIsLoadingData(false);
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Fetch both in parallel
      const [bookingsResponse, featuresResponse] = await Promise.all([
        fetch(`${apiUrl}/api/bookings?includeDeleted=true`, {
          credentials: 'include',
        }),
        fetch(`${apiUrl}/api/user-subscriptions/me`, {
          credentials: 'include',
        })
      ]);
      
      if (bookingsResponse.ok) {
        const data = await bookingsResponse.json();
        console.log('Booking - Fetched bookings:', data?.length || 0, 'bookings');
        console.log('Booking - Sample booking:', data?.[0]);
        setBookings(data || []);
        
        // Fetch form submissions for all bookings
        const submissionsMap = {};
        await Promise.all(
          (data || []).map(async (booking) => {
            try {
              const formResponse = await fetch(`${apiUrl}/api/bookings/${booking._id}/form-submission`, {
                credentials: 'include',
              });
              if (formResponse.ok) {
                const formData = await formResponse.json();
                submissionsMap[booking._id] = formData;
              } else if (formResponse.status !== 404) {
                // Only log non-404 errors (404 means no form submission, which is normal)
                console.error(`Error fetching form submission for booking ${booking._id}:`, formResponse.status);
              }
            } catch (error) {
              console.error(`Error fetching form submission for booking ${booking._id}:`, error);
            }
          })
        );
        setFormSubmissions(submissionsMap);
      } else {
        console.error('Booking - Failed to fetch bookings, status:', bookingsResponse.status);
        setBookings([]);
      }
      
      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json();
        setBookingLimit(featuresData.features?.bookingLimit ?? null);
        setHasCustomBranding(featuresData.features?.customBranding || false);
      } else {
        console.error('Failed to fetch features');
      }
    } catch (error) {
      console.error('Booking - Error fetching data:', error);
      setBookings([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (userId) {
      checkCalendarStatus(); // Check if calendar is already connected
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchBookings();
    }
  }, [userId, accountStatus]);

  // Listen for timezone changes from Account page
  useEffect(() => {
    const handleTimezoneChange = (event) => {
      console.log('Timezone changed to:', event.detail.timezone);
      // Update local timezone state
      setUserTimezone(event.detail.timezone);
      // Refresh bookings when timezone changes
      fetchBookings();
      // Also refresh calendar events if connected
      if (isCalendarConnected) {
        fetchCalendarEvents(false);
      }
      toast.info('Refreshing bookings with new timezone...');
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange);

    return () => {
      window.removeEventListener('timezoneChanged', handleTimezoneChange);
    };
  }, [userId, isCalendarConnected]);

  // Check if Google Calendar is connected
  const checkCalendarStatus = async () => {
    if (!userId) return;
    
    setIsCheckingCalendarStatus(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/google-calendar/status`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsCalendarConnected(data.connected === true);
      } else {
        setIsCalendarConnected(false);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
      setIsCalendarConnected(false);
    } finally {
      setIsCheckingCalendarStatus(false);
    }
  };

  // Fetch Google Calendar events with auto-refresh
  const fetchCalendarEvents = async (showLoadingState = true) => {
    if (!userId) return;

    console.log('Booking - Fetching Google Calendar events for userId:', userId);

    if (showLoadingState) {
      setIsLoadingCalendar(true);
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Add time range parameters (past 3 months to future 12 months)
      const now = new Date();
      const timeMin = new Date(now.getTime() - (3 * 30 * 24 * 60 * 60 * 1000)); // 3 months ago
      const timeMax = new Date(now.getTime() + (12 * 30 * 24 * 60 * 60 * 1000)); // 12 months from now
      
      const url = new URL(`${apiUrl}/api/google-calendar/events`);
      url.searchParams.append('timeMin', timeMin.toISOString());
      url.searchParams.append('timeMax', timeMax.toISOString());
      
      console.log('Booking - Google Calendar API URL:', url.toString());
      console.log('Booking - Time range:', { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() });

      const response = await fetch(url.toString(), {
        credentials: 'include',
      });

      console.log('Booking - Google Calendar response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Booking - Google Calendar response:', data);
        if (data.success && data.events) {
          console.log('Booking - Google Calendar events count:', data.events.length);
          if (data.events.length > 0) {
            console.log('Booking - Sample Google Calendar event:', data.events[0]);
          }
          setCalendarEvents(data.events);
          setIsCalendarConnected(true); // Mark as connected if we got events successfully
        } else {
          console.warn('Booking - Google Calendar API returned no events or failed:', data);
          // Check if it's a "not connected" error
          if (data.error && data.error.includes('not connected')) {
            setIsCalendarConnected(false);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Booking - Google Calendar API error:', response.status, errorText);
        if (response.status === 401 || errorText.includes('not connected')) {
          setIsCalendarConnected(false);
        }
      }
    } catch (error) {
      console.error('Booking - Error fetching calendar events:', error);
    } finally {
      if (showLoadingState) {
        setIsLoadingCalendar(false);
      }
      setIsRefreshing(false);
    }
  };

  // Initial fetch and setup auto-refresh polling - only if calendar is connected
  useEffect(() => {
    if (!userId || !isCalendarConnected) return;

    // Initial fetch
    fetchCalendarEvents(true);

    // Setup auto-refresh every 60 seconds
    const refreshInterval = setInterval(() => {
      fetchCalendarEvents(false); // Don't show loading state on auto-refresh
    }, 60000); // 60 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [userId, isCalendarConnected]);

  // Transform bookings for calendar view - ALWAYS show Convex bookings (single source of truth)
  useEffect(() => {
    console.log('Booking - Transforming events - bookings:', bookings?.length || 0);

    // Filter out cancelled and deleted bookings from calendar view
    // Only show confirmed and pending bookings in calendar
    const activeBookings = (bookings || []).filter(booking => 
      booking.status !== 'cancelled' && booking.status !== 'deleted'
    );

    // ALWAYS show Convex bookings - they are the source of truth
    const transformedBookings = activeBookings.map((booking, index) => {
      // Get hours and minutes in user's timezone
      const { hours, minutes } = getTimeComponents(booking.appointmentDate, userTimezone);

      // Get appointment type name and color for display
      const appointmentTypeName = booking.appointmentType?.name || 'Appointment';
      const appointmentTypeColor = booking.appointmentType?.color || '#4285F4'; // Use service color or default blue

      console.log(`Booking ${index + 1} - appointmentType:`, booking.appointmentType, 'color:', appointmentTypeColor);

      return {
        id: `booking-${booking._id}`,
        title: `${appointmentTypeName} with ${booking.customerName}`,
        date: toLocalDateString(booking.appointmentDate, userTimezone),
        color: appointmentTypeColor, // Always use appointment type color
        time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        source: 'booking',
        data: booking
      };
    });

    console.log('Booking - Transformed bookings with colors:', transformedBookings.map(b => ({ id: b.id, color: b.color })));
    setCombinedEvents(transformedBookings);
  }, [bookings, userTimezone]);

  // Clean up URL parameters and handle calendar connection status
  useEffect(() => {
    const calendarConnected = searchParams.get('calendar_connected');
    const calendarError = searchParams.get('calendar_error');
    const bookingId = searchParams.get('bookingId');
    const dateParam = searchParams.get('date');
    const viewParam = searchParams.get('view');
    const dayView = searchParams.get('dayView');

    if (calendarConnected) {
      // Remove the parameter immediately to prevent duplicate toasts on re-renders
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('calendar_connected');
        return newParams;
      });
      
      toast.success('Google Calendar connected successfully!');
      // Immediately update the connection state
      setIsCalendarConnected(true);
      // Refresh calendar status from database
      checkCalendarStatus();
      fetchCalendarEvents(true);
    }

    if (calendarError) {
      // Remove the parameter immediately to prevent duplicate toasts on re-renders
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('calendar_error');
        return newParams;
      });
      
      toast.error('Failed to connect Google Calendar');
    }

    // Handle navigation from notification "Show in Calendar"
    if (bookingId && dateParam && viewParam === 'calendar' && !isLoadingData) {
      // Switch to calendar view
      setShowBookingList(false);
      setShowBookingCalendar(true);
      
      // Check if booking exists and is not cancelled
      const booking = bookings.find(b => b._id === bookingId);
      if (!booking) {
        toast.error('This booking is no longer available.');
      } else if (booking.status === 'cancelled') {
        toast.error('This booking has been cancelled.');
      }
      // If booking exists and is not cancelled, CalendarApp will handle focusing on it
      
      // Remove params after handling (with a slight delay to ensure CalendarApp receives them)
      setTimeout(() => {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('bookingId');
          newParams.delete('date');
          newParams.delete('view');
          newParams.delete('dayView');
          return newParams;
        });
      }, 100);
    }
  }, [searchParams, setSearchParams, bookings, isLoadingData]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchCalendarEvents(true);
  };

  // Google Calendar OAuth handler
  const handleConnectGoogleCalendar = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    // Redirect to backend OAuth endpoint which will redirect to Google
    window.location.href = `${apiUrl}/api/google-calendar/auth`;
  };

  // Google Calendar disconnect handler
  const handleDisconnectGoogleCalendar = async () => {
    if (isDisconnecting) return;
    
    setIsDisconnecting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/google-calendar/disconnect`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setIsCalendarConnected(false);
        setCalendarEvents([]);
        setCombinedEvents([]);
        setShowGoogleCalendarDisconnectModal(false);
        toast.success('Google Calendar disconnected successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disconnect calendar');
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error(error.message || 'Failed to disconnect Google Calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Show delete confirmation modal
  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    setShowDeleteModal(true);
  };

  // Show cancel confirmation modal
  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  // Cancel appointment handler
  const handleCancelAppointment = async () => {
    if (!bookingToCancel) return;

    setIsCancelling(true);

    try {
      console.log('Booking - Cancelling appointment:', bookingToCancel);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Update booking status to cancelled via API
      const response = await fetch(`${apiUrl}/api/bookings/${bookingToCancel._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        console.log('Booking - Appointment cancelled successfully');
        toast.success('Appointment cancelled successfully!');
        
        // Close modal
        setShowCancelModal(false);
        setBookingToCancel(null);
        
        // Refresh bookings list
        await fetchBookings();
        
        // Refresh calendar events
        fetchCalendarEvents(false);
      } else {
        const errorData = await response.json();
        console.error('Booking - Failed to cancel appointment:', errorData);
        toast.error(errorData.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Booking - Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  // Delete appointment handler
  const handleDeleteAppointment = async () => {
    if (!bookingToDelete) return;

    setIsDeleting(true);

    try {
      console.log('Booking - Deleting appointment:', bookingToDelete);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Delete via API (which handles both Convex and Google Calendar)
      const response = await fetch(`${apiUrl}/api/bookings/${bookingToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('Booking - Appointment deleted successfully');
        toast.success('Appointment deleted successfully!');
        
        // Refresh bookings list (which will also refresh form submissions)
        await fetchBookings();
        
        // Refresh calendar events
        fetchCalendarEvents(false);
      } else {
        const errorData = await response.json();
        console.error('Booking - Failed to delete appointment:', errorData);
        toast.error(errorData.message || 'Failed to delete appointment');
      }

      // Close modal
      setShowDeleteModal(false);
      setBookingToDelete(null);

      // Refresh calendar events to update UI
      fetchCalendarEvents(false);
    } catch (error) {
      console.error('Booking - Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Prepare bookings for list view - ALWAYS show Convex bookings (source of truth)
  const bookingsForList = React.useMemo(() => {
    console.log('bookingsForList - bookings count:', bookings?.length || 0);

    const now = new Date().getTime();

    // Filter out deleted bookings - they should not appear anywhere
    const activeBookings = (bookings || []).filter(booking => booking.status !== 'deleted');

    // ALWAYS show Convex bookings - they are the source of truth
    const mappedBookings = activeBookings.map(booking => {
      // Get appointment type name for display
      const appointmentTypeName = booking.appointmentType?.name || 'Appointment';

      return {
        ...booking,
        title: `${appointmentTypeName} with ${booking.customerName}`,
        name: booking.customerName,
        date: formatDate(booking.appointmentDate, userTimezone),
        time: formatTime(booking.appointmentDate, userTimezone, false),
        color: booking.appointmentType?.color || '#4285F4', // Always use appointment type color
        source: 'booking',
        appointmentTimestamp: new Date(booking.appointmentDate).getTime(),
        isPast: new Date(booking.appointmentDate).getTime() < now,
      };
    });

    // Sort by appointment date (ascending - closest first)
    const sortedBookings = [...mappedBookings].sort((a, b) => {
      return a.appointmentTimestamp - b.appointmentTimestamp;
    });

    // Separate upcoming and past bookings
    // Upcoming: not past AND not cancelled (cancelled bookings go to past)
    // Past: is past OR is cancelled (cancelled bookings show in past section)
    const upcomingBookings = sortedBookings.filter(booking => 
      !booking.isPast && booking.status !== 'cancelled'
    );
    const pastBookings = sortedBookings.filter(booking => 
      booking.isPast || booking.status === 'cancelled'
    );

    return {
      upcoming: upcomingBookings,
      past: pastBookings,
    };
  }, [bookings, userTimezone]);

  const currentMonthBookingsCount = getCurrentMonthBookingsCount();
  const isBookingLimitReached = bookingLimit !== null && currentMonthBookingsCount >= bookingLimit;
  const googleButtonDisabled = isInactive || isCalendarConnected || isCheckingCalendarStatus || isDisconnecting;
  const addAppointmentDisabled = isInactive || isBookingLimitReached;

  return (
    <AppLayout>
      <div className="booking-page ">
        <div className="top-con">
          <div className="content-main-wrapper">
            <div className="wrap">
              <h1>Bookings</h1>
              <p>View and manage your upcoming appointments</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <GoogleButton
                  text={
                    isDisconnecting
                      ? (isMobile ? "Disconnecting..." : "Disconnecting...")
                      : isCheckingCalendarStatus 
                        ? (isMobile ? "..." : "Checking...")
                        : isCalendarConnected 
                          ? (isMobile ? "Connected" : "Calendar Connected")
                          : (isMobile ? "Calendar" : "Sync to Google Calendar")
                  }
                  style={{ 
                    width: isMobile ? (isCalendarConnected ? "140px" : "110px") : "240px",
                    paddingLeft: isMobile && isCalendarConnected ? "14px" : undefined,
                    paddingRight: isMobile && isCalendarConnected ? "8px" : undefined,
                    justifyContent: isMobile && isCalendarConnected ? "flex-start" : "center",
                    opacity: isInactive ? 0.5 : 1,
                    cursor: isInactive ? 'not-allowed' : undefined
                  }}
                  onClick={handleConnectGoogleCalendar}
                  disabled={googleButtonDisabled}
                />
                {isCalendarConnected && !isDisconnecting && (
                  <button
                    onClick={() => setShowGoogleCalendarDisconnectModal(true)}
                    disabled={isInactive || isDisconnecting}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isInactive ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748B',
                      opacity: isInactive ? 0.4 : 0.7,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (isInactive) return;
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      if (isInactive) return;
                      e.currentTarget.style.opacity = '0.7';
                    }}
                    title="Disconnect Google Calendar"
                  >
                    <CrossIcon />
                  </button>
                )}
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing || isLoadingCalendar}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E0E0E0',
                  background: isRefreshing ? '#f0f0f0' : '#fff',
                  cursor: isRefreshing || isLoadingCalendar ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isRefreshing || isLoadingCalendar ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
                title="Refresh calendar events"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                  }}
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
              </button>
            </div>
          </div>
          <p className="mobile-head">
            View and manage your upcoming appointments
          </p>
        </div>

        {isLoadingData ? (
          <div className="booking-loading">
            <div className="booking-spinner"></div>
            <p className="booking-loading-text">Loading bookings...</p>
          </div>
        ) : (
          <>
            <div className="center-con">
              <div className="wrap">
                <button
                  onClick={() => {
                    setShowBookingList(true);
                    setShowBookingCalendar(false);
                  }}
                  className={showBookingList ? "active" : ""}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 8H2.00667"
                      stroke={showBookingList ? "#fff" : "#64748B"}
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M2 12H2.00667"
                      stroke={showBookingList ? "#fff" : "#64748B"}
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M2 4H2.00667"
                      stroke={showBookingList ? "#fff" : "#64748B"}
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M5.33301 8H13.9997"
                      stroke={showBookingList ? "#fff" : "#64748B"}
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M5.33301 12H13.9997"
                      stroke={showBookingList ? "#fff" : "#64748B"}
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M5.33301 4H13.9997"
                      stroke={showBookingList ? "#fff" : "#64748B"}
                      stroke-width="1.33333"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  List
                </button>
                <button
                  onClick={() => {
                    setShowBookingList(false);
                    setShowBookingCalendar(true);
                  }}
                  className={showBookingCalendar ? "active" : ""}
                  disabled={isInactive}
                >
                  <svg
                    width="19"
                    height="18"
                    viewBox="0 0 19 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.29688 2.25V3.9375M13.1719 2.25V3.9375M2.48438 14.0625V5.625C2.48437 5.17745 2.66216 4.74823 2.97863 4.43176C3.2951 4.11529 3.72432 3.9375 4.17188 3.9375H14.2969C14.7444 3.9375 15.1736 4.11529 15.4901 4.43176C15.8066 4.74823 15.9844 5.17745 15.9844 5.625V14.0625M2.48438 14.0625C2.48437 14.5101 2.66216 14.9393 2.97863 15.2557C3.2951 15.5722 3.72432 15.75 4.17188 15.75H14.2969C14.7444 15.75 15.1736 15.5722 15.4901 15.2557C15.8066 14.9393 15.9844 14.5101 15.9844 14.0625M2.48438 14.0625V8.4375C2.48437 7.98995 2.66216 7.56073 2.97863 7.24426C3.2951 6.92779 3.72432 6.75 4.17188 6.75H14.2969C14.7444 6.75 15.1736 6.92779 15.4901 7.24426C15.8066 7.56073 15.9844 7.98995 15.9844 8.4375V14.0625"
                      stroke={isInactive ? "#A0AEC0" : (showBookingCalendar ? "#fff" : "#64748B")}
                      strokeWidth="1.125"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Calendar
                </button>
              </div>
              {!isLoadingData && (
                <div className="add-appointment-btn-wrap">
                  <Button
                    text={isMobile ? "New" : "Add Appointment"}
                    style={{
                      width: isMobile ? "75px" : "",
                      ...(addAppointmentDisabled ? {
                        backgroundColor: '#64748B33',
                        border: 'none',
                        cursor: 'not-allowed',
                        color: '#64748B80',
                      } : {})
                    }}
                    icon={<FaPlus color={
                      addAppointmentDisabled ? "#64748B80" : "#fff"
                    } />}
                    variant="primary"
                    disabled={addAppointmentDisabled}
                    onClick={() => {
                      if (isInactive) {
                        return;
                      }
                      // Check if user has reached monthly booking limit
                      if (bookingLimit !== null) {
                        const currentMonthBookingsCount = getCurrentMonthBookingsCount();
                        
                        if (currentMonthBookingsCount >= bookingLimit) {
                          toast.error("Upgrade to Pro plan to add more bookings. You have reached your monthly limit.");
                          return;
                        }
                      }
                      setSelectedBooking(null); // Clear any selection
                      setModalMode("add");
                      setShowAddAppointmentModal(true);
                    }}
                  />
                </div>
              )}
            </div>

            {showBookingList && (
              <div className="booking-detail-con">
                {/* Tabs */}
                <div className="booking-tabs-container">
                  <div className="booking-tabs-wrapper">
                    <button
                      className={`booking-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                      onClick={() => setActiveTab('upcoming')}
                    >
                      <span>Upcoming Bookings</span>
                    </button>
                    <button
                      className={`booking-tab ${activeTab === 'past' ? 'active' : ''}`}
                      onClick={() => setActiveTab('past')}
                    >
                      <span>Past Bookings</span>
                    </button>
                  </div>
                </div>

                {/* Upcoming Bookings */}
                {activeTab === 'upcoming' && (
                  <>
                    {!isLoadingData && bookingLimit !== null && (
                      <div className="booking-limit-text-wrap">
                        <p className="booking-limit-text">
                          <strong>{currentMonthBookingsCount} of {bookingLimit}</strong> bookings used this month. Upgrade to add more.
                        </p>
                      </div>
                    )}
                    {bookingsForList.upcoming && bookingsForList.upcoming.length > 0 ? (
                      bookingsForList.upcoming.map((booking, index) => (
                      <div className={`booking-card ${booking.status === 'cancelled' ? 'booking-cancelled' : ''}`} key={`upcoming-${booking._id || index}`}>
                    <div className="left">
                      <div className="top">
                        <div className="wrap">
                          <span style={{ backgroundColor: booking.color }} />
                          <h3>{booking.title}</h3>
                        </div>
                      </div>

                      <div className="bottom">
                        <div className="wrap">
                          {/* Person icon */}
                          <svg
                            width="14"
                            height="16"
                            viewBox="0 0 14 16"
                            fill="none"
                          >
                            <path
                              d="M9.81273 3.5C9.81273 4.24592 9.51641 4.96129 8.98896 5.48874C8.46152 6.01618 7.74615 6.3125 7.00023 6.3125C6.25431 6.3125 5.53893 6.01618 5.01149 5.48874C4.48404 4.96129 4.18773 4.24592 4.18773 3.5C4.18773 2.75408 4.48404 2.03871 5.01149 1.51126C5.53893 0.983816 6.25431 0.6875 7.00023 0.6875C7.74615 0.6875 8.46152 0.983816 8.98896 1.51126C9.51641 2.03871 9.81273 2.75408 9.81273 3.5ZM1.37598 14.0885C1.40008 12.6128 2.00323 11.2056 3.05536 10.1705C4.10749 9.13545 5.52429 8.55535 7.00023 8.55535C8.47616 8.55535 9.89296 9.13545 10.9451 10.1705C11.9972 11.2056 12.6004 12.6128 12.6245 14.0885C10.86 14.8976 8.94134 15.3151 7.00023 15.3125C4.99323 15.3125 3.08823 14.8745 1.37598 14.0885Z"
                              stroke="#64748B"
                              strokeWidth="1.125"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{booking.name}</span>
                        </div>
                        <div className="wrap">
                          {/* Calendar icon */}
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                          >
                            <path
                              d="M5.0625 2.25V3.9375M12.9375 2.25V3.9375M2.25 14.0625V5.625C2.25 5.17745 2.42779 4.74823 2.74426 4.43176C3.06072 4.11529 3.48995 3.9375 3.9375 3.9375H14.0625C14.5101 3.9375 14.9393 4.11529 15.2557 4.43176C15.5722 4.74823 15.75 5.17745 15.75 5.625V14.0625M2.25 14.0625C2.25 14.5101 2.42779 14.9393 2.74426 15.2557C3.06072 15.5722 3.48995 15.75 3.9375 15.75H14.0625C14.5101 15.75 14.9393 15.5722 15.2557 15.2557C15.5722 14.9393 15.75 14.5101 15.75 14.0625M2.25 14.0625V8.4375C2.25 7.98995 2.42779 7.56073 2.74426 7.24426C3.06072 6.92779 3.48995 6.75 3.9375 6.75H14.0625C14.5101 6.75 14.9393 6.92779 15.2557 7.24426C15.5722 7.56073 15.75 7.98995 15.75 8.4375V14.0625"
                              stroke="#64748B"
                              strokeWidth="1.125"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{booking.date}</span>
                        </div>
                        <div className="wrap">
                          {/* Clock icon */}
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                          >
                            <path
                              d="M9 4.5V9H12.375M15.75 9C15.75 9.88642 15.5754 10.7642 15.2362 11.5831C14.897 12.4021 14.3998 13.1462 13.773 13.773C13.1462 14.3998 12.4021 14.897 11.5831 15.2362C10.7642 15.5754 9.88642 15.75 9 15.75C8.11358 15.75 7.23583 15.5754 6.41689 15.2362C5.59794 14.897 4.85382 14.3998 4.22703 13.773C3.60023 13.1462 3.10303 12.4021 2.76381 11.5831C2.42459 10.7642 2.25 9.88642 2.25 9C2.25 7.20979 2.96116 5.4929 4.22703 4.22703C5.4929 2.96116 7.20979 2.25 9 2.25C10.7902 2.25 12.5071 2.96116 13.773 4.22703C15.0388 5.4929 15.75 7.20979 15.75 9Z"
                              stroke="#64748B"
                              strokeWidth="1.125"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{booking.time}</span>
                          {booking.status === 'cancelled' && (
                            <span className="booking-cancelled-label">Cancelled</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="right">
                      {formSubmissions[booking._id] && (
                        <button
                          className="booking-form-icon-btn"
                          onClick={() => {
                            setSelectedFormSubmission(formSubmissions[booking._id]);
                            setSelectedBookingId(booking._id);
                            setShowFormModal(true);
                            setDownloadState('idle');
                          }}
                          title="View form"
                        >
                          <FormIcon />
                        </button>
                      )}
                      {booking.notes && booking.notes.trim() && (
                        <button
                          className="booking-message-icon-btn"
                          onClick={() => {
                            setSelectedComment(booking.notes);
                            setShowCommentModal(true);
                          }}
                          title="View comment"
                        >
                          <MessageIcon />
                        </button>
                      )}
                      <ActionMenu
                        disabled={isInactive}
                        items={[
                          {
                            label: "View",
                            icon: <ViewIcon />,
                            onClick: () => {
                              setSelectedBooking(booking);
                              setModalMode("view");
                              setShowAddAppointmentModal(true);
                            },
                          },
                          {
                            label: "Edit",
                            icon: <EditIconAdmin />,
                            onClick: () => {
                              setSelectedBooking(booking);
                              setModalMode("edit");
                              setShowAddAppointmentModal(true);
                            },
                          },
                          {
                            label: "Cancel",
                            icon: <CancelIcon />,
                            onClick: () => handleCancelClick(booking),
                          },
                        ]}
                      />
                    </div>
                  </div>
                      ))
                    ) : (
                      <div className="no-bookings-message">
                        <p>{accountStatus === 'inactive' ? 'This booking page is currently unavailable.' : 'No upcoming bookings found.'}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Past Bookings */}
                {activeTab === 'past' && (
                  <>
                    {!isLoadingData && bookingLimit !== null && (
                      <div className="booking-limit-text-wrap">
                        <p className="booking-limit-text">
                          <strong>{currentMonthBookingsCount} of {bookingLimit}</strong> bookings used this month. Upgrade to add more.
                        </p>
                      </div>
                    )}
                    {bookingsForList.past && bookingsForList.past.length > 0 ? (
                      bookingsForList.past.map((booking, index) => (
                      <div className={`booking-card ${booking.status === 'cancelled' ? 'booking-cancelled' : ''}`} key={`past-${booking._id || index}`}>
                    <div className="left">
                      <div className="top">
                        <div className="wrap">
                          <span style={{ backgroundColor: booking.color }} />
                          <h3>{booking.title}</h3>
                        </div>
                      </div>

                      <div className="bottom">
                        <div className="wrap">
                          {/* Person icon */}
                          <svg
                            width="14"
                            height="16"
                            viewBox="0 0 14 16"
                            fill="none"
                          >
                            <path
                              d="M9.81273 3.5C9.81273 4.24592 9.51641 4.96129 8.98896 5.48874C8.46152 6.01618 7.74615 6.3125 7.00023 6.3125C6.25431 6.3125 5.53893 6.01618 5.01149 5.48874C4.48404 4.96129 4.18773 4.24592 4.18773 3.5C4.18773 2.75408 4.48404 2.03871 5.01149 1.51126C5.53893 0.983816 6.25431 0.6875 7.00023 0.6875C7.74615 0.6875 8.46152 0.983816 8.98896 1.51126C9.51641 2.03871 9.81273 2.75408 9.81273 3.5ZM1.37598 14.0885C1.40008 12.6128 2.00323 11.2056 3.05536 10.1705C4.10749 9.13545 5.52429 8.55535 7.00023 8.55535C8.47616 8.55535 9.89296 9.13545 10.9451 10.1705C11.9972 11.2056 12.6004 12.6128 12.6245 14.0885C10.86 14.8976 8.94134 15.3151 7.00023 15.3125C4.99323 15.3125 3.08823 14.8745 1.37598 14.0885Z"
                              stroke="#64748B"
                              strokeWidth="1.125"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{booking.name}</span>
                        </div>
                        <div className="wrap">
                          {/* Calendar icon */}
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                          >
                            <path
                              d="M5.0625 2.25V3.9375M12.9375 2.25V3.9375M2.25 14.0625V5.625C2.25 5.17745 2.42779 4.74823 2.74426 4.43176C3.06072 4.11529 3.48995 3.9375 3.9375 3.9375H14.0625C14.5101 3.9375 14.9393 4.11529 15.2557 4.43176C15.5722 4.74823 15.75 5.17745 15.75 5.625V14.0625M2.25 14.0625C2.25 14.5101 2.42779 14.9393 2.74426 15.2557C3.06072 15.5722 3.48995 15.75 3.9375 15.75H14.0625C14.5101 15.75 14.9393 15.5722 15.2557 15.2557C15.5722 14.9393 15.75 14.5101 15.75 14.0625M2.25 14.0625V8.4375C2.25 7.98995 2.42779 7.56073 2.74426 7.24426C3.06072 6.92779 3.48995 6.75 3.9375 6.75H14.0625C14.5101 6.75 14.9393 6.92779 15.2557 7.24426C15.5722 7.56073 15.75 7.98995 15.75 8.4375V14.0625"
                              stroke="#64748B"
                              strokeWidth="1.125"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{booking.date}</span>
                        </div>
                        <div className="wrap">
                          {/* Clock icon */}
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                          >
                            <path
                              d="M9 4.5V9H12.375M15.75 9C15.75 9.88642 15.5754 10.7642 15.2362 11.5831C14.897 12.4021 14.3998 13.1462 13.773 13.773C13.1462 14.3998 12.4021 14.897 11.5831 15.2362C10.7642 15.5754 9.88642 15.75 9 15.75C8.11358 15.75 7.23583 15.5754 6.41689 15.2362C5.59794 14.897 4.85382 14.3998 4.22703 13.773C3.60023 13.1462 3.10303 12.4021 2.76381 11.5831C2.42459 10.7642 2.25 9.88642 2.25 9C2.25 7.20979 2.96116 5.4929 4.22703 4.22703C5.4929 2.96116 7.20979 2.25 9 2.25C10.7902 2.25 12.5071 2.96116 13.773 4.22703C15.0388 5.4929 15.75 7.20979 15.75 9Z"
                              stroke="#64748B"
                              strokeWidth="1.125"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{booking.time}</span>
                          {booking.status === 'cancelled' && (
                            <span className="booking-cancelled-label">Cancelled</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="right">
                      {formSubmissions[booking._id] && (
                        <button
                          className="booking-form-icon-btn"
                          onClick={() => {
                            setSelectedFormSubmission(formSubmissions[booking._id]);
                            setSelectedBookingId(booking._id);
                            setShowFormModal(true);
                            setDownloadState('idle');
                          }}
                          title="View form"
                        >
                          <FormIcon />
                        </button>
                      )}
                      {booking.notes && booking.notes.trim() && (
                        <button
                          className="booking-message-icon-btn"
                          onClick={() => {
                            setSelectedComment(booking.notes);
                            setShowCommentModal(true);
                          }}
                          title="View comment"
                        >
                          <MessageIcon />
                        </button>
                      )}
                      <ActionMenu
                        disabled={isInactive}
                        items={[
                          {
                            label: "View",
                            icon: <ViewIcon />,
                            onClick: () => {
                              setSelectedBooking(booking);
                              setModalMode("view");
                              setShowAddAppointmentModal(true);
                            },
                          },
                          {
                            label: "Edit",
                            icon: <EditIconAdmin />,
                            onClick: () => {
                              setSelectedBooking(booking);
                              setModalMode("edit");
                              setShowAddAppointmentModal(true);
                            },
                          },
                          {
                            label: "Delete",
                            icon: <DeleteIcon />,
                            onClick: () => handleDeleteClick(booking),
                          },
                        ]}
                      />
                    </div>
                  </div>
                      ))
                    ) : (
                      <div className="no-bookings-message">
                        <p>{accountStatus === 'inactive' ? 'This booking page is currently unavailable.' : 'No past bookings found.'}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {showBookingCalendar && (
              <div className="booking-full-calendar">
                <CalendarApp 
                  events={combinedEvents}
                  initialDate={searchParams.get('date') ? new Date(parseInt(searchParams.get('date'))) : null}
                  initialView={searchParams.get('dayView') === 'true' ? 'day' : null}
                  focusBookingId={searchParams.get('bookingId') || null}
                />
              </div>
            )}
          </>
        )}
      </div>
      <AddAppointmentModal
        showAddAppointmentModal={showAddAppointmentModal}
        setShowAddAppointmentModal={setShowAddAppointmentModal}
        selectedEvent={selectedBooking}
        mode={modalMode}
        onAppointmentCreated={() => {
          // Refresh bookings and calendar events when appointment is created
          fetchBookings();
          fetchCalendarEvents(false);
          setSelectedBooking(null); // Clear selection after save
        }}
      />

      {/* Comment Modal */}
      {showCommentModal && selectedComment && (
        <div className="booking-comment-modal-overlay" onClick={() => {
          // Trigger scale animation instead of closing
          setIsModalBouncing(true);
          setTimeout(() => setIsModalBouncing(false), 300);
        }}>
          <div 
            className={`booking-comment-modal ${isModalBouncing ? 'modal-bounce' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="booking-comment-modal-header">
              <h2>Comment</h2>
              <button 
                className="booking-comment-close-btn" 
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedComment(null);
                  setIsModalBouncing(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="booking-comment-modal-content">
              <p>{selectedComment}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Submission Modal */}
      {showFormModal && selectedFormSubmission && (
        <div className="booking-comment-modal-overlay" onClick={() => {
          setIsModalBouncing(true);
          setTimeout(() => setIsModalBouncing(false), 300);
        }}>
          <div 
            className={`booking-comment-modal ${isModalBouncing ? 'modal-bounce' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="booking-form-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className={`booking-form-download-btn ${downloadState === 'downloading' ? 'downloading' : ''} ${downloadState === 'downloaded' ? 'downloaded' : ''}`}
                  disabled={downloadState === 'downloading'}
                  onClick={async () => {
                    if (!selectedBookingId) return;
                    
                    setDownloadState('downloading');
                    
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                      console.log('🔄 Starting form download...');

                      const response = await fetch(`${apiUrl}/api/bookings/${selectedBookingId}/form-submission/download`, {
                        method: 'GET',
                        credentials: 'include',
                      });

                      if (!response.ok) {
                        throw new Error('Download failed');
                      }

                      // Get headers info for debugging
                      const contentType = response.headers.get('Content-Type');
                      const contentDisposition = response.headers.get('Content-Disposition');
                      const contentLength = response.headers.get('Content-Length');

                      console.log('📦 Response headers:', {
                        contentType,
                        contentDisposition,
                        contentLength: contentLength ? `${contentLength} bytes` : 'unknown'
                      });

                      // Get the blob with explicit type from Content-Type header
                      const blob = await response.blob();
                      console.log('💾 Blob created:', {
                        size: `${blob.size} bytes`,
                        type: blob.type
                      });

                      // Get filename from Content-Disposition header
                      let filename = 'form-submission.pdf';
                      if (contentDisposition) {
                        // Try to match quoted filename first: filename="something.pdf"
                        let filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                        if (!filenameMatch) {
                          // Fallback to unquoted filename: filename=something.pdf
                          filenameMatch = contentDisposition.match(/filename=([^;]+)/);
                        }
                        if (filenameMatch && filenameMatch[1]) {
                          filename = filenameMatch[1].trim();
                        }
                      }

                      console.log('📁 Download filename:', filename);

                      // Create blob URL and trigger download
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);

                      console.log('✅ Download triggered successfully');
                      setDownloadState('downloaded');

                      // Reset to idle after 5 seconds
                      setTimeout(() => {
                        setDownloadState('idle');
                      }, 5000);
                    } catch (error) {
                      console.error('❌ Error downloading form:', error);
                      toast.error('Failed to download form');
                      setDownloadState('idle');
                    }
                  }}
                >
                  {downloadState === 'downloading' ? (
                    'Downloading...'
                  ) : downloadState === 'downloaded' ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Downloaded
                    </>
                  ) : (
                    <>
                      <DownloadIcon />
                      Download
                    </>
                  )}
                </button>
              </div>
              <button 
                className="booking-comment-close-btn" 
                onClick={() => {
                  setShowFormModal(false);
                  setSelectedFormSubmission(null);
                  setSelectedBookingId(null);
                  setDownloadState('idle');
                  setIsModalBouncing(false);
                }}
              >
                <FaTimes />
              </button>
            </div>
            <div className="booking-comment-modal-content booking-form-modal-content">
              <div className="booking-form-title-section">
                <h2 className="booking-form-modal-title">
                  {selectedFormSubmission.intakeForm?.name || 'Untitled Form'}
                </h2>
                {selectedFormSubmission.intakeForm?.description && (
                  <p className="booking-form-modal-description">
                    {selectedFormSubmission.intakeForm.description}
                  </p>
                )}
              </div>
              <div className="booking-form-modal-list">
                {selectedFormSubmission.intakeForm?.fields?.map((field, index) => {
                  const questionText = field?.question || field?.label || field?.title || `Question ${index + 1}`;
                  const responses = Array.isArray(selectedFormSubmission.responses) 
                    ? selectedFormSubmission.responses 
                    : [];
                  const response = responses.find(r => r.fieldId === field.id);
                  const answerValue = response?.answer;
                  const fileUrls = response?.fileUrls;

                  const renderAnswer = () => {
                    if (field.type === 'file' || field.type === 'file-upload') {
                      if (fileUrls && fileUrls.length > 0) {
                        return (
                          <div className="booking-form-modal-files">
                            {fileUrls.map((fileUrl, idx) => (
                              <a
                                key={idx}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {fileUrl.split('/').pop() || `File ${idx + 1}`}
                              </a>
                            ))}
                          </div>
                        );
                      }
                      return <span className="booking-form-modal-answer-muted">No file uploaded</span>;
                    }

                    let displayValue = answerValue ?? null;

                    if (field.type === 'checkbox') {
                      displayValue = displayValue ? 'Yes' : 'No';
                    } else if (field.type === 'checkbox-list') {
                      const listValue = Array.isArray(displayValue)
                        ? displayValue
                        : displayValue
                          ? [displayValue]
                          : [];
                      if (listValue.length === 0) {
                        return <span className="booking-form-modal-answer-muted">Not provided</span>;
                      }
                      return <span>{listValue.join(', ')}</span>;
                    } else if (field.type === 'yes-no') {
                      displayValue = displayValue
                        ? String(displayValue).charAt(0).toUpperCase() + String(displayValue).slice(1).toLowerCase()
                        : 'Not provided';
                    } else if (field.type === 'dropdown' || field.type === 'text' || field.type === 'textarea') {
                      displayValue = displayValue ? String(displayValue) : 'Not provided';
                    }

                    if (!displayValue || displayValue === 'Not provided') {
                      return <span className="booking-form-modal-answer-muted">Not provided</span>;
                    }

                    if (field.type === 'textarea') {
                      return <p className="booking-form-modal-answer-textarea">{displayValue}</p>;
                    }

                    return <span>{displayValue}</span>;
                  };

                  return (
                    <div key={field.id || index} className="booking-form-modal-item">
                      <p className="booking-form-modal-question">{questionText}</p>
                      <div className="booking-form-modal-answer">
                        {renderAnswer()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && bookingToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setShowDeleteModal(false);
              setBookingToDelete(null);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="46"
                  height="46"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M24 6L43 40H5L24 6Z"
                    fill="#FFEAEA"
                    stroke="#DC2626"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M24 17v11"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="24" cy="33" r="1.5" fill="#DC2626" />
                </svg>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#1F2937' }}>
                Delete Appointment
              </h2>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
                Are you sure you want to delete this appointment?
              </p>
              <div style={{ 
                backgroundColor: '#F9FAFB', 
                padding: '16px', 
                borderRadius: '8px', 
                marginTop: '16px',
                textAlign: 'left'
              }}>
                <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                  <strong>{bookingToDelete.customerName || bookingToDelete.name}</strong>
                </p>
                <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                  📧 {bookingToDelete.customerEmail}
                </p>
                <p style={{ fontSize: '13px', color: '#6B7280' }}>
                  📅 {bookingToDelete.date} at {bookingToDelete.time}
                </p>
              </div>
              <p style={{ fontSize: '13px', color: '#DC2626', marginTop: '16px', fontWeight: '500' }}>
                This action cannot be undone. The appointment will be permanently removed{!hasCustomBranding && ' and will still count toward your monthly limit'}.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                text="Cancel"
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setBookingToDelete(null);
                }}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  color: '#374151',
                }}
              />
              <Button
                text={isDeleting ? "Deleting..." : "Delete Appointment"}
                type="button"
                onClick={handleDeleteAppointment}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  backgroundColor: '#DC2626',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        show={showCancelModal}
        onHide={() => {
          if (!isCancelling) {
            setShowCancelModal(false);
            setBookingToCancel(null);
          }
        }}
        centered
        backdrop="static"
        className="cancel-confirmation-modal"
      >
        <Modal.Body style={{ padding: 0 }}>
          <div className="cancel-modal-content">
            <button 
              className="cancel-modal-close-btn"
              onClick={() => {
                if (!isCancelling) {
                  setShowCancelModal(false);
                  setBookingToCancel(null);
                }
              }}
              disabled={isCancelling}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <div className="cancel-modal-text">
              <h3>Cancel Booking</h3>
              <p className="cancel-modal-info">
                Are you sure you want to cancel this booking?
              </p>
              <p className="cancel-modal-info" style={{ marginTop: '0' }}>
                It will move to Past Bookings{!hasCustomBranding && ' but will still count toward your monthly limit'}.
              </p>
            </div>
            
            <div className="cancel-modal-buttons">
              <button 
                className="cancel-modal-delete-btn"
                onClick={handleCancelAppointment}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
              <button 
                className="cancel-modal-cancel-btn"
                onClick={() => {
                  if (!isCancelling) {
                    setShowCancelModal(false);
                    setBookingToCancel(null);
                  }
                }}
                disabled={isCancelling}
              >
                No, Back
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <HowThisWorksButton title="How it Works: Bookings" videoUrl="https://jumpshare.com/embed/QPJYwCKeSKewPWlKqoGy" />
      
      {/* Onboarding Video Modal - Shows once after onboarding completion */}
      <VideoModal
        show={showOnboardingVideo}
        onClose={() => setShowOnboardingVideo(false)}
        title="Welcome to Daywise!"
        embedUrl={onboardingVideoUrl}
      />

      {/* Google Calendar Disconnect Confirmation Modal */}
      <GoogleCalendarDisconnectModal
        show={showGoogleCalendarDisconnectModal}
        onClose={() => {
          if (!isDisconnecting) {
            setShowGoogleCalendarDisconnectModal(false);
          }
        }}
        onConfirm={handleDisconnectGoogleCalendar}
        isDisconnecting={isDisconnecting}
      />
    </AppLayout>
  );
};
export default BookingsPage;
