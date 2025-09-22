// backend/models/privateLeaderboardModel.js
const supabaseAdmin = require('../supabase/supabaseClient'); // service-role client
const readClient = require('../supabase/supabaseClient'); // can be same client; separated for clarity

const PrivateLeaderboardModel = {
  // Create a new leaderboard
  async create(payload) {
    const { data, error } = await supabaseAdmin
      .from('private_leaderboards')
      .insert([payload])
      .select()
      .single();
    return { data, error };
  },

  // Find a leaderboard by ID
  async findById(id) {
    if (!id) return { data: null, error: new Error('id required') };
    const leaderboardId = String(id).trim();
    const { data, error } = await supabaseAdmin
      .from('private_leaderboards')
      .select('*')
      .eq('id', leaderboardId)
      .maybeSingle();
    return { data, error };
  },

  // List leaderboards for a given user (owner OR member)
  async listForUser(userId) {
    try {
      if (!userId) return { data: null, error: new Error('userId required') };
      const uid = String(userId).trim();

      // 1) member rows for this user (get ids)
      const { data: memberRows, error: memberErr } = await supabaseAdmin
        .from('private_leaderboard_members')
        .select('leaderboardId')
        .eq('userId', uid);

      if (memberErr) return { data: null, error: memberErr };

      const memberIds = (memberRows || []).map(r => r.leaderboardId).filter(Boolean);

      // 2) fetch leaderboards owned by the user
      const ownerPromise = supabaseAdmin
        .from('private_leaderboards')
        .select('*')
        .eq('ownerUserId', uid);

      // 3) fetch leaderboards where the user is a member (if any)
      const memberPromise = memberIds.length
        ? supabaseAdmin.from('private_leaderboards').select('*').in('id', memberIds)
        : Promise.resolve({ data: [], error: null });

      const [ownerRes, memberRes] = await Promise.all([ownerPromise, memberPromise]);

      if (ownerRes.error) return { data: null, error: ownerRes.error };
      if (memberRes.error) return { data: null, error: memberRes.error };

      // merge & dedupe by id (owner rows may overlap with member rows)
      const merged = [...(ownerRes.data || []), ...(memberRes.data || [])];
      const map = new Map();
      for (const lb of merged) {
        if (lb && lb.id) map.set(lb.id, lb);
      }

      return { data: Array.from(map.values()), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // Update allowed fields by leaderboard ID
  async updateById(id, changes) {
    const allowed = ['name', 'description', 'coverImage', 'periodType', 'periodStart', 'periodEnd', 'isActive'];
    const payload = {};
    for (const k of allowed) if (Object.prototype.hasOwnProperty.call(changes, k)) payload[k] = changes[k];

    const { data, error } = await supabaseAdmin
      .from('private_leaderboards')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // Delete a leaderboard by ID
  async deleteById(id) {
    const { error } = await supabaseAdmin
      .from('private_leaderboards')
      .delete()
      .eq('id', id);
    return { error };
  },

  // Add a member to a leaderboard
  async addMember({ leaderboardId, userId, role = 'member' }) {
    const { data, error } = await supabaseAdmin
      .from('private_leaderboard_members')
      .insert([{ leaderboardId, userId, role }])
      .select()
      .maybeSingle();
    return { data, error };
  },

  // Add member by invite code
  async addMemberByInviteCode({ inviteCode, userId }) {
    // Find leaderboard
    const { data: lb, error: lbErr } = await supabaseAdmin
      .from('private_leaderboards')
      .select('id, isActive')
      .eq('inviteCode', inviteCode)
      .maybeSingle();
    if (lbErr) return { data: null, error: lbErr };
    if (!lb) return { data: null, error: new Error('Leaderboard not found') };
    if (!lb.isActive) return { data: null, error: new Error('Leaderboard is inactive') };

    // Check if user is already a member
    const { data: existing, error: exErr } = await supabaseAdmin
      .from('private_leaderboard_members')
      .select('id')
      .eq('leaderboardId', lb.id)
      .eq('userId', userId)
      .limit(1);
    if (exErr) return { data: null, error: exErr };
    if (existing && existing.length) return { data: null, error: new Error('Already a member') };

    // Add user as member
    const { data, error } = await supabaseAdmin
      .from('private_leaderboard_members')
      .insert([{ leaderboardId: lb.id, userId, role: 'member' }])
      .select()
      .maybeSingle();
    return { data, error };
  },

  // Remove a member
  async removeMember({ leaderboardId, userId }) {
    const { error } = await supabaseAdmin
      .from('private_leaderboard_members')
      .delete()
      .eq('leaderboardId', leaderboardId)
      .eq('userId', userId);
    return { error };
  },

  // List members of a leaderboard
  async listMembers(leaderboardId) {
    const { data, error } = await supabaseAdmin
      .from('private_leaderboard_members')
      .select('userId, role, joined_at')
      .eq('leaderboardId', leaderboardId);
    return { data, error };
  },

  // Get leaderboard standings
  async getStandings(leaderboardId) {
    const { data, error } = await readClient
      .from('private_leaderboard_standings')
      .select('*')
      .eq('leaderboardId', leaderboardId)
      .order('rank', { ascending: true });
    return { data, error };
  },

  // Get owner user ID
  async getOwnerUserId(leaderboardId) {
    const { data, error } = await supabaseAdmin
      .from('private_leaderboards')
      .select('ownerUserId')
      .eq('id', leaderboardId)
      .maybeSingle();
    if (error) throw error;
    return data ? data.ownerUserId : null;
  }
};

module.exports = PrivateLeaderboardModel;
