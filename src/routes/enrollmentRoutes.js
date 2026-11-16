const router = require('express').Router();
const c = require('../controllers/enrollmentController');
const authenticate = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/authorizeRole');

router.use(authenticate, authorizeRole('admin')); // the whole router is admin-only

router.get('/', c.list);
router.post('/', c.create);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;
