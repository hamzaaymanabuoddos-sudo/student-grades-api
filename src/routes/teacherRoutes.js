const router = require('express').Router();
const c = require('../controllers/teacherController');
const authenticate = require('../middlewares/authMiddleware');
const { authorizeRole, authorizeSelfOrAdmin } = require('../middlewares/authorizeRole');

router.use(authenticate);

router.get('/', authorizeRole('admin'), c.list);
router.post('/', authorizeRole('admin'), c.create);

router.get('/:id', authorizeSelfOrAdmin('teacher'), c.getById);
router.put('/:id', authorizeRole('admin'), c.update);
router.delete('/:id', authorizeRole('admin'), c.remove);

router.get('/:id/courses', authorizeSelfOrAdmin('teacher'), c.getCourses);

module.exports = router;
