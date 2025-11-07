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
  selectedTime: selectedTimeProp = null
}) => {
  const [selectedDate, setSelectedDate] = useState(value || new Date());
  const [selectedTime, setSelectedTime] = useState(selectedTimeProp);
  const isMobile = useMobile(999);
  
  // Update selectedTime when prop changes (including null)
  useEffect(() => {
    setSelectedTime(selectedTimeProp);
  }, [selectedTimeProp]);

  const timeSlots = availableTimeSlots;

  // Update selectedDate when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
    }
  }, [value]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);

    // Call the parent's handleDateSelect function to fetch time slots
    if (typeof onDateSelect === "function") {
      onDateSelect(date);
    }

    // 👇 Automatically move to next step on mobile
    if (isMobile && typeof onNext === "function") {
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
            style={{ backgroundColor: "#F9FAFF", borderRadius: "50px" }}
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
          {loadingTimeSlots ? (
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
