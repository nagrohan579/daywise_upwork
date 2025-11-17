import { useState } from "react";
import { VideoIcon } from "./SVGICONS/Svg";
import VideoModal from "./ui/modals/VideoModal";
import "./HowThisWorksButton.css";

const DEFAULT_VIDEO_URL = "https://jumpshare.com/embed/iWcB5XN8SpKmvEKiGWFR";

const HowThisWorksButton = ({
  title = "How this Works",
  videoUrl = DEFAULT_VIDEO_URL,
  buttonLabel = "How this Works",
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        className="how-this-works-floating-btn"
        aria-label={buttonLabel}
        onClick={() => setShowModal(true)}
      >
        <span className="how-this-works-icon">
          <VideoIcon />
        </span>
        <span className="how-this-works-text">{buttonLabel}</span>
      </button>

      <VideoModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={title}
        embedUrl={videoUrl}
      />
    </>
  );
};

export default HowThisWorksButton;

