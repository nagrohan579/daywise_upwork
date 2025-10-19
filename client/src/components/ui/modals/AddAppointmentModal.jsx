import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import Input from "../Input/Input";
import Select from "../Input/Select";
import Button from "../Button";
import { useEffect, useState } from "react";

const AddAppointmentModal = ({
  showAddAppointmentModal,
  setShowAddAppointmentModal,
  selectedEvent,
  mode = "add",
}) => {
  // console.log("modemode", mode);
  console.log("selectedEvent", selectedEvent);
  const isEdit = mode === "edit";
  const isView = mode === "view";
  const isAdd = mode === "add";

  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const now = new Date();

    // Format date → October 11, 2025
    const formattedDate = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Format time → 11:43 AM
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    setCurrentDate(formattedDate);
    setCurrentTime(formattedTime);
  }, []);

  return (
    <Modal
      show={showAddAppointmentModal}
      onHide={() => setShowAddAppointmentModal(false)}
      centered
      backdrop="static"
      className="addAppointmentModal "
    >
      <Modal.Header>
        <div className="content-wrap">
          <Modal.Title>
            {isEdit ? "Edit Appointment" : "Appointment Details"}
          </Modal.Title>
          <p>
            {isEdit
              ? "Update the appointment details below"
              : "Add the appointment details below"}
          </p>
        </div>
        <button
          className="close-btn"
          onClick={() => setShowAddAppointmentModal(false)}
        >
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={""}>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Name</h5>
            <Input
              placeholder={"Charlie"}
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Email</h5>
            <Input
              placeholder={"testemail@gmail.com"}
              type="email"
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Date</h5>
            <Input
              placeholder={currentDate}
              type="date"
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
            />
          </div>
          <div className={`input-wrap ${isView ? "view-wrap" : ""}`}>
            <h5>Time</h5>
            <Input
              placeholder={currentTime}
              type="time"
              readOnly={isView}
              style={{
                border: isView ? "none" : "",
                backgroundColor: isView ? "transparent" : "",
                pointerEvents: isView ? "none" : "auto",
              }}
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
              onClick={() => setShowAddAppointmentModal(false)}
            />
            <Button text={isEdit ? "Save Changes" : "Create"} type="submit" />
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
};

export default AddAppointmentModal;
