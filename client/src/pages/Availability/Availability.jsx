import { useState } from "react";
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

import "./availability.css";
import { RxCross2 } from "react-icons/rx";

const days = ["S", "M", "T", "W", "T", "F", "S"];

const Availability = () => {
  const [showDateSpecificHour, setShowDateSpecificHour] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const isMobile = useMobile(991);

  const handleEditClick = () => {
    setModalMode("edit");
    setShowDateSpecificHour(true);
  };
  const handleAddClick = () => {
    setModalMode("create");
    setShowDateSpecificHour(true);
  };

  return (
    <AppLayout>
      <div className="availability-page">
        <div className="top-con">
          <div className="wrap">
            <h1>Availability</h1>
            <p>Set your availability for bookings</p>
          </div>
        </div>
        <div className="availability-con">
          <div className="top-wrapper">
            <div className="weekHour-con">
              <div className="top-content">
                <h3>Week Hours</h3>
                <p>Set when you are typically available for meetings</p>
              </div>
              <div className="time-range-con">
                {days.map((day, index) => (
                  <WeekTimeRange key={index} day={day} />
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
                  <div className="wrapper">
                    <div className="box">
                      <div className="top">
                        <h4>Sep 30, 2025</h4>
                        <RxCross2 color="#64748B" />
                      </div>
                      <div className="bottom">
                        <button>
                          <InfoIcon width={20} height={20} />
                          Unavailable
                        </button>
                        <EditIcon onClick={handleEditClick} />
                      </div>
                    </div>
                    <PlusIcon />
                  </div>
                  <div className="wrapper">
                    <div className="box">
                      <div className="top">
                        <h4>Oct 4, 2025</h4>
                        <RxCross2 color="#64748B" />
                      </div>
                      <div className="bottom">
                        <button>
                          <InfoIcon width={20} height={20} />
                          Unavailable
                        </button>
                        <EditIcon />
                      </div>
                    </div>
                    <PlusIcon />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DateSpecificHourModal
        showDateSpecificHour={showDateSpecificHour}
        setShowDateSpecificHour={setShowDateSpecificHour}
        mode={modalMode}
      />
    </AppLayout>
  );
};

export default Availability;
