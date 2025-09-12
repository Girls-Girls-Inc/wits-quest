const { createClient } = require("@supabase/supabase-js");

// Admin client (trusted writes, bypasses RLS)
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const HuntModel = {
  async createHunt(huntData) {
    const { data, error } = await admin.from("hunts").insert([huntData]).select();
    return { data, error };
  },

  async getHunts(filter = {}) {
    let query = admin.from("hunts").select("*");

    if (filter.id) query = query.eq("id", filter.id);
    if (filter.name) query = query.ilike("name", `%${filter.name}%`);

    const { data, error } = await query;
    return { data, error };
  },

  async updateHunt(huntId, huntData) {
    const { data, error } = await admin.from("hunts").update(huntData).eq("id", huntId).select();
    return { data, error };
  },

  async deleteHunt(huntId) {
    const { data, error } = await admin.from("hunts").delete().eq("id", huntId).select();
    return { data, error };
  },
};

module.exports = HuntModel;
