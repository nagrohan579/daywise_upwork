import { Modal } from "react-bootstrap";
import "./modal.css";

const StripeDisconnectModal = ({
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
      className="stripe-disconnect-modal"
    >
      <Modal.Body style={{ padding: 0 }}>
        <div className="stripe-disconnect-content">
          <button className="stripe-disconnect-close-btn" onClick={onClose}>
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

          <div className="stripe-disconnect-text">
            <h3>Disconnect Stripe?</h3>
            <p>You won’t be able to take paid bookings until you reconnect.</p>
          </div>

          <div className="stripe-disconnect-buttons">
            <button
              className="stripe-disconnect-confirm"
              onClick={onConfirm}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
            <button
              className="stripe-disconnect-cancel"
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

export default StripeDisconnectModal;


