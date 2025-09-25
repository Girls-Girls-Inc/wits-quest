import React from "react";
import { Link } from "react-router-dom";
import "../styles/button.css";

const IconButton = ({
  route,
  icon,
  label,
  onClick,
  type = "button",
  target = null,
  disabled = false,
  className = "",
}) => {
  const computedClassName = [
    "icon-button",
    className,
    disabled ? "icon-button--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const buttonContent = (
    <>
      {icon && <i className="material-symbols-outlined">{icon}</i>}
      <span>{label}</span>
    </>
  );

  if (onClick || type === "submit") {
    return (
      <button
        className={computedClassName}
        onClick={onClick}
        type={type}
        disabled={disabled}
        style={disabled ? { pointerEvents: "none" } : undefined}
      >
        {buttonContent}
      </button>
    );
  }

  return (
    <Link
      to={route}
      className={computedClassName}
      target={target}
      aria-disabled={disabled ? "true" : "false"}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
      style={disabled ? { pointerEvents: "none" } : undefined}
    >
      {buttonContent}
    </Link>
  );
};

export default IconButton;
