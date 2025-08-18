import React, { useEffect, useState } from "react";
import IconButton from "../components/IconButton";
import InputField from "../components/InputField";
import PasswordInputField from "../components/PasswordInputField";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import SignupImage from "../assets/signup.png";

const Profile = () => {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        toast.error("Error fetching user");
        setLoading(false);
        return;
      }

      if (user) {
        setForm({
          displayName:
            user.user_metadata?.displayName ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          email: user.email || "",
          password: "",
          confirmPassword: "",
        });
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) {
      toast.error("Error fetching user data");
      setLoading(false);
      return;
    }

    // Build the update payload
    const updatePayload = {};
    if (form.email && form.email !== user.email) {
      updatePayload.email = form.email;
    }
    if (form.displayName !== (user.user_metadata?.displayName || "")) {
      updatePayload.data = { displayName: form.displayName };
    }
    if (form.password) {
      updatePayload.password = form.password;
    }

    if (Object.keys(updatePayload).length === 0) {
      toast("No changes to update");
      setLoading(false);
      return;
    }

    // Send update
    const { data, error } = await supabase.auth.updateUser(updatePayload);
    setLoading(false);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
      return;
    }

    // If email was updated, show pending email
    if (updatePayload.email) {
      const newEmail = data.user?.new_email;
      if (newEmail) {
        toast.success(
          `Check ${newEmail} for a confirmation link to complete the change.`
        );
        // Update the form to show pending email
        setForm((prev) => ({ ...prev, email: newEmail }));
      }
    } else {
      toast.success("Profile updated successfully!");
    }

    if (form.password) {
      toast.success("Password changed successfully!");
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="">
      <div className="container active">
        <Toaster />

        {/* PROFILE FORM */}
        <div className="form-box login">
          <form onSubmit={handleSave} className="login-form">
            <h1>MY PROFILE</h1>

            <div className="input-box">
              <InputField
                id="displayName"
                icon="person"
                name="displayName"
                placeholder="Display Name"
                value={form.displayName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-box">
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
                placeholder="New Password"
                value={form.password}
                name="password"
                onChange={handleChange}
                required={false}
              />
            </div>

            <div className="input-box">
              <PasswordInputField
                id="confirmPassword"
                placeholder="Confirm New Password"
                value={form.confirmPassword}
                name="confirmPassword"
                onChange={handleChange}
                required={false}
              />
            </div>

            <div className="btn">
              <IconButton type="submit" icon="save" label="SAVE CHANGES" />
            </div>
          </form>
        </div>

        {/* SIDE PANEL */}
        <div className="toggle">
          <div className="toggle-panel toggle-right">
            <img src={SignupImage} alt="Quest image" />
            <h1>Keep Your Info Updated!</h1>
            <p>Edit your profile details anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
