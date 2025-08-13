import React from "react";
import "../styles/inputField.css";

const InputField = ({
  id,
  type,
  name,
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
        name={name}
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
