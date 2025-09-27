const { createClient } = require("@supabase/supabase-js");

function normalizeQuizRow(row) {
  if (!row) return row;
  const normalized = { ...row };

  if (typeof normalized.questionText !== 'string') {
    normalized.questionText = normalized.questionText == null
      ? ''
      : String(normalized.questionText);
  }

  if (typeof normalized.options === 'string') {
    const trimmed = normalized.options.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        normalized.options = Array.isArray(parsed)
          ? parsed
          : (Array.isArray(parsed?.options) ? parsed.options : []);
      } catch (err) {
        normalized.options = trimmed
          .split(/\r?\n/)
          .map((opt) => opt.trim())
          .filter(Boolean);
      }
    } else {
      normalized.options = [];
    }
  } else if (!Array.isArray(normalized.options)) {
    normalized.options = normalized.options ? [normalized.options] : [];
  }

  if (typeof normalized.questionType === 'string') {
    normalized.questionType = normalized.questionType.toLowerCase();
  }

  return normalized;
}

function prepareWritePayload(raw) {
  const payload = { ...raw };

  if (Array.isArray(payload.options)) {
    payload.options = JSON.stringify(payload.options);
  } else if (payload.options && typeof payload.options === 'object') {
    payload.options = JSON.stringify(payload.options);
  } else if (payload.options == null) {
    payload.options = null;
  } else {
    payload.options = String(payload.options);
  }

  if (typeof payload.questionType === 'string') {
    payload.questionType = payload.questionType.toLowerCase();
  }

  const allowed = new Set(['questionText', 'questionType', 'correctAnswer', 'options']);
  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key)) sanitized[key] = value;
  }

  return sanitized;
}

// Admin client (trusted writes, bypasses RLS). Use sparingly.
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const pick = (sb) => sb || admin;

const QuizModel = {
  async create(quizData, sb) {
    const supabase = pick(sb);
    const insert = prepareWritePayload(quizData);

    const { data, error } = await supabase
      .from('quizzes')
      .insert([insert])
      .select();

    if (error) return { data: null, error };
    const row = Array.isArray(data) ? data[0] : data;
    return { data: normalizeQuizRow(row), error: null };
  },

  async list(sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('id', { ascending: true });

    if (error) return { data: null, error };
    const rows = Array.isArray(data) ? data.map(normalizeQuizRow) : [];
    return { data: rows, error: null };
  },

  async update(quizId, quizData, sb) {
    const supabase = pick(sb);
    const update = prepareWritePayload(quizData);

    const { data, error } = await supabase
      .from('quizzes')
      .update(update)
      .eq('id', quizId)
      .select()
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: normalizeQuizRow(data), error: null };
  },

  async remove(quizId, sb) {
    const supabase = pick(sb);
    const { data, error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)
      .select()
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: normalizeQuizRow(data), error: null };
  },

  async getById(quizId, sb) {
    const supabase = pick(sb);
    const raw = typeof quizId === 'string' ? quizId.trim() : quizId;
    const idValue = /^\d+$/.test(`${raw}`) ? Number(raw) : raw;

    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', idValue)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: normalizeQuizRow(data), error: null };
  },
};

module.exports = {
  normalizeQuizRow,
  prepareWritePayload,
  ...QuizModel,
};

