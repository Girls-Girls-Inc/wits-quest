import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import RequireSession from "./components/RequireSession";

const Layout = lazy(() => import("./pages/Layout"));
const Login = lazy(() => import("./pages/loginSignup"));
const Profile = lazy(() => import("./pages/editProfile"));
const PasswordResetRequest = lazy(() => import("./pages/passwordResetRequest"));
const PasswordReset = lazy(() => import("./pages/passwordReset"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Quests = lazy(() => import("./pages/quests"));
const QuestMap = lazy(() => import("./pages/map"));
const Leaderboard = lazy(() => import("./pages/leaderboard"));
const Admin = lazy(() => import("./pages/adminDashboard"));
const QuestDetail = lazy(() => import("./pages/questDetail"));
const ManageQuests = lazy(() => import("./pages/manageQuests"));
const ManageHunts = lazy(() => import("./pages/manageHunts"));
const ManageQuizzes = lazy(() => import("./pages/manageQuizzes"));
const AddQuiz = lazy(() => import("./pages/addQuiz"));
const Settings = lazy(() => import("./pages/settings"));

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

      <Suspense fallback={<div className="page-loader">Loading...</div>}>
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
              path="/addQuiz"
              element={
                <RequireSession>
                  <AddQuiz />
                </RequireSession>
              }
            />
            <Route
              path="/manageQuizzes"
              element={
                <RequireSession>
                  <ManageQuizzes />
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
      </Suspense>
    </>
  );
};

export default App;

