// backend/models/questModel.js
const supabase = require('../supabase/supabaseClient'); // using require to match LeaderboardModel style

const QuestModel = {
  async createQuest(questData) {
    const { data, error } = await supabase
      .from('quests')
      .insert([questData])
      .select(); // optional: return the inserted row

    return { data, error };
  },

  async getQuests(filter = {}) {
    let query = supabase.from('quests').select('*');

    // Apply filters if provided
    if (filter.id) query = query.eq('id', filter.id);
    if (filter.createdBy) query = query.eq('createdBy', filter.createdBy);
    if (filter.collectibleId) query = query.eq('collectibleId', filter.collectibleId);
    if (filter.locationId) query = query.eq('locationId', filter.locationId);
    if (filter.isActive !== undefined) query = query.eq('isActive', filter.isActive);

    const { data, error } = await query;
    return { data, error };
  },
};

module.exports = QuestModel;
