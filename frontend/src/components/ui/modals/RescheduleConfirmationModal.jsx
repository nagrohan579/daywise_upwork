import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./modal.css";

const RescheduleConfirmationModal = ({ show, setShow, bookingDate, bookingTime, bookingToken }) => {
  const navigate = useNavigate();

  const handleConfirm = () => {
    setShow(false);
    navigate(`/reschedule_event/${bookingToken}`);
  };

  const formatBookingDateTime = () => {
    if (!bookingDate || !bookingTime) return '';
    return `${bookingDate} at ${bookingTime}`;
  };

  return (
    <Modal
      show={show}
      onHide={() => setShow(false)}
      centered
      backdrop="static"
      className="reschedule-confirmation-modal"
    >
      <Modal.Body style={{ padding: 0 }}>
        <div className="reschedule-modal-content">
          <button 
            className="reschedule-modal-close-btn"
            onClick={() => setShow(false)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="reschedule-modal-text">
            <h3>Reschedule Booking?</h3>
            <p className="reschedule-modal-subtitle">Need to change your appointment time?</p>
            <p className="reschedule-modal-info">
              Your current booking on <strong>{formatBookingDateTime()}</strong> will be updated automatically once you confirm.
            </p>
          </div>
          
          <div className="reschedule-modal-buttons">
            <button 
              className="reschedule-modal-confirm-btn"
              onClick={handleConfirm}
            >
              Yes, Reschedule
            </button>
            <button 
              className="reschedule-modal-cancel-btn"
              onClick={() => setShow(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default RescheduleConfirmationModal;

