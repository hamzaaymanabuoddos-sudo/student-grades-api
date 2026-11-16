// AUTHENTICATION: "Who are you?"
// Reads the JWT from the HttpOnly cookie, verifies it, loads the user, attaches req.user.
// Anything that fails here is a 401 (we do not know who you are).
const env = require('../config/env');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/token');

module.exports = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies[env.cookie.name];
  if (!token) throw new AppError(401, 'Authentication required: please log in');

  let payload;
  try {
    payload = verifyToken(token); // checks signature AND expiry
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Session expired: please log in again' : 'Invalid token';
    throw new AppError(401, message);
  }

  // Re-read the user from the database on every request.
  // Why: if an admin deleted the account or changed something, an old token must not keep working,
  // and the DATABASE (not the token) is the source of truth for the role.
  const user = await userModel.findByIdWithProfile(Number(payload.sub));
  if (!user) throw new AppError(401, 'Account no longer exists');

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    studentId: user.student_id || null,
    teacherId: user.teacher_id || null,
    fullName: user.student_name || user.teacher_name || null,
  };
  next();
});
