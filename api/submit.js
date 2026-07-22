// POST /api/submit — create or update an assessment submission.
const { loadAll, saveAll, newId } = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel parses JSON bodies automatically; guard for the string case too.
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const { id, NM, AS, GY_, DT } = body;
  if (!NM || !AS || !GY_ || !DT) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const list = await loadAll();
  const now = new Date().toISOString();
  const meta = { team_member: NM, assessor: AS, gym: GY_, assessment_date: DT };

  if (id) {
    const existing = list.find(s => s.id === id);
    if (existing) {
      existing.data = body;
      existing.updated_at = now;
      Object.assign(existing, meta);
      await saveAll(list);
      return res.json({ id });
    }
  }

  const rec = { id: newId(), created_at: now, updated_at: now, ...meta, data: body };
  list.push(rec);
  await saveAll(list);
  res.json({ id: rec.id });
};
