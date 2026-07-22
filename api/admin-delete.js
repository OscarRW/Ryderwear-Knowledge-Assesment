// POST /admin/:id/delete (rewritten to /api/admin-delete?id=:id) — delete a submission.
const { loadAll, saveAll } = require('../lib/store');
const { requireAuth } = require('../lib/auth');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  const id = req.query.id;
  const list = await loadAll();
  await saveAll(list.filter(s => s.id !== id));

  res.status(303).setHeader('Location', '/admin');
  res.end();
};
