import "./googlebutton.css";
const GoogleButton = ({ text, style = {} }) => {
  return (
    <button className="google-btn" style={style}>
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
