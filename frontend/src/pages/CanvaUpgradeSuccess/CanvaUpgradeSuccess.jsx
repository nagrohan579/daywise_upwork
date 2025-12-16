import "./CanvaUpgradeSuccess.css";

const CanvaUpgradeSuccess = () => {
  return (
    <div className="canva-upgrade-success">
      <div className="canva-upgrade-success-container">
        {/* Logo Section */}
        <div className="canva-upgrade-success-logo-wrapper">
          <img 
            src="/assets/images/logo.svg" 
            alt="Daywise Logo" 
            className="canva-upgrade-success-logo"
            onError={(e) => {
              // Fallback to images folder if assets doesn't exist
              e.target.src = "/images/logo.svg";
            }}
          />
        </div>

        {/* Content Section */}
        <div className="canva-upgrade-success-content">
          <h1 className="canva-upgrade-success-heading">
            You're all set 🎉
          </h1>
          <p className="canva-upgrade-success-message">
            Your Daywise Booking upgrade was successful. You can close this tab and return to Canva to continue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CanvaUpgradeSuccess;

