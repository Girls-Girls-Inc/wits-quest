// src/hooks/useModerator.js
import { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";

const API_BASE = import.meta.env.VITE_WEB_URL;

/**
 * Returns { loading, isModerator, user }
 * - loading: true while checking auth + role
 * - isModerator: boolean (false if no user or not a moderator)
 * - user: Supabase user object or null
 */
export default function useModerator() {
    const [loading, setLoading] = useState(true);
    const [isModerator, setIsModerator] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                const { data, error } = await supabase.auth.getUser();
                if (error) throw error;

                const supaUser = data?.user ?? null;
                if (!supaUser) {
                    if (!cancelled) {
                        setUser(null);
                        setIsModerator(false);
                        setLoading(false);
                    }
                    return;
                }

                if (!cancelled) setUser(supaUser);

                // Prefer a dedicated “me” endpoint if your backend has one.
                // Fallback: GET /users/:id
                const res = await fetch(`${API_BASE}/users/${supaUser.id}`, {
                    credentials: "include",
                });

                if (!res.ok) {
                    // If 404/401, treat as non-moderator
                    if (!cancelled) {
                        setIsModerator(false);
                        setLoading(false);
                    }
                    return;
                }

                const me = await res.json();
                // Expected shape: { userId, email, isModerator, ... }
                if (!cancelled) {
                    setIsModerator(!!me?.isModerator);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setUser(null);
                    setIsModerator(false);
                    setLoading(false);
                }
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, []);

    return { loading, isModerator, user };
}
