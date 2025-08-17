import React from "react";
import { Routes, Route } from "react-router-dom";

import Login from "./pages/login-signup";
import Profile from "./pages/profile";
import toast, { Toaster } from "react-hot-toast";
import PasswordResetRequest from "./pages/passwordResetRequest";
import PasswordReset from "./pages/passwordReset";
import Dashboard from "./pages/dashboard";
import Quests from "./pages/quests";

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reset-request" element={<PasswordResetRequest />} />
        <Route path="/reset" element={<PasswordReset />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quests" element={<Quests />} />
      </Routes>
    </>
  );
};

export default App;
