import React from "react";
import "./ColorPicker.css";

const ColorPicker = ({ label, name, options = [], value, onChange, error }) => {
  return (
    <div className="color-group">
      {label && (
        <label htmlFor={name} className="color-label">
          {label} <span className="required">*</span>
        </label>
      )}

      <div className="color-options">
        {options.map((color, index) => (
          <div
            key={index}
            className={`color-circle ${value === color ? "active" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
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
