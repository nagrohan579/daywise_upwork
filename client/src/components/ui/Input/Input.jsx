import { useState } from "react";
import "./Input.css";
const Input = ({
  label,
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  readOnly = false,
  style = {},
  error,
  ...props
}) => {
  const [inputType, setInputType] = useState(type);
  const [isFocused, setIsFocused] = useState(false);

  // For date/time inputs → show placeholder by default (text type)
  const handleFocus = (e) => {
    setIsFocused(true);
    if ((type === "date" || type === "time") && !readOnly) {
      setInputType(type);
      // Trigger native picker on mobile
      setTimeout(() => {
        e.target.showPicker?.();
      }, 0);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if ((type === "date" || type === "time") && !value) {
      setInputType("text");
    }
    if (onBlur) onBlur(e);
  };

  // Show placeholder text when no value and not focused
  const shouldShowPlaceholder =
    (type === "date" || type === "time") && !value && !isFocused;
  const displayType = shouldShowPlaceholder ? "text" : inputType;

  return (
    <div className="input-group-comp">
      {label && (
        <label htmlFor={name} className="input-label">
          {label}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={displayType}
        style={{ ...style }}
        className={`input-field ${error ? "input-error" : ""}`}
        placeholder={placeholder}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={onChange}
        readOnly={readOnly}
        {...props}
      />

      {error && <p className="input-error-text">{error}</p>}
    </div>
  );
};

export default Input;
