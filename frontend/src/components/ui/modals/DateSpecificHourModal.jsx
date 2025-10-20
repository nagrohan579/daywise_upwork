import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import Input from "../Input/Input";
import Select from "../Input/Select";
import Button from "../Button";
import { useState } from "react";

const DateSpecificHourModal = ({
  showDateSpecificHour,
  setShowDateSpecificHour,
  mode = "create",
}) => {
  const isEdit = mode === "edit";

  // track selected type
  const [selectedType, setSelectedType] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // check if we should show time inputs
  const showTimeInputs =
    selectedType === "Custom Hours" || selectedType === "Special Availability";
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
        <form onSubmit={""}>
          <div className="input-wrap">
            <Input label={"Date*"} type="date" placeholder={"2025-09-29"} />
            <Select
              label={"Type*"}
              placeholder="Unavailable"
              style={{ borderRadius: "12px", backgroundColor: "#F9FAFF" }}
              options={["Unavailable", "Custom Hours", "Special Availability"]}
              value={selectedType}
              onChange={setSelectedType}
            />
          </div>

          <div className="reason-input-con">
            <Input
              label={"Reason (optional)"}
              placeholder={"eg., Holiday, Vacation"}
            />
          </div>

          {/* CONDITIONAL TIME INPUTS */}
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
          <div className="reason-input-con">
            <Select
              label={"Services Affected (optional)"}
              placeholder="All services"
              style={{ backgroundColor: "#F9FAFF",borderRadius:"12px" }}
            />
          </div>

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
            <Button text={isEdit ? "Save Changes" : "Create"} type="submit" />
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default DateSpecificHourModal;
