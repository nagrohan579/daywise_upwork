import {
  ActionMenu,
  AddAppointmentModal,
  AppLayout,
  Button,
  GoogleButton,
} from "../../components";
import { FaPlus } from "react-icons/fa6";
import { FaEye, FaEdit } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import "./Booking.css";
import { useState, useEffect } from "react";
import { useMobile } from "../../hooks";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import CalendarApp from "../../components/Calendar/CalendarTest";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

// Helper function to convert date to local date string without timezone shift
const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  const isMobile = useMobile(991);

  // Fetch current user
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
        } else {
          console.error('Booking - Failed to fetch user, status:', response.status);
        }
      } catch (error) {
        console.error('Booking - Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  // Fetch bookings from Convex
  const convexBookings = useQuery(
    api.bookings.getByUser,
    userId ? { userId } : "skip"
  );

  // Convex mutation for deleting bookings
  const deleteBooking = useMutation(api.bookings.deleteBooking);

  // Log Convex bookings when they change
  useEffect(() => {
    console.log('Booking - Convex bookings query result:', convexBookings);
    console.log('Booking - Convex bookings count:', convexBookings?.length || 0);
    if (convexBookings && convexBookings.length > 0) {
      console.log('Booking - Sample Convex booking:', convexBookings[0]);
    }
    
    // Stop loading when we have data or the query completes
    if (convexBookings !== undefined) {
      setIsLoadingData(false);
    }
  }, [convexBookings]);

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
        } else {
          console.warn('Booking - Google Calendar API returned no events or failed:', data);
        }
      } else {
        const errorText = await response.text();
        console.error('Booking - Google Calendar API error:', response.status, errorText);
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

  // Initial fetch and setup auto-refresh polling
  useEffect(() => {
    if (!userId) return;

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
  }, [userId]);

  // Transform and combine data whenever bookings or calendar events change
  useEffect(() => {
    console.log('Booking - Transforming events - Convex bookings:', convexBookings?.length || 0, 'Calendar events:', calendarEvents?.length || 0);
    
    // Only show Convex bookings to avoid duplicates
    // (Convex bookings are automatically synced to Google Calendar)
    const transformedBookings = (convexBookings || []).map((booking, index) => {
      const bookingDate = new Date(booking.appointmentDate);
      const hours = bookingDate.getHours();
      const minutes = bookingDate.getMinutes();

      return {
        id: `booking-${booking._id}`,
        title: `${booking.customerName}`,
        date: toLocalDateString(bookingDate), // Use helper function to avoid timezone issues
        color: "orange", // Default color for bookings
        time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        source: 'booking',
        data: booking
      };
    });

    console.log('Booking - Transformed Convex bookings:', transformedBookings);

    // Only include calendar events that are NOT already in Convex bookings
    // (to avoid showing duplicates when bookings are synced to calendar)
    const bookingEventIds = new Set(
      (convexBookings || [])
        .filter(b => b.googleCalendarEventId)
        .map(b => b.googleCalendarEventId)
    );

    const transformedCalendarEvents = (calendarEvents || [])
      .filter(event => !bookingEventIds.has(event.id)) // Exclude synced bookings
      .map((event, index) => {
        let eventDate;
        let eventTime = null;

        // Handle different date formats from Google Calendar
        if (event.start?.dateTime) {
          eventDate = new Date(event.start.dateTime);
          const hours = eventDate.getHours();
          const minutes = eventDate.getMinutes();
          eventTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else if (event.start?.date) {
          eventDate = new Date(event.start.date);
          // All-day event
          eventTime = null;
        } else {
          return null;
        }

        return {
          id: `calendar-${event.id || index}`,
          title: event.summary || 'Untitled Event',
          date: toLocalDateString(eventDate), // Use helper function to avoid timezone issues
          color: "blue", // Different color for calendar events
          time: eventTime,
          source: 'calendar',
          data: event
        };
      }).filter(Boolean);

    console.log('Booking - Transformed Google Calendar events (excluding synced bookings):', transformedCalendarEvents);

    const combined = [...transformedBookings, ...transformedCalendarEvents];
    console.log('Booking - Combined events total:', combined.length);
    console.log('Booking - Combined events:', combined);
    
    setCombinedEvents(combined);
  }, [convexBookings, calendarEvents]);

  // Clean up URL parameters (calendar connection is now handled by GoogleButton component)
  useEffect(() => {
    const calendarConnected = searchParams.get('calendar_connected');
    const calendarError = searchParams.get('calendar_error');

    if (calendarConnected || calendarError) {
      // Remove the parameters from URL
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('calendar_connected');
        newParams.delete('calendar_error');
        return newParams;
      });
    }
  }, [searchParams, setSearchParams]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchCalendarEvents(true);
  };

  // Show delete confirmation modal
  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    setShowDeleteModal(true);
  };

  // Delete appointment handler
  const handleDeleteAppointment = async () => {
    if (!bookingToDelete) return;

    setIsDeleting(true);

    try {
      console.log('Booking - Deleting appointment:', bookingToDelete);
      
      // Delete from Convex
      await deleteBooking({ id: bookingToDelete._id });
      console.log('Booking - Appointment deleted from Convex');

      // Close modal immediately after Convex deletion
      setShowDeleteModal(false);
      setBookingToDelete(null);

      // Delete from Google Calendar if it exists (in background)
      if (bookingToDelete.googleCalendarEventId) {
        console.log('Booking - Deleting from Google Calendar:', bookingToDelete.googleCalendarEventId);
        
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${apiUrl}/api/google-calendar/events/${bookingToDelete.googleCalendarEventId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (response.ok) {
            console.log('Booking - Appointment deleted from Google Calendar');
            toast.success('Appointment deleted successfully!');
          } else {
            console.error('Booking - Failed to delete from Google Calendar');
            toast.warning('Appointment deleted but calendar sync failed');
          }
        } catch (calendarError) {
          console.error('Booking - Error deleting from Google Calendar:', calendarError);
          toast.warning('Appointment deleted but calendar sync failed');
        }
      } else {
        console.log('Booking - No Google Calendar event ID, skipping calendar deletion');
        toast.success('Appointment deleted successfully!');
      }

      // Refresh calendar events to update UI
      fetchCalendarEvents(false);
    } catch (error) {
      console.error('Booking - Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    } finally {
      setIsDeleting(false);
    }
  };

  // Prepare bookings for list view
  const bookingsForList = (convexBookings || []).map(booking => {
    const bookingDate = new Date(booking.appointmentDate);
    const hours = bookingDate.getHours();
    const minutes = bookingDate.getMinutes();
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;

    return {
      ...booking,
      title: `Appointment with ${booking.customerName}`,
      name: booking.customerName,
      date: bookingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' }),
      time: `${displayHours}:${minutes.toString().padStart(2, '0')}${isPM ? 'pm' : 'am'}`,
      color: "#F19B11",
    };
  });

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
              <GoogleButton
                text={isMobile ? "Calendar" : "Sync to Google Calendar"}
                style={{ width: isMobile ? "110px" : "240px" }}
              />
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
                      stroke={showBookingCalendar ? "#fff" : "#64748B"}
                      stroke-width="1.125"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  Calendar
                </button>
              </div>
              <Button
                text={isMobile ? "New" : "Add Appointment"}
                style={{ width: isMobile ? "75px" : "" }}
                icon={<FaPlus color="#fff" />}
                variant="primary"
                onClick={() => {
                  setSelectedBooking(null); // Clear any selection
                  setModalMode("add");
                  setShowAddAppointmentModal(true);
                }}
              />{" "}
            </div>

            {showBookingList && (
              <div className="booking-detail-con">
                {bookingsForList.map((booking, index) => (
                  <div className="booking-card" key={index}>
                    <div className="left">
                      <div className="top">
                        <span style={{ backgroundColor: booking.color }} />
                        <h3>{booking.title}</h3>
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
                        </div>
                      </div>
                    </div>

                    <div className="right">
                      <ActionMenu
                        items={[
                          {
                            label: "View",
                            icon: <FaEye />,
                            onClick: () => {
                              setSelectedBooking(booking);
                              setModalMode("view");
                              setShowAddAppointmentModal(true);
                            },
                          },
                          {
                            label: "Edit",
                            icon: <FaEdit />,
                            onClick: () => {
                              setSelectedBooking(booking);
                              setModalMode("edit");
                              setShowAddAppointmentModal(true);
                            },
                          },
                          {
                            label: "Delete",
                            icon: <RiDeleteBin5Line />,
                            onClick: () => handleDeleteClick(booking),
                          },
                        ]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showBookingCalendar && (
              <div className="booking-full-calendar">
                <CalendarApp events={combinedEvents} />
              </div>
            )}

            {showBookingList && bookingsForList.length === 0 && (
              <div className="no-appointment-con">
                <div className="content">
                  <h4>No appointments yet</h4>
                  <p>
                    Your appointments will appear here once customers start booking.
                  </p>
                </div>
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
          // Refresh calendar events when appointment is created
          fetchCalendarEvents(false);
          setSelectedBooking(null); // Clear selection after save
        }}
      />

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
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
                This action cannot be undone. The appointment will be removed from both your system and Google Calendar.
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
    </AppLayout>
  );
};
export default BookingsPage;
