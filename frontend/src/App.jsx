import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import IconButton from "./components/IconButton";
import Signup from "./pages/signup";
import Login from "./pages/login";
import SignIn from "./pages/signIn";
import Profile from "./pages/profile"

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
};

export default App;
