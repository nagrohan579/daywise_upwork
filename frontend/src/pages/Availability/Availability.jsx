import { useState, useEffect } from "react";
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
import { useMobile } from "../../hooks";
import { toast } from "sonner";

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

      // Set default values for days with no data
      Object.keys(grouped).forEach(day => {
        if (grouped[day].length === 0) {
          // Sunday and Saturday default to unavailable
          if (day === 'sunday' || day === 'saturday') {
            grouped[day] = [];
          } else {
            // Weekdays default to 9-5
            grouped[day] = [{ start: "09:00", end: "17:00" }];
          }
        }
      });

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

      toast.success('Availability saved successfully!');
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

  const handleDeleteException = async (exceptionId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/availability-exceptions/${exceptionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete exception');
      }

      toast.success('Unavailable date removed successfully!');
      await fetchDateExceptions(); // Refresh the list
    } catch (error) {
      console.error('Error deleting exception:', error);
      toast.error('Failed to delete exception');
    }
  };

  const handleEditException = (exception) => {
    // For now, just show a message that edit is not implemented
    toast.info('Edit functionality will be implemented in the next phase');
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
                placeholder="Pacific Time - US & Canada"
                style={{
                  backgroundColor: "#F9FAFF",
                  borderRadius: "100px",
                  maxWidth: "233px",
                }}
                options={[
                  "Pacific Time (US & Canada)",
                  "Mountain Time (US & Canada)",
                  "Central Time (US & Canada)",
                  "Eastern Time (US & Canada)",
                  "Atlantic Time (Canada)",
                  "Greenwich Mean Time (GMT)",
                  "Central European Time (CET)",
                  "Eastern European Time (EET)",
                  "India Standard Time (IST)",
                  "China Standard Time (CST)",
                  "Japan Standard Time (JST)",
                  "Australia Eastern Standard Time (AEST)",
                ]}
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
                              onClick={() => handleDeleteException(exception._id)}
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
    </AppLayout>
  );
};

export default Availability;
