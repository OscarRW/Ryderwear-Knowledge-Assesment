// Functional test of the serverless handlers using the local-file storage fallback.
// Mocks Vercel's (req, res) so we can drive submit -> list -> view -> delete end to end.
process.env.DATA_DIR = '/tmp/rw-assess-test-data';
process.env.ADMIN_USER = 'oscar';
process.env.ADMIN_PASS = 'secret';
require('fs').rmSync(process.env.DATA_DIR, { recursive: true, force: true });

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
  // 1. submit a new assessment
  const payload = {
    NM: 'Jane Doe', AS: 'Oscar', GY_: 'Malaga', DT: '2026-07-22',
    AN: [{ s: 5, c: '' }, { s: 3, c: 'needs work' }, { s: 0, c: '' }],
    AC: 'Solid overall', SA: 'data:sigA', SM: 'data:sigM',
  };
  let res = mockRes();
  await submit({ method: 'POST', body: payload }, res);
  assert(res.type === 'json' && res.body.id, 'submit returns an id');
  const id = res.body.id;

  // 2. missing required field -> 400
  res = mockRes();
  await submit({ method: 'POST', body: { NM: 'x' } }, res);
  assert(res.statusCode === 400, 'submit rejects missing fields (400)');

  // 3. update existing (same id) does not create a duplicate
  res = mockRes();
  await submit({ method: 'POST', body: { ...payload, id, AC: 'Updated note' } }, res);
  assert(res.body.id === id, 'submit with same id updates in place');

  // 4. admin list requires auth
  res = mockRes();
  await adminList({ headers: {} }, res);
  assert(res.statusCode === 401, 'admin list blocks unauthorised (401)');

  // 5. admin list with wrong password -> 401
  res = mockRes();
  await adminList({ headers: { authorization: basic('oscar', 'wrong') } }, res);
  assert(res.statusCode === 401, 'admin list blocks wrong password (401)');

  // 6. admin list authorised shows the single submission
  res = mockRes();
  await adminList({ headers: { authorization: basic('oscar', 'secret') } }, res);
  assert(res.statusCode === 200 && /Jane Doe/.test(res.body), 'admin list shows submission when authorised');
  assert(/1 assessment submitted/.test(res.body), 'admin list count is 1 (no duplicate from update)');
  // avg of rated (5,3) = 4.0; comp (s===5) = 1; train (0<s<5) = 1
  assert(/pill-avg">4\.0/.test(res.body), 'admin list computes avg 4.0');

  // 7. admin view injects the payload into index.html
  res = mockRes();
  await adminView({ headers: { authorization: basic('oscar', 'secret') }, query: { id } }, res);
  assert(res.statusCode === 200 && /window\.__LOAD__=/.test(res.body), 'admin view injects window.__LOAD__');
  assert(res.body.indexOf('<!-- ADMIN_LOAD_INJECT -->') === -1, 'admin view replaced the placeholder');
  assert(res.body.includes('"__id":"' + id + '"'), 'admin view payload carries the id');

  // 8. admin view unknown id -> 404
  res = mockRes();
  await adminView({ headers: { authorization: basic('oscar', 'secret') }, query: { id: 'nope' } }, res);
  assert(res.statusCode === 404, 'admin view 404 for unknown id');

  // 9. delete requires auth
  res = mockRes();
  await adminDelete({ headers: {}, query: { id } }, res);
  assert(res.statusCode === 401, 'delete blocks unauthorised (401)');

  // 10. delete authorised removes it and redirects
  res = mockRes();
  await adminDelete({ headers: { authorization: basic('oscar', 'secret') }, query: { id } }, res);
  assert(res.statusCode === 303 && res.headers.Location === '/admin', 'delete redirects to /admin (303)');

  // 11. list now empty
  res = mockRes();
  await adminList({ headers: { authorization: basic('oscar', 'secret') } }, res);
  assert(/No assessments submitted yet/.test(res.body), 'list empty after delete');

  console.log('\nALL TESTS PASSED');
})();
