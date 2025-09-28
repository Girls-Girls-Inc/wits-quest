// backend/models/userModel.js
const supabase = require('../supabase/supabaseClient');
const createSupabaseClientWithToken = require('../supabase/supabaseClientWithToken.js');

const UserModel = {
  async getAllUsers(token) {
    const supabase = createSupabaseClientWithToken(token);
    const { data, error } = await supabase.from('userData').select('*').order('created_at', { ascending: true });
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

  async updateById(userId, fields, token) {
    const supabase = createSupabaseClientWithToken(token);
    const { data, error } = await supabase
      .from('userData')
      .update(fields)
      .eq('userId', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },
};

module.exports = UserModel;
