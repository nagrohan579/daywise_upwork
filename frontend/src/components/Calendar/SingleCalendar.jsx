import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SingleCalendar.css";
import Select from "../ui/Input/Select";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useMobile } from "../../hooks";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

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
  timezoneValue = null, // IANA timezone string (e.g., "America/Los_Angeles")
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
    // Use selected timezone for comparison (same as backend logic)
    const isBlocked = blockedDates.some(blocked => {
      // If timezoneValue is provided, convert dates to that timezone for comparison
      // Otherwise, fall back to browser local timezone (for backward compatibility)
      const tz = timezoneValue || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Extract year, month, day from the calendar date (which is in browser local timezone)
      // Then create a date in the selected timezone with those same calendar values
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-11
      const day = date.getDate();
      
      // Create the date in the selected timezone (interpret the calendar date in that timezone)
      const dateInTz = dayjs.tz(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, 'YYYY-MM-DD', tz);
      const dateStart = dateInTz.startOf('day');
      const dateEnd = dateInTz.endOf('day');
      
      // Convert blocked dates to the selected timezone
      const blockStart = dayjs(blocked.startDate).tz(tz).startOf('day');
      const blockEnd = dayjs(blocked.endDate).tz(tz).endOf('day');
      
      // Check if the requested date overlaps with the blocked date range
      // Same logic as backend: dateStart.isBefore(blockEnd) && dateEnd.isAfter(blockStart)
      return dateStart.isBefore(blockEnd) && dateEnd.isAfter(blockStart);
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
  }, [weeklyAvailability, availabilityExceptions, blockedDates, value, timezoneValue]);

  // Re-evaluate selected date when timezone changes
  useEffect(() => {
    if (timezoneValue && selectedDate) {
      // When timezone changes, check if current selected date is still available
      // If not, find the next available date
      if (!isDateAvailable(selectedDate)) {
        const nextAvailable = getNextAvailableDate();
        if (nextAvailable) {
          setSelectedDate(nextAvailable);
          // Notify parent if we have onDateSelect
          if (typeof onDateSelect === "function") {
            onDateSelect(nextAvailable);
          }
        }
      }
    }
  }, [timezoneValue]);

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

  // Force calendar to re-render when timezone changes by using key
  // This ensures tileDisabled is re-evaluated with the new timezone
  const calendarKey = `calendar-${timezoneValue || 'default'}`;

  return (
    <div className="single-calendar-container">
      <div className="calendar-date-wrapper">
        <h2>Select a Date & Time</h2>
        <Calendar
          key={calendarKey}
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
            {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())
              ? selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Select a date"}
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
