import "./UI.css";

const Button = ({
  text,
  icon,
  onClick,
  variant = "primary",
  type = "button",
  style = {},
}) => {
  return (
    <button
      className={`btn-comp btn-${variant}`}
      style={style}
      type={type}
      onClick={onClick}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {text && <span className="btn-text">{text}</span>}
    </button>
  );
};

export default Button;
