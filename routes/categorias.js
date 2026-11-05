const { Router } = require('express');
const { listar, crear, actualizar, eliminar } = require('../controllers/categoriaController');
const { autenticar } = require('../middleware/authMiddleware');

const router = Router();

router.get('/', autenticar(), listar);
router.post('/', autenticar(['Administrador']), crear);
router.put('/:id', autenticar(['Administrador']), actualizar);
router.delete('/:id', autenticar(['Administrador']), eliminar);

module.exports = router;
