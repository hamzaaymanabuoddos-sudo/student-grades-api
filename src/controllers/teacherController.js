const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { rules, optional, required, validate, requireAtLeastOne, parseId, parsePagination, normalizeEmail } = require('../utils/validators');
const { hashPassword } = require('../utils/password');
const teacherModel = require('../models/teacherModel');
const userModel = require('../models/userModel');
const courseModel = require('../models/courseModel');

async function loadTeacher(idParam) {
  const id = parseId(idParam, 'id');
  const teacher = await teacherModel.findById(id);
  if (!teacher) throw new AppError(404, 'Teacher not found');
  return teacher;
}

const list = asyncHandler(async (req, res) => {
  ok(res, await teacherModel.list(parsePagination(req.query)));
});

const getById = asyncHandler(async (req, res) => {
  ok(res, await loadTeacher(req.params.id));
});

// POST /api/teachers (admin) - teachers can NOT self-register
const create = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;
  validate({
    email: required(rules.email, email),
    password: required(rules.password, password),
    fullName: required(rules.fullName, fullName),
  });
  const teacher = await teacherModel.createWithUser({
    email: normalizeEmail(email),
    passwordHash: await hashPassword(password),
    fullName: fullName.trim(),
  });
  ok(res, teacher, 201);
});

const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'id');
  const { email, fullName } = req.body;
  requireAtLeastOne({ email, fullName });
  validate({ email: optional(rules.email, email), fullName: optional(rules.fullName, fullName) });
  const updated = await teacherModel.update(id, {
    email: email === undefined ? undefined : normalizeEmail(email),
    fullName: fullName === undefined ? undefined : fullName.trim(),
  });
  if (!updated) throw new AppError(404, 'Teacher not found');
  ok(res, updated);
});

// DELETE: fails with 409 if the teacher still has courses (ON DELETE RESTRICT on courses.teacher_id)
const remove = asyncHandler(async (req, res) => {
  const teacher = await loadTeacher(req.params.id);
  await userModel.remove(teacher.user_id);
  ok(res, { message: 'Teacher deleted' });
});

// GET /api/teachers/:id/courses (admin or the teacher themself)
const getCourses = asyncHandler(async (req, res) => {
  const teacher = await loadTeacher(req.params.id);
  ok(res, await courseModel.findByTeacherId(teacher.id));
});

module.exports = { list, getById, create, update, remove, getCourses };
