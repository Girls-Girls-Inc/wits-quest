// src/components/Navbar.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import NavButton from "./NavButton";
import "../styles/navbar.css";
import Logo from "../assets/logo.png";

const Navbar = () => {
  const location = useLocation();
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    const h = () => force();
    window.addEventListener("role:change", h);
    return () => window.removeEventListener("role:change", h);
  }, []);

  const isModerator = window.__IS_MODERATOR__ === true;

  const navItems = [
    ...(isModerator
      ? [{ route: "/adminDashboard", icon: "admin", label: "Admin" }]
      : []),
    { route: "/dashboard", icon: "dashboard", label: "Home" },
    { route: "/quests", icon: "logo", label: "Quests" },
    { route: "/map", icon: "map", label: "Map" },
    { route: "/leaderboard", icon: "leaderboard", label: "Leaderboard" },
    { route: "/settings", icon: "profile", label: "Profile" },
  ];

  return (
    <>
      <nav className="navbar-drawer">
        <img src={Logo} alt="" className="logo-img" draggable="false" />
        <h2 className="title">Campus Quest</h2>
        {navItems.map((item) => (
          <NavButton
            key={item.route}
            route={item.route}
            iconName={item.icon}
            label={item.label}
            className={
              location.pathname === item.route ||
              location.pathname.startsWith(item.route + "/")
                ? "active"
                : ""
            }
          />
        ))}
      </nav>

      <nav className="navbar-bottom">
        {navItems.map((item) => (
          <NavButton
            key={item.route}
            route={item.route}
            iconName={item.icon}
            label={item.label}
            className={
              location.pathname === item.route ||
              location.pathname.startsWith(item.route + "/")
                ? "active"
                : ""
            }
          />
        ))}
      </nav>
    </>
  );
};

export default Navbar;
