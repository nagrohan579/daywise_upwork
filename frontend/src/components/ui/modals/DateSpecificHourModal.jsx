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

  // Reset form to default values when modal opens in create mode
  useEffect(() => {
    if (showDateSpecificHour && !isEdit) {
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
    }
  }, [showDateSpecificHour, isEdit]);

  // Fetch services when modal opens
  useEffect(() => {
    if (showDateSpecificHour) {
      fetchServices();
    }
  }, [showDateSpecificHour]);

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

        toast.success('Booking window added successfully!');
      }
      else {
        // Unavailable, Custom Hours, Special Availability - all use availability exceptions
        const dateObj = new Date(selectedDate);
        if (isNaN(dateObj.getTime())) {
          throw new Error('Invalid date selected');
        }

        let exceptionData = {
          date: dateObj.toISOString(),
          type: selectedType === "Unavailable" ? "unavailable" :
                selectedType === "Custom Hours" ? "custom_hours" : "special_availability",
          reason: reason || undefined,
          startTime: showTimeInputs ? startTime : undefined,
          endTime: showTimeInputs ? endTime : undefined,
          appointmentTypeId: appointmentTypeId || undefined,
        };

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

        toast.success(`${selectedType} added successfully!`);
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
