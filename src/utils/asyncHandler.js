// Express 4 does not catch rejected promises from async handlers.
// This wrapper forwards any error to next(err) so the error middleware sees it.
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
