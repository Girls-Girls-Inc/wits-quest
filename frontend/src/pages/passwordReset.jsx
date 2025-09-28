import React, { useState, useEffect, useRef } from "react";
import PasswordInputField from "../components/PasswordInputField";
import IconButton from "../components/IconButton";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const PasswordReset = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordRules, setPasswordRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });
  const [loading, setLoading] = useState(true); // page auth check
  const toastId = useRef(null);

  // Validate password
  const validatePassword = (pw) => {
    setPasswordRules({
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      specialChar: /[^A-Za-z0-9]/.test(pw),
    });
  };

  useEffect(() => {
    validatePassword(password);
  }, [password]);

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // Toast for password validation
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

    if (password.length > 0 && !isPasswordValid) {
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
    } else if (password.length === 0 && toastId.current) {
      toast.dismiss(toastId.current);
      toastId.current = null;
    }
  }, [passwordRules, password, isPasswordValid]);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.aud !== "authenticated") {
        // Not authenticated, redirect
        navigate("/");
        return;
      }
      setLoading(false); // allow page to render
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password has been reset successfully!");
      navigate("/profile");
    } catch (err) {
      toast.error("Failed to reset password. Please try again.");
      console.error("Password reset error:", err.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="container-pass">
      <div className="pass-forget">
        <form onSubmit={handleSubmit} className="reset-password-form">
          <h1>Set New Password</h1>

          <div className="input-box">
            <PasswordInputField
              id="new-password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="btn">
            <IconButton
              type="submit"
              icon="lock_reset"
              label="Reset Password"
              disabled={!isPasswordValid}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;
