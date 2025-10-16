import React, { useEffect, useState } from "react";
import IconButton from "../components/IconButton";
import InputField from "../components/InputField";
import PasswordInputField from "../components/PasswordInputField";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../styles/profile.css";

const Profile = () => {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatarUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [joinedDate, setJoinedDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          toast.error("Error fetching user");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Fetch profile image from userData table
        const { data: profileData, error: profileError } = await supabase
          .from("userData")
          .select("profileUrl")
          .eq("userId", user.id)
          .single();

        if (profileError) {
          console.warn("No profile image found yet:", profileError);
        }

        // Determine which avatar to use
        let avatar = profileData?.profileUrl; // user-uploaded avatar first
        if (!avatar) {
          avatar =
            user.user_metadata?.avatar_url ||
            `https://ui-avatars.com/api/?name=${user.user_metadata?.displayName || "User"}`;
        }

        setForm({
          displayName:
            user.user_metadata?.displayName ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          email: user.email || "",
          password: "",
          confirmPassword: "",
          avatarUrl: avatar,
        });

        setJoinedDate(new Date(user.created_at).toLocaleDateString());
      } catch (err) {
        console.error("Unexpected error fetching user:", err);
        toast.error("Failed to fetch user");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarUpload = async (e) => {
    if (!userId) return;
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    try {
      const { error: uploadError } = await supabase.storage
        .from("profile")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("profile").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      // Update form state
      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }));

      // Save uploaded image URL to userData immediately
      const { error: upsertError } = await supabase
        .from("userData")
        .upsert({ userId, profileUrl: publicUrl }, { onConflict: "userId" });
      if (upsertError) throw upsertError;

      toast.success("Profile image updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!userId) return;

    if (form.password && form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
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

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabase.auth.updateUser(updatePayload);
        if (updateError) throw updateError;
      }

      toast.success("Profile updated successfully!");
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="profile-container">
      <Toaster />

      <div className="profile-top">
        <IconButton
          icon={isEditing ? "close" : "edit"}
          onClick={() => setIsEditing(!isEditing)}
          className="edit-button"
          label={isEditing ? "Close" : "Edit"}
        />
      </div>

      {!isEditing && (
        <div className="profile-info">
          <div className="profile-avatar-wrapper">
            <img src={form.avatarUrl} alt="avatar" className="profile-avatar" />
          </div>
          <div className="profile-details">
            <h2>{form.displayName || "User"}</h2>
            <p>{form.email}</p>
            <p className="text-sm">Joined: {joinedDate}</p>
          </div>
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSave} className="profile-form">
          <div className="avatar-upload">
            <label htmlFor="avatarUpload" className="avatar-label">
              <div className="profile-avatar-wrapper">
                <img
                  src={form.avatarUrl}
                  alt="avatar"
                  style={{ height: "150px", width: "150px", objectFit: "cover", borderRadius: "50%" }}
                />
                {uploading && <div className="uploading-overlay">Uploading...</div>}
              </div>
              <span className="avatar-upload-text">Change Profile Image</span>
              <input
                type="file"
                id="avatarUpload"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>

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
