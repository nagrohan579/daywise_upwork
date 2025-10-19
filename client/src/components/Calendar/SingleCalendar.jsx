import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SingleCalendar.css";
import Select from "../UI/Input/Select";
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

const SingleCalendar = ({ onSelectTime, onNext, notShowTime }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const isMobile = useMobile(999);

  const timeSlots = [
    "12:00 PM",
    "12:30 PM",
    "2:00 PM",
    "2:30 PM",
    "4:00 PM",
    "8:00 PM",
  ];

  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);

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

      <div className={`time-slot-wrapper ${notShowTime ? "hide" : ""}`}>
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
          {timeSlots.map((time, index) => (
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default SingleCalendar;
