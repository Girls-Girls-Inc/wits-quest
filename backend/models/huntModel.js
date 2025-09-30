const { createClient } = require("@supabase/supabase-js");

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const pick = (sb) => sb || admin;

const HuntModel = {
  async createHunt(huntData) {
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

  async updateHunt(huntId, huntData) {
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

  // --- userHunts ---
  async addForUser(payload, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("userHunts")
      .insert([payload])
      .select();
    return { data, error };
  },
};

module.exports = HuntModel;
