// backend/models/questModel.js
const { createClient } = require('@supabase/supabase-js');

// Admin client for non-RLS operations (reads or trusted writes)
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Prefer the passed sb (per-request client) when you need RLS;
// fall back to admin when you don't.
const pick = (sb) => sb || admin;

const QuestModel = {
  async createQuest(questData, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from('quests')
      .insert([questData])
      .select();
    return { data, error };
  },

  async getQuests(filter = {}, sb) {
    const supabase = pick(sb);
    let query = supabase.from('quests').select('*');

    if (filter.id) query = query.eq('id', filter.id);
    if (filter.createdBy) query = query.eq('createdBy', filter.createdBy);
    if (filter.collectibleId) query = query.eq('collectibleId', filter.collectibleId);
    if (filter.locationId) query = query.eq('locationId', filter.locationId);
    if (filter.isActive !== undefined) query = query.eq('isActive', filter.isActive);

    const { data, error } = await query;
    return { data, error };
  },

  // -------- userQuests (RLS) ----------
  async addForUser(payload, sb) {
    const supabase = pick(sb); // per-request client
    const { data, error } = await supabase
      .from('userQuests')
      .insert([payload])
      .select();
    return { data, error };
  },


  async listForUser(userId, sb) {
    const supabase = pick(sb); // per-request client so RLS filters to auth.uid()
    const { data, error } = await supabase
      .from('userQuests')
      .select('id, questId, step, isComplete, completedAt, quests(*)')
      .eq('userId', userId)
      .order('createdAt', { ascending: false }); // if you have createdAt
    return { data, error };
  },

  async setComplete({ userId, questId }, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from('userQuests')
      .update({ isComplete: true, completedAt: new Date().toISOString() })
      .eq('userId', userId)
      .eq('questId', questId)
      .select();
    return { data, error };
  },
};

module.exports = QuestModel;
