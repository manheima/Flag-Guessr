import crypto from 'node:crypto';
import { createReadStream, mkdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, 'dist');
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'daily.sqlite');
const PORT = Number(process.env.PORT || 4174);

// =========================================================================
// SQLite Daily Challenge Database
// =========================================================================
mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS daily_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    seq_num INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    is_custom_name INTEGER NOT NULL DEFAULT 0,
    edit_token TEXT NOT NULL,
    score INTEGER NOT NULL,
    flag_score INTEGER NOT NULL,
    capital_score INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_daily_date_rank
    ON daily_scores (date_key, score DESC, elapsed_ms ASC, id ASC);
`);

const stmtNextSeq = db.prepare(
  'SELECT COALESCE(MAX(seq_num), 0) + 1 AS next_seq FROM daily_scores WHERE date_key = ?'
);
const stmtInsert = db.prepare(`
  INSERT INTO daily_scores
    (date_key, seq_num, player_name, is_custom_name, edit_token, score, flag_score, capital_score, elapsed_ms, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtGetById = db.prepare('SELECT * FROM daily_scores WHERE id = ?');
const stmtUpdateName = db.prepare(
  'UPDATE daily_scores SET player_name = ?, is_custom_name = ? WHERE id = ?'
);
const stmtAllForDate = db.prepare(`
  SELECT id, seq_num, player_name, is_custom_name, score, flag_score, capital_score, elapsed_ms, created_at
  FROM daily_scores
  WHERE date_key = ?
  ORDER BY score DESC, elapsed_ms ASC, id ASC
`);

function isValidDateKey(val) {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function getDefaultDateKey() {
  return new Date().toLocaleDateString('en-CA');
}

function sanitizePlayerName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, 24);
}

function computeStatsForDate(dateKey, targetEntryId = null) {
  const rows = stmtAllForDate.all(dateKey);
  const totalPlayers = rows.length;
  const distribution = Array(11).fill(0);

  let sumScore = 0;
  let sumFlags = 0;
  let sumCapitals = 0;
  let rank = null;
  let targetScore = null;

  rows.forEach((r, idx) => {
    const s = Math.max(0, Math.min(10, Number(r.score) || 0));
    distribution[s] += 1;
    sumScore += s;
    sumFlags += Number(r.flag_score) || 0;
    sumCapitals += Number(r.capital_score) || 0;

    if (targetEntryId !== null && Number(r.id) === Number(targetEntryId)) {
      rank = idx + 1;
      targetScore = s;
    }
  });

  const averageScore = totalPlayers > 0 ? Number((sumScore / totalPlayers).toFixed(1)) : 0;
  const averageFlagPct = totalPlayers > 0 ? Math.round((sumFlags / (totalPlayers * 5)) * 100) : 0;
  const averageCapitalPct =
    totalPlayers > 0 ? Math.round((sumCapitals / (totalPlayers * 5)) * 100) : 0;

  let percentile = null;
  if (rank !== null && totalPlayers > 0) {
    if (totalPlayers === 1) {
      percentile = 100;
    } else {
      const beaten = totalPlayers - rank;
      percentile = Math.round((beaten / (totalPlayers - 1)) * 100);
    }
  }

  const top5 = rows.slice(0, 5).map((r, idx) => ({
    rank: idx + 1,
    id: Number(r.id),
    playerName: String(r.player_name),
    isCustomName: Boolean(r.is_custom_name),
    score: Number(r.score),
    flagScore: Number(r.flag_score),
    capitalScore: Number(r.capital_score),
    elapsedMs: Number(r.elapsed_ms),
  }));

  return {
    dateKey,
    totalPlayers,
    averageScore,
    averageFlagPct,
    averageCapitalPct,
    scoreDistribution: distribution,
    rank,
    percentile,
    targetScore,
    top5,
  };
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 64 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // GET /api/daily/today?date=YYYY-MM-DD[&entryId=123]
  if (req.method === 'GET' && pathname === '/api/daily/today') {
    const requestedDate = url.searchParams.get('date');
    const dateKey = isValidDateKey(requestedDate) ? requestedDate : getDefaultDateKey();
    const entryIdParam = url.searchParams.get('entryId');
    const entryId = entryIdParam && /^\d+$/.test(entryIdParam) ? Number(entryIdParam) : null;
    sendJson(res, 200, computeStatsForDate(dateKey, entryId));
    return;
  }

  // POST /api/daily/submit
  if (req.method === 'POST' && pathname === '/api/daily/submit') {
    const body = await readJsonBody(req);
    const dateKey = isValidDateKey(body.dateKey) ? body.dateKey : getDefaultDateKey();
    const flagScore = Math.max(0, Math.min(5, Math.round(Number(body.flagScore) || 0)));
    const capitalScore = Math.max(0, Math.min(5, Math.round(Number(body.capitalScore) || 0)));
    const score = flagScore + capitalScore;
    const elapsedMs = Math.max(500, Math.min(3600000, Math.round(Number(body.elapsedMs) || 0)));

    const seqRow = stmtNextSeq.get(dateKey);
    const seqNum = Number(seqRow?.next_seq || 1);
    const customName = sanitizePlayerName(body.playerName);
    const playerName = customName || `user${seqNum}`;
    const isCustomName = customName ? 1 : 0;
    const editToken = crypto.randomBytes(16).toString('hex');
    const createdAt = Date.now();

    const info = stmtInsert.run(
      dateKey,
      seqNum,
      playerName,
      isCustomName,
      editToken,
      score,
      flagScore,
      capitalScore,
      elapsedMs,
      createdAt
    );

    const id = Number(info.lastInsertRowid);
    const stats = computeStatsForDate(dateKey, id);

    sendJson(res, 201, {
      entry: {
        id,
        dateKey,
        seqNum,
        playerName,
        defaultName: `user${seqNum}`,
        isCustomName: Boolean(isCustomName),
        editToken,
        score,
        flagScore,
        capitalScore,
        elapsedMs,
      },
      stats,
    });
    return;
  }

  // PATCH /api/daily/entry/:id
  const patchMatch = pathname.match(/^\/api\/daily\/entry\/(\d+)$/);
  if (req.method === 'PATCH' && patchMatch) {
    const id = Number(patchMatch[1]);
    const body = await readJsonBody(req);
    const existing = stmtGetById.get(id);

    if (!existing) {
      sendJson(res, 404, { error: 'Score entry not found' });
      return;
    }
    if (!body.editToken || body.editToken !== existing.edit_token) {
      sendJson(res, 403, { error: 'Invalid edit token' });
      return;
    }

    const customName = sanitizePlayerName(body.playerName);
    const defaultName = `user${existing.seq_num}`;
    const nextName = customName || defaultName;
    const isCustomName = customName ? 1 : 0;

    stmtUpdateName.run(nextName, isCustomName, id);
    const stats = computeStatsForDate(String(existing.date_key), id);

    sendJson(res, 200, {
      entry: {
        id,
        dateKey: String(existing.date_key),
        seqNum: Number(existing.seq_num),
        playerName: nextName,
        defaultName,
        isCustomName: Boolean(isCustomName),
        editToken: String(existing.edit_token),
        score: Number(existing.score),
        flagScore: Number(existing.flag_score),
        capitalScore: Number(existing.capital_score),
        elapsedMs: Number(existing.elapsed_ms),
      },
      stats,
    });
    return;
  }

  sendJson(res, 404, { error: 'API route not found' });
}

