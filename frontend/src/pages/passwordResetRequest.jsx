import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import Logo from "../assets/Logo.webp";
import env from "../lib/env";

const PasswordResetRequest = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: (env.VITE_WEB_URL || "") + "/reset",
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email for password reset instructions.");
        navigate("/"); // back to login
      }
    } catch (err) {
      toast.error("Failed to send reset email. Please try again.");
      console.error("Reset password error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-pass">
      <div className="pass-forget">
        <form onSubmit={handleSubmit} className="reset-request-form">
          <h1>Reset Password</h1>
          <img src={Logo} className="" alt="" />
          <div className="input-box">
            <InputField
              id="reset-email"
              icon="email"
              placeholder="Email Address"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="btn">
            <IconButton
              type="submit"
              icon="send"
              label={loading ? "Sending..." : "Send Reset Link"}
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetRequest;

