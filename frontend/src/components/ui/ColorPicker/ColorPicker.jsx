import React, { useRef, useEffect, useState } from "react";
import "./ColorPicker.css";

const ColorPicker = ({ label, name, value, onChange, error }) => {
  const colorInputRef = useRef(null);
  const containerRef = useRef(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleColorClick = () => {
    colorInputRef.current?.click();
    setIsPickerOpen(true);
  };

  const handleColorChange = (e) => {
    onChange(e.target.value);
    setIsPickerOpen(false);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
        // Force close the color picker by blurring the input
        if (colorInputRef.current) {
          colorInputRef.current.blur();
        }
      }
    };

    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPickerOpen]);

  return (
    <div className="color-group">
      {label && (
        <label htmlFor={name} className="color-label">
          {label} <span className="required">*</span>
        </label>
      )}

      <div className="color-picker-container" ref={containerRef}>
        <div 
          className="color-preview-circle"
          style={{ backgroundColor: value || "#F19B11" }}
          onClick={handleColorClick}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={value || "#F19B11"}
          onChange={handleColorChange}
          className="color-input"
        />
      </div>

      {error && <p className="color-error-text">{error}</p>}
    </div>
  );
};

export default ColorPicker;




// 
// import React from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import ColorPicker from "./components/ui/ColorPicker/ColorPicker";

// const schema = z.object({
//   serviceColor: z.string().min(1, "Please select a color"),
// });

// function App() {
//   const { handleSubmit, setValue, watch, formState: { errors } } = useForm({
//     resolver: zodResolver(schema),
//   });

//   const selectedColor = watch("serviceColor");

//   const onSubmit = (data) => {
//     console.log("Form data:", data);
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)}>
//       <ColorPicker
//         label="Service color"
//         name="serviceColor"
//         options={["#F19B11", "#D01DC7", "#5162FA"]}
//         value={selectedColor}
//         onChange={(val) => setValue("serviceColor", val, { shouldValidate: true })}
//         error={errors.serviceColor?.message}
//       />

//       <button type="submit">Submit</button>
//     </form>
//   );
// }

// export default App;
