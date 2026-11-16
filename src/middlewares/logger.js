// Simple request logger. Shows the request lifecycle:
//   when a request ARRIVES we remember the time; when the response is FINISHED we print one line.
//   [2026-11-16 10:30:12] PUT /api/courses/2/students/5/grade -> 200 (14ms)
const { format } = require('date-fns'); // used for readable timestamps

module.exports = function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const time = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    console.log(`[${time}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
};
