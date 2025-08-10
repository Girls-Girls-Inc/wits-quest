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
import SignupImage from "../assets/signupImage.svg";
import Logo from "../assets/Logo.png";

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
    <div className="loginPage flex">
      <div className="container">
        <div className="image-container">
          <img src={SignupImage} alt="" draggable="false" />
          <div className="text-container">
            {" "}
            <h2 className="title">Wits Quest</h2>
            <p>Conquer the Edge with your Wits wits</p>
          </div>

          <div className="footer-container">
            <span className="text">Not a Witizen? </span>
            <IconButton route="/signup" icon="person_add" label="Signup" />
          </div>
        </div>

        <div className="form-container">
          <div className="header-container">
            <img src={Logo} alt="Wits quest Logo" draggable="false" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <InputField
            id="email"
            icon="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
          />
          <PasswordInputField
            id="password"
            placeholder="Password"
            value={form.password}
            onChange={handlePasswordChange}
            required
          />
          <IconButton type="submit" icon="login" label="Login" />
        </form>
        <div className="google-signin-wrapper">
          <button className="google-signup-btn" onClick={handleGoogleSignIn}>
            <img src={GoogleImage} alt="Google icon" />
            Sign in with Google
          </button>
        </div>
        <div className="bottom-navigation">
          <IconButton route="/" icon="home" label="Home" />
        </div>
      </div>
    </div>
  );
};

export default Login;
