import { useState } from "react";
import { Modal } from "react-bootstrap";
import { toast } from "sonner";
import "./modal.css";

const DeleteConfirmationModal = ({ show, setShow, onConfirm, itemName = "entry" }) => {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      setShow(false);
      toast.success(`${itemName} deleted successfully!`);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={() => setShow(false)}
      centered
      backdrop="static"
      className="delete-confirmation-modal"
    >
      <Modal.Body style={{ padding: 0 }}>
        <div className="delete-modal-content">
          <button 
            className="delete-modal-close-btn"
            onClick={() => setShow(false)}
            style={{ 
              position: 'absolute',
              right: '13px',
              top: '13px',
              width: '18px',
              height: '18px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="#64748B" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <div className="delete-modal-text">
            <h4>Delete date-specific hour?</h4>
            <p>This action can't be undone.</p>
          </div>
          
          <div className="delete-modal-buttons">
            <button 
              className="delete-modal-delete-btn"
              onClick={handleConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button 
              className="delete-modal-cancel-btn"
              onClick={() => setShow(false)}
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default DeleteConfirmationModal;

