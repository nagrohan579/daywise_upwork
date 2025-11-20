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
  const [localValue, setLocalValue] = useState(value);

  // Update inputType when type prop changes (for password show/hide)
  useEffect(() => {
    setInputType(type);
  }, [type]);

  // Sync local value with prop value when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  // For date/time inputs → always keep as date/time type on mobile to allow native picker
  const handleFocus = (e) => {
    setIsFocused(true);
    if ((type === "date" || type === "time") && !readOnly) {
      // Always set to date/time type, never text
      setInputType(type);
      // Trigger native picker on mobile - use longer timeout for iOS
      setTimeout(() => {
        if (e.target && e.target.showPicker) {
          e.target.showPicker();
        } else if (e.target && e.target.type === type) {
          // Fallback: ensure type is set and try click
          e.target.type = type;
          e.target.click();
        }
      }, 100);
    }
    
    // For number inputs, store the local value for editing
    if (type === "number") {
      setLocalValue(value?.toString() || "");
    }
  };

  // Handle click for date/time inputs to ensure picker opens
  const handleClick = (e) => {
    if ((type === "date" || type === "time") && !readOnly) {
      // Ensure type is set before click
      setInputType(type);
      // Small delay to ensure type is updated
      setTimeout(() => {
        if (e.target && e.target.showPicker) {
          e.target.showPicker();
        }
      }, 50);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // Don't change type to text on mobile - keep as date/time to allow picker
    // Only change to text on desktop if no value (for placeholder display)
    if ((type === "date" || type === "time") && !value) {
      const isMobile = window.innerWidth <= 991;
      if (!isMobile) {
        setInputType("text");
      }
    }
    
    // For number inputs, ensure the value is properly formatted
    if (type === "number" && onChange) {
      const inputValue = e.target.value;
      const numValue = inputValue === '' ? 0 : Number(inputValue);
      if (!isNaN(numValue)) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: numValue.toString()
          }
        };
        onChange(syntheticEvent);
      }
    }
    
    // Call onBlur from props if it exists (from register or custom)
    if (onBlur) onBlur(e);
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;

    if (type === "number") {
      // If the field is completely empty, force it to "0"
      if (inputValue === '' || inputValue === null || inputValue === undefined) {
        setLocalValue('0');
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: '0'
            }
          };
          onChange(syntheticEvent);
        }
        return;
      }

      // Remove leading zeros when typing
      let processedValue = inputValue;

      // Don't process if it's just a minus sign or decimal point at the start
      if (inputValue && inputValue !== '-' && inputValue !== '.') {
        // If current value is "0" and user types a non-zero digit, replace the zero
        if (localValue === '0' && inputValue.length === 2 && inputValue.startsWith('0')) {
          processedValue = inputValue.substring(1);
        } else {
          // Remove leading zeros (but keep a single "0" if that's all there is)
          processedValue = inputValue.replace(/^0+(\d)/, '$1');
        }
      }

      // Update local value with the processed value
      setLocalValue(processedValue);

      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: processedValue
          }
        };
        onChange(syntheticEvent);
      }
    } else if (onChange) {
      // Call onChange from props if it exists (from register or custom)
      onChange(e);
    }
  };

  // Prevent mouse wheel from changing number input values
  const handleWheel = (e) => {
    if (type === "number" && document.activeElement === e.target) {
      e.target.blur();
    }
  };

  // Show placeholder text when no value and not focused
  // On mobile, always use date/time type to allow native picker
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 991;
  const shouldShowPlaceholder =
    (type === "date" || type === "time") && !value && !isFocused && !isMobile;
  const displayType = shouldShowPlaceholder ? "text" : inputType;
  
  // For number inputs, use local value while focused
  const displayValue = (type === "number" && isFocused) ? localValue : value;

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
        value={displayValue}
        onFocus={handleFocus}
        onClick={handleClick}
        onBlur={handleBlur}
        onChange={handleChange}
        onWheel={type === "number" ? handleWheel : props.onWheel}
        readOnly={readOnly}
        {...props}
      />

      {error && <p className="input-error-text">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
