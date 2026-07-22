// HTTP Basic Auth for the admin routes — same behaviour as the old server.
// Returns true if the request is authorised; otherwise sends a 401 and returns false.

function requireAuth(req, res) {
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  let name = '';
  let pass = '';
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    name = decoded.slice(0, idx);
    pass = decoded.slice(idx + 1);
  }

  if (name !== ADMIN_USER || pass !== ADMIN_PASS) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Ryderwear Admin", charset="UTF-8"');
    res.status(401).send('Access denied');
    return false;
  }
  return true;
}

module.exports = { requireAuth };
