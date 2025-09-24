// backend/models/questModel.js
const { createClient } = require("@supabase/supabase-js");

// Admin client (trusted writes, bypasses RLS). Use sparingly.
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);


const pick = (sb) => sb || admin;

const QuestModel = {
  async createQuest(questData, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("quests")
      .insert([questData])
      .select();
    return { data, error };
  },

  async getQuests(filter = {}, sb) {
    const supabase = pick(sb);
    let query = supabase.from("quests").select("*");

    if (filter.id) query = query.eq("id", filter.id);
    if (filter.createdBy) query = query.eq("createdBy", filter.createdBy);
    if (filter.collectibleId)
      query = query.eq("collectibleId", filter.collectibleId);
    if (filter.locationId) query = query.eq("locationId", filter.locationId);
    if (filter.isActive !== undefined)
      query = query.eq("isActive", filter.isActive);

    const { data, error } = await query;
    return { data, error };
  },

  // -------- userQuests (RLS) ----------
  async addForUser(payload, sb) {
    const supabase = pick(sb); // per-request client
    const { data, error } = await supabase
      .from("userQuests")
      .insert([payload])
      .select();
    return { data, error };
  },

  async listForUser(userId, sb) {
    const supabase = pick(sb); // per-request client so RLS filters to auth.uid()

    const { data, error } = await supabase
      .from("userQuests")
      .select(
        `
      id,
      userId,
      questId,
      step,
      isComplete,
      completedAt,
      quests(
        id,
        name,
        description,
        pointsAchievable,
        locationId,
        locations (
          id,
          name
        )
      )
    `
      )
      .eq("userId", userId)
      .order("id", { ascending: true });

    return { data, error };
  },
  async getUserQuestById(userQuestId, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("userQuests")
      .select("id, userId, questId, step, isComplete, completedAt")
      .eq("id", userQuestId)
      .maybeSingle()
    return { data, error };
  },

  async setCompleteById(userQuestId, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("userQuests")
      .update({ isComplete: true, completedAt: new Date().toISOString() })
      .eq("id", userQuestId)
      .eq("isComplete", false)
      .select()
      .maybeSingle()
    return { data, error };
  },

  async getQuestById(questId, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("quests")
      .select("*")
      .eq("id", questId)
      .maybeSingle()
    return { data, error };
  },

  async updateQuest(questId, questData, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("quests")
      .update(questData)
      .eq("id", questId)
      .maybeSingle();
    return { data, error };
  },

  async deleteQuest(questId, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from("quests")
      .delete()
      .eq("id", questId)
      .maybeSingle();
    return { data, error };
  },
};

module.exports = QuestModel;
