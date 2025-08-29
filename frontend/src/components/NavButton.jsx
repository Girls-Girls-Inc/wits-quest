// src/components/NavButton.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../styles/button.css";

import LogoIcon from "../assets/Logo.png";
import leaderBoardLogo from "../assets/leaderboard.png";
import homeLogo from "../assets/home.png";
import mapLogo from "../assets/map.png";
import profileLogo from "../assets/profile.png";
import adminLogo from "../assets/admin.png";
import Leaderboard from "../pages/leaderboard";


const ICONS = {
  dashboard: homeLogo,
  profile: profileLogo,
  map: mapLogo,
  logo: LogoIcon,
  leaderboard: leaderBoardLogo,
  admin: adminLogo,
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
