// JWT creation + cookie helpers.
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// The payload is only BASE64-encoded, NOT encrypted: anyone can read it.
// So we put the bare minimum: who (sub = user id) and role. Never email/password/personal data.
function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: env.jwt.expiresIn,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] }); // pin the algorithm
}

function setAuthCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie(env.cookie.name, token, {
    httpOnly: env.cookie.httpOnly,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    expires: new Date(exp * 1000), // cookie dies when the JWT dies
  });
}

function clearAuthCookie(res) {
  // Options must match the ones used when the cookie was set, or the browser keeps it.
  res.clearCookie(env.cookie.name, {
    httpOnly: env.cookie.httpOnly,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
  });
}

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie };
