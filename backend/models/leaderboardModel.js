const supabase = require('../supabase/supabaseClient');

const LeaderboardModel = {
  async getLeaderboard(periodType, start, end, userId, id) {
  let query = supabase
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true });

  if (periodType) query = query.ilike('periodType', periodType); // case-insensitive
  if (id) query = query.eq('id', id.trim()); // case-insensitive
  if (userId) query = query.eq('userId', userId.trim());
  if (start) query = query.gte('periodStart', new Date(start).toISOString());
  if (end) query = query.lte('periodEnd', new Date(end).toISOString());

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
},

//   async addEntry(entry) {
//     const { data, error } = await supabase
//       .from('leaderboard')
//       .insert(entry)
//       .select();

//     if (error) throw error;

//     return data;
//   },

//   async updateScore(id, score, rank) {
//     const { data, error } = await supabase
//       .from('leaderboard')
//       .update({ score, rank })
//       .eq('id', id)
//       .select();

//     if (error) throw error;

//     return data;
//   },

//   async deleteEntry(id) {
//     const { error } = await supabase
//       .from('leaderboard')
//       .delete()
//       .eq('id', id);

//     return { error };
//   }
};

module.exports = LeaderboardModel;


