const ToggleSwitch = ({ checked, onchange, disabled = false }) => {
  return (
    <label className={`switch ${disabled ? 'switch-disabled' : ''}`}>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onchange} 
        disabled={disabled}
      />
      <span className="slider round"></span>
    </label>
  );
};

export default ToggleSwitch;
