import { useState, useEffect, useMemo } from "react";
import { FaPlus } from "react-icons/fa";
import {
  AppLayout,
  Button,
  DateSpecificHourModal,
  EditIcon,
  InfoIcon,
  PlusIcon,
  Select,
  WeekTimeRange,
} from "../../components";
import DeleteConfirmationModal from "../../components/ui/modals/DeleteConfirmationModal";
import { useMobile } from "../../hooks";
import { toast } from "sonner";
import ct from 'countries-and-timezones';

import "./availability.css";
import { RxCross2 } from "react-icons/rx";

const days = ["S", "M", "T", "W", "T", "F", "S"];
const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const Availability = () => {
  const [showDateSpecificHour, setShowDateSpecificHour] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const isMobile = useMobile(991);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [dateExceptions, setDateExceptions] = useState([]);
  const [services, setServices] = useState([]);
  const [userData, setUserData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState(null);

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
      
      // Filter only unavailable exceptions
      const unavailableExceptions = exceptions.filter(exception => exception.type === 'unavailable');
      setDateExceptions(unavailableExceptions);
    } catch (error) {
      console.error('Error fetching date exceptions:', error);
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
    setModalMode("create");
    setShowDateSpecificHour(true);
  };

  const handleDeleteClick = (exceptionId) => {
    setExceptionToDelete(exceptionId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!exceptionToDelete) return;
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const response = await fetch(`${apiUrl}/api/availability-exceptions/${exceptionToDelete}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete exception');
    }

    return response; // Promise resolves on success
  };

  const handleEditException = (exception) => {
    // For now, just show a message that edit is not implemented
    toast.info('Edit functionality will be implemented in the next phase');
  };

  // Generate timezone options dynamically (same as Account and PublicBooking pages)
  const { timezoneOptions } = useMemo(() => {
    const allTimezones = ct.getAllTimezones();
    const timezoneMap = new Map();
    Object.values(allTimezones).forEach(tz => {
      const offset = tz.utcOffset / 60;
      const sign = offset >= 0 ? '+' : '';
      const formattedOffset = `GMT${sign}${offset}`;
      const label = `${tz.name.replace(/_/g, ' ')} (${formattedOffset})`;
      if (!timezoneMap.has(label)) {
        timezoneMap.set(label, tz.name);
      }
    });
    const sortedTimezones = Array.from(timezoneMap.entries())
      .sort((a, b) => {
        const tzA = allTimezones[a[1]];
        const tzB = allTimezones[b[1]];
        return tzA.utcOffset - tzB.utcOffset;
      })
      .map(([label]) => label);
    return { timezoneOptions: sortedTimezones };
  }, []);

  // Helper function to get timezone label from value
  const getTimezoneLabel = (value) => {
    if (!value) return "";
    let tz = ct.getTimezone(value);
    if (tz) {
      const offset = tz.utcOffset / 60;
      const sign = offset >= 0 ? '+' : '';
      const formattedOffset = `GMT${sign}${offset}`;
      return `${tz.name.replace(/_/g, ' ')} (${formattedOffset})`;
    }
    return value;
  };

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
                  maxWidth: "233px",
                }}
                options={timezoneOptions}
                showCurrentTime={true}
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
                  {dateExceptions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>
                      No unavailable dates set
                    </div>
                  ) : (
                    dateExceptions.map((exception) => (
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
                              {exception.appointmentTypeId ? 
                                (() => {
                                  const service = services.find(s => s._id === exception.appointmentTypeId);
                                  return service ? service.name : 'Unknown Service';
                                })() : 
                                'All Services'
                              }
                            </button>
                            <EditIcon onClick={() => handleEditException(exception)} />
                          </div>
                        </div>
                        <PlusIcon />
                      </div>
                    ))
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
        onSuccess={fetchDateExceptions}
      />
      <DeleteConfirmationModal
        show={showDeleteModal}
        setShow={setShowDeleteModal}
        onConfirm={handleDeleteConfirm}
        itemName="Date-specific hour"
      />
    </AppLayout>
  );
};

export default Availability;
