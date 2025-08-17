import React from "react";
import IconButton from "./IconButton";
import "../styles/navbar.css";

const Navbar = () => {
  const navItems = [
    { route: "/dashboard", icon: "home", label: "Home" },
    { route: "/profile", icon: "person", label: "Profile" },
    { route: "/quests", icon: "flag", label: "Quests" },
    { route: "/profile", icon: "settings", label: "Profile" },
  ];

  return (
    <>
      {/* Desktop Right Drawer */}
      <nav className="navbar-drawer">
        {navItems.map((item) => (
          <IconButton
            key={item.route}
            route={item.route}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="navbar-bottom">
        {navItems.map((item) => (
          <IconButton
            key={item.route}
            route={item.route}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </nav>
    </>
  );
};

export default Navbar;
