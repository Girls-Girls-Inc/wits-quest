import React, { useState } from "react";
import IconButton from "../components/IconButton";
import PasswordInputField from "../components/PasswordInputField";
import InputField from "../components/InputField";
import GoogleImage from "../assets/google-icon.png";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import toast from "react-hot-toast";

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
    <div style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <h2>Login</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
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

      <div style={{ margin: "1.5rem 0" }}>
        <button onClick={handleGoogleSignIn}>
          <img
            src={GoogleImage}
            alt="Google icon"
            style={{ width: "20px", height: "20px", marginRight: "8px" }}
          />
          Sign in with Google
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <IconButton route="/" icon="home" label="Home" />
        <IconButton route="/signup" icon="person_add" label="Signup" />
      </div>
    </div>
  );
};

export default Login;
