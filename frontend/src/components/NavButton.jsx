// src/components/NavButton.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../styles/button.css";

// import DashboardIcon from "../assets/icons/dashboard.png";
// import ProfileIcon from "../assets/icons/profile.png";
// import QuestsIcon from "../assets/icons/quests.png";
// import SettingsIcon from "../assets/icons/settings.png";
import LogoIcon from "../assets/logo.png";

const ICONS = {
  //   dashboard: DashboardIcon,
  //   profile: ProfileIcon,
  //   quests: QuestsIcon,
  //   settings: SettingsIcon,
  logo: LogoIcon,
};

const NavButton = ({
  route,
  iconName,
  label,
  onClick,
  type = "button",
  target = null,
  disabled = false,
  className = "",
  alt = "",
}) => {
  const imgSrc = ICONS[iconName];

  const buttonContent = (
    <>
      {imgSrc && (
        <img src={imgSrc} alt={alt || label} className="nav-button-icon" />
      )}
      {label && <span>{label}</span>}
    </>
  );

  if (onClick || type === "submit") {
    return (
      <button
        className={`icon-button nav-button ${className}`}
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
      className={`icon-button nav-button ${className}`}
      target={target}
      aria-disabled={disabled ? "true" : "false"}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
    >
      {buttonContent}
    </Link>
  );
};

export default NavButton;
