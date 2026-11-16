// AUTHORIZATION level 2 (resource-based): "Are you responsible for THIS course?"
//
// A role check is not enough: Teacher 5 and Teacher 7 are both 'teacher', but only the one
// who owns the course may grade it.
//
//   Request -> authenticated? -> role teacher/admin? -> WHICH course? -> who owns it?
//           -> current teacher === course.teacher_id ? allow : 403
const courseModel = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');

// Pure decision function, reusable from controllers and easy to unit test.
function canManageCourse(user, course) {
  if (user.role === 'admin') return true;
  return user.role === 'teacher' && user.teacherId !== null && user.teacherId === course.teacher_id;
}

// `paramName` = which route param holds the course id (':courseId' for grades, ':id' for /courses/:id/students)
const authorizeCourseTeacher = (paramName = 'courseId') =>
  asyncHandler(async (req, res, next) => {
    const courseId = parseId(req.params[paramName], paramName);

    const course = await courseModel.findById(courseId);
    if (!course) throw new AppError(404, 'Course not found');

    if (!canManageCourse(req.user, course)) {
      throw new AppError(403, 'Forbidden: you are not the responsible teacher of this course');
    }

    req.course = course; // hand it to the controller so it does not query again
    next();
  });

module.exports = { authorizeCourseTeacher, canManageCourse };
