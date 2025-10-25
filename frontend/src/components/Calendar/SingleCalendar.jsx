import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SingleCalendar.css";
import Select from "../ui/Input/Select";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useMobile } from "../../hooks";

// ✅ Available dates (example)
const availableDates = [
  new Date(2025, 9, 13),
  new Date(2025, 9, 16),
  new Date(2025, 9, 23),
  new Date(2025, 9, 30),
  new Date(2025, 9, 18),
];

// Function to highlight available days
const tileClassName = ({ date, view }) => {
  if (view === "month") {
    const isAvailable = availableDates.some(
      (d) =>
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    );

    if (isAvailable) return "available-day"; // 👈 highlight class
  }
  return null;
};

const SingleCalendar = ({ onSelectTime, onNext, notShowTime, availableTimeSlots = [], onDateSelect, loadingTimeSlots = false, selectedAppointmentType = null }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const isMobile = useMobile(999);

  const timeSlots = availableTimeSlots;

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
    console.log('Wrapper clicked');
    console.log('Target:', e.target);
    console.log('Closest time-slot-container:', e.target.closest('.time-slot-container'));
    
    // If clicking outside the time-slot-container, reset selection
    if (!e.target.closest('.time-slot-container')) {
      console.log('Clicked outside time-slot-container - resetting');
      setSelectedTime(null);
      if (typeof onSelectTime === "function") onSelectTime(null);
    } else {
      console.log('Clicked inside time-slot-container - not resetting');
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
          tileClassName={tileClassName}
          // maxDetail="month"
          // view="month"
        />
        <div className="select-con">
          <Select
            placeholder="Pacific Time - US & Canada 8:38 AM"
            style={{ backgroundColor: "#F9FAFF", borderRadius: "50px" }}
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
            timeSlots.map((time, index) => (
              <div key={index} className="time-slot-row">
                {selectedTime === time ? (
                  <div className="time-slot-selected">
                    <div className="selected-time-text">{time}</div>
                    <button className="next-btn" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                ) : (
                  <button
                    className="time-slot-btn"
                    onClick={() => handleTimeSelect(time)}
                  >
                    {time}
                  </button>
                )}
              </div>
            ))
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
