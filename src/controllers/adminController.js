const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { rules, required, validate, parseId, parsePagination, normalizeEmail } = require('../utils/validators');
const { hashPassword } = require('../utils/password');
const userModel = require('../models/userModel');
const courseModel = require('../models/courseModel');
const enrollmentModel = require('../models/enrollmentModel');

// GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  ok(res, await userModel.list(parsePagination(req.query)));
});

const getUser = asyncHandler(async (req, res) => {
  const user = await userModel.findByIdWithProfile(parseId(req.params.id, 'id'));
  if (!user) throw new AppError(404, 'User not found');
  ok(res, user);
});

// DELETE /api/admin/users/:id   (an admin cannot delete themself)
const deleteUser = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'id');
  if (id === req.user.id) throw new AppError(400, 'You cannot delete your own account');
  if (!(await userModel.remove(id))) throw new AppError(404, 'User not found');
  ok(res, { message: 'User deleted' });
});

// POST /api/admin/admins  - the only way (besides the seed script) to create another admin
const createAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  validate({ email: required(rules.email, email), password: required(rules.password, password) });
  const user = await userModel.create({
    email: normalizeEmail(email),
    passwordHash: await hashPassword(password),
    role: 'admin',
  });
  ok(res, user, 201);
});

// GET /api/admin/stats  - aggregation demo (COUNT, AVG, GROUP BY)
const stats = asyncHandler(async (req, res) => {
  const [usersByRole, enrollments, courses] = await Promise.all([
    userModel.countByRole(),
    enrollmentModel.overallStats(),
    courseModel.statsPerCourse(),
  ]);
  ok(res, { usersByRole, enrollments, courses });
});

module.exports = { listUsers, getUser, deleteUser, createAdmin, stats };
