const router = require('express').Router();
const c = require('../controllers/studentController');
const authenticate = require('../middlewares/authMiddleware');
const { authorizeRole, authorizeSelfOrAdmin } = require('../middlewares/authorizeRole');

router.use(authenticate); // every student route requires login

router.get('/', authorizeRole('admin'), c.list);
router.post('/', authorizeRole('admin'), c.create);

router.get('/:id', authorizeSelfOrAdmin('student'), c.getById);
router.put('/:id', authorizeRole('admin'), c.update);
router.delete('/:id', authorizeRole('admin'), c.remove);

router.get('/:id/courses', authorizeSelfOrAdmin('student'), c.getCourses);
router.get('/:id/transcript', authorizeSelfOrAdmin('student'), c.getTranscript);

module.exports = router;
