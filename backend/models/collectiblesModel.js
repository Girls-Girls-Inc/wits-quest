const { createClient } = require('@supabase/supabase-js');

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TABLE = 'collectibles';
const pick = (sb) => sb || admin; // use per-request client if provided

const CollectiblesModel = {
  // Reads: can be public via admin; you can also pass an sb to filter via RLS
  async list({ search, limit = 50, offset = 0 } = {}, sb) {
    const supabase = pick(sb);
    let q = supabase.from(TABLE).select('*', { count: 'exact' }).order('createdAt', { ascending: false });
    if (search && search.trim()) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    const start = Number(offset) || 0;
    const end = start + (Number(limit) || 50) - 1;
    const { data, error, count } = await q.range(start, end);
    if (error) throw error;
    return { data, count };
    // return array only? -> up to you; this returns { data, count } like before
  },

  async getById(id, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // Writes: pass per-request anon client from controller so RLS enforces moderator check
 async create(payload, sb) {
  const client = sb ?? pub;   // must prefer sb
  const { data, error } = await client
    .from('collectibles')
    .insert(payload)
    .select()
    .single();
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
};

module.exports = CollectiblesModel;
