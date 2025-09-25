// backend/models/privateLeaderboardModel.js
const supabaseAdmin = require('../supabase/supabaseClient'); // service-role client
const readClient = require('../supabase/supabaseClient'); // can be same client; separated for clarity

const PrivateLeaderboardModel = {
  // Create a new leaderboard
  async create(payload) {
    if (!payload) return { data: null, error: new Error('payload required') };
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

  // Add a member to a leaderboard (idempotent)
  async addMember({ leaderboardId, userId, role = 'member' }) {
    if (!leaderboardId || !userId) return { data: null, error: new Error('leaderboardId and userId required') };

    // 1) try to insert; if unique-violation occurs, fetch existing row
    const { data, error } = await supabaseAdmin
      .from('private_leaderboard_members')
      .insert([{ leaderboardId, userId, role }])
      .select()
      .maybeSingle();

    if (error) {
      // Postgres unique violation code is '23505' — treat as already exists
      if (error.code === '23505' || (error.details && error.details.includes('already exists'))) {
        const { data: found, error: findErr } = await supabaseAdmin
          .from('private_leaderboard_members')
          .select('*')
          .eq('leaderboardId', leaderboardId)
          .eq('userId', userId)
          .limit(1);
        if (findErr) return { data: null, error: findErr };
        return { data: (found && found[0]) || null, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  },

  // Add member by invite code (idempotent)
  async addMemberByInviteCode({ inviteCode, userId }) {
    if (!inviteCode || !userId) return { data: null, error: new Error('inviteCode and userId required') };

    // Find leaderboard
    const { data: lb, error: lbErr } = await supabaseAdmin
      .from('private_leaderboards')
      .select('id, isActive')
      .eq('inviteCode', inviteCode)
      .maybeSingle();
    if (lbErr) return { data: null, error: lbErr };
    if (!lb) return { data: null, error: new Error('Leaderboard not found') };
    if (!lb.isActive) return { data: null, error: new Error('Leaderboard is inactive') };

    // check existing membership
    const { data: existing, error: exErr } = await supabaseAdmin
      .from('private_leaderboard_members')
      .select('*')
      .eq('leaderboardId', lb.id)
      .eq('userId', userId)
      .limit(1);

    if (exErr) return { data: null, error: exErr };
    if (existing && existing.length) return { data: existing[0], error: null };

    // try insert and handle race
    const { data, error } = await supabaseAdmin
      .from('private_leaderboard_members')
      .insert([{ leaderboardId: lb.id, userId, role: 'member' }])
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505' || (error.details && error.details.includes('already exists'))) {
        const { data: found, error: findErr } = await supabaseAdmin
          .from('private_leaderboard_members')
          .select('*')
          .eq('leaderboardId', lb.id)
          .eq('userId', userId)
          .limit(1);
        if (findErr) return { data: null, error: findErr };
        return { data: (found && found[0]) || null, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
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
    if (!leaderboardId) return { data: null, error: new Error('leaderboardId required') };

    // 1) get membership rows
    const { data: memberRows, error: memberErr } = await supabaseAdmin
      .from('private_leaderboard_members')
      .select('userId, role, joinedAt')
      .eq('leaderboardId', leaderboardId);

    if (memberErr) return { data: null, error: memberErr };

    const members = (memberRows || []).map(r => ({
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt || r.joined_at || null
    }));

    if (!members.length) return { data: [], error: null };

    // 2) fetch usernames from leaderboard_with_users view (service role can read it)
    const userIds = members.map(m => m.userId);
    const { data: usersData, error: usersErr } = await supabaseAdmin
      .from('leaderboard_with_users')
      .select('userId, username')
      .in('userId', userIds);

    if (usersErr) {
      // not fatal — return members without usernames
      return { data: members, error: null };
    }

    // 3) map usernames by userId
    const unameMap = new Map();
    (usersData || []).forEach(u => {
      if (u && u.userId) unameMap.set(String(u.userId), u.username ?? null);
    });

    // 4) merge username into members
    const enriched = members.map(m => ({
      ...m,
      username: unameMap.get(String(m.userId)) ?? null
    }));

    return { data: enriched, error: null };
  },

  // Get leaderboard standings (from view)
  async getStandings(leaderboardId) {
    if (!leaderboardId) return { data: null, error: new Error('leaderboardId required') };
    const { data, error } = await readClient
      .from('private_leaderboard_standings')
      .select('*')
      .eq('leaderboardId', leaderboardId)
      .order('rank', { ascending: true });
    return { data, error };
  },

  // Get owner user ID
  async getOwnerUserId(leaderboardId) {
    if (!leaderboardId) return null;
    const { data, error } = await supabaseAdmin
      .from('private_leaderboards')
      .select('ownerUserId')
      .eq('id', leaderboardId)
      .maybeSingle();
    if (error) throw error;
    return data ? data.ownerUserId : null;
  },

  // helper: find by owner+name+period (used if you later want idempotent create)
  async findByUnique({ ownerUserId, name, periodStart, periodEnd }) {
    const q = supabaseAdmin.from('private_leaderboards').select('*').limit(1);
    if (ownerUserId) q.eq('ownerUserId', ownerUserId);
    if (name) q.eq('name', name);
    if (periodStart === null) q.is('periodStart', null);
    else if (periodStart !== undefined) q.eq('periodStart', periodStart);
    if (periodEnd === null) q.is('periodEnd', null);
    else if (periodEnd !== undefined) q.eq('periodEnd', periodEnd);

    const { data, error } = await q.maybeSingle();
    return { data, error };
  },
};

module.exports = PrivateLeaderboardModel;
