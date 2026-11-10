// POST /api/submit: retired 11 Nov 2026.
//
// The Team Knowledge Assessment was switched off when induction training moved
// into the Compliance Manager. Past submissions are kept in Redis and stay
// viewable at /admin; nothing new is accepted, including edits to old ones.
//
// 410 rather than 404, so a copy of the old form still open on somebody's phone
// gets a clear answer instead of failing silently.
module.exports = async (req, res) => {
  res.status(410).json({
    error: 'The Team Knowledge Assessment has been retired and no longer accepts submissions.',
  });
};
