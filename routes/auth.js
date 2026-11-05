const { Router } = require('express');
const { registrar, login, perfil } = require('../controllers/authController');
const { autenticar } = require('../middleware/authMiddleware');
const { limiteLogin } = require('../middleware/rateLimiters');

const router = Router();

router.post('/login', limiteLogin, login);
router.post('/register', autenticar(['Administrador']), registrar);
router.get('/perfil', autenticar(), perfil);

module.exports = router;
