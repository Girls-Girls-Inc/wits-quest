const { supabase } = require('../supabase/supabaseClient');

const getUserEmail = async (req, res) => {

    const user = req.body;

    try {
        const { data, error } = await supabase
            .from('userData')
            .select(`email`)
            .eq('email', 'user.email');

        if (error) {
            throw error;
        }

        res.status(200).send(data);
    } catch (error) {
        console.error('Error getting user email user:', error.message);
        res.status(500).send('Error getting user email user: ' + error.message);
    }

};

module.exports = {
    getUserEmail
};