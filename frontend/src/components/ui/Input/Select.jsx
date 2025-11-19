import { useState, useRef, useEffect } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import moment from "moment-timezone";
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
  onDisabledClick,
}) => {
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const containerRef = useRef(null);

  // Function to get timezone value from timezone label
  const getTimezoneFromLabel = (label) => {
    // Create a reverse mapping from the Account.jsx timezoneMap
    const timezoneMap = {
      "Pacific Time (US & Canada)": "America/Los_Angeles",
      "Mountain Time (US & Canada)": "America/Denver", 
      "Central Time (US & Canada)": "America/Chicago",
      "Eastern Time (US & Canada)": "America/New_York",
      "Atlantic Time (Canada)": "America/Halifax",
      "Newfoundland Time (Canada)": "America/St_Johns",
      "Alaska Time": "America/Anchorage",
      "Hawaii Time": "Pacific/Honolulu",
      "Mountain Time (Arizona)": "America/Phoenix",
      "Eastern Time (Detroit)": "America/Detroit",
      "Eastern Time (Indiana)": "America/Indiana/Indianapolis",
      "Eastern Time (Kentucky)": "America/Kentucky/Louisville",
      "Central Time (Indiana)": "America/Indiana/Tell_City",
      "Central Time (Michigan)": "America/Menominee",
      "Central Time (North Dakota)": "America/North_Dakota/Center",
      "Mountain Time (Idaho)": "America/Boise",
      "Central Time (Mexico)": "America/Mexico_City",
      "Eastern Time (Mexico)": "America/Cancun",
      "Mountain Time (Mexico)": "America/Mazatlan",
      "Pacific Time (Mexico)": "America/Tijuana",
      "Mountain Time (Canada)": "America/Creston",
      "Pacific Time (Canada)": "America/Dawson",
      "Atlantic Time (Canada - Glace Bay)": "America/Glace_Bay",
      "Eastern Time (Canada)": "America/Nipigon",
      "Central Time (Canada)": "America/Rainy_River",
      "Argentina Time": "America/Argentina/Buenos_Aires",
      "Brasilia Time": "America/Sao_Paulo",
      "Acre Time (Brazil)": "America/Rio_Branco",
      "Amazon Time (Brazil)": "America/Manaus",
      "Fernando de Noronha Time (Brazil)": "America/Noronha",
      "Chile Time": "America/Santiago",
      "Easter Island Time": "America/Easter",
      "Colombia Time": "America/Bogota",
      "Peru Time": "America/Lima",
      "Venezuela Time": "America/Caracas",
      "Ecuador Time": "America/Guayaquil",
      "Bolivia Time": "America/La_Paz",
      "Paraguay Time": "America/Asuncion",
      "Uruguay Time": "America/Montevideo",
      "Guyana Time": "America/Guyana",
      "Suriname Time": "America/Paramaribo",
      "French Guiana Time": "America/Cayenne",
      "Falkland Islands Time": "Atlantic/Stanley",
      "Greenwich Mean Time (GMT)": "UTC",
      "Western European Time (Portugal)": "Europe/Lisbon",
      "Central European Time (Spain)": "Europe/Madrid",
      "Eastern European Time (Romania)": "Europe/Bucharest",
      "Moscow Time": "Europe/Moscow",
      "Volgograd Time": "Europe/Volgograd",
      "Samara Time": "Europe/Samara",
      "Yekaterinburg Time": "Europe/Yekaterinburg",
      "Omsk Time": "Europe/Omsk",
      "Novosibirsk Time": "Europe/Novosibirsk",
      "Krasnoyarsk Time": "Europe/Krasnoyarsk",
      "Irkutsk Time": "Europe/Irkutsk",
      "Yakutsk Time": "Europe/Yakutsk",
      "Vladivostok Time": "Europe/Vladivostok",
      "Magadan Time": "Europe/Magadan",
      "Kamchatka Time": "Europe/Kamchatka",
      "Anadyr Time": "Europe/Anadyr",
      "Greenwich Mean Time (Iceland)": "Europe/Reykjavik",
      "Azores Time": "Atlantic/Azores",
      "Western European Time (Canary Islands)": "Atlantic/Canary",
      "Turkey Time": "Europe/Istanbul",
      "Kaliningrad Time": "Europe/Kaliningrad",
      "India Standard Time": "Asia/Kolkata",
      "China Standard Time": "Asia/Shanghai",
      "Japan Standard Time": "Asia/Tokyo",
      "Korea Standard Time": "Asia/Seoul",
      "Indochina Time": "Asia/Bangkok",
      "Western Indonesia Time": "Asia/Jakarta",
      "Central Indonesia Time": "Asia/Makassar",
      "Eastern Indonesia Time": "Asia/Jayapura",
      "Philippines Standard Time": "Asia/Manila",
      "Malaysia Time": "Asia/Kuala_Lumpur",
      "Singapore Time": "Asia/Singapore",
      "Hong Kong Time": "Asia/Hong_Kong",
      "Taiwan Time": "Asia/Taipei",
      "Ulaanbaatar Time": "Asia/Ulaanbaatar",
      "Hovd Time": "Asia/Hovd",
      "Choibalsan Time": "Asia/Choibalsan",
      "East Timor Time": "Asia/Dili",
      "Eastern European Time (Egypt)": "Africa/Cairo",
      "Central European Time (Tunisia)": "Africa/Tunis",
      "Western European Time (Morocco)": "Africa/Casablanca",
      "West Africa Time": "Africa/Lagos",
      "Greenwich Mean Time (Ivory Coast)": "Africa/Abidjan",
      "East Africa Time": "Africa/Nairobi",
      "Central Africa Time": "Africa/Lubumbashi",
      "South Africa Standard Time": "Africa/Johannesburg",
      "Australia Eastern Standard Time": "Australia/Sydney",
      "Australia Central Standard Time": "Australia/Adelaide",
      "Australia Western Standard Time": "Australia/Perth",
      "Lord Howe Standard Time": "Australia/Lord_Howe",
      "New Zealand Standard Time": "Pacific/Auckland",
      "Chatham Standard Time": "Pacific/Chatham",
      "Fiji Time": "Pacific/Fiji",
      "Tonga Time": "Pacific/Tongatapu",
      "Samoa Standard Time": "Pacific/Apia",
      "Niue Time": "Pacific/Niue",
      "Cook Islands Time": "Pacific/Rarotonga",
      "Tahiti Time": "Pacific/Tahiti",
      "Marquesas Time": "Pacific/Marquesas",
      "Gambier Time": "Pacific/Gambier",
      "Pitcairn Time": "Pacific/Pitcairn",
      "Galapagos Time": "Pacific/Galapagos",
      "Norfolk Time": "Pacific/Norfolk"
    };
    
    return timezoneMap[label] || null;
  };

  // Update current time every second when showCurrentTime is true
  useEffect(() => {
    if (!showCurrentTime) return;
    
    const updateTime = () => {
      const timezoneValue = getTimezoneFromLabel(value);
      if (timezoneValue) {
        const now = moment().tz(timezoneValue);
        setCurrentTime(now.format('h:mm A'));
      } else {
        setCurrentTime("");
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [showCurrentTime, value]);

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

  // Position the dropdown dynamically when it opens
  useEffect(() => {
    if (open && containerRef.current) {
      const selectBox = containerRef.current.querySelector('.select-box');
      const dropdown = containerRef.current.querySelector('.select-dropdown');
      
      if (selectBox && dropdown) {
        // Check if this select is within an intake form field (should use absolute positioning)
        const isInIntakeForm = containerRef.current.closest('.intake-form-field');
        
        if (isInIntakeForm) {
          // For intake forms, use absolute positioning relative to select-group
          const rect = selectBox.getBoundingClientRect();
          dropdown.style.width = `${rect.width}px`;
          dropdown.style.position = 'absolute';
          dropdown.style.left = '0';
          dropdown.style.top = 'calc(100% + 4px)';
        } else {
          // For other contexts, use fixed positioning
          const rect = selectBox.getBoundingClientRect();
          dropdown.style.width = `${rect.width}px`;
          dropdown.style.left = `${rect.left}px`;
          dropdown.style.top = `${rect.bottom + 4}px`;
        }
      }
    }
  }, [open]);

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
              onClick={() => {
                if (disabled) {
                  if (onDisabledClick) {
                    onDisabledClick();
                  }
                  return;
                }
                setOpen(!open);
              }}
              style={style}
            >
              <span className={`select-text ${!value ? "select-placeholder" : ""}`}>
                {showCurrentTime && value && currentTime ? `${value} ${currentTime}` : (value || placeholder)}
              </span>
              {!disabled && (
                <span className="select-icon">
                  {open ? <FaChevronUp /> : <FaChevronDown />}
                </span>
              )}
            </div>

            {open && (
              <ul className="select-dropdown">
                {options.length > 0 ? (
                  options.map((opt, index) => {
                    const timezoneValue = getTimezoneFromLabel(opt);
                    const optionTime = timezoneValue ? moment().tz(timezoneValue).format('h:mm A') : '';
                    const displayText = showCurrentTime && optionTime ? `${opt} ${optionTime}` : opt;
                    
                    return (
                      <li
                        key={index}
                        className="select-option"
                        onClick={() => handleSelect(opt)}
                      >
                        {displayText}
                      </li>
                    );
                  })
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
