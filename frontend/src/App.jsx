import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import IconButton from "./components/IconButton";
import Signup from "./pages/signup";
import Login from "./pages/login";
import SignIn from "./pages/signIn";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    </>
  );
};

export default App;
