import React from "react";
import { Routes, Route } from "react-router-dom";
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
import RequireSession from "./components/RequireSession";

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
        <Route path="/login" element={<Login />} />
        <Route path="/reset" element={<PasswordReset />} />
        <Route path="/resetRequest" element={<PasswordResetRequest />} />

        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <RequireSession>
                <Dashboard />
              </RequireSession>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireSession>
                <Profile />
              </RequireSession>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireSession>
                <Settings />
              </RequireSession>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireSession>
                <Dashboard />
              </RequireSession>
            }
          />
          <Route path="/displayQuests" element={<Quests />} />
          <Route path="/map" element={<QuestMap />} />
          <Route path="/displayLeaderboard" element={<Leaderboard />} />
          <Route
            path="/adminDashboard"
            element={
              <RequireSession>
                <Admin />
              </RequireSession>
            }
          />
          <Route
            path="/displayQuests/:questId"
            element={
              <RequireSession>
                <QuestDetail />
              </RequireSession>
            }
          />
          <Route
            path="/manageQuests"
            element={
              <RequireSession>
                <ManageQuests />
              </RequireSession>
            }
          />
          <Route
            path="/manageHunts"
            element={
              <RequireSession>
                <ManageHunts />
              </RequireSession>
            }
          />
        </Route>
      </Routes>
    </>
  );
};

export default App;

