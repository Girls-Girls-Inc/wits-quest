import React, { useState } from "react";
import IconButton from "../components/IconButton";
import PasswordInputField from "../components/PasswordInputField";
import InputField from "../components/InputField";
import GoogleImage from "../assets/google-icon.png";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import toast from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";

const Login = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setForm({ ...form, password: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        toast.error(error.message || "Invalid email or password");
        return;
      }

      toast.success("Login successful!");
      navigate("/profile");
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Login error:", err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });

      if (error) {
        toast.error(error.message || "Google Sign-in failed");
        return;
      }

      toast.success("Signed in with Google!");
    } catch (err) {
      toast.error("An unexpected Google Sign-in error occurred.");
      console.error("Google Sign-in error:", err.message);
    }
  };

  return (
    <div className="container">
      <div className="form-box login">
        <form onSubmit={handleSubmit} className="login-form">
          <h1>Login</h1>
          <div className="input-box">
            {" "}
            <InputField
              id="email"
              icon="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-box">
            <PasswordInputField
              id="password"
              placeholder="Password"
              value={form.password}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className="forgot-pass">
            <a href="#">Forgot Password?</a>
          </div>
          <div className="btn">
            {" "}
            <IconButton type="submit" icon="login" label="login" />
          </div>

          <div className="google-signin-wrapper">
            <div className="line">
              {" "}
              <p>or</p>
            </div>

            <button className="google-signup-btn" onClick={handleGoogleSignIn}>
              <img src={GoogleImage} alt="Google icon" />
              Sign in with Google
            </button>
          </div>
        </form>

        {/* <IconButton route="/signup" icon="person_add" label="Signup" /> */}
      </div>
      <div className="form-box signup">
        <form onSubmit={handleSubmit}>
          <h2>Signup</h2>

          <div className="input-box">
            <InputField
              id="name"
              icon="person"
              placeholder="Username"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="input-box">
            <InputField
              id="email"
              icon="email"
              placeholder="Email Address"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="input-box">
            <PasswordInputField
              id="password"
              placeholder="Password"
              value={form.password}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className="btn">
            {" "}
            <IconButton type="submit" icon="signup" label="SIGN UP" />
          </div>

          <div className="google-signin-wrapper">
            <div className="line">
              {" "}
              <p>or</p>
            </div>

            <button className="google-signup-btn" onClick={handleGoogleSignIn}>
              <img src={GoogleImage} alt="Google icon" />
              Sign Up with Google
            </button>
          </div>
        </form>

        {/* <IconButton route="/signup" icon="person_add" label="Signup" /> */}
      </div>
    </div>
  );
};

export default Login;
