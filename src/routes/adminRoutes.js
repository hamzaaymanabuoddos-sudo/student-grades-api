const router = require('express').Router();
const c = require('../controllers/adminController');
const authenticate = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/authorizeRole');

router.use(authenticate, authorizeRole('admin'));

router.get('/users', c.listUsers);
router.get('/users/:id', c.getUser);
router.delete('/users/:id', c.deleteUser);
router.post('/admins', c.createAdmin);
router.get('/stats', c.stats);

module.exports = router;
