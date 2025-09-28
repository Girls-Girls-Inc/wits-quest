const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });


// Assign env variables to constants
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabaseClientWithToken(token) {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

module.exports = createSupabaseClientWithToken;