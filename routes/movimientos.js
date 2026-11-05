const { Router } = require('express');
const { listar, crear, anular } = require('../controllers/movimientoController');
const { autenticar } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', autenticar(), listar);
router.post('/', autenticar(['Administrador', 'Almacenero']), crear);
router.patch('/:id/anular', autenticar(['Administrador']), anular);

module.exports = router;
