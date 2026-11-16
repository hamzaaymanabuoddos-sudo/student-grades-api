// CORS configuration.
//
// WHAT: Browsers block a web page from one origin (e.g. http://localhost:5173) from
//       reading responses of another origin (http://localhost:3000) unless the API
//       explicitly allows it with CORS headers.
// WHY:  Without it, a future frontend could not call this API. (Postman is NOT a browser,
//       so it ignores CORS - that's why CORS bugs only appear once you build a frontend.)
// COOKIES: For the browser to send/accept our auth cookie on cross-origin requests:
//   1. The server must send  Access-Control-Allow-Credentials: true   (credentials: true)
//   2. The server must name an EXACT origin - the wildcard '*' is forbidden with credentials
//   3. The frontend must call fetch(url, { credentials: 'include' })
const cors = require('cors');
const env = require('./env');

const corsMiddleware = cors({
  origin(origin, callback) {
    // Requests without an Origin header (Postman, curl, server-to-server) are not browser
    // cross-origin requests, so we let them through.
    if (!origin || env.clientOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Not on the allow-list: no CORS headers are added, so the browser blocks the response.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600, // browsers may cache the preflight (OPTIONS) answer for 10 minutes
});

module.exports = corsMiddleware;
