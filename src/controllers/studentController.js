const { format } = require('date-fns');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { rules, optional, required, validate, requireAtLeastOne, parseId, parsePagination, normalizeEmail } = require('../utils/validators');
const { hashPassword } = require('../utils/password');
const studentModel = require('../models/studentModel');
const userModel = require('../models/userModel');
const enrollmentModel = require('../models/enrollmentModel');

async function loadStudent(idParam) {
  const id = parseId(idParam, 'id');
  const student = await studentModel.findById(id);
  if (!student) throw new AppError(404, 'Student not found');
  return student;
}

// GET /api/students?search=&limit=&offset=   (admin)
const list = asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : null;
  ok(res, await studentModel.list({ limit, offset, search }));
});

// GET /api/students/:id   (admin or the student themself)
const getById = asyncHandler(async (req, res) => {
  ok(res, await loadStudent(req.params.id));
});

// POST /api/students   (admin) - creates user + student profile
const create = asyncHandler(async (req, res) => {
  const { email, password, fullName, studentNo } = req.body;
  validate({
    email: required(rules.email, email),
    password: required(rules.password, password),
    fullName: required(rules.fullName, fullName),
    studentNo: required(rules.studentNo, studentNo),
  });
  const student = await studentModel.createWithUser({
    email: normalizeEmail(email),
    passwordHash: await hashPassword(password),
    studentNo: studentNo.trim().toUpperCase(),
    fullName: fullName.trim(),
  });
  ok(res, student, 201);
});

// PUT /api/students/:id   (admin) - partial update
const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'id');
  const { email, fullName, studentNo } = req.body;
  requireAtLeastOne({ email, fullName, studentNo });
  validate({
    email: optional(rules.email, email),
    fullName: optional(rules.fullName, fullName),
    studentNo: optional(rules.studentNo, studentNo),
  });
  const updated = await studentModel.update(id, {
    email: email === undefined ? undefined : normalizeEmail(email),
    fullName: fullName === undefined ? undefined : fullName.trim(),
    studentNo: studentNo === undefined ? undefined : studentNo.trim().toUpperCase(),
  });
  if (!updated) throw new AppError(404, 'Student not found');
  ok(res, updated);
});

// DELETE /api/students/:id   (admin)
// Deleting the USER cascades (ON DELETE CASCADE) to the student profile and the enrollments.
const remove = asyncHandler(async (req, res) => {
  const student = await loadStudent(req.params.id);
  await userModel.remove(student.user_id);
  ok(res, { message: 'Student deleted' });
});

// GET /api/students/:id/courses   (admin or the student themself)
const getCourses = asyncHandler(async (req, res) => {
  const student = await loadStudent(req.params.id);
  ok(res, await enrollmentModel.findCoursesByStudent(student.id));
});

// GET /api/students/:id/transcript   (admin or the student themself)
const getTranscript = asyncHandler(async (req, res) => {
  const student = await loadStudent(req.params.id);
  const [courses, summary] = await Promise.all([
    enrollmentModel.transcriptRows(student.id),
    enrollmentModel.transcriptSummary(student.id),
  ]);
  ok(res, {
    student: { id: student.id, studentNo: student.student_no, fullName: student.full_name, email: student.email },
    courses,
    summary,
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm'),
  });
});

module.exports = { list, getById, create, update, remove, getCourses, getTranscript };
