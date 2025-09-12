const { createClient } = require('@supabase/supabase-js');

const TABLE = 'locations';

// Service-role client (bypasses RLS) — default when no client/options provided
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function anonWithToken(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

function pick(sbOrOpts) {
  if (!sbOrOpts) return admin;

  // If it's already a Supabase client (has .from)
  if (typeof sbOrOpts.from === 'function') return sbOrOpts;

  // If it's an options bag that might contain a token
  const token =
    sbOrOpts.token ||
    sbOrOpts.Authorization ||
    sbOrOpts.authToken ||
    (typeof sbOrOpts === 'string' ? sbOrOpts : null);

  if (token) return anonWithToken(token);

  return admin;
}

const LocationModel = {
  async getLocations(id, name, sbOrOpts) {
    const supabase = pick(sbOrOpts);
    let q = supabase.from(TABLE).select('*').order('id', { ascending: true });
    if (id != null) q = q.eq('id', id);
    if (name) q = q.ilike('name', `%${name}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async getLocationById(id, sbOrOpts) {
    const supabase = pick(sbOrOpts);
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createLocation(payload, sbOrOpts) {
    const supabase = pick(sbOrOpts);
    // Accept object payload; controller already normalizes fields & types
    const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async updateLocation(id, updates, sbOrOpts) {
    const supabase = pick(sbOrOpts);
    const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().maybeSingle();
    
  if (error) throw error;
  if (!data) {
    const e = new Error('Location not found');
    e.status = 404;
    throw e;
  }
  return data;
  },

  async deleteLocation(id, sbOrOpts) {
    const supabase = pick(sbOrOpts);
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    // Match your controller's expectation: return { error }
    return { error: error || null };
  },
};

module.exports = LocationModel;

