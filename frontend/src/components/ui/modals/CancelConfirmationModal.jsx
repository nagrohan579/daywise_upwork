import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./modal.css";

const CancelConfirmationModal = ({ show, setShow, bookingDate, bookingTime, bookingToken, userSlug, onDeleteSuccess }) => {
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/bookings/cancel/${bookingToken}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }

      const data = await response.json();
      setShow(false);

      // Redirect to user's booking page using slug from response or prop
      const slug = data.userSlug || userSlug;
      if (slug) {
        window.location.href = `/${slug}`;
      } else if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      // Silently handle error - user will be redirected anyway
      setShow(false);
      const slug = userSlug;
      if (slug) {
        window.location.href = `/${slug}`;
      } else if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        navigate('/');
      }
    }
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
      className="cancel-confirmation-modal"
    >
      <Modal.Body style={{ padding: 0 }}>
        <div className="cancel-modal-content">
          <button 
            className="cancel-modal-close-btn"
            onClick={() => setShow(false)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="cancel-modal-text">
            <h3>Cancel Booking</h3>
            <p className="cancel-modal-subtitle">
              Are you sure you want to cancel your booking on <strong>[{formatBookingDateTime()}]</strong>?
            </p>
            <p className="cancel-modal-info">
              This action can't be undone.
            </p>
          </div>
          
          <div className="cancel-modal-buttons">
            <button 
              className="cancel-modal-delete-btn"
              onClick={handleDelete}
            >
              Delete
            </button>
            <button 
              className="cancel-modal-cancel-btn"
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

export default CancelConfirmationModal;

