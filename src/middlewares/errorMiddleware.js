// CENTRALIZED ERROR HANDLING.
// Any error thrown (or passed to next(err)) anywhere ends up in errorHandler.
// Controllers stay clean: they just `throw new AppError(404, '...')`.
const AppError = require('../utils/AppError');
const env = require('../config/env');

// Friendly messages for named constraints from schema.sql
const CONSTRAINT_MESSAGES = {
  users_email_key: 'This email is already registered',
  students_student_no_key: 'This student number already exists',
  courses_code_key: 'This course code already exists',
  enrollments_student_id_course_id_key: 'Student is already enrolled in this course',
  enrollments_grade_range: 'Grade must be between 0 and 100',
  courses_credit_range: 'Credit hours must be between 1 and 6',
};

function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Translate PostgreSQL error codes -> HTTP errors. This is the "database as second line of defense" in action.
function fromPgError(err) {
  const friendly = CONSTRAINT_MESSAGES[err.constraint];
  switch (err.code) {
    case '23505': // unique_violation
      return new AppError(409, friendly || 'Duplicate value violates a unique constraint');
    case '23503': // foreign_key_violation
      if (/still referenced/i.test(err.detail || '')) {
        return new AppError(409, 'Cannot delete: other records still depend on this one (e.g. a teacher with courses, or a course with enrollments)');
      }
      return new AppError(404, 'A referenced record does not exist');
    case '23514': // check_violation
      return new AppError(400, friendly || 'Value violates a database check constraint');
    case '23502': // not_null_violation
      return new AppError(400, `Missing required value: ${err.column}`);
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
      return new AppError(400, 'Invalid input value');
    default:
      return null;
  }
}

// Express recognizes an error handler by its 4 parameters - keep `next` even if unused.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (err.type === 'entity.parse.failed') {
    error = new AppError(400, 'Malformed JSON in request body');
  } else if (err.type === 'entity.too.large') {
    error = new AppError(413, 'Request body too large');
  } else if (!(err instanceof AppError) && typeof err.code === 'string') {
    error = fromPgError(err) || err;
  }

  const status = error instanceof AppError ? error.statusCode : 500;

  if (status === 500) {
    console.error('[error]', err); // log the real cause on the server...
  }

  // ...but never leak internals to the client in production.
  const message = status === 500 && env.isProduction ? 'Internal server error' : error.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    ...(error.details ? { details: error.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
