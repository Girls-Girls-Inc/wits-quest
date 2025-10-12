const { createClient } = require("@supabase/supabase-js");

// Admin client with service role key
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Helper to pick admin or passed-in supabase client
const pick = (sb) => sb || admin;

const HuntModel = {
  // ------------------ HUNTS ------------------
  async createHunt(huntData) {
    // Ensure pointsAchievable is numeric
    if (
      huntData.pointsAchievable === undefined ||
      huntData.pointsAchievable === null ||
      huntData.pointsAchievable === ""
    ) {
      huntData.pointsAchievable = 0;
    } else {
      huntData.pointsAchievable = Number(huntData.pointsAchievable);
      if (isNaN(huntData.pointsAchievable)) huntData.pointsAchievable = 0;
    }

    const { data, error } = await admin
      .from("hunts")
      .insert([huntData])
      .select();
    return { data, error };
  },

  async getHunts(filter = {}) {
    let query = admin.from("hunts").select("*");
    if (filter.id) query = query.eq("id", filter.id);
    if (filter.name) query = query.ilike("name", `%${filter.name}%`);

    const { data, error } = await query;
    return { data, error };
  },

  async getHuntById(huntId, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("hunts")
      .select("*")
      .eq("id", huntId)
      .single();
    return { data, error };
  },

  async updateHunt(huntId, huntData) {
    // Handle pointsAchievable updates safely
    if (
      huntData.pointsAchievable !== undefined &&
      huntData.pointsAchievable !== null &&
      huntData.pointsAchievable !== ""
    ) {
      huntData.pointsAchievable = Number(huntData.pointsAchievable);
      if (isNaN(huntData.pointsAchievable)) huntData.pointsAchievable = 0;
    }

    const { data, error } = await admin
      .from("hunts")
      .update(huntData)
      .eq("id", huntId)
      .select();
    return { data, error };
  },

  async deleteHunt(huntId) {
    const { data, error } = await admin
      .from("hunts")
      .delete()
      .eq("id", huntId)
      .select();
    return { data, error };
  },

  // ------------------ USER HUNTS ------------------
  async addForUser(payload, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("userHunts")
      .insert([payload])
      .select();
    return { data, error };
  },

  async getUserHuntById(userHuntId, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("userHunts")
      .select("*")
      .eq("id", userHuntId)
      .single();
    return { data, error };
  },

  async setCompleteById(userHuntId, sb) {
    const supabase = pick(sb);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("userHunts")
      .update({ isComplete: true, isActive: false, completedAt: now })
      .eq("id", userHuntId)
      .select();
    return { data, error };
  },
};

module.exports = HuntModel;
