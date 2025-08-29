const supabase = require('../supabase/supabaseClient');

const LocationModel = {
  async getLocations(id, name) {
    let query = supabase
      .from('locations')
      .select('id, name')
      .order('id', { ascending: true });

    if (id) query = query.eq('id', id);
    if (name) query = query.ilike('name', `%${name}%`);

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  },

  async createLocation(locationData) {
    const { data, error } = await supabase
      .from('locations')
      .insert([locationData])
      .select();
    if (error) throw error;
    return data;
  },

  async updateLocation(id, updatedData) {
    const { data, error } = await supabase
      .from('locations')
      .update(updatedData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  },

  async deleteLocation(id) {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    return { error };
  },
};

module.exports = LocationModel;
