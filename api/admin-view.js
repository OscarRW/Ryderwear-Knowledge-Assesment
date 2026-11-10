// GET /admin/:id (rewritten to /api/admin-view?id=:id): open a submission in the
// results view by injecting it into the assessment page via the ADMIN_LOAD_INJECT
// placeholder.
//
// Retired 11 Nov 2026: index.html is now the retirement notice, so the form lives
// on only as Ryderwear_Gym_Knowledge_Assessment.html, kept for exactly this view.
const fs = require('fs');
const path = require('path');
const { loadAll } = require('../lib/store');
const { requireAuth } = require('../lib/auth');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  const id = req.query.id;
  const s = (await loadAll()).find(x => x.id === id);
  if (!s) return res.status(404).send('Assessment not found');

  const html = fs.readFileSync(path.join(process.cwd(), 'Ryderwear_Gym_Knowledge_Assessment.html'), 'utf8');
  const payload = { ...s.data, __id: s.id };
  const injection = `<script>window.__LOAD__=${JSON.stringify(payload).replace(/</g, '\\u003c')};</script>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html.replace('<!-- ADMIN_LOAD_INJECT -->', injection));
};
