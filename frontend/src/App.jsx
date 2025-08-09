import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import IconButton from "./components/IconButton";
import Signup from "./pages/signup";
import Login from "./pages/login";
import Profile from "./pages/profile";
import toast, { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
};

export default App;
