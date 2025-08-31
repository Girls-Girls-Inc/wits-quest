import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Login from "./pages/loginSignup";
import Profile from "./pages/profile";
import toast, { Toaster } from "react-hot-toast";
import PasswordResetRequest from "./pages/passwordResetRequest";
import PasswordReset from "./pages/passwordReset";
import Dashboard from "./pages/dashboard";
import Quests from "./pages/quests";
import QuestMap from "./pages/map";
import Leaderboard from "./pages/leaderboard";
import Admin from "./pages/adminDashboard";
import QuestDetail from "./pages/questDetail";

const App = () => {
  return (
    <>
      <Toaster />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/reset" element={<PasswordReset />} />
        <Route path="/reset-request" element={<PasswordResetRequest />} />
        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/map" element={<QuestMap />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/adminDashboard" element={<Admin />} />
          <Route path="/quests/:questId" element={<QuestDetail />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
