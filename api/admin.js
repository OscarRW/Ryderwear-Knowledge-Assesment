// GET /admin (rewritten to /api/admin) — password-protected list of all submissions.
const { loadAll } = require('../lib/store');
const { requireAuth } = require('../lib/auth');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderAdminList(list) {
  const rows = list.map(s => {
    const AN = (s.data && s.data.AN) || [];
    const rated = AN.filter(a => a && a.s > 0);
    const avg = rated.length ? (rated.reduce((t, a) => t + a.s, 0) / rated.length).toFixed(1) : '—';
    const comp = AN.filter(a => a && a.s === 5).length;
    const train = AN.filter(a => a && a.s > 0 && a.s < 5).length;
    const created = s.created_at ? new Date(s.created_at).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : '—';
    return `<tr>
      <td><a class="name" href="/admin/${esc(s.id)}">${esc(s.team_member)}</a></td>
      <td>${esc(s.gym)}</td>
      <td>${esc(s.assessor)}</td>
      <td>${esc(s.assessment_date)}</td>
      <td class="muted">${esc(created)}</td>
      <td><span class="pill pill-avg">${esc(avg)}</span></td>
      <td><span class="pill pill-comp">${comp}</span></td>
      <td><span class="pill pill-train">${train}</span></td>
      <td class="actions">
        <a class="btn" href="/admin/${esc(s.id)}">View</a>
        <form method="post" action="/admin/${esc(s.id)}/delete" onsubmit="return confirm('Delete this assessment? This cannot be undone.');">
          <button class="btn btn-danger" type="submit">Delete</button>
        </form>
      </td>
    </tr>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Ryderwear Admin — Assessments</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f3f5;color:#111827;padding:24px;line-height:1.5;}
  .wrap{max-width:1280px;margin:0 auto;}
  header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap;}
  h1{font-size:22px;font-weight:600;}
  .sub{font-size:13px;color:#6b7280;}
  .sub a{color:#2563eb;text-decoration:none;}
  .sub a:hover{text-decoration:underline;}
  table{width:100%;background:#fff;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);font-size:13px;}
  th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e5e7eb;vertical-align:middle;}
  th{background:#f8f9fa;font-weight:600;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;}
  tr:last-child td{border-bottom:none;}
  tbody tr:hover{background:#f8f9fa;}
  td.muted{color:#6b7280;}
  .name{color:#111827;text-decoration:none;font-weight:600;}
  .name:hover{color:#2563eb;}
  .pill{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:600;font-size:12px;min-width:32px;text-align:center;}
  .pill-avg{background:#eff6ff;color:#2563eb;}
  .pill-comp{background:#f0fdf4;color:#16a34a;}
  .pill-train{background:#fffbeb;color:#d97706;}
  .actions{display:flex;gap:6px;align-items:center;}
  .actions form{margin:0;}
  .btn{display:inline-block;padding:5px 11px;border-radius:4px;border:1px solid #d1d5db;background:#fff;color:#111827;text-decoration:none;font-size:12px;cursor:pointer;font-family:inherit;}
  .btn:hover{background:#f8f9fa;}
  .btn-danger{color:#dc2626;border-color:#fecaca;}
  .btn-danger:hover{background:#fef2f2;}
  .empty{background:#fff;padding:40px;text-align:center;color:#6b7280;border-radius:8px;font-size:14px;}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>Team Knowledge Assessments</h1>
      <p class="sub">${list.length} assessment${list.length === 1 ? '' : 's'} submitted &middot; <a href="/">+ New assessment</a></p>
    </div>
  </header>
  ${list.length === 0 ? `<div class="empty">No assessments submitted yet.</div>` : `
  <table>
    <thead><tr>
      <th>Team member</th>
      <th>Gym</th>
      <th>Assessor</th>
      <th>Assessment date</th>
      <th>Submitted</th>
      <th>Avg /5</th>
      <th>Comp.</th>
      <th>Train.</th>
      <th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`}
</div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  const list = (await loadAll()).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderAdminList(list));
};
