import "./Input.css";

const Textarea = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  style = {},
  onBlur,
  error,
  rows = 10,
  height = "116px",
  ...props
}) => {
  return (
    <div className="textarea-group">
      {label && (
        <label htmlFor={name} className="textarea-label">
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        className={`textarea-field ${error ? "textarea-error" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        style={{ height, ...style }}
        rows={rows}
        {...props}
      />
      {error && <p className="textarea-error-text">{error}</p>}
    </div>
  );
};

export default Textarea;
