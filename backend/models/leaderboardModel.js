// backend/models/leaderboardModel.js
const { createClient } = require("@supabase/supabase-js");

const readClient = require("../supabase/supabaseClient");

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const BOARD_ID_TO_TYPE = { "123": "Weekly", "1234": "Monthly", "12345": "Yearly" };

function boundsExclusive(kind, at = new Date()) {
  const d = new Date(at);
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  if (kind === "Weekly") {
    const ref = new Date(Date.UTC(y, m, day));
    const monOffset = (ref.getUTCDay() + 6) % 7;
    const start = new Date(ref); start.setUTCDate(ref.getUTCDate() - monOffset); start.setUTCHours(0,0,0,0);
    const end   = new Date(start); end.setUTCDate(start.getUTCDate() + 7); end.setUTCHours(0,0,0,0);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (kind === "Monthly") {
    const start = new Date(Date.UTC(y, m, 1, 0,0,0,0));
    const end   = new Date(Date.UTC(y, m+1, 1, 0,0,0,0));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  const start = new Date(Date.UTC(y, 0, 1, 0,0,0,0));
  const end   = new Date(Date.UTC(y+1, 0, 1, 0,0,0,0));
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Current-period helper (UTC):
 * - "overall"   → single row per user: periodStart/end NULL
 * - "weekly"    → Mon..Sun week (ISO week)
 * - "monthly"   → first..last day of current month
 *
 * Returns: { periodType, periodStart, periodEnd } (ISO strings or nulls)
 */
function currentPeriod(periodType = "overall") {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  if (periodType.toLowerCase() === "weekly") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = d.getUTCDay();                  // 0..6 (Sun..Sat)
    const mondayOffset = (day + 6) % 7;         // 0 for Mon, 6 for Sun
    const start = new Date(d); start.setUTCDate(d.getUTCDate() - mondayOffset);
    const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
    // Set times to full-day bounds
    start.setUTCHours(0, 0, 0, 0); end.setUTCHours(23, 59, 59, 999);

    return {
      periodType: "weekly",
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  }

  if (periodType.toLowerCase() === "monthly") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return {
      periodType: "monthly",
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };
  }

  // overall
  return { periodType: "overall", periodStart: null, periodEnd: null };
}

const LeaderboardModel = {
  // ───────────── READ (unchanged) ─────────────
  async getLeaderboard(periodType, start, end, userId, id) {
  let t = periodType || (id && BOARD_ID_TO_TYPE[id.trim()]);            // map 123 → Weekly
  t = t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : "Weekly";     // normalize casing

  let s = start, e = end;
  if (!s || !e) ({ start: s, end: e } = boundsExclusive(t));            // current window

  let q = readClient.from("leaderboard_with_users").select("*")
    .eq("periodType", t).eq("periodStart", s).eq("periodEnd", e)
    .order("points", { ascending: false }).order("username", { ascending: true });

  if (userId) q = q.eq("userId", userId.trim());

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
},


// helper: compute current UTC bounds with EXCLUSIVE end


async addPointsAtomic({ userId, points, at = new Date().toISOString() }) {
  if (!userId) throw new Error("userId is required");
  const delta = Math.max(0, Number.isFinite(+points) ? Math.trunc(+points) : 0);

  // 1) Preferred: atomic RPC that writes Weekly/Monthly/Yearly into the ONE leaderboard table
  // Make sure you've created the lb_add_points() function we built earlier.
  const { error: rpcErr } = await admin.rpc("lb_add_points", {
    in_user_id: userId,
    in_points: delta,
    in_when: at,
  });
  if (!rpcErr) return { ok: true, method: "rpc" };

  // 2) Fallback (non-atomic) — writes the SAME windows with EXCLUSIVE ends
  console.warn("lb_add_points RPC failed, using JS fallback:", rpcErr?.message);

  const y = boundsExclusive("Yearly",  new Date(at));
  const w = boundsExclusive("Weekly",  new Date(at));
  const m = boundsExclusive("Monthly", new Date(at));
  const periods = [
    { periodType: "Yearly",  periodStart: y.start, periodEnd: y.end },
    { periodType: "Weekly",  periodStart: w.start, periodEnd: w.end },
    { periodType: "Monthly", periodStart: m.start, periodEnd: m.end },
  ];

  for (const p of periods) {
    // upsert a zero row so update always has something to hit
    const { error: upsertErr } = await admin
      .from("leaderboard")
      .upsert(
        {
          userId,
          periodType: p.periodType,                  // MUST match casing in DB
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          points: 0,
        },
        { onConflict: '"userId","periodType","periodStart","periodEnd"' }
      );
    if (upsertErr) throw upsertErr;

    // fetch id+points for that exact window
    const { data: row, error: selErr } = await admin
      .from("leaderboard")
      .select("id, points")
      .eq("userId", userId)
      .eq("periodType", p.periodType)
      .eq("periodStart", p.periodStart)
      .eq("periodEnd", p.periodEnd)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!row) throw new Error("Invariant: upserted row not found for leaderboard period");

    const { error: updErr } = await admin
      .from("leaderboard")
      .update({ points: (row.points ?? 0) + delta })
      .eq("id", row.id);
    if (updErr) throw updErr;
  }

  return { ok: true, method: "fallback" };
}
};

LeaderboardModel.currentPeriod = currentPeriod;
module.exports = LeaderboardModel;
