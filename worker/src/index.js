const BOARD_LIMIT = 20;
const MAX_SCORE = 999999999;
const ALLOWED_ORIGINS = new Set([
  'https://richcande1-rca.github.io',
  'http://localhost:8787',
  'http://127.0.0.1:8787'
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://richcande1-rca.github.io';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function cleanInitials(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
}

function cleanScore(value) {
  const score = Number.parseInt(value, 10);
  if (!Number.isFinite(score)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, score));
}

function cleanBuild(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

async function getBoard(request, env) {
  const result = await env.DB.prepare(
    `SELECT initials, score, build, created_at AS createdAt
     FROM pinball_entries
     ORDER BY score DESC, created_at ASC
     LIMIT ?`
  ).bind(BOARD_LIMIT).all();

  return jsonResponse(request, {
    ok: true,
    entries: result.results || []
  });
}

async function postBoard(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse(request, { ok: false, error: 'Invalid JSON.' }, 400);
  }

  const initials = cleanInitials(payload.initials);
  const score = cleanScore(payload.score);
  const build = cleanBuild(payload.build);

  if (!initials) {
    return jsonResponse(request, { ok: false, error: 'Initials are required.' }, 400);
  }

  if (score <= 0) {
    return jsonResponse(request, { ok: false, error: 'Score must be greater than zero.' }, 400);
  }

  const cutoffResult = await env.DB.prepare(
    `SELECT score
     FROM pinball_entries
     ORDER BY score DESC, created_at ASC
     LIMIT 1 OFFSET ?`
  ).bind(BOARD_LIMIT - 1).first();

  if (cutoffResult && score <= Number(cutoffResult.score || 0)) {
    return jsonResponse(request, { ok: false, error: 'Score no longer qualifies for the world board.' }, 409);
  }

  await env.DB.prepare(
    `INSERT INTO pinball_entries (initials, score, build)
     VALUES (?, ?, ?)`
  ).bind(initials, score, build).run();

  const overflow = await env.DB.prepare(
    `SELECT id
     FROM pinball_entries
     ORDER BY score DESC, created_at ASC
     LIMIT -1 OFFSET ?`
  ).bind(BOARD_LIMIT).all();

  const idsToDelete = (overflow.results || []).map(row => row.id);
  if (idsToDelete.length) {
    const placeholders = idsToDelete.map(() => '?').join(',');
    await env.DB.prepare(
      `DELETE FROM pinball_entries WHERE id IN (${placeholders})`
    ).bind(...idsToDelete).run();
  }

  return getBoard(request, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (!env.DB) {
      return jsonResponse(request, { ok: false, error: 'D1 binding DB is missing.' }, 500);
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return jsonResponse(request, {
        ok: true,
        service: 'Miami Nights World High Scores',
        endpoint: '/api/board'
      });
    }

    if (url.pathname !== '/api/board') {
      return jsonResponse(request, { ok: false, error: 'Not found.' }, 404);
    }

    if (request.method === 'GET') return getBoard(request, env);
    if (request.method === 'POST') return postBoard(request, env);

    return jsonResponse(request, { ok: false, error: 'Method not allowed.' }, 405);
  }
};
