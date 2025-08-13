import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [userName, setName] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        return;
      }
      if (user && user.user_metadata?.displayName) {
        setName(user.user_metadata.displayName);
      } else {
        setName("Guest");
      }
    };

    fetchUser();
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.aud !== "authenticated") {
        // Not authenticated, redirect
        navigate("/login");
        return;
      }
      setLoading(false); // allow page to render
    };
    checkAuth();
  }, [navigate]);

  return <h1>Hello {userName}</h1>;
};

export default Profile;
