import React, { useState } from "react";
import IconButton from "../components/IconButton";
import InputField from "../components/InputField";
import PasswordInputField from "../components/PasswordInputField";
import GoogleImage from "../assets/google-icon.png"; // Replace with your actual path

const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setForm({ ...form, password: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Signup form submitted:", form);
  };

  const handleGoogleSignIn = () => {
    console.log("Google Sign-In clicked");
  };

  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <h2>Signup</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <InputField
          id="name"
          icon="person"
          placeholder="Full Name"
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

        <button type="submit">Create Account</button>
      </form>

      <div style={{ margin: "1.5rem 0" }}>
        <button
          onClick={handleGoogleSignIn}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1rem",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
            color: "black",
          }}
        >
          <img
            src={GoogleImage}
            alt="Google icon"
            style={{ width: "20px", height: "20px" }}
          />
          Sign up with Google
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <IconButton route="/" icon="home" label="Home" />
        <IconButton route="/login" icon="login" label="Login" />
      </div>
    </div>
  );
};

export default Signup;
