// backend/models/leaderboardModel.js
const { createClient } = require("@supabase/supabase-js");
const readClient = require("../supabase/supabaseClient");

// Admin client for RPC calls
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const LeaderboardModel = {
  /**
   * Get leaderboard by static ID (123=Weekly, 1234=Monthly, 12345=Yearly)
   * Uses the leaderboard_with_users view that has username joined
   */
  async getLeaderboard(id, userId) {
    const leaderboardId = id ? parseInt(id.trim()) : 123;

    let query = readClient
      .from("leaderboard_with_users")
      .select("id, userId, username, points")
      .eq("id", leaderboardId)
      .order("points", { ascending: false })
      .order("username", { ascending: true });

    if (userId) {
      query = query.eq("userId", userId.trim());
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Leaderboard query error:', error);
      throw error;
    }

    // Add rank to each entry
    return (data || []).map((entry, index) => ({
      rank: index + 1,
      id: entry.id,
      userId: entry.userId,
      username: entry.username || "Unknown",
      points: entry.points,
    }));
  },


  async addPointsAtomic({ userId, points }) {
    if (!userId) throw new Error("userId is required");
    const delta = Math.max(0, Number.isFinite(+points) ? Math.trunc(+points) : 0);

    if (delta === 0) {
      return { ok: true, awarded: 0, message: "No points to award" };
    }

    try {
      // Call the database function that updates all 3 leaderboards
      const { data, error } = await admin.rpc("lb_add_points", {
        in_user_id: userId,
        in_points: delta,
      });

      if (error) {
        console.error('Error calling lb_add_points RPC:', error);
        throw error;
      }

      return data || { ok: true, awarded: delta };
    } catch (err) {
      console.error('addPointsAtomic error:', err);
      throw err;
    }
  },
};

module.exports = LeaderboardModel;

