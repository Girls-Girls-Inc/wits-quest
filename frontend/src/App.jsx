import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import IconButton from "./components/IconButton";
import Signup from "./pages/signup";
import Login from "./pages/login";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
};

export default App;
