import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SingleCalendar.css";
import Select from "../ui/Input/Select";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useMobile } from "../../hooks";

const SingleCalendar = ({
  onSelectTime,
  onNext,
  notShowTime,
  availableTimeSlots = [],
  onDateSelect,
  loadingTimeSlots = false,
  selectedAppointmentType = null,
  timezoneOptions = [],
  currentTimezone = null,
  onTimezoneChange = null,
  value = null,
  selectedTime: selectedTimeProp = null,
  weeklyAvailability = [],
  availabilityExceptions = [],
  blockedDates = []
}) => {
  // Helper function to check if a date is available
  // Implements same logic as slots endpoint with priority: custom_hours/special_availability > unavailable checks
  const isDateAvailable = (date) => {
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Format date as YYYY-MM-DD for exception matching
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Get date timestamp for comparison
    const dateTimestamp = new Date(dateStr).getTime();

    // Find exceptions for this specific date
    const dateExceptions = availabilityExceptions.filter(exception => {
      const exceptionDate = new Date(exception.date);
      const excYear = exceptionDate.getFullYear();
      const excMonth = String(exceptionDate.getMonth() + 1).padStart(2, '0');
      const excDay = String(exceptionDate.getDate()).padStart(2, '0');
      const excDateStr = `${excYear}-${excMonth}-${excDay}`;
      return excDateStr === dateStr;
    });

    // PRIORITY 1: Check for custom_hours or special_availability (these OVERRIDE unavailability)
    const hasOverride = dateExceptions.some(ex =>
      ex.type === 'custom_hours' || ex.type === 'special_availability'
    );
    if (hasOverride) {
      return true; // Date is available because it has override hours
    }

    // PRIORITY 2: Check for closed_months
    const closedMonthException = availabilityExceptions.find(ex => {
      if (ex.type !== 'closed_months' || !ex.customSchedule) return false;
      try {
        const schedule = JSON.parse(ex.customSchedule);
        return schedule.month === date.getMonth() && schedule.year === date.getFullYear();
      } catch {
        return false;
      }
    });
    if (closedMonthException) {
      return false; // Entire month is closed
    }

    // PRIORITY 3: Check for blocked dates (booking window)
    const isBlocked = blockedDates.some(blocked => {
      const blockStart = new Date(blocked.startDate);
      const blockEnd = new Date(blocked.endDate);
      blockStart.setHours(0, 0, 0, 0);
      blockEnd.setHours(23, 59, 59, 999);
      return dateTimestamp >= blockStart.getTime() && dateTimestamp <= blockEnd.getTime();
    });
    if (isBlocked) {
      return false; // Date is in blocked range
    }

    // PRIORITY 4: Check for unavailable exception
    const unavailableException = dateExceptions.find(ex => ex.type === 'unavailable');
    if (unavailableException) {
      return false; // Date is specifically marked unavailable
    }

    // PRIORITY 5: Check weekly availability (only if no exceptions apply)
    const allDayRecords = weeklyAvailability.filter(slot => {
      const rawWeekday = slot.weekday || '';
      const wk = String(rawWeekday).toLowerCase().trim();
      const matches = wk === dayName || wk === dayName.slice(0, 3) || wk === String(dayOfWeek);
      return matches;
    });

    if (allDayRecords.length === 0) {
      return true; // Available by default if no records
    }

    const hasAvailableSlots = allDayRecords.some(slot => slot.isAvailable !== false);
    return hasAvailableSlots;
  };

  // Find the next available date starting from today
  const getNextAvailableDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check up to 60 days in the future
    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);

      if (isDateAvailable(checkDate)) {
        return checkDate;
      }
    }

    return null; // No available date found in the next 60 days
  };

  // Initialize selectedDate based on availability
  const getInitialDate = () => {
    if (value) return value;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If today is available, use it
    if (isDateAvailable(today)) {
      return today;
    }

    // Otherwise, find the next available date
    return getNextAvailableDate();
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [selectedTime, setSelectedTime] = useState(selectedTimeProp);
  const [internalLoading, setInternalLoading] = useState(false);
  const isMobile = useMobile(999);

  // Update selectedTime when prop changes (including null)
  useEffect(() => {
    setSelectedTime(selectedTimeProp);
  }, [selectedTimeProp]);

  // Reset internal loading when parent loading starts or ends
  useEffect(() => {
    if (loadingTimeSlots) {
      setInternalLoading(false);
    }
  }, [loadingTimeSlots]);

  const timeSlots = availableTimeSlots;

  // Update selectedDate when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
    }
  }, [value]);

  // Update selectedDate when availability data loads (weekly, exceptions, blocked dates)
  useEffect(() => {
    if (weeklyAvailability.length > 0 || availabilityExceptions.length > 0 || blockedDates.length > 0) {
      // If we have a value prop, check if it's available and update internal state
      if (value) {
        if (!isDateAvailable(value)) {
          // Value prop date is unavailable, find next available
          const nextAvailable = getNextAvailableDate();
          if (nextAvailable) {
            setSelectedDate(nextAvailable);
            // Notify parent to update the value prop
            if (typeof onDateSelect === "function") {
              onDateSelect(nextAvailable);
            }
          }
        } else {
          // Value prop date is available, sync internal state
          setSelectedDate(value);
        }
      } else {
        // No value prop, use internal logic
        // If current selectedDate is unavailable, find next available
        if (selectedDate && !isDateAvailable(selectedDate)) {
          const nextAvailable = getNextAvailableDate();
          setSelectedDate(nextAvailable);
        } else if (!selectedDate) {
          // If no date selected, set to next available
          const nextAvailable = getNextAvailableDate();
          setSelectedDate(nextAvailable);
        }
      }
    }
  }, [weeklyAvailability, availabilityExceptions, blockedDates, value]);

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setInternalLoading(true);

    // Call the parent's handleDateSelect function to fetch time slots
    let shouldProceed = true;
    if (typeof onDateSelect === "function") {
      try {
        const result = onDateSelect(date);
        if (result instanceof Promise) {
          const resolved = await result;
          if (resolved === false) {
            shouldProceed = false;
            setInternalLoading(false);
          }
        } else if (result === false) {
          shouldProceed = false;
          setInternalLoading(false);
        }
      } catch (error) {
        console.error("SingleCalendar - Error in onDateSelect:", error);
        shouldProceed = false;
        setInternalLoading(false);
      }
    } else {
      setInternalLoading(false);
    }

    // 👇 Automatically move to next step on mobile only if allowed
    if (isMobile && typeof onNext === "function" && shouldProceed) {
      onNext();
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    if (typeof onSelectTime === "function") onSelectTime(time);
  };

  const handleNext = () => {
    if (!selectedTime) return;
    if (typeof onNext === "function") {
      onNext({ time: selectedTime, date: selectedDate });
    } else {
      alert(`You selected ${selectedTime} on ${selectedDate.toDateString()}`);
    }
  };

  const handleWrapperClick = (e) => {
    // If clicking outside the time-slot-container, reset selection
    if (!e.target.closest('.time-slot-container')) {
      setSelectedTime(null);
      if (typeof onSelectTime === "function") onSelectTime(null);
    }
  };

  return (
    <div className="single-calendar-container">
      <div className="calendar-date-wrapper">
        <h2>Select a Date & Time</h2>
        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          minDate={new Date()}
          tileDisabled={({ date, view }) => {
            // Only disable tiles in month view
            if (view !== 'month') return false;

            // Don't disable past dates (already handled by minDate)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) return false;

            // Use the comprehensive isDateAvailable helper
            return !isDateAvailable(date);
          }}
          nextLabel={<FaChevronRight size={14} />}
          prevLabel={<FaChevronLeft size={14} />}
          next2Label={null}
          prev2Label={null}
        // maxDetail="month"
        // view="month"
        />
        <div className="select-con">
          <Select
            placeholder="Select timezone"
            value={currentTimezone || ""}
            onChange={onTimezoneChange}
            style={{ borderRadius: "50px" }}
            options={timezoneOptions}
          />
        </div>
      </div>

      <div className={`time-slot-wrapper ${notShowTime ? "hide" : ""}`} onClick={handleWrapperClick}>
        <div className="selected-date">
          <h3>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>
        </div>

        <div className="time-slot-container">
          {loadingTimeSlots || internalLoading ? (
            <div className="time-slots-loading">
              <div className="time-slots-loading-content">
                <div className="time-slots-spinner"></div>
                <p className="time-slots-loading-text">Loading time slots...</p>
              </div>
            </div>
          ) : timeSlots.length > 0 ? (
            timeSlots.map((timeSlot) => {
              const displayTime = typeof timeSlot === 'string' ? timeSlot : timeSlot.display;
              const originalTime = typeof timeSlot === 'string' ? timeSlot : timeSlot.original;
              return (
                <div key={originalTime} className="time-slot-row">
                  {selectedTime === originalTime ? (
                    <div className="time-slot-selected">
                      <div className="selected-time-text">{displayTime}</div>
                      <button className="next-btn" onClick={handleNext}>
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
  );
};

export default SingleCalendar;
