import { useState } from "react";
import { RxCross2 } from "react-icons/rx";
import { PlusIcon } from "../SVGICONS/Svg";
import "./AvailabilityTimer.css";

const WeekTimeRange = ({ day }) => {
  const isUnavailableByDefault = day === "S" 

  const [timeRanges, setTimeRanges] = useState(
    isUnavailableByDefault ? [] : [{ start: "09:00", end: "17:00" }]
  );

  const handleAdd = () => {
    setTimeRanges([...timeRanges, { start: "09:00", end: "17:00" }]);
  };

  const handleRemove = (index) => {
    const updated = timeRanges.filter((_, i) => i !== index);
    setTimeRanges(updated);
  };

  const handleTimeChange = (index, field, value) => {
    const updated = [...timeRanges];
    updated[index][field] = value;
    setTimeRanges(updated);
  };

  const formatTimeDisplay = (time) => {
    const [hour, minute] = time.split(":");
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  return (
    <div className="week-time-range">
      {timeRanges.length > 0 ? (
        timeRanges.map((range, index) => (
          <div key={index} className="wrapper">
            <span className="days">{day}</span>

            <div className="time-range-wrap">
              <div className="time-edit-fields">
                <input
                  type="time"
                  value={range.start}
                  onChange={(e) =>
                    handleTimeChange(index, "start", e.target.value)
                  }
                />
                <span> - </span>
                <input
                  type="time"
                  value={range.end}
                  onChange={(e) =>
                    handleTimeChange(index, "end", e.target.value)
                  }
                />
              </div>

              <span
                onClick={() => handleRemove(index)}
                style={{ cursor: "pointer" }}
              >
                <RxCross2 color="#64748B" />
              </span>
            </div>

            <span onClick={handleAdd} style={{ cursor: "pointer" }}>
              <PlusIcon />
            </span>
          </div>
        ))
      ) : (
        <div className="wrapper">
          <span className="days">{day}</span>
          <div className="unavailable-time">
            <p>Unavailable</p>
          </div>
          <span onClick={handleAdd} style={{ cursor: "pointer" }}>
            <PlusIcon />
          </span>
        </div>
      )}
    </div>
  );
};

export default WeekTimeRange;
