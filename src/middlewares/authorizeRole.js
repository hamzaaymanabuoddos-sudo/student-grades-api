// AUTHORIZATION level 1 (role-based): "Is your ROLE allowed to use this endpoint?"
// Runs AFTER authMiddleware (needs req.user). A failure here is a 403: we know who you are, but no.
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/validators');

// Usage: router.post('/', authenticate, authorizeRole('admin'), controller)
const authorizeRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError(403, `Forbidden: requires role ${allowedRoles.join(' or ')}`));
  }
  next();
};

// "Only the owner of this profile, or an admin."
// Example: GET /api/students/7/transcript -> a student may only open THEIR OWN id.
const PROFILE_KEY = { student: 'studentId', teacher: 'teacherId' };

const authorizeSelfOrAdmin = (ownerRole, paramName = 'id') => (req, res, next) => {
  try {
    if (!req.user) throw new AppError(401, 'Authentication required');
    if (req.user.role === 'admin') return next();
    const requestedId = parseId(req.params[paramName], paramName);
    if (req.user.role === ownerRole && req.user[PROFILE_KEY[ownerRole]] === requestedId) return next();
    throw new AppError(403, `Forbidden: you can only access your own ${ownerRole} data`);
  } catch (err) {
    next(err);
  }
};

module.exports = { authorizeRole, authorizeSelfOrAdmin };
