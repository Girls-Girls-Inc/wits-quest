import React from "react";
import "../styles/inputField.css";

const InputField = ({
  id,
  type,
  placeholder,
  icon,
  onChange,
  value,
  required = true,
}) => {
  return (
    <div className="input-wrapper">
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className="input-field"
        onChange={onChange}
        value={value}
        required={required}
      />
      <i className="material-symbols-outlined">{icon}</i>
    </div>
  );
};

export default InputField;
