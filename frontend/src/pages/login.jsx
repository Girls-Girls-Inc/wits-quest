import React, { useState, useEffect } from "react";
import { useRef } from "react";
import IconButton from "../components/IconButton";
import PasswordInputField from "../components/PasswordInputField";
import InputField from "../components/InputField";
import GoogleImage from "../assets/google-icon.png";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import Logo from "../assets/Logo.png";
import SignupImage from "../assets/signupImage.svg";

const Login = () => {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [signupForm, setSignupForm] = useState({
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
    validatePassword(signupForm.password);
  }, [signupForm.password]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const toastId = useRef(null);

  useEffect(() => {
    const rules = [
      passwordRules.length
        ? "✔ Minimum 8 characters"
        : "✖ Minimum 8 characters",
      passwordRules.uppercase
        ? "✔ At least 1 uppercase letter"
        : "✖ At least 1 uppercase letter",
      passwordRules.lowercase
        ? "✔ At least 1 lowercase letter"
        : "✖ At least 1 lowercase letter",
      passwordRules.number ? "✔ At least 1 number" : "✖ At least 1 number",
      passwordRules.specialChar
        ? "✔ At least 1 special character"
        : "✖ At least 1 special character",
    ];

    const message = rules.join("\n");

    if (signupForm.password.length > 0 && !isPasswordValid) {
      if (!toastId.current) {
        toastId.current = toast.loading(message, { duration: Infinity });
      } else {
        toast.loading(message, { id: toastId.current, duration: Infinity });
      }
    } else if (isPasswordValid && toastId.current) {
      toast.success("Password meets all requirements!", {
        id: toastId.current,
        duration: 3000,
      });
      toastId.current = null;
    } else if (signupForm.password.length === 0 && toastId.current) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }
  }, [passwordRules, signupForm.password, isPasswordValid]);
  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleSignupChange = (e) => {
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
  };

  const handleLoginPasswordChange = (e) => {
    setLoginForm({ ...loginForm, password: e.target.value });
  };

  const handleSignupPasswordChange = (e) => {
    setSignupForm({ ...signupForm, password: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
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

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          data: { displayName: signupForm.name },
          redirectTo: import.meta.env.VITE_WEB_URL + "/profile",
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("duplicate")
        ) {
          toast.error(
            "This email is already registered. Please login or reset your password."
          );
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Check your email to complete sign-up.");
      setIsActive(false);
    } catch (err) {
      toast.error("Signup failed. Please try again.");
      console.error("Signup error:", err.message);
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
    <div className={`container${isActive ? " active" : ""}`}>
      <Toaster />
      {/* LOGIN FORM */}
      <div className="form-box login">
        <form onSubmit={handleLoginSubmit} className="login-form">
          <h1>LOGIN</h1>
          <div className="input-box">
            <InputField
              id="login-email"
              icon="email"
              name="email"
              placeholder="Email Address"
              value={loginForm.email}
              onChange={handleLoginChange}
              required
            />
          </div>
          <div className="input-box">
            <PasswordInputField
              id="login-password"
              placeholder="Password"
              value={loginForm.password}
              onChange={handleLoginPasswordChange}
              required
            />
          </div>

          <div className="forgot-pass">
            <a href="#">Forgot Password?</a>
          </div>
          <div className="btn">
            <IconButton type="submit" icon="login" label="LOGIN" />
          </div>

          <div className="google-signin-wrapper">
            <div className="line">
              <p>or</p>
            </div>
            <button className="google-signup-btn" onClick={handleGoogleSignIn}>
              <img src={GoogleImage} alt="Google icon" />
              Sign in with Google
            </button>
          </div>
        </form>
      </div>

      {/* SIGNUP FORM */}
      <div className="form-box signup">
        <form onSubmit={handleSignupSubmit} className="signup-form">
          <h1>SIGNUP</h1>

          <div className="input-box">
            <InputField
              id="name"
              icon="person"
              placeholder="Username"
              name="name"
              value={signupForm.name}
              onChange={handleSignupChange}
            />
          </div>

          <div className="input-box">
            <InputField
              id="signup-email"
              icon="email"
              placeholder="Email Address"
              name="email"
              value={signupForm.email}
              onChange={handleSignupChange}
            />
          </div>

          <div className="input-box">
            <PasswordInputField
              id="signup-password"
              placeholder="Password"
              value={signupForm.password}
              onChange={handleSignupPasswordChange}
              required
            />
          </div>

          {/* <div className="password-validation-box" aria-live="polite">
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
                passwordRules.specialChar
                  ? "password-valid"
                  : "password-invalid"
              }
            >
              {passwordRules.specialChar ? "✔" : "✖"} At least 1 special
              character
            </p>
          </div> */}

          <div className="btn">
            <IconButton type="submit" icon="app_registration" label="SIGN UP" />
          </div>

          <div className="google-signin-wrapper">
            <div className="line">
              <p>or</p>
            </div>
            <button className="google-signup-btn" onClick={handleGoogleSignIn}>
              <img src={GoogleImage} alt="Google icon" />
              Sign Up with Google
            </button>
          </div>
        </form>
      </div>
      <div className="toggle">
        <div className="toggle-panel toggle-left">
          <img src={Logo} alt="Compass shaped Logo" />
          <h1>Welcome back!</h1>
          <p>Not yet a Witizen ?</p>
          <div className="btn signup-btn" onClick={() => setIsActive(true)}>
            <IconButton type="submit" icon="person" label="SIGN UP" />
          </div>
        </div>

        <div className="toggle-panel toggle-right">
          <img src={SignupImage} alt="Quest image" />
          <h1>Conquer Quests using your Wits wits!</h1>
          <p>Already a Witizen?</p>
          <div className="btn login-btn" onClick={() => setIsActive(false)}>
            <IconButton type="submit" icon="person" label="LOGIN" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
