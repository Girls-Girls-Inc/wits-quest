// models/collectiblesModel.js
const { createClient } = require('@supabase/supabase-js');

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TABLE = 'collectibles';
const pick = (sb) => sb || admin;

const CollectiblesModel = {
  async list({ search, limit = 50, offset = 0 } = {}, sb) {
    const supabase = pick(sb);
    let q = supabase.from(TABLE).select('*', { count: 'exact' }).order('createdAt', { ascending: false });
    if (search && search.trim()) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    const start = Number(offset) || 0;
    const end = start + (Number(limit) || 50) - 1;
    const { data, error, count } = await q.range(start, end);
    if (error) throw error;
    return { data, count };
  },

  async getById(id, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async listInventoryForUser(userId, { start, end, limit = 100, offset = 0 } = {}, sb) {
    const client = pick(sb);

    let q = client
      .from('userInventory')
      .select(`
        earnedAt,
        collectible:collectibleId (
          id, name, description, "imageUrl", "createdAt"
        )
      `)
      .eq('userId', userId)
      .order('earnedAt', { ascending: false })
      .range(offset, offset + Math.max(1, Math.min(limit, 500)) - 1);

    if (start) q = q.gte('earnedAt', start);
    if (end) q = q.lte('earnedAt', end);

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map(({ collectible, earnedAt }) => ({
      ...collectible,
      earnedAt,
    }));
  },

  // Inserts collectible; RLS enforced if sb (anon+JWT) is provided.
  async create(payload, sb) {
    const client = pick(sb);
    const { data, error } = await client.from('collectibles').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async update(id, updates, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id, sb) {
    const supabase = pick(sb);
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async getCollectibles(id, name, sb) {
    const supabase = pick(sb);
    let query = supabase.from('collectibles').select('id, name').order('id', { ascending: true });
    if (id) query = query.eq('id', id);
    if (name) query = query.ilike('name', `%${name}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // NEW: add collectible to userInventory (idempotent via onConflict)
  async addToInventory(userId, collectibleId, earnedAt, sb) {
    const client = pick(sb);
    const payload = {
      userId,
      collectibleId,
      earnedAt: earnedAt ?? new Date().toISOString(),
    };

    const { data, error } = await client.from('userInventory').upsert(
      { userId, collectibleId, earnedAt: earnedAt ?? new Date().toISOString() },
      { onConflict: '"userId","collectibleId"', ignoreDuplicates: false }
    );



    if (error) throw error;
    return data;
  },
};

module.exports = CollectiblesModel;
