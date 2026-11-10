// Functional test of the serverless handlers using the local-file storage fallback.
// Mocks Vercel's (req, res) so the handlers can be driven directly.
//
// Retired 11 Nov 2026. What must hold now: the public form is gone, nothing new
// can be submitted, and every past result is still listable, viewable (with its
// PDF) and deletable by an admin.
process.env.DATA_DIR = '/tmp/rw-assess-test-data';
process.env.ADMIN_USER = 'oscar';
process.env.ADMIN_PASS = 'secret';
const fs = require('fs');
fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });

const { loadAll, saveAll } = require('../lib/store');
const submit = require('../api/submit');
const adminList = require('../api/admin');
const adminView = require('../api/admin-view');
const adminDelete = require('../api/admin-delete');

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.body = o; res.type = 'json'; return res; };
  res.send = (s) => { res.body = s; res.type = 'html'; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; return res; };
  res.end = () => res;
  return res;
}
const basic = (u, p) => 'Basic ' + Buffer.from(u + ':' + p).toString('base64');
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } console.log('pass:', msg); };

(async () => {
  const payload = {
    NM: 'Jane Doe', AS: 'Oscar', GY_: 'Malaga', DT: '2026-07-22',
    AN: [{ s: 5, c: '' }, { s: 3, c: 'needs work' }, { s: 0, c: '' }],
    AC: 'Solid overall', SA: 'data:sigA', SM: 'data:sigM',
  };

  // 1. the home page is the notice, and posts nowhere
  const home = fs.readFileSync('index.html', 'utf8');
  assert(/has been retired/.test(home), 'home page is the retirement notice');
  assert(!/api\/submit/.test(home), 'home page no longer submits anything');

  // 2. a complete, valid submission is refused and nothing is stored
  let res = mockRes();
  await submit({ method: 'POST', body: payload }, res);
  assert(res.statusCode === 410, 'submit is refused (410 Gone)');
  assert((await loadAll()).length === 0, 'the refused submission was not stored');

  // 3. so is an edit to an existing one
  await saveAll([{ id: 'past1', created_at: '2026-07-22T05:00:00.000Z', updated_at: '2026-07-22T05:00:00.000Z',
    team_member: 'Jane Doe', assessor: 'Oscar', gym: 'Malaga', assessment_date: '2026-07-22', data: payload }]);
  res = mockRes();
  await submit({ method: 'POST', body: { ...payload, id: 'past1', AC: 'Changed after retirement' } }, res);
  assert(res.statusCode === 410, 'editing a past assessment is refused too');
  assert((await loadAll())[0].data.AC === 'Solid overall', 'the past assessment is unchanged');

  // 4. admin list still requires auth
  res = mockRes();
  await adminList({ headers: {} }, res);
  assert(res.statusCode === 401, 'admin list blocks unauthorised (401)');
  res = mockRes();
  await adminList({ headers: { authorization: basic('oscar', 'wrong') } }, res);
  assert(res.statusCode === 401, 'admin list blocks wrong password (401)');

  // 5. and still shows past results, with no way to start a new one
  res = mockRes();
  await adminList({ headers: { authorization: basic('oscar', 'secret') } }, res);
  assert(res.statusCode === 200 && /Jane Doe/.test(res.body), 'admin list shows the past submission');
  assert(/1 assessment submitted/.test(res.body), 'admin list count is 1');
  assert(/pill-avg">4\.0/.test(res.body), 'admin list computes avg 4.0');
  assert(!/New assessment/.test(res.body), 'admin list no longer offers a new assessment');

  // 6. viewing one renders it in the kept copy of the form
  res = mockRes();
  await adminView({ headers: { authorization: basic('oscar', 'secret') }, query: { id: 'past1' } }, res);
  assert(res.statusCode === 200 && /window\.__LOAD__=/.test(res.body), 'admin view injects window.__LOAD__');
  assert(res.body.indexOf('<!-- ADMIN_LOAD_INJECT -->') === -1, 'admin view replaced the placeholder');
  assert(res.body.includes('"__id":"past1"'), 'admin view payload carries the id');
  assert(/function mkPDF/.test(res.body), 'admin view is the real form, so the PDF can still be downloaded');
  assert(res.body.indexOf('window.__LOAD__=') < res.body.indexOf("if(!window.__LOAD__)location.replace('/')"),
    'the data is injected before the guard that sends direct visitors away');

  // 7. the kept form sends anyone who opens it directly to the notice
  const kept = fs.readFileSync('Ryderwear_Gym_Knowledge_Assessment.html', 'utf8');
  assert(/if\(!window\.__LOAD__\)location\.replace\('\/'\)/.test(kept), 'the kept form redirects direct visitors');
  const vj = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert(vj.functions['api/admin-view.js'].includeFiles === 'Ryderwear_Gym_Knowledge_Assessment.html', 'admin view is bundled with the kept form');

  // 8. unknown id -> 404
  res = mockRes();
  await adminView({ headers: { authorization: basic('oscar', 'secret') }, query: { id: 'nope' } }, res);
  assert(res.statusCode === 404, 'admin view 404 for unknown id');

  // 9. delete still requires auth, and still works
  res = mockRes();
  await adminDelete({ headers: {}, query: { id: 'past1' } }, res);
  assert(res.statusCode === 401, 'delete blocks unauthorised (401)');
  res = mockRes();
  await adminDelete({ headers: { authorization: basic('oscar', 'secret') }, query: { id: 'past1' } }, res);
  assert(res.statusCode === 303 && res.headers.Location === '/admin', 'delete redirects to /admin (303)');
  res = mockRes();
  await adminList({ headers: { authorization: basic('oscar', 'secret') } }, res);
  assert(/No assessments submitted yet/.test(res.body), 'list empty after delete');

  console.log('\nALL TESTS PASSED');
})();
