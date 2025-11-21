import { Modal } from "react-bootstrap";
import "./modal.css";

const GoogleCalendarDisconnectModal = ({
  show,
  onClose,
  onConfirm,
  isDisconnecting = false,
}) => {
  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      className="google-calendar-disconnect-modal"
    >
      <Modal.Body style={{ padding: 0 }}>
        <div className="google-calendar-disconnect-content">
          <button 
            className="google-calendar-disconnect-close-btn" 
            onClick={onClose}
            disabled={isDisconnecting}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
                stroke="#64748B"
                strokeWidth="1.125"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="google-calendar-disconnect-text">
            <h3>Disconnect Google Calendar?</h3>
            <p>Your bookings won't be affected. Only the Google Calendar sync will be disconnected.</p>
          </div>

          <div className="google-calendar-disconnect-buttons">
            <button
              className="google-calendar-disconnect-confirm"
              onClick={onConfirm}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
            <button
              className="google-calendar-disconnect-cancel"
              onClick={onClose}
              disabled={isDisconnecting}
            >
              No, Back
            </button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default GoogleCalendarDisconnectModal;

