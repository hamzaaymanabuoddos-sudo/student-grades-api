// Application-level validation. It gives friendly 400 errors BEFORE we hit the database.
// The database constraints (schema.sql) remain as the second line of defense.
const AppError = require('./AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STUDENT_NO_RE = /^[A-Za-z0-9]{4,20}$/;
const COURSE_CODE_RE = /^[A-Za-z]{2,5}[0-9]{3}$/;
const ROLES = ['student', 'teacher', 'admin'];

const isString = (v) => typeof v === 'string';

// Each rule returns an error message, or null when the value is valid.
const rules = {
  id: (v) => (Number.isInteger(v) && v > 0 ? null : 'must be a positive integer'),
  email: (v) => (isString(v) && v.length <= 255 && EMAIL_RE.test(v.trim()) ? null : 'must be a valid email address'),
  password: (v) => {
    if (!isString(v)) return 'is required';
    if (v.length < 8) return 'must be at least 8 characters';
    if (v.length > 72) return 'must be at most 72 characters (bcrypt limit)';
    if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'must contain at least one letter and one number';
    return null;
  },
  fullName: (v) => (isString(v) && v.trim().length >= 2 && v.trim().length <= 150 ? null : 'must be 2-150 characters'),
  name: (v) => (isString(v) && v.trim().length >= 2 && v.trim().length <= 150 ? null : 'must be 2-150 characters'),
  studentNo: (v) => (isString(v) && STUDENT_NO_RE.test(v.trim()) ? null : 'must be 4-20 letters/digits (e.g. S2024001)'),
  courseCode: (v) => (isString(v) && COURSE_CODE_RE.test(v.trim()) ? null : 'must look like CS101 (2-5 letters + 3 digits)'),
  creditHours: (v) => (Number.isInteger(v) && v >= 1 && v <= 6 ? null : 'must be an integer between 1 and 6'),
  grade: (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? null : 'must be a number between 0 and 100'),
  role: (v) => (ROLES.includes(v) ? null : `must be one of: ${ROLES.join(', ')}`),
};

// For PUT bodies where every field is optional: undefined = "not provided" = valid.
const optional = (rule, value) => (value === undefined ? null : rule(value));

// Required-field helper: runs the rule, but reports "is required" when the value is missing.
const required = (rule, value) => (value === undefined || value === null ? 'is required' : rule(value));

// Throws ONE 400 error listing every invalid field.
function validate(checks) {
  const errors = {};
  for (const [field, message] of Object.entries(checks)) {
    if (message) errors[field] = `${field} ${message}`;
  }
  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'Validation failed', errors);
  }
}

function requireAtLeastOne(obj, label = 'field') {
  if (Object.values(obj).every((v) => v === undefined)) {
    throw new AppError(400, `Provide at least one ${label} to update`);
  }
}

// Route params arrive as strings ("5"). Convert and verify.
function parseId(value, name = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, `${name} must be a positive integer`);
  return n;
}

function parsePagination(query) {
  let limit = parseInt(query.limit, 10);
  let offset = parseInt(query.offset, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  if (!Number.isInteger(offset) || offset < 0) offset = 0;
  return { limit, offset };
}

const normalizeEmail = (email) => email.trim().toLowerCase();

module.exports = { rules, optional, required, validate, requireAtLeastOne, parseId, parsePagination, normalizeEmail };
