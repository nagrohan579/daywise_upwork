import React, { useCallback, useState, useEffect, useRef } from "react";
import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa6";
import "./CalendarTest.css";
import AddAppointmentModal from "../ui/modals/AddAppointmentModal";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = ["Sun", "Mon", "Tues", "Wed", "Thu", "Fri", "Sat"];

const CalendarApp = ({ events = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const timeGridRef = useRef(null);

  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event);
    setShowAddAppointmentModal(true);
  }, []);

  // Auto-scroll to first booking when day view loads
  useEffect(() => {
    if (view === "day" && timeGridRef.current) {
      const displayDate = currentDate;
      const dayEvents = getEventsForDate(displayDate);
      const timedEvents = dayEvents.filter((e) => e.time);
      
      const getFirstBookingHour = () => {
        if (timedEvents.length === 0) return 8; // Default to 8am if no bookings
        
        const earliestHour = Math.min(...timedEvents.map(e => {
          const eventHour = parseInt(e.time.split(":")[0]);
          return eventHour;
        }));
        
        // Scroll to 1 hour before the first booking, but not before 6am
        return Math.max(earliestHour - 1, 6);
      };

      const firstHour = getFirstBookingHour();
      const scrollPosition = firstHour * 60; // 60px per hour slot
      timeGridRef.current.scrollTop = scrollPosition;
    }
  }, [view, currentDate]);

  const styles = {
    container: {
      minHeight: "100vh",
      fontFamily: '"Inter", Arial, sans-serif',
    },
    calendarWrapper: {
      maxWidth: "1400px",
      margin: "0 auto",
      background: "white",
      borderRadius: "14px",
      //   boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      border: "1px solid #64748B33",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px",
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
      flexWrap: "wrap",
    },
    title: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#121212",
      margin: 0,
    },
    navigation: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    navBtn: {
      width: "32px",
      height: "32px",
      background: "transparent",
      cursor: "pointer",
      borderRadius: "6px",
      border: "1px solid #E0E9FE",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 0.2s",
    },
    todayBtn: {
      padding: "6px 16px",
      border: "1px solid #E0E9FE",
      color: "#121212",
      fontWeight: "500",
      background: "white",
      borderRadius: "50px",
      cursor: "pointer",
      fontSize: "14px",
      transition: "background 0.2s",
    },
    viewSelector: {
      position: "relative",
    },
    viewBtn: {
      padding: "8px 16px",
      border: "1px solid #E0E9FE",
      background: "white",
      borderRadius: "50px",
      color: "#64748B",
      fontWeight: "500",
      cursor: "pointer",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "background 0.2s",
    },
    viewDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: "8px",
      width: "120px",
      background: "white",
      border: "1px solid #E0E9FE",
      borderRadius: "4px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      zIndex: 100,
    },
    viewOption: {
      padding: "10px 16px",
      cursor: "pointer",
      fontSize: "14px",
      transition: "background 0.2s",
    },
    calendarTable: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
    },
    weekdayHeader: {
      padding: "12px 8px",
      textAlign: "center",
      fontSize: "14px",
      fontWeight: "500",
      color: "#64748B",
      borderRight: "1px solid #64748B33",
      borderBottom: "1px solid #64748B33",
      background: "#F9FAFF",
    },
    dayCell: {
      padding: "8px",
      borderRight: "1px solid #64748B33",
      borderBottom: "1px solid #64748B33",
      verticalAlign: "top",
      position: "relative",
    },
    dayCellUnavailable: {
      background: "#FFF5F5",
    },
    dayCellOtherMonth: {
      background: "#fafafa",
    },
    dayCellToday: {
      background: "#eff6ff",
    },
    dayNumber: {
      fontSize: "14px",
      color: "#333",
      marginBottom: "4px",
      fontWeight: "400",
    },
    dayNumberOther: {
      color: "#999",
    },
    dayNumberToday: {
      color: "#2563eb",
      fontWeight: "600",
    },
    eventBadge: {
      fontSize: "11px",
      padding: "4px 8px",
      borderRadius: "3px",
      marginBottom: "4px",
      color: "white",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      display: "block",
      cursor: "Pointer",
    },
    weekDayHeader: {
      textAlign: "center",
      padding: "12px 8px",
      borderRight: "1px solid #64748B33",
      borderBottom: "1px solid #64748B33",
      background: "#fafafa",
    },
    weekDayHeaderToday: {
      background: "#bfdbfe",
    },
    weekDayName: {
      fontSize: "11px",
      color: "#64748B",
      marginBottom: "4px",
      fontWeight: "400",
    },
    weekDayNumber: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#333",
    },
    weekDayNumberToday: {
      color: "#2563eb",
    },
    weekDayCell: {
      height: "500px",
      padding: "0",
      borderRight: "1px solid #e5e5e5",
      verticalAlign: "top",
      background: "white",
      position: "relative",
    },
    weekDayCellUnavailable: {
      background: "#FFF5F5",
    },
    weekDayCellToday: {
      background: "#e0f2fe",
    },
    weekEventContainer: {
      padding: "12px 8px",
      height: "100%",
    },
    dayViewHeader: {
      padding: "16px 20px",
      borderBottom: "1px solid #e5e5e5",
      background: "#fafafa",
    },
    dayDate: {
      fontSize: "14px",
      color: "#64748B",
    },
    timeGrid: {
      maxHeight: "600px",
      overflowY: "auto",
    },
    timeSlot: {
      display: "flex",
      borderBottom: "1px solid #e5e5e5",
      minHeight: "60px",
    },
    timeSlotUnavailable: {
      background: "#FFF5F5",
    },
    timeLabel: {
      width: "80px",
      padding: "8px 12px",
      textAlign: "right",
      fontSize: "14px",
      color: "#666",
      flexShrink: 0,
    },
    timeContent: {
      flex: 1,
      padding: "8px 12px",
      position: "relative",
    },
    timeEvent: {
      position: "absolute",
      left: "8px",
      right: "8px",
      top: "8px",
      padding: "8px 12px",
      borderRadius: "4px",
      color: "white",
      fontSize: "13px",
      cursor: "pointer",
    },
  };

  const eventColors = {
    orange: "#f97316",
    blue: "#3b82f6",
    red: "#ef4444",
    purple: "#a855f7",
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getWeekDays = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date);
    sunday.setDate(diff);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };

  const getEventsForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const hasUnavailableEvent = (date) => {
    const dayEvents = getEventsForDate(date);
    return dayEvents.some(
      (e) => e.color === "red" || e.title.toLowerCase().includes("unavailable")
    );
  };

  const formatDate = (date) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() + direction * 7);
    } else {
      newDate.setDate(currentDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const EventBadge = React.memo(({ event, onClick }) => {
    return (
      <div
        style={{
          fontSize: "11px",
          padding: "4px 8px",
          borderRadius: "3px",
          marginBottom: "4px",
          color: "white",
          background: event.color || eventColors[event.color] || "#3b82f6",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
        }}
        onClick={() => onClick(event)}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "white",
            flexShrink: 0,
          }}
        ></span>
        <span className="event-title">{event.title}</span>
      </div>
    );
  });
  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek, year, month } =
      getDaysInMonth(currentDate);
    const days = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <table style={styles.calendarTable}>
        <thead>
          <tr>
            {dayNames.map((day, idx) => (
              <th
                key={idx}
                style={{
                  ...styles.weekdayHeader,
                  borderRight: idx === 6 ? "none" : "1px solid #e5e5e5",
                }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIdx) => (
            <tr key={weekIdx}>
              {week.map((dayObj, dayIdx) => {
                const dayEvents = getEventsForDate(dayObj.date);
                const isTodayDate = isToday(dayObj.date);
                const isUnavailable = hasUnavailableEvent(dayObj.date);
                const isLastRow = weekIdx === weeks.length - 1;

                const cellStyle = {
                  ...styles.dayCell,
                  ...(dayIdx === 6 ? { borderRight: "none" } : {}),
                  ...(isLastRow ? { borderBottom: "none" } : {}),
                  ...(isUnavailable ? styles.dayCellUnavailable : {}),
                  ...(!dayObj.isCurrentMonth ? styles.dayCellOtherMonth : {}),
                  ...(isTodayDate ? styles.dayCellToday : {}),
                };

                const numberStyle = {
                  ...styles.dayNumber,
                  ...(!dayObj.isCurrentMonth ? styles.dayNumberOther : {}),
                  ...(isTodayDate ? styles.dayNumberToday : {}),
                };

                return (
                  <td key={dayIdx} style={cellStyle}>
                    <div style={numberStyle}>{dayObj.day}</div>
                    {dayEvents.map((event) => (
                      <EventBadge
                        key={event.id}
                        event={event}
                        onClick={handleEventClick}
                      />
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const today = new Date();

    const isTodayWeek = (date) => {
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    return (
      <table style={styles.calendarTable}>
        <thead>
          <tr>
            {weekDays.map((date, idx) => {
              const isTodayDate = isTodayWeek(date);
              return (
                <th
                  key={idx}
                  style={{
                    ...styles.weekDayHeader,
                    ...(idx === 6 ? { borderRight: "none" } : {}),
                    ...(isTodayDate ? styles.weekDayHeaderToday : {}),
                  }}
                >
                  <div style={styles.weekDayName}>
                    {dayNames[date.getDay()]}
                  </div>
                  <div
                    style={{
                      ...styles.weekDayNumber,
                      ...(isTodayDate ? styles.weekDayNumberToday : {}),
                    }}
                  >
                    {date.getDate()}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            {weekDays.map((date, idx) => {
              const dayEvents = getEventsForDate(date);
              const isTodayDate = isTodayWeek(date);
              const isUnavailable = hasUnavailableEvent(date);

              return (
                <td
                  key={idx}
                  style={{
                    ...styles.weekDayCell,
                    ...(idx === 6 ? { borderRight: "none" } : {}),
                    ...(isUnavailable ? styles.weekDayCellUnavailable : {}),
                    ...(isTodayDate ? styles.weekDayCellToday : {}),
                  }}
                >
                  <div style={styles.weekEventContainer}>
                    {dayEvents.map((event) => (
                      <EventBadge
                        key={event.id}
                        event={event}
                        onClick={handleEventClick}
                      />
                    ))}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const displayDate = currentDate;
    const dayEvents = getEventsForDate(displayDate);

    const allDayEvents = dayEvents.filter((e) => !e.time); // 👈 Unavailable / all-day events
    const timedEvents = dayEvents.filter((e) => e.time);

    const getEventForHour = (hour) => {
      return timedEvents.filter((e) => {
        const eventHour = parseInt(e.time.split(":")[0]);
        return eventHour === hour;
      });
    };

    return (
      <div>
        <div style={styles.dayViewHeader}>
          <div style={styles.dayDate}>{formatDate(displayDate)}</div>
        </div>

        {/* 👇 All-day / Unavailable events block */}
        {allDayEvents.length > 0 && (
          <div style={{ padding: "12px 16px", background: "#FFF5F5" }}>
            {allDayEvents.map((event) => (
              <EventBadge
                key={event.id}
                event={event}
                onClick={handleEventClick}
              />
            ))}
          </div>
        )}

        <div style={styles.timeGrid} ref={timeGridRef}>
          {hours.map((hour) => {
            const hourEvents = getEventForHour(hour);
            const timeLabel =
              hour === 0
                ? "12 am"
                : hour < 12
                ? `${hour} am`
                : hour === 12
                ? "12 pm"
                : `${hour - 12} pm`;

            return (
              <div key={hour} style={styles.timeSlot}>
                <div style={styles.timeLabel}>{timeLabel}</div>
                <div style={styles.timeContent}>
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        ...styles.timeEvent,
                        background: event.color || eventColors[event.color] || "#3b82f6",
                      }}
                      onClick={() => handleEventClick(event)}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={styles.container} className="calendar-container">
        <div style={styles.header} className="calendar-header">
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h1>
            <div style={styles.navigation}>
              <button
                style={styles.navBtn}
                onClick={() => navigate(-1)}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#f0f0f0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <FaChevronLeft size={16} color="#64748B" />
              </button>
              <button
                style={styles.todayBtn}
                onClick={goToToday}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#f9f9f9")
                }
                onMouseOut={(e) => (e.currentTarget.style.background = "white")}
              >
                Today
              </button>
              <button
                style={styles.navBtn}
                onClick={() => navigate(1)}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#f0f0f0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <FaChevronRight size={16} color="#64748B" />
              </button>
            </div>
          </div>

          <div style={styles.viewSelector}>
            <button
              style={styles.viewBtn}
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#f9f9f9")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
              <FaChevronDown size={16} color="#64748B" />
            </button>
            {showViewDropdown && (
              <div style={styles.viewDropdown}>
                {["month", "week", "day"].map((v) => (
                  <div
                    key={v}
                    style={styles.viewOption}
                    onClick={() => {
                      setView(v);
                      setShowViewDropdown(false);
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#f0f0f0")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "white")
                    }
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={styles.calendarWrapper}>
          <div>
            {view === "month" && renderMonthView()}
            {view === "week" && renderWeekView()}
            {view === "day" && renderDayView()}
          </div>
        </div>
      </div>
      <AddAppointmentModal
        showAddAppointmentModal={showAddAppointmentModal}
        setShowAddAppointmentModal={setShowAddAppointmentModal}
        selectedEvent={selectedEvent}
        mode={"edit"}
      />
    </>
  );
};

export default CalendarApp;
