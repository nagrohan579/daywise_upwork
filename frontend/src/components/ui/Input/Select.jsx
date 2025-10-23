import { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./Input.css";

const Select = ({
  label,
  name,
  options = [],
  value,
  onChange,
  style = {},
  showCurrentTime = false,
  placeholder = "Select an option",
  error,
  children,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleSelect = (option) => {
    if (disabled) return;
    if (onChange) onChange(option);
    setOpen(false);
  };

  // If children (option elements) are provided, render them inside a native <select> for accessibility
  const hasChildren = !!children;

  return (
    <div className="input-group-comp">
      {label && (
        <label htmlFor={name} className="input-label">
          {label}
        </label>
      )}

      <div className={`select-group`} ref={containerRef}>
        <div className="wrap">
          {showCurrentTime && (
            <p className="timezone-text">Current Time</p>
          )}
        </div>

        {hasChildren ? (
          // Render a native select when options are provided as children (used in AddAppointmentModal)
          <select
            id={name}
            name={name}
            className={`input-field`}
            value={value}
            onChange={(e) => handleSelect(e.target.value)}
            style={style}
            disabled={disabled}
          >
            <option value="">{placeholder}</option>
            {children}
          </select>
        ) : (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-expanded={open}
              className={`select-box ${error ? "select-error" : ""} ${disabled ? 'select-disabled' : ''}`}
              onClick={() => !disabled && setOpen(!open)}
              style={style}
            >
              <span className={`select-text ${!value ? "select-placeholder" : ""}`}>
                {value || placeholder}
              </span>
              <span className="select-icon">
                {open ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </div>

            {open && (
              <ul className="select-dropdown">
                {options.length > 0 ? (
                  options.map((opt, index) => (
                    <li
                      key={index}
                      className="select-option"
                      onClick={() => handleSelect(opt)}
                    >
                      {opt}
                    </li>
                  ))
                ) : (
                  <li className="select-option disabled">No options available</li>
                )}
              </ul>
            )}
          </>
        )}

        {error && <p className="select-error-text">{error}</p>}
      </div>
    </div>
  );
};

export default Select;

// WITH ZOD
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import Select from "./components/ui/Select/Select";

// const schema = z.object({
//   service: z.string().min(1, "Please select a service"),
// });

// function App() {
//   const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
//     resolver: zodResolver(schema),
//   });

//   const service = watch("service");

//   const onSubmit = (data) => console.log(data);

//   return (
//     <form onSubmit={handleSubmit(onSubmit)}>
//       <Select
//         label="Service"
//         name="service"
//         value={service}
//         onChange={(val) => setValue("service", val)}
//         options={["Consultation", "Therapy", "Coaching"]}
//         error={errors.service?.message}
//       />
//       <button type="submit">Submit</button>
//     </form>
//   );
// }
