import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Login from "./pages/loginSignup";
import Profile from "./pages/editProfile";
import toast, { Toaster } from "react-hot-toast";
import PasswordResetRequest from "./pages/passwordResetRequest";
import PasswordReset from "./pages/passwordReset";
import Dashboard from "./pages/dashboard";
import Quests from "./pages/quests";
import QuestMap from "./pages/map";
import Leaderboard from "./pages/leaderboard";
import Admin from "./pages/adminDashboard";
import QuestDetail from "./pages/questDetail";
import ManageQuests from "./pages/manageQuests";
import ManageHunts from "./pages/manageHunts";
import Settings from "./pages/settings";

const App = () => {
  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: "#002d73",
            color: "#ffb819",
          },
          success: {
            style: {
              background: "green",
              color: "white",
            },
            iconTheme: {
              primary: "white",
              secondary: "green",
            },
          },
          error: {
            style: {
              background: "red",
              color: "white",
            },
            iconTheme: {
              primary: "white",
              secondary: "red",
            },
          },
          loading: {
            style: {
              background: "#002d73",
              color: "#ffb819",
            },
          },
        }}
      />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/reset" element={<PasswordReset />} />
        <Route path="/reset-request" element={<PasswordResetRequest />} />

        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/map" element={<QuestMap />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/adminDashboard" element={<Admin />} />
          <Route path="/quests/:questId" element={<QuestDetail />} />
          <Route path="/manageQuests" element={<ManageQuests />} />
          <Route path="/manageHunts" element={<ManageHunts />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
