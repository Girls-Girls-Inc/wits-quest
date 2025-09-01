import React, { useEffect, useState } from "react";
import IconButton from "../components/IconButton";
import InputField from "../components/InputField";
import PasswordInputField from "../components/PasswordInputField";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../index.css";

const Profile = () => {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [joinedDate, setJoinedDate] = useState("");

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
        setJoinedDate(new Date(user.created_at).toLocaleDateString());
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

    const updatePayload = {};
    if (form.email && form.email !== user.email) updatePayload.email = form.email;
    if (form.displayName !== (user.user_metadata?.displayName || "")) {
      updatePayload.data = { displayName: form.displayName };
    }
    if (form.password) updatePayload.password = form.password;

    if (Object.keys(updatePayload).length === 0) {
      toast("No changes to update");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.updateUser(updatePayload);
    setLoading(false);

    if (error) {
      toast.error("Failed to update profile: " + error.message);
      return;
    }

    if (updatePayload.email) {
      const newEmail = data.user?.new_email;
      if (newEmail) {
        toast.success(
          `Check ${newEmail} for a confirmation link to complete the change.`
        );
        setForm((prev) => ({ ...prev, email: newEmail }));
      }
    } else {
      toast.success("Profile updated successfully!");
    }

    if (form.password) {
      toast.success("Password changed successfully!");
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
    }

    setIsEditing(false);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="profile-container">
      <Toaster />

      {/* Top Section */}
      <div className="profile-top">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="edit-button"
        >
          <span className="material-icons">
            {isEditing ? "close" : "edit"}
          </span>
        </button>
      </div>

      {/* Profile Info */}
      {!isEditing && (
      <div className="profile-info">
        <div className=""></div>
        <div className="profile-details">
          <h2>{form.displayName || "User"}</h2>
          <p>{form.email}</p>
          <p className="text-sm">Joined: {joinedDate}</p>
        </div>
      </div>
      )}

      {/* Editable Form */}
      {isEditing && (
        <form onSubmit={handleSave} className="p-6 pt-0 space-y-4 border-t border-gray-200">
          <h1 className="text-2xl font-bold"></h1>

          <InputField
            id="displayName"
            icon="person"
            name="displayName"
            placeholder="Display Name"
            value={form.displayName}
            onChange={handleChange}
            required
          />

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
            placeholder="New Password"
            value={form.password}
            name="password"
            onChange={handleChange}
            required={false}
          />

          <PasswordInputField
            id="confirmPassword"
            placeholder="Confirm New Password"
            value={form.confirmPassword}
            name="confirmPassword"
            onChange={handleChange}
            required={false}
          />

          <IconButton type="submit" icon="save" label="SAVE CHANGES" />
        </form>
      )}
    </div>
  );
};

export default Profile;
