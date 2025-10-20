import { useState, useEffect, forwardRef } from "react";
import "./Input.css";
const Input = forwardRef(({
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
}, ref) => {
  const [inputType, setInputType] = useState(type);
  const [isFocused, setIsFocused] = useState(false);

  // Update inputType when type prop changes (for password show/hide)
  useEffect(() => {
    setInputType(type);
  }, [type]);

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
    // Call onBlur from props if it exists (from register or custom)
    if (onBlur) onBlur(e);
  };

  const handleChange = (e) => {
    // Call onChange from props if it exists (from register or custom)
    if (onChange) onChange(e);
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
        ref={ref}
        id={name}
        name={name}
        type={displayType}
        style={{ ...style }}
        className={`input-field ${error ? "input-error" : ""}`}
        placeholder={placeholder}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        readOnly={readOnly}
        {...props}
      />

      {error && <p className="input-error-text">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