// =========================================================================
// Static Asset & SPA Server
// =========================================================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function cacheControlFor(urlPath) {
  if (urlPath.startsWith('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (urlPath.startsWith('/flags/')) {
    return 'public, max-age=86400';
  }
  return 'no-cache';
}

async function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return { status: 400 };
  }

  const normalized = path.posix.normalize(decoded);
  const relative = normalized === '/' ? 'index.html' : normalized.replace(/^\/+/, '');
  const candidate = path.resolve(DIST_DIR, relative);

  if (candidate !== DIST_DIR && !candidate.startsWith(DIST_DIR + path.sep)) {
    return { status: 403 };
  }

  try {
    const info = await stat(candidate);
    if (info.isFile()) {
      return { status: 200, filePath: candidate, size: info.size, urlPath: normalized };
    }
    if (info.isDirectory()) {
      const indexFile = path.join(candidate, 'index.html');
      const indexInfo = await stat(indexFile);
      if (indexInfo.isFile()) {
        return { status: 200, filePath: indexFile, size: indexInfo.size, urlPath: '/index.html' };
      }
    }
  } catch {
    // Fall through to SPA fallback or 404
  }

  if (!path.posix.extname(normalized)) {
    const indexFile = path.join(DIST_DIR, 'index.html');
    try {
      const indexInfo = await stat(indexFile);
      if (indexInfo.isFile()) {
        return { status: 200, filePath: indexFile, size: indexInfo.size, urlPath: '/index.html' };
      }
    } catch {
      return { status: 500 };
    }
  }

  return { status: 404 };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');

  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, url);
    } catch (err) {
      console.error('API error:', err);
      sendJson(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }

  const result = await resolveFile(url.pathname);

  if (result.status !== 200) {
    res.writeHead(result.status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(result.status === 404 ? 'Not Found' : 'Error');
    return;
  }

  const ext = path.extname(result.filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': result.size,
    'Cache-Control': cacheControlFor(result.urlPath),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = createReadStream(result.filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end();
  });
  stream.pipe(res);
});

server.listen(PORT, () => {
  console.log(`Flag Guessr server listening on http://localhost:${PORT} (DB: ${DB_PATH})`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
