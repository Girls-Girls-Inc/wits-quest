// src/components/Navbar.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import NavButton from "./NavButton";
import "../styles/navbar.css";
import Logo from "../assets/logo.png";
import useModerator from "../hooks/useModerator";

const Navbar = () => {
  const location = useLocation();
  const { loading, isModerator } = useModerator();

  // Base items (Admin at index 0)
  const navItems = [
    { route: "/adminDashboard", icon: "admin", label: "Admin" },
    { route: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { route: "/quests", icon: "logo", label: "Quests" },
    { route: "/map", icon: "map", label: "Map" },
    { route: "/leaderboard", icon: "leaderboard", label: "Leaderboard" },
    { route: "/profile", icon: "profile", label: "Profile" },
  ];

  // Hide Admin by default until we know the role (prevents flash)
  const filtered = (loading || !isModerator)
    ? navItems.filter((i) => i.route !== "/adminDashboard")
    : navItems;

  return (
    <>
      {/* Desktop Right Drawer */}
      <nav className="navbar-drawer">
        <img src={Logo} alt="" className="logo-img" draggable="false" />
        <h2 className="title">Campus Quest</h2>
        {filtered.map((item) => (
          <NavButton
            key={item.route}
            route={item.route}
            iconName={item.icon}
            label={item.label}
            className={location.pathname === item.route ? "active" : ""}
          />
        ))}
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="navbar-bottom">
        {filtered.map((item) => (
          <NavButton
            key={item.route}
            route={item.route}
            iconName={item.icon}
            label={item.label}
            className={location.pathname === item.route ? "active" : ""}
          />
        ))}
      </nav>
    </>
  );
};

export default Navbar;
