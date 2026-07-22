// Storage abstraction for assessment submissions.
//
// Production (Vercel): uses Upstash Redis (the Redis integration from the Vercel
// Marketplace) when its env vars are present. Works with either the Vercel-injected
// KV_REST_API_* names or Upstash's own UPSTASH_REDIS_REST_* names.
// Local dev / no Redis: falls back to a JSON file under /tmp (ephemeral) or DATA_DIR.
//
// Same data shape as the old Express server: an array of
//   { id, created_at, updated_at, team_member, assessor, gym, assessment_date, data }

const KV_KEY = 'submissions';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useKV = !!(REDIS_URL && REDIS_TOKEN);

let kv = null;
if (useKV) {
  // Only require when actually configured, so local dev doesn't need the package installed.
  const { Redis } = require('@upstash/redis');
  kv = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
}

const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.DATA_DIR || path.join('/tmp', 'rw-assess-data');
const DB_PATH = path.join(DATA_DIR, 'submissions.json');

async function loadAll() {
  if (useKV) {
    const list = await kv.get(KV_KEY);
    return Array.isArray(list) ? list : [];
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    return [];
  }
}

async function saveAll(list) {
  if (useKV) {
    await kv.set(KV_KEY, list);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(list, null, 2));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = { loadAll, saveAll, newId, usingKV: useKV };
