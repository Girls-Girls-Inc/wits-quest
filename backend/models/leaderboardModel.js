const supabase = require("../supabase/supabaseClient");

const LeaderboardModel = {
  async getLeaderboard(periodType, start, end, userId, id) {
    let query = supabase
      .from("leaderboard_with_users") // ✅ use the view
      .select("*")
      .order("rank", { ascending: true });

    if (periodType) query = query.ilike("periodType", periodType);
    if (id) query = query.eq("id", id.trim());
    if (userId) query = query.eq("userId", userId.trim());
    if (start) query = query.gte("periodStart", new Date(start).toISOString());
    if (end) query = query.lte("periodEnd", new Date(end).toISOString());

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },
};

module.exports = LeaderboardModel;
