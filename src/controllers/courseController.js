const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { rules, optional, required, validate, requireAtLeastOne, parseId, parsePagination } = require('../utils/validators');
const courseModel = require('../models/courseModel');
const teacherModel = require('../models/teacherModel');

const list = asyncHandler(async (req, res) => {
  ok(res, await courseModel.list(parsePagination(req.query)));
});

const getById = asyncHandler(async (req, res) => {
  const course = await courseModel.findById(parseId(req.params.id, 'id'));
  if (!course) throw new AppError(404, 'Course not found');
  ok(res, course);
});

// POST /api/courses (admin). Business rule: a course must have a VALID responsible teacher.
const create = asyncHandler(async (req, res) => {
  const { code, name, creditHours, teacherId } = req.body;
  validate({
    code: required(rules.courseCode, code),
    name: required(rules.name, name),
    creditHours: required(rules.creditHours, creditHours),
    teacherId: required(rules.id, teacherId),
  });
  if (!(await teacherModel.findById(teacherId))) throw new AppError(404, 'Teacher not found');

  const course = await courseModel.create({
    code: code.trim().toUpperCase(),
    name: name.trim(),
    creditHours,
    teacherId,
  });
  ok(res, course, 201);
});

const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'id');
  const { code, name, creditHours, teacherId } = req.body;
  requireAtLeastOne({ code, name, creditHours, teacherId });
  validate({
    code: optional(rules.courseCode, code),
    name: optional(rules.name, name),
    creditHours: optional(rules.creditHours, creditHours),
    teacherId: optional(rules.id, teacherId),
  });
  if (teacherId !== undefined && !(await teacherModel.findById(teacherId))) {
    throw new AppError(404, 'Teacher not found');
  }
  const updated = await courseModel.update(id, {
    code: code === undefined ? undefined : code.trim().toUpperCase(),
    name: name === undefined ? undefined : name.trim(),
    creditHours,
    teacherId,
  });
  if (!updated) throw new AppError(404, 'Course not found');
  ok(res, updated);
});

// DELETE: 409 if the course still has enrollments (ON DELETE RESTRICT)
const remove = asyncHandler(async (req, res) => {
  const deleted = await courseModel.remove(parseId(req.params.id, 'id'));
  if (!deleted) throw new AppError(404, 'Course not found');
  ok(res, { message: 'Course deleted' });
});

// GET /api/courses/:id/students  (responsible teacher or admin; checked by authorizeCourseTeacher)
const getStudents = asyncHandler(async (req, res) => {
  ok(res, { course: req.course, students: await courseModel.findStudents(req.course.id) });
});

module.exports = { list, getById, create, update, remove, getStudents };
