import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";

const Profile = () => {
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

  return <h1>Hello {userName}</h1>;
};

export default Profile;
