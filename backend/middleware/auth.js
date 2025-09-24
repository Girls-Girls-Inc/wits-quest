// backend/middleware/auth.js
const admin = require('../supabase/supabaseClient'); // your service-role client

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    // validate token via Supabase Auth (admin client)
    // For supabase-js v2:
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // attach user info on req for controllers
    req.user = {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata || {}
    };
    req.accessToken = token; // optional, for logging or future use

    return next();
  } catch (err) {
    console.error('Auth middleware error', err);
    return res.status(500).json({ error: 'Auth error' });
  }
}

module.exports = { requireAuth };
