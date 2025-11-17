import { Modal } from "react-bootstrap";
import "./modal.css";

const VideoModal = ({ show, onClose, title = "How it Works", embedUrl }) => {
  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      className="video-modal"
      size="lg"
    >
      <Modal.Body>
        <button
          type="button"
          className="video-modal-close-btn"
          onClick={onClose}
          aria-label="Close video"
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

        <h2 className="video-modal-title">{title}</h2>

        <div className="video-modal-iframe-wrapper">
          <iframe
            id="how-this-works-video"
            src={embedUrl}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default VideoModal;

