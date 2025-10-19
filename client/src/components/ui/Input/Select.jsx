import { useState } from "react";
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
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (option) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="select-group">
      <div className="wrap">
        {label && (
          <label htmlFor={name} className="select-label">
            {label}
          </label>
        )}
        {showCurrentTime && (
          <p className="timezone-text">Current Time 7:24 AM</p>
        )}
      </div>

      <div
        className={`select-box ${error ? "select-error" : ""}`}
        onClick={() => setOpen(!open)}
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

      {error && <p className="select-error-text">{error}</p>}
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
