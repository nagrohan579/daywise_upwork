import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./modal.css";
import Input from "../Input/Input";
import Select from "../Input/Select";
import Button from "../Button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const DateSpecificHourModal = ({
  showDateSpecificHour,
  setShowDateSpecificHour,
  mode = "create",
  editData = null,
  onSuccess,
}) => {
  const isEdit = mode === "edit";

  // Form state
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedType, setSelectedType] = useState("Unavailable");
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Year selection state for closed months
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  
  // Generate year options (2026-2036, excluding current year)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear + 1 + i);

  // Services state
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState("All services");
  const [loadingServices, setLoadingServices] = useState(false);

  // Check if we should show time inputs
  const showTimeInputs =
    selectedType === "Custom Hours" || selectedType === "Special Availability";

  // Check if we should show booking window date fields (start and end date)
  const showBookingWindowDates = selectedType === "Booking Window";

  // Check if we should show closed months selection
  const showClosedMonths = selectedType === "Closed Months";

  // Check if we should show single date picker
  const showSingleDate = selectedType !== "Booking Window" && selectedType !== "Closed Months";

  // Check if we should show reason field (only for Unavailable and Special Availability)
  const showReason = selectedType === "Unavailable" || selectedType === "Special Availability";

  // Check if we should show services field (only for Unavailable and Special Availability)
  const showServices = selectedType === "Unavailable" || selectedType === "Special Availability";

  // Helper to check if a month is in the past (only for current year)
  const isMonthPast = (monthName) => {
    if (selectedYear !== currentYear) return false; // Future years don't have past months
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const monthIndex = months.indexOf(monthName); // 0-11
    return monthIndex < currentMonth;
  };

  // Reset form to default values when modal opens in create mode, or populate when in edit mode
  useEffect(() => {
    if (showDateSpecificHour) {
      if (!isEdit || !editData) {
        // Reset to defaults for create mode
        setSelectedDate("");
        setSelectedType("Unavailable");
        setReason("");
        setStartTime("");
        setEndTime("");
        setStartDate("");
        setEndDate("");
        setSelectedMonths([]);
        setSelectedService("All services");
        setSelectedYear(currentYear);
      } else {
        // Populate form with edit data
        if (editData.type === 'closed_months' || (editData.year && editData.items)) {
          // Handle closed months - editData can be either a single exception or a grouped object
          try {
            let year, monthNumbers;
            if (editData.year && editData.items) {
              // Grouped closed months (from Availability page)
              year = parseInt(editData.year);
              monthNumbers = editData.items.map(item => item.month);
            } else {
              // Single exception
              const schedule = JSON.parse(editData.customSchedule || '{}');
              year = schedule.year || currentYear;
              monthNumbers = [schedule.month];
            }
            setSelectedType("Closed Months");
            setSelectedYear(year);
            // Convert month numbers to month names
            const monthNames = monthNumbers.map(monthNum => months[monthNum]);
            setSelectedMonths(monthNames);
          } catch (e) {
            console.error('Error parsing closed months schedule:', e);
          }
        } else if (editData.startDate && editData.endDate) {
          // Handle blocked dates (booking windows)
          setSelectedType("Booking Window");
          // Handle both timestamp (number) and date string formats
          const startDateObj = typeof editData.startDate === 'number' 
            ? new Date(editData.startDate) 
            : new Date(editData.startDate);
          const endDateObj = typeof editData.endDate === 'number' 
            ? new Date(editData.endDate) 
            : new Date(editData.endDate);
          setStartDate(startDateObj.toISOString().split('T')[0]);
          setEndDate(endDateObj.toISOString().split('T')[0]);
        } else {
          // Handle regular exceptions (unavailable, custom_hours, special_availability)
          // Handle both timestamp (number) and date string formats
          const dateObj = typeof editData.date === 'number' 
            ? new Date(editData.date) 
            : new Date(editData.date);
          setSelectedDate(dateObj.toISOString().split('T')[0]);
          
          if (editData.type === 'unavailable') {
            setSelectedType("Unavailable");
          } else if (editData.type === 'custom_hours') {
            setSelectedType("Custom Hours");
          } else if (editData.type === 'special_availability') {
            setSelectedType("Special Availability");
          }
          
          if (editData.startTime) setStartTime(editData.startTime);
          if (editData.endTime) setEndTime(editData.endTime);
          if (editData.reason) setReason(editData.reason);
          
          // Set selected service for special_availability or unavailable with appointmentTypeId
          if (editData.appointmentTypeId) {
            // We'll need to fetch services and find the matching one
            // For now, we'll set it after services are loaded
          } else {
            setSelectedService("All services");
          }
        }
      }
    }
  }, [showDateSpecificHour, isEdit, editData]);

  // Fetch services when modal opens
  useEffect(() => {
    if (showDateSpecificHour) {
      fetchServices();
    }
  }, [showDateSpecificHour]);

  // Set selected service after services are loaded (for edit mode)
  useEffect(() => {
    if (isEdit && editData && editData.appointmentTypeId && services.length > 0) {
      const service = services.find(s => s._id === editData.appointmentTypeId);
      if (service) {
        setSelectedService(service.name);
      } else {
        setSelectedService("All services");
      }
    }
  }, [services, isEdit, editData]);

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showYearDropdown && !event.target.closest('[data-year-selector]')) {
        setShowYearDropdown(false);
      }
    };
    
    if (showYearDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showYearDropdown]);

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}/api/appointment-types`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        console.error('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation based on type
    if (!selectedType) {
      toast.error("Please select a type");
      return;
    }

    if (showSingleDate && !selectedDate) {
      toast.error("Please select a date");
      return;
    }

    if (showBookingWindowDates && (!startDate || !endDate)) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (showClosedMonths && selectedMonths.length === 0) {
      toast.error("Please select at least one month");
      return;
    }

    if (showTimeInputs) {
      if (!startTime || !endTime) {
        toast.error("Please fill in start and end times");
        return;
      }
    }

    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      // Find the selected service ID
      let appointmentTypeId = null;
      if (selectedService !== "All services") {
        const selectedServiceObj = services.find(service => service.name === selectedService);
        if (selectedServiceObj) {
          appointmentTypeId = selectedServiceObj._id;
        }
      }

      // Determine original type from editData
      let originalType = null;
      let originalId = null;
      if (isEdit && editData) {
        if (editData.startDate && editData.endDate) {
          originalType = "Booking Window";
          originalId = editData._id;
        } else if (editData.type === 'closed_months' || (editData.year && editData.items)) {
          originalType = "Closed Months";
          originalId = editData.year ? null : editData._id; // For grouped closed months, we'll delete all
        } else {
          originalType = editData.type === 'unavailable' ? "Unavailable" :
                        editData.type === 'custom_hours' ? "Custom Hours" :
                        editData.type === 'special_availability' ? "Special Availability" : null;
          originalId = editData._id;
        }
      }

      // TYPE-SPECIFIC SUBMISSION LOGIC
      if (selectedType === "Closed Months") {
        // Map month names to numbers (0-11)
        const monthMap = { "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5, "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11 };
        
        // Get current user ID
        const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
        });
        
        if (meResponse.status === 401) {
          throw new Error('Please log in to set closed months');
        }
        
        const meData = await meResponse.json();
        const currentUserId = meData.user.id;

        // If editing and original type was different, delete the old entry
        if (isEdit && originalType !== "Closed Months" && originalId) {
          if (originalType === "Booking Window") {
            await fetch(`${apiUrl}/api/blocked-dates/${originalId}`, {
              method: 'DELETE',
              credentials: 'include',
            });
          } else {
            await fetch(`${apiUrl}/api/availability-exceptions/${originalId}`, {
              method: 'DELETE',
              credentials: 'include',
            });
          }
        }

        // Delete existing closed_months exceptions for the selected year
        const existingExceptionsResponse = await fetch(`${apiUrl}/api/availability-exceptions`, {
          credentials: 'include',
        });
        
        if (existingExceptionsResponse.ok) {
          const allExceptions = await existingExceptionsResponse.json();
          const closedMonthsExceptions = allExceptions.filter(ex => 
            ex.type === 'closed_months' && 
            ex.customSchedule && 
            (() => {
              try {
                const schedule = JSON.parse(ex.customSchedule);
                return schedule.year === selectedYear;
              } catch {
                return false;
              }
            })()
          );
          
          // Delete existing closed months for this year
          for (const exception of closedMonthsExceptions) {
            await fetch(`${apiUrl}/api/availability-exceptions/${exception._id}`, {
              method: 'DELETE',
              credentials: 'include',
            });
          }
        }

        // Create a new exception for each selected month
        for (const monthName of selectedMonths) {
          const monthNumber = monthMap[monthName];
          // Use first day of the month as the date (for storage/querying purposes)
          const firstDayOfMonth = new Date(selectedYear, monthNumber, 1);
          
          const exceptionData = {
            date: firstDayOfMonth.toISOString(),
            type: "closed_months",
            customSchedule: JSON.stringify({ month: monthNumber, year: selectedYear }),
          };

          const response = await fetch(`${apiUrl}/api/availability-exceptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(exceptionData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create closed months exception');
          }
        }

        toast.success('Closed months updated successfully!');
      }
      else if (selectedType === "Booking Window") {
        // Convert dates to UTC ISO format
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          throw new Error('Invalid date range');
        }

        // If editing and original type was Booking Window, update it
        if (isEdit && originalType === "Booking Window" && originalId) {
          const response = await fetch(`${apiUrl}/api/blocked-dates/${originalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              startDate: startDateObj.toISOString(),
              endDate: endDateObj.toISOString(),
              isAllDay: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update booking window');
          }

          toast.success('Booking window updated successfully!');
        } else {
          // If original type was different or creating new, delete old if exists and create new
          if (isEdit && originalType !== "Booking Window" && originalId) {
            // Delete old exception if it was a different type
            if (originalType === "Closed Months") {
              // For closed months, delete all for the year (handled above in closed months section)
            } else {
              // Delete old exception
              await fetch(`${apiUrl}/api/availability-exceptions/${originalId}`, {
                method: 'DELETE',
                credentials: 'include',
              });
            }
          }

          // Create new booking window
          const response = await fetch(`${apiUrl}/api/blocked-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              startDate: startDateObj.toISOString(),
              endDate: endDateObj.toISOString(),
              isAllDay: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create booking window');
          }

          toast.success(isEdit ? 'Booking window updated successfully!' : 'Booking window added successfully!');
        }
      }
      else {
        // Unavailable, Custom Hours, Special Availability - all use availability exceptions
        const dateObj = new Date(selectedDate);
        if (isNaN(dateObj.getTime())) {
          throw new Error('Invalid date selected');
        }

        const newType = selectedType === "Unavailable" ? "unavailable" :
                       selectedType === "Custom Hours" ? "custom_hours" : "special_availability";

        let exceptionData = {
          date: dateObj.toISOString(),
          type: newType,
          reason: reason || undefined,
          startTime: showTimeInputs ? startTime : undefined,
          endTime: showTimeInputs ? endTime : undefined,
          appointmentTypeId: appointmentTypeId || undefined,
        };

        // If editing and same type, update it
        if (isEdit && originalType === selectedType && originalId && originalType !== "Closed Months" && originalType !== "Booking Window") {
          const response = await fetch(`${apiUrl}/api/availability-exceptions/${originalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(exceptionData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update exception');
          }

          toast.success(`${selectedType} updated successfully!`);
        } else {
          // If type changed or creating new, delete old if exists and create new
          if (isEdit && originalId) {
            if (originalType === "Booking Window") {
              // Delete old blocked date
              await fetch(`${apiUrl}/api/blocked-dates/${originalId}`, {
                method: 'DELETE',
                credentials: 'include',
              });
            } else if (originalType === "Closed Months") {
              // For closed months, already deleted above
            } else {
              // Delete old exception
              await fetch(`${apiUrl}/api/availability-exceptions/${originalId}`, {
                method: 'DELETE',
                credentials: 'include',
              });
            }
          }

          // Create new exception
          const response = await fetch(`${apiUrl}/api/availability-exceptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(exceptionData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create exception');
          }

          toast.success(isEdit ? `${selectedType} updated successfully!` : `${selectedType} added successfully!`);
        }
      }

      setShowDateSpecificHour(false);

      // Reset form
      setSelectedDate("");
      setSelectedType("");
      setReason("");
      setSelectedService("All services");
      setStartTime("");
      setEndTime("");
      setStartDate("");
      setEndDate("");
      setSelectedMonths([]);
      setSelectedYear(currentYear);
      setShowYearDropdown(false);

      // Call success callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating exception:', error);
      toast.error(error.message || 'Failed to create exception');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal
      show={showDateSpecificHour}
      onHide={() => setShowDateSpecificHour(false)}
      centered
      backdrop="static"
      className="dateSpecificHour "
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>
            {isEdit ? "Edit Specific Hours" : "Add Specific Hours"}
          </Modal.Title>
          <p>
            {isEdit
              ? "Customize your regular availability for specific dates."
              : "Customize your regular availability for specific dates."}
          </p>
        </div>
        <button
          className="close-btn"
          onClick={() => setShowDateSpecificHour(false)}
        >
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <div className="input-wrap">
            {showSingleDate && (
              <Input 
                label={"Date*"} 
                type="date" 
                placeholder={"2025-09-29"}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            )}
            <Select
              label={"Type*"}
              placeholder="Select type"
              style={{ borderRadius: "12px", backgroundColor: "#F9FAFF" }}
              options={["Unavailable", "Custom Hours", "Special Availability", "Booking Window", "Closed Months"]}
              value={selectedType}
              onChange={setSelectedType}
            />
          </div>

          {/* Time Inputs for Custom Hours and Special Availability - Right after date */}
          {showTimeInputs && (
            <div className="input-wrap">
              <Input
                label="Start Time*"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Start Time"
              />
              <Input
                label="End Time*"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="End Time"
              />
            </div>
          )}

          {/* Date Fields for Booking Window */}
          {showBookingWindowDates && (
            <div className="input-wrap">
              <Input 
                label={"Start Date*"} 
                type="date" 
                placeholder={"2025-09-29"}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input 
                label={"End Date*"} 
                type="date" 
                placeholder={"2025-09-30"}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          {/* Closed Months Selection */}
          {showClosedMonths && (
            <div className="closed-months-con">
              <h4 className="closed-months-title">Closed Months</h4>
              <p className="closed-months-subtitle">Block entire months from bookings</p>
              
              {/* Year Selection */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '20px',
                alignItems: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear(currentYear);
                    setShowYearDropdown(false);
                    setSelectedMonths([]); // Clear selection when switching years
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: selectedYear === currentYear ? '1px solid #0053F1' : '1px solid #64748b33',
                    backgroundColor: selectedYear === currentYear ? '#0053F1' : '#FFFFFF',
                    color: selectedYear === currentYear ? '#FFFFFF' : '#64748B',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Current Year ({currentYear})
                </button>
                
                <div style={{ position: 'relative' }} data-year-selector>
                  <button
                    type="button"
                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                    data-year-selector
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: selectedYear !== currentYear ? '1px solid #0053F1' : '1px solid #64748b33',
                      backgroundColor: selectedYear !== currentYear ? '#0053F1' : '#FFFFFF',
                      color: selectedYear !== currentYear ? '#FFFFFF' : '#64748B',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {selectedYear !== currentYear ? selectedYear : 'Future Year'}
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {showYearDropdown ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                    </span>
                  </button>
                  
                    {showYearDropdown && (
                    <div data-year-selector style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E0E9FE',
                      borderRadius: '8px',
                      boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      minWidth: '150px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {yearOptions.map((year) => (
                        <button
                          key={year}
                          type="button"
                          onClick={() => {
                            setSelectedYear(year);
                            setShowYearDropdown(false);
                            setSelectedMonths([]); // Clear selection when switching years
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            textAlign: 'left',
                            border: 'none',
                            backgroundColor: selectedYear === year ? '#F0F9FF' : '#FFFFFF',
                            color: selectedYear === year ? '#0053F1' : '#1F2937',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedYear !== year) {
                              e.target.style.backgroundColor = '#F9FAFB';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedYear !== year) {
                              e.target.style.backgroundColor = '#FFFFFF';
                            }
                          }}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="closed-months-grid">
                {months.map((month) => {
                  const isPast = isMonthPast(month);
                  return (
                    <button
                      key={month}
                      type="button"
                      className={`closed-month-btn ${selectedMonths.includes(month) ? "selected" : ""} ${isPast ? "disabled" : ""}`}
                      onClick={() => {
                        if (isPast) return; // Don't allow selecting past months
                        if (selectedMonths.includes(month)) {
                          setSelectedMonths(selectedMonths.filter((m) => m !== month));
                        } else {
                          setSelectedMonths([...selectedMonths, month]);
                        }
                      }}
                      disabled={isPast}
                      style={{ opacity: isPast ? 0.4 : 1, cursor: isPast ? 'not-allowed' : 'pointer' }}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason field - only for Unavailable and Special Availability */}
          {showReason && (
            <div className="reason-input-con">
              <Input
                label={"Reason (optional)"}
                placeholder={"eg., Holiday, Vacation"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {/* Services field - only for Unavailable and Special Availability */}
          {showServices && (
            <div className="reason-input-con">
              <Select
                label={"Services Affected (optional)"}
                placeholder="All services"
                style={{ backgroundColor: "#F9FAFF",borderRadius:"12px" }}
                options={["All services", ...services.map(service => service.name)]}
                value={selectedService}
                onChange={setSelectedService}
              />
            </div>
          )}

          <div className="btn-wrap">
            <Button
              text={"Cancel"}
              style={{
                backgroundColor: "transparent",
                color: "#64748B",
                border: "1px solid #E0E9FE",
              }}
              onClick={() => setShowDateSpecificHour(false)}
            />
            <Button 
              text={submitting ? "Creating..." : (isEdit ? "Save Changes" : "Create")} 
              type="submit" 
              disabled={submitting}
            />
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default DateSpecificHourModal;
