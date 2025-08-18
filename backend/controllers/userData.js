const { db } = require('../supabase/supabaseClient');

const retriveUserEmail = async (e) => {

    const { data, error } = await supabase
        .from('userData')
        .select(`email`)
        .
}