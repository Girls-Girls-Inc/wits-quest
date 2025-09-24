// backend/models/leaderboardModel.js
const { createClient } = require("@supabase/supabase-js");

const readClient = require("../supabase/supabaseClient");

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

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
    let query = readClient
      .from("leaderboard_with_users")
      .select("*")
      // sort by points descending, highest first
      .order("points", { ascending: false, nullsFirst: false });

    if (periodType) query = query.ilike("periodType", periodType);
    if (id) query = query.eq("id", id.trim());
    if (userId) query = query.eq("userId", userId.trim());
    if (start) query = query.gte("periodStart", new Date(start).toISOString());
    if (end) query = query.lte("periodEnd", new Date(end).toISOString());

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Atomic points award.
   * - periodType: "overall" | "weekly" | "monthly"
   *   If omitted, defaults to "overall".
   * - Uses an RPC `lb_add_points` (defined below) for true atomicity.
   *   Falls back to upsert+update if the function is missing.
   */
// backend/models/leaderboardModel.js

async addPointsAtomic({ userId, points, at = new Date().toISOString() }) {
  const delta = Math.max(0, Number.isFinite(+points) ? Math.trunc(+points) : 0);

  // 1) Preferred: DB-side atomic fan-out (weekly + monthly + overall)
  const { error: rpcErr } = await admin.rpc("lb_add_points", {
    in_user_id: userId,
    in_points: delta,
    in_when: at, // optional; remove if your function uses now()
  });
  if (!rpcErr) return { ok: true, method: "rpc" };

  // 2) Fallback (non-atomic): ensure rows exist, then read-modify-write each bucket
  // Only fall back if the function is missing; otherwise bubble the real error.
  if (!/lb_add_points/i.test(rpcErr?.message || "")) throw rpcErr;

  const periods = [
    { periodType: "overall", periodStart: null, periodEnd: null },
    LeaderboardModel.currentPeriod("weekly"),
    LeaderboardModel.currentPeriod("monthly"),
  ];

  for (const p of periods) {
    // Ensure the row exists (0 points) for this user & period window
    const { error: upsertErr } = await admin
      .from("leaderboard")
      .upsert(
        {
          // NOTE: use your real column names (camelCase vs snake_case)
          userId,                         // or user_id
          periodType: p.periodType,       // or period_type
          periodStart: p.periodStart,     // or period_start
          periodEnd: p.periodEnd,         // or period_end
          points: 0,
        },
        { onConflict: "userId,periodType,periodStart,periodEnd", ignoreDuplicates: false }
      );
    if (upsertErr) throw upsertErr;

    // Read current points
    const { data: row, error: selErr } = await admin
      .from("leaderboard")
      .select("id, points")
      .eq("userId", userId)                 // or .eq("user_id", userId)
      .eq("periodType", p.periodType)       // or .eq("period_type", p.periodType)
      .is("periodStart", p.periodStart)     // .is handles NULL; use .eq if not null
      .is("periodEnd", p.periodEnd)
      .single();
    if (selErr) throw selErr;

    const newPts = (Number(row?.points) || 0) + delta;
    const { error: updErr } = await admin
      .from("leaderboard")
      .update({ points: newPts })
      .eq("id", row.id);
    if (updErr) throw updErr;
  }

  return { ok: true, method: "fallback" };
}
};

LeaderboardModel.currentPeriod = currentPeriod;
module.exports = LeaderboardModel;
