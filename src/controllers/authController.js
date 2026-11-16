// CONTROLLER: reads the HTTP request, validates, calls models, sends the HTTP response. No SQL here.
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { rules, required, validate, normalizeEmail } = require('../utils/validators');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/token');
const userModel = require('../models/userModel');
const studentModel = require('../models/studentModel');

// Compared against when the email does not exist, so "unknown email" and "wrong password"
// take about the same time (prevents leaking which emails are registered).
const DUMMY_HASH = require('bcryptjs').hashSync('not-a-real-password', 10);

// POST /api/auth/register  (PUBLIC, creates STUDENTS only)
// The role is NEVER read from the body: otherwise anyone could register as admin.
const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, studentNo } = req.body;
  validate({
    email: required(rules.email, email),
    password: required(rules.password, password),
    fullName: required(rules.fullName, fullName),
    studentNo: required(rules.studentNo, studentNo),
  });

  const passwordHash = await hashPassword(password);
  const student = await studentModel.createWithUser({
    email: normalizeEmail(email),
    passwordHash,
    studentNo: studentNo.trim().toUpperCase(),
    fullName: fullName.trim(),
  });

  ok(res, { ...student, role: 'student' }, 201);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  validate({
    email: required(rules.email, email),
    password: password ? null : 'is required',
  });

  const user = await userModel.findByEmail(normalizeEmail(email));
  const passwordOk = await comparePassword(password, user ? user.password_hash : DUMMY_HASH);

  // Same message for both failures on purpose.
  if (!user || !passwordOk) throw new AppError(401, 'Invalid email or password');

  const token = signToken(user);
  setAuthCookie(res, token);

  // Never return password_hash.
  ok(res, { id: user.id, email: user.email, role: user.role });
});

// POST /api/auth/logout
// The JWT is stateless (the server stores nothing), so "logging out" = telling the browser to delete the cookie.
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  ok(res, { message: 'Logged out' });
});

// GET /api/auth/me  (protected)
const me = asyncHandler(async (req, res) => {
  ok(res, req.user);
});

module.exports = { register, login, logout, me };
