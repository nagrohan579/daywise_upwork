const ToggleSwitch = ({ checked, onchange }) => {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={onchange} />
      <span className="slider round"></span>
    </label>
  );
};

export default ToggleSwitch;
