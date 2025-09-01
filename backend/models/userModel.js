// backend/models/userModel.js
const supabase = require('../supabase/supabaseClient');

const UserModel = {
  async getAllUsers({ userId, email, isModerator, createdBefore, createdAfter }) {
    let query = supabase.from('userData').select('*');

    if (userId) query = query.eq('userId', userId.trim());
    if (email) query = query.ilike('email', `%${email.trim()}%`);
    if (typeof isModerator !== 'undefined') query = query.eq('isModerator', isModerator);
    if (createdBefore) query = query.lte('created_at', createdBefore);
    if (createdAfter) query = query.gte('created_at', createdAfter);

    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(userId) {
    const { data, error } = await supabase
      .from('userData')
      .select('*')
      .eq('userId', userId)
      .single(); // expect one row

    // If no row, Supabase throws; treat as "not found"
    if (error) {
      // PGRST116 = No rows
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async updateById(userId, fields) {
    const { data, error } = await supabase
      .from('userData')
      .update(fields)
      .eq('userId', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

module.exports = UserModel;
