import { Modal } from "react-bootstrap";
import { IoClose } from "react-icons/io5";
import "./modal.css";
import Input from "../Input/Input";
import Select from "../Input/Select";
import Button from "../Button";
import SingleCalendar from "../../Calendar/SingleCalendar";

const PreviewBookingModal = ({ showPreviewBooking, setShowPreviewBooking }) => {
  return (
    <Modal
      show={showPreviewBooking}
      onHide={() => setShowPreviewBooking(false)}
      centered
      backdrop="static"
      className="previewBookingModal "
    >
      <Modal.Header>
        <button
          className="close-btn"
          onClick={() => setShowPreviewBooking(false)}
        >
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <div className="main-wrapper">
          <div className="containerr">
            <div className="left">
              <div className="daywise-branding">
                <Button text={"Powered by Daywise"} />
              </div>
              <div className="profile-con">
                <img
                  src="/assets/images/logo-here.png"
                  alt="logo"
                  style={{ display: "none" }}
                />
                <div className="profile-wrapper">
                  <img src="/assets/images/profile.png" alt="profile" />
                  <h5>Daniel Allen</h5>
                </div>
                <div className="business-wrapper">
                  <h2>Business Name Here</h2>
                  <p>Your business welcome message appears here.</p>
                </div>
                <div className="select-con">
                  <h4>Select Appointment Type</h4>
                  <Select
                    placeholder="30 Minute Appointment"
                    style={{ backgroundColor: "#F9FAFF", borderRadius: "12px" }}
                    options={[
                      "60 Minute Appointment",
                      "90 Minute Appointment",
                      "120 Minute Appointment",
                    ]}
                  />
                </div>
                <p className="description">
                  The service/Appointment description goes here if it has one.
                </p>
              </div>
            </div>
            <div className="right">
              <SingleCalendar notShowTime={true} />
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default PreviewBookingModal;
