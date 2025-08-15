import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Login from "./pages/login-signup";
import Profile from "./pages/profile";
import toast, { Toaster } from "react-hot-toast";
import PasswordResetRequest from "./pages/passwordResetRequest";
import PasswordReset from "./pages/passwordReset";

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reset-request" element={<PasswordResetRequest />} />
        <Route path="/reset" element={<PasswordReset />} />
      </Routes>
    </>
  );
};

export default App;
