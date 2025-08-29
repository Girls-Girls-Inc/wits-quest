const supabase = require('../supabase/supabaseClient');

const UserModel = {
  async getAllUsers({ userId, email, isModerator, createdBefore, createdAfter }) {
    let query = supabase.from('userData').select('*');

    // Optional filters
    if (userId) query = query.eq('userId', userId.trim());
    if (email) query = query.ilike('email', `%${email.trim()}%`); // case-insensitive partial match
    if (isModerator !== undefined) query = query.eq('isModerator', isModerator);
    if (createdBefore) query = query.lte('created_at', new Date(createdBefore).toISOString());
    if (createdAfter) query = query.gte('created_at', new Date(createdAfter).toISOString());

    // Order by creation date
    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },
};

module.exports = UserModel;
