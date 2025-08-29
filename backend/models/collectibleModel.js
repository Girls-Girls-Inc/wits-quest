const supabase = require('../supabase/supabaseClient');

const CollectibleModel = {
  async getCollectibles(id, name) {
    let query = supabase
      .from('collectibles')
      .select('id, name') // only fetch id and name
      .order('id', { ascending: true });

    if (id) query = query.eq('id', id);
    if (name) query = query.ilike('name', `%${name}%`);

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },

  async createCollectible(collectibleData) {
    const { data, error } = await supabase
      .from('collectibles')
      .insert([collectibleData])
      .select(); // return inserted row

    if (error) throw error;
    return data;
  },

  async updateCollectible(id, updatedData) {
    const { data, error } = await supabase
      .from('collectibles')
      .update(updatedData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  },

  async deleteCollectible(id) {
    const { error } = await supabase
      .from('collectibles')
      .delete()
      .eq('id', id);

    return { error };
  },
};

module.exports = CollectibleModel;
