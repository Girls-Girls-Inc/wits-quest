import React, { useState, useEffect } from "react";
import IconButton from "../components/IconButton";
import InputField from "../components/InputField";
import PasswordInputField from "../components/PasswordInputField";
import GoogleImage from "../assets/google-icon.png";
import supabase from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import "../styles/login-signup.css";

const Signup = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [passwordRules, setPasswordRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  const validatePassword = (password) => {
    setPasswordRules({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
    });
  };

  useEffect(() => {
    validatePassword(form.password);
  }, [form.password]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setForm({ ...form, password: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { displayName: form.name },
          redirectTo: import.meta.env.VITE_WEB_URL + "/profile",
        },
      });

      // @Lily, Kayisha can't figure this out!!!
      // if (error) {
      //   if (
      //     error.message.toLowerCase().includes("already registered") ||
      //     error.message.toLowerCase().includes("user already registered") ||
      //     error.message.toLowerCase().includes("duplicate")
      //   ) {
      //     toast.error(
      //       "This email is already registered. Please login or reset your password."
      //     );
      //   } else {
      //     toast.error(error.message);
      //   }
      //   return;
      // }

      //  no error, success toas
      toast.success("Check your email to complete sign-up.");
      navigate("/login");
    } catch (error) {
      toast.error("Signup failed. Please try again.");
      console.error("Signup error:", error.message);
    }
  };

  const handleGoogleSignIn = () => {
    console.log("Google Sign-In clicked");
  };

  return (
    <div className="signup-container">
      <Toaster />
      <h2>Signup</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <InputField
          id="name"
          icon="person"
          placeholder="Username"
          name="name"
          value={form.name}
          onChange={handleChange}
        />

        <InputField
          id="email"
          icon="email"
          placeholder="Email Address"
          name="email"
          value={form.email}
          onChange={handleChange}
        />

        <PasswordInputField
          id="password"
          placeholder="Password"
          value={form.password}
          onChange={handlePasswordChange}
          required
        />

        <div className="password-validation-box" aria-live="polite">
          <p
            className={
              passwordRules.length ? "password-valid" : "password-invalid"
            }
          >
            {passwordRules.length ? "✔" : "✖"} Minimum 8 characters
          </p>
          <p
            className={
              passwordRules.uppercase ? "password-valid" : "password-invalid"
            }
          >
            {passwordRules.uppercase ? "✔" : "✖"} At least 1 uppercase letter
          </p>
          <p
            className={
              passwordRules.lowercase ? "password-valid" : "password-invalid"
            }
          >
            {passwordRules.lowercase ? "✔" : "✖"} At least 1 lowercase letter
          </p>
          <p
            className={
              passwordRules.number ? "password-valid" : "password-invalid"
            }
          >
            {passwordRules.number ? "✔" : "✖"} At least 1 number
          </p>
          <p
            className={
              passwordRules.specialChar ? "password-valid" : "password-invalid"
            }
          >
            {passwordRules.specialChar ? "✔" : "✖"} At least 1 special character
          </p>
        </div>

        <button type="submit" disabled={!isPasswordValid}>
          Create Account
        </button>
      </form>

      <div>
        <button onClick={handleGoogleSignIn} className="google-signup-btn">
          <img
            src={GoogleImage}
            alt="Google icon"
            style={{ width: "20px", height: "20px" }}
          />
          Sign up with Google
        </button>
      </div>

      <div>
        <IconButton route="/" icon="home" label="Home" />
        <IconButton route="/login" icon="login" label="Login" />
      </div>
    </div>
  );
};

export default Signup;
