// src/components/Navbar.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import NavButton from "./NavButton";
import "../styles/navbar.css";
import Logo from "../assets/Logo.webp";

const Navbar = () => {
  const location = useLocation();
  const [, force] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    const h = () => force();
    window.addEventListener("role:change", h);
    return () => window.removeEventListener("role:change", h);
  }, []);

  const isModerator = window.__IS_MODERATOR__ === true;
  const pathname = location.pathname.toLowerCase();
  const shouldShowLeaderboard = !/^\/(admin|manage|add)/.test(pathname);

  const baseDesktopItems = [
    { route: "/dashboard", icon: "dashboard", label: "Home" },
    { route: "/displayQuests", icon: "logo", label: "Quests" },
    { route: "/map", icon: "map", label: "Map" },
    { route: "/settings", icon: "profile", label: "Profile" },
  ];

  const baseMobileItems = [
    { route: "/dashboard", icon: "dashboard", label: "Home" },
    { route: "/displayQuests", icon: "logo", label: "Quests" },
    { route: "/settings", icon: "profile", label: "Profile" },
  ];

  const leaderboardDesktopItem = {
    route: "/displayLeaderboard",
    icon: "leaderboard",
    label: "Leaderboard",
  };

  const leaderboardMobileItem = {
    route: "/displayLeaderboard",
    icon: "leaderboard",
    label: "Board",
  };

  const allNavItems = [
    ...(isModerator
      ? [{ route: "/adminDashboard", icon: "admin", label: "Admin" }]
      : []),
    ...baseDesktopItems.slice(0, 3),
    ...(shouldShowLeaderboard ? [leaderboardDesktopItem] : []),
    ...baseDesktopItems.slice(3),
  ];

  const mobileNavItems = [
    ...(isModerator
      ? [{ route: "/adminDashboard", icon: "admin", label: "Admin" }]
      : []),
    ...baseMobileItems.slice(0, 2),
    ...(shouldShowLeaderboard ? [leaderboardMobileItem] : []),
    ...baseMobileItems.slice(2),
  ];

  const getActiveClass = (itemRoute) => {
    return location.pathname === itemRoute ||
      location.pathname.startsWith(itemRoute + "/")
      ? "active"
      : "";
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="navbar-drawer">
        <img src={Logo} alt="" className="logo-img" draggable="false" />
        <h2 className="title">Campus Quest</h2>
        {allNavItems.map((item) => (
          <NavButton
            key={item.route}
            route={item.route}
            iconName={item.icon}
            label={item.label}
            className={getActiveClass(item.route)}
          />
        ))}
      </nav>

      {/* Mobile Navbar - Map button removed */}
      <nav className="navbar-bottom">
        {mobileNavItems.map((item) => (
          <NavButton
            key={item.route}
            route={item.route}
            iconName={item.icon}
            label={item.label}
            className={getActiveClass(item.route)}
          />
        ))}
      </nav>
    </>
  );
};

export default Navbar;


