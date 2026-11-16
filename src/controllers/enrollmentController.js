const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ok } = require('../utils/response');
const { rules, required, validate, parseId, parsePagination } = require('../utils/validators');
const enrollmentModel = require('../models/enrollmentModel');
const studentModel = require('../models/studentModel');
const courseModel = require('../models/courseModel');
const { canManageCourse } = require('../middlewares/authorizeCourseTeacher');

// GET /api/enrollments?studentId=&courseId=   (admin)
const list = asyncHandler(async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const studentId = req.query.studentId ? parseId(req.query.studentId, 'studentId') : null;
  const courseId = req.query.courseId ? parseId(req.query.courseId, 'courseId') : null;
  ok(res, await enrollmentModel.list({ studentId, courseId, limit, offset }));
});

// POST /api/enrollments   (admin)
// Rules: student exists, course exists, not already enrolled.
const create = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.body;
  validate({ studentId: required(rules.id, studentId), courseId: required(rules.id, courseId) });

  if (!(await studentModel.findById(studentId))) throw new AppError(404, 'Student not found');
  if (!(await courseModel.findById(courseId))) throw new AppError(404, 'Course not found');
  if (await enrollmentModel.findByStudentAndCourse(studentId, courseId)) {
    throw new AppError(409, 'Student is already enrolled in this course');
  }
  // If two requests race past the check above, the UNIQUE constraint still rejects the second one (-> 409).
  ok(res, await enrollmentModel.create({ studentId, courseId }), 201);
});

// PUT /api/enrollments/:id   (admin) body: { grade: 85 } or { grade: null }
const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id, 'id');
  const { grade } = req.body;
  if (grade === undefined) throw new AppError(400, 'Validation failed', { grade: 'grade is required (number 0-100, or null to clear)' });
  if (grade !== null) validate({ grade: rules.grade(grade) });

  const updated = await enrollmentModel.updateGradeById(id, grade);
  if (!updated) throw new AppError(404, 'Enrollment not found');
  ok(res, updated);
});

// DELETE /api/enrollments/:id   (admin)
const remove = asyncHandler(async (req, res) => {
  const deleted = await enrollmentModel.remove(parseId(req.params.id, 'id'));
  if (!deleted) throw new AppError(404, 'Enrollment not found');
  ok(res, { message: 'Enrollment deleted' });
});

// ---------------------------------------------------------------------------
// GRADE ENDPOINTS: /api/courses/:courseId/students/:studentId/grade
// ---------------------------------------------------------------------------

// Shared checks: student exists + is enrolled. (Course existence + ownership were already
// verified by authorizeCourseTeacher for PUT/DELETE, or are checked in getGrade.)
async function loadEnrollment(courseId, studentId) {
  if (!(await studentModel.findById(studentId))) throw new AppError(404, 'Student not found');
  const enrollment = await enrollmentModel.findByStudentAndCourse(studentId, courseId);
  if (!enrollment) throw new AppError(404, 'Student is not enrolled in this course');
  return enrollment;
}

// PUT  -> enter or modify a grade. Auth chain: authenticate -> authorizeRole(teacher, admin) -> authorizeCourseTeacher
const setGrade = asyncHandler(async (req, res) => {
  const courseId = req.course.id;
  const studentId = parseId(req.params.studentId, 'studentId');
  validate({ grade: required(rules.grade, req.body.grade) });

  const enrollment = await loadEnrollment(courseId, studentId);
  ok(res, await enrollmentModel.updateGradeById(enrollment.id, req.body.grade));
});

// DELETE -> clear a grade (sets it back to NULL = "not graded yet")
const clearGrade = asyncHandler(async (req, res) => {
  const studentId = parseId(req.params.studentId, 'studentId');
  const enrollment = await loadEnrollment(req.course.id, studentId);
  ok(res, await enrollmentModel.updateGradeById(enrollment.id, null));
});

// GET -> view one grade.
//   student: only their own | teacher: only own course | admin: anything
const getGrade = asyncHandler(async (req, res) => {
  const courseId = parseId(req.params.courseId, 'courseId');
  const studentId = parseId(req.params.studentId, 'studentId');

  const course = await courseModel.findById(courseId);
  if (!course) throw new AppError(404, 'Course not found');

  if (req.user.role === 'student') {
    if (req.user.studentId !== studentId) throw new AppError(403, 'Forbidden: you can only view your own grades');
  } else if (!canManageCourse(req.user, course)) {
    throw new AppError(403, 'Forbidden: you are not the responsible teacher of this course');
  }

  ok(res, await loadEnrollment(courseId, studentId));
});

module.exports = { list, create, update, remove, setGrade, clearGrade, getGrade };
