import { useState, useEffect, useMemo } from "react";
import { FaPlus } from "react-icons/fa";
import {
  AppLayout,
  Button,
  DateSpecificHourModal,
  EditIcon,
  InfoIcon,
  Select,
  WeekTimeRange,
} from "../../components";
import HowThisWorksButton from "../../components/HowThisWorksButton";
import DeleteConfirmationModal from "../../components/ui/modals/DeleteConfirmationModal";
import { useMobile } from "../../hooks";
import { toast } from "sonner";
import { getTimezoneOptions, getTimezoneLabel, getTimezoneValue } from "../../utils/timezones";

import "./availability.css";
import { RxCross2 } from "react-icons/rx";

const days = ["S", "M", "T", "W", "T", "F", "S"];
const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const Availability = () => {
  const [showDateSpecificHour, setShowDateSpecificHour] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editData, setEditData] = useState(null);
  const isMobile = useMobile(991);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [dateExceptions, setDateExceptions] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [services, setServices] = useState([]);
  const [userData, setUserData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState(null);
  const [blockedDateToDelete, setBlockedDateToDelete] = useState(null);
  const [closedMonthsToDelete, setClosedMonthsToDelete] = useState(null); // { year, items }

  // State for weekly availability - key is day name, value is array of time ranges
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    sunday: [],
    monday: [{ start: "09:00", end: "17:00" }],
    tuesday: [{ start: "09:00", end: "17:00" }],
    wednesday: [{ start: "09:00", end: "17:00" }],
    thursday: [{ start: "09:00", end: "17:00" }],
    friday: [{ start: "09:00", end: "17:00" }],
    saturday: [],
  });

  // Fetch availability data on mount
  useEffect(() => {
    fetchAvailability();
    fetchDateExceptions();
    fetchBlockedDates();
    fetchServices();
  }, []);

  const fetchAvailability = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Get current user
      const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (meResponse.status === 401) {
        toast.error('Please log in to access availability');
        window.location.href = '/login';
        return;
      }

      const meData = await meResponse.json();
      const currentUserId = meData.user.id;
      setUserId(currentUserId);
      setUserData(meData.user); // Store user data including timezone
      console.log('Availability - User data:', meData.user);

      // Fetch availability data
      const response = await fetch(`${apiUrl}/api/availability/${currentUserId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const availabilityData = await response.json();
      console.log('Fetched availability data:', availabilityData);

      // Convert flat array to grouped by weekday
      const grouped = {
        sunday: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
      };

      availabilityData.forEach(item => {
        if (grouped[item.weekday]) {
          // Only add time slots if the day is available
          if (item.isAvailable && item.startTime && item.endTime) {
            grouped[item.weekday].push({
              start: item.startTime,
              end: item.endTime,
            });
          }
          // If isAvailable is false, the day remains as empty array (unavailable)
        }
      });

      console.log('Grouped availability:', grouped);

      // No need to apply defaults - backend provides complete data for all 7 days
      setWeeklyAvailability(grouped);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDateExceptions = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Get current user
      const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (meResponse.status === 401) {
        return;
      }

      const meData = await meResponse.json();
      const currentUserId = meData.user.id;

      // Fetch date exceptions
      const response = await fetch(`${apiUrl}/api/availability-exceptions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch date exceptions');
      }

      const exceptions = await response.json();
      console.log('Fetched date exceptions:', exceptions);
      
      // Filter unavailable, custom_hours, special_availability, and closed_months exceptions
      const dateExceptions = exceptions.filter(exception => 
        exception.type === 'unavailable' || 
        exception.type === 'custom_hours' || 
        exception.type === 'special_availability' ||
        exception.type === 'closed_months'
      );
      setDateExceptions(dateExceptions);
    } catch (error) {
      console.error('Error fetching date exceptions:', error);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Get current user
      const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (meResponse.status === 401) {
        return;
      }

      // Fetch blocked dates (booking windows)
      const response = await fetch(`${apiUrl}/api/blocked-dates`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch blocked dates');
      }

      const blocked = await response.json();
      console.log('Fetched blocked dates:', blocked);
      setBlockedDates(blocked);
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}/api/appointment-types`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      console.log('=== SAVING WEEKLY AVAILABILITY ===');
      console.log('Current weeklyAvailability state:', weeklyAvailability);

      const response = await fetch(`${apiUrl}/api/availability/weekly`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          weeklySchedule: weeklyAvailability,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save availability');
      }

      const responseData = await response.json();
      console.log('Save response:', responseData);

      toast.success('Availability saved successfully!');

      // Add a small delay to ensure Convex has processed the mutation
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Fetching updated availability...');
      await fetchAvailability(); // Refresh data
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error(error.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleDayChange = (dayName, timeRanges) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayName]: timeRanges,
    }));
  };

  const handleEditClick = () => {
    setModalMode("edit");
    setShowDateSpecificHour(true);
  };
  const handleAddClick = () => {
    setEditData(null);
    setModalMode("create");
    setShowDateSpecificHour(true);
  };

  const handleDeleteClick = (exceptionId) => {
    setExceptionToDelete(exceptionId);
    setBlockedDateToDelete(null);
    setClosedMonthsToDelete(null);
    setShowDeleteModal(true);
  };

  const handleDeleteBlockedDateClick = (blockedDateId) => {
    setBlockedDateToDelete(blockedDateId);
    setExceptionToDelete(null);
    setClosedMonthsToDelete(null);
    setShowDeleteModal(true);
  };

  const handleDeleteClosedMonthsClick = (year, items) => {
    setClosedMonthsToDelete({ year, items });
    setExceptionToDelete(null);
    setBlockedDateToDelete(null);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    if (closedMonthsToDelete) {
      // Delete all closed months exceptions for the selected year
      try {
        for (const item of closedMonthsToDelete.items) {
          const response = await fetch(`${apiUrl}/api/availability-exceptions/${item.exception._id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!response.ok) {
            throw new Error('Failed to delete closed month exception');
          }
        }
        await fetchDateExceptions();
        setClosedMonthsToDelete(null);
        return { ok: true };
      } catch (error) {
        throw new Error('Failed to delete closed months');
      }
    } else if (exceptionToDelete) {
      const response = await fetch(`${apiUrl}/api/availability-exceptions/${exceptionToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete exception');
      }

      await fetchDateExceptions();
      return response;
    } else if (blockedDateToDelete) {
      const response = await fetch(`${apiUrl}/api/blocked-dates/${blockedDateToDelete}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete blocked date');
      }

      await fetchBlockedDates();
      return response;
    }
  };

  const handleEditException = (exception) => {
    setEditData(exception);
    setModalMode("edit");
    setShowDateSpecificHour(true);
  };

  // Get timezone options from custom timezone utilities
  const timezoneOptions = useMemo(() => {
    return getTimezoneOptions().map(([label]) => label);
  }, []);

  return (
    <AppLayout>
      <div className="availability-page">
        <div className="top-con">
          <div className="wrap">
            <h1>Availability</h1>
            <p>Set your availability for bookings</p>
          </div>
          <Button
            text={saving ? "Saving..." : "Save Changes"}
            onClick={handleSaveChanges}
            disabled={saving || loading}
            style={{ minWidth: "140px" }}
          />
        </div>

        {loading ? (
          <div className="availability-loading">
            <div className="availability-loading-content">
              <div className="availability-spinner"></div>
              <p className="availability-loading-text">Loading availability data...</p>
            </div>
          </div>
        ) : (
          <div className="availability-con">
          <div className="top-wrapper">
            <div className="weekHour-con">
              <div className="top-content">
                <h3>Week Hours</h3>
                <p>Set when you are typically available for meetings</p>
              </div>
              <div className="time-range-con">
                {days.map((day, index) => (
                  <WeekTimeRange
                    key={index}
                    day={day}
                    dayName={dayNames[index]}
                    timeRanges={weeklyAvailability[dayNames[index]]}
                    onChange={(ranges) => handleDayChange(dayNames[index], ranges)}
                  />
                ))}
              </div>

              <Select
                value={userData?.timezone ? getTimezoneLabel(userData.timezone) : ""}
                placeholder="Select timezone"
                style={{
                  backgroundColor: "#F9FAFF",
                  borderRadius: "100px",
                }}
                options={timezoneOptions}
                showCurrentTime={true}
                disabled={true}
                onDisabledClick={() => {
                  toast.info("Your timezone is managed in your Account settings.");
                }}
              />
            </div>
            <div className="datespecific-con">
              <div className="top-content">
                <div className="parent-wrap">
                  <div className="wrap">
                    <h3>Date-Specific Hours</h3>
                    <p>Adjust hours for specific days</p>
                  </div>
                  <Button
                    text={"Add New"}
                    icon={<FaPlus />}
                    onClick={handleAddClick}
                    style={{width : isMobile ? "120px" : ""}}
                  />
                </div>

                <div className="show-date-specific-hour">
                  {dateExceptions.length === 0 && blockedDates.length === 0 ? (
                    <div className="no-date-specific-hours-message">
                      No date-specific hours set
                    </div>
                  ) : (
                    <>
                      {/* Group closed_months by year */}
                      {(() => {
                        const closedMonthsExceptions = dateExceptions.filter(ex => ex.type === 'closed_months');
                        const otherExceptions = dateExceptions.filter(ex => ex.type !== 'closed_months');
                        
                        // Group closed months by year
                        const closedMonthsByYear = {};
                        closedMonthsExceptions.forEach(exception => {
                          try {
                            const schedule = JSON.parse(exception.customSchedule || '{}');
                            const year = schedule.year;
                            const month = schedule.month;
                            if (!closedMonthsByYear[year]) {
                              closedMonthsByYear[year] = [];
                            }
                            closedMonthsByYear[year].push({ exception, month });
                          } catch (e) {
                            console.error('Error parsing closed months schedule:', e);
                          }
                        });
                        
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        
                        return (
                          <>
                            {/* Closed Months grouped by year */}
                            {Object.entries(closedMonthsByYear).map(([year, items]) => {
                              const sortedMonths = items.sort((a, b) => a.month - b.month);
                              const monthNamesList = sortedMonths.map(item => monthNames[item.month]).join(', ');
                              
                              return (
                                <div key={`closed-months-${year}`} className="wrapper">
                                  <div className="box">
                                    <div className="top">
                                      <h4>Closed Months ({year})</h4>
                                      <RxCross2 
                                        color="#64748B" 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleDeleteClosedMonthsClick(year, items)}
                                      />
                                    </div>
                                    <div className="bottom">
                                      <button>
                                        <InfoIcon width={20} height={20} />
                                        {monthNamesList}
                                      </button>
                                    </div>
                                  </div>
                                  <EditIcon onClick={() => {
                                    // For closed months, pass all items so we can edit all months for that year
                                    handleEditException({ type: 'closed_months', year, items });
                                  }} />
                                </div>
                              );
                            })}
                            
                            {/* Other Date Exceptions */}
                            {otherExceptions.map((exception) => (
                              <div key={exception._id} className="wrapper">
                                <div className="box">
                                  <div className="top">
                                    <h4>{new Date(exception.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    })}</h4>
                                    <RxCross2 
                                      color="#64748B" 
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => handleDeleteClick(exception._id)}
                                    />
                                  </div>
                                  <div className="bottom">
                                    <button>
                                      <InfoIcon width={20} height={20} />
                                      {exception.type === 'unavailable' ? (
                                        'Unavailable'
                                      ) : exception.type === 'custom_hours' ? (
                                        exception.startTime && exception.endTime 
                                          ? `${exception.startTime} - ${exception.endTime}`
                                          : 'Custom Hours'
                                      ) : exception.type === 'special_availability' ? (
                                        (() => {
                                          const timeRange = exception.startTime && exception.endTime 
                                            ? `${exception.startTime} - ${exception.endTime}`
                                            : 'Special Availability';
                                          const serviceName = exception.appointmentTypeId 
                                            ? (() => {
                                                const service = services.find(s => s._id === exception.appointmentTypeId);
                                                return service ? service.name : 'Unknown Service';
                                              })()
                                            : 'All Services';
                                          return `${timeRange} (${serviceName})`;
                                        })()
                                      ) : (
                                        exception.appointmentTypeId ? 
                                          (() => {
                                            const service = services.find(s => s._id === exception.appointmentTypeId);
                                            return service ? service.name : 'Unknown Service';
                                          })() : 
                                          'All Services'
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <EditIcon onClick={() => handleEditException(exception)} />
                              </div>
                            ))}
                          </>
                        );
                      })()}
                      
                      {/* Booking Windows */}
                      {blockedDates.map((blocked) => {
                        const startDate = new Date(blocked.startDate);
                        const endDate = new Date(blocked.endDate);
                        const isSameDay = startDate.toDateString() === endDate.toDateString();
                        
                        return (
                          <div key={blocked._id} className="wrapper">
                            <div className="box">
                              <div className="top">
                                <h4>
                                  {isSameDay 
                                    ? startDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })
                                    : `${startDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })} - ${endDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}`
                                  }
                                </h4>
                                <RxCross2 
                                  color="#64748B" 
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleDeleteBlockedDateClick(blocked._id)}
                                />
                              </div>
                              <div className="bottom">
                                <button>
                                  <InfoIcon width={20} height={20} />
                                  Booking Window
                                </button>
                              </div>
                            </div>
                            <EditIcon onClick={() => handleEditException(blocked)} />
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
      <DateSpecificHourModal
        showDateSpecificHour={showDateSpecificHour}
        setShowDateSpecificHour={setShowDateSpecificHour}
        mode={modalMode}
        editData={editData}
        onSuccess={() => {
          setEditData(null);
          fetchDateExceptions();
          fetchBlockedDates();
        }}
      />
      <DeleteConfirmationModal
        show={showDeleteModal}
        setShow={setShowDeleteModal}
        onConfirm={handleDeleteConfirm}
        itemName={
          closedMonthsToDelete 
            ? `Closed months for ${closedMonthsToDelete.year}` 
            : blockedDateToDelete 
            ? "Booking window" 
            : "Date-specific hour"
        }
      />
      <HowThisWorksButton title="How Availability Works" />
    </AppLayout>
  );
};

export default Availability;
