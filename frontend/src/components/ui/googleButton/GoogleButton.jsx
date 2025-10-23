import "./googlebutton.css";
const GoogleButton = ({ text, style = {}, onClick, disabled = false }) => {
  return (
    <button 
      className="google-btn" 
      style={style}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <img
        src="/assets/images/google-logo.png"
        alt="google"
        width={18}
        height={18}
      />
      {text}
    </button>
  );
};

export default GoogleButton;
