const router = require('express').Router();
const courseController = require('../controllers/courseController');
const enrollmentController = require('../controllers/enrollmentController');
const authenticate = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/authorizeRole');
const { authorizeCourseTeacher } = require('../middlewares/authorizeCourseTeacher');

router.use(authenticate);

// Course catalog: any logged-in user may browse it
router.get('/', courseController.list);
router.get('/:id', courseController.getById);

// Management: admin only
router.post('/', authorizeRole('admin'), courseController.create);
router.put('/:id', authorizeRole('admin'), courseController.update);
router.delete('/:id', authorizeRole('admin'), courseController.remove);

// Students of a course: the responsible teacher (or admin)
router.get('/:id/students', authorizeRole('teacher', 'admin'), authorizeCourseTeacher('id'), courseController.getStudents);

// ----- GRADES -----
// Middleware chain for modifying a grade:
//   authenticate (router.use above) -> authorizeRole -> authorizeCourseTeacher -> controller
const gradePath = '/:courseId/students/:studentId/grade';
const canGrade = [authorizeRole('teacher', 'admin'), authorizeCourseTeacher('courseId')];

router.put(gradePath, ...canGrade, enrollmentController.setGrade);
router.delete(gradePath, ...canGrade, enrollmentController.clearGrade);
router.get(gradePath, enrollmentController.getGrade); // students/teachers/admin: checked inside the controller

module.exports = router;
