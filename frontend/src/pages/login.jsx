import React, { useState } from "react";
import IconButton from "../components/IconButton";
import PasswordInputField from "../components/PasswordInputField";
import InputField from "../components/InputField";
import GoogleImage from "../assets/google-icon.png";

const Login = () => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login form submitted:", form);
  };

  const handleGoogleSignIn = () => {
    console.log("Google Sign-In clicked");
    // TODO: Integrate Google login logic here
  };

  return (
    <div style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <h2>Login</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <InputField
          id="name"
          icon="email"
          placeholder="Email Adress"
          value={form.name}
        />

        <PasswordInputField
          id="password"
          placeholder="Password"
          value={form.password}
          onChange={handlePasswordChange}
          required
        />

        <IconButton onClick={handleSubmit} icon="login" label="Login" />
      </form>

      <div style={{ margin: "1.5rem 0" }}>
        {/* Google Login Button */}
        <button onClick={handleGoogleSignIn}>
          <img
            src={GoogleImage}
            alt="Google icon"
            style={{ width: "20px", height: "20px" }}
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
