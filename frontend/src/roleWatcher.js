// src/roleWatcher.js
import supabase from "./supabase/supabaseClient";

const API_BASE = (import.meta.env.VITE_WEB_URL || "").replace(/\/$/, "");

async function fetchIsModeratorById(userId, token) {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;

    const me = await res.json();
    // log the raw field so you can see what backend returns
    // (remove if you don't want logs)
    console.log("is_moderator (raw):", me?.is_moderator ?? me?.isModerator, "user:", userId);
    return !!(me?.is_moderator ?? me?.isModerator);
}

function setRole(flag, meta = {}) {
    window.__IS_MODERATOR__ = !!flag;
    window.dispatchEvent(
        new CustomEvent("role:change", { detail: { isModerator: !!flag, ...meta } })
    );
}

/**
 * Initializes the role flag and keeps it updated when the user signs in/out
 * or when the token refreshes. Runs once before React mounts.
 */
export async function initRoleWatcher({ verbose = false } = {}) {
    // default before login
    setRole(false, { reason: "init" });

    // If a session already exists (returning user), set immediately
    const { data } = await supabase.auth.getSession();
    const initialToken = data?.session?.access_token;
    const initialUserId = data?.session?.user?.id;

    if (verbose) {
        console.log("[roleWatcher] boot", {
            hasToken: !!initialToken,
            userId: initialUserId,
            API_BASE,
        });
    }

    if (initialToken && initialUserId) {
        try {
            const flag = await fetchIsModeratorById(initialUserId, initialToken);
            setRole(flag, { reason: "initial", userId: initialUserId });
        } catch {
            setRole(false, { reason: "initial-error" });
        }
    }

    // Watch future auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (verbose) console.log("[roleWatcher] auth event:", event);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            const token = session?.access_token;
            const userId = session?.user?.id;
            const flag = token && userId ? await fetchIsModeratorById(userId, token).catch(() => false) : false;
            setRole(flag, { reason: event.toLowerCase(), userId });
        } else if (event === "SIGNED_OUT") {
            setRole(false, { reason: "signed_out" });
        }
    });
}
