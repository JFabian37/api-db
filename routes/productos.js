const { Router } = require('express');
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/productoController');
const { autenticar } = require('../middleware/authMiddleware');

const router = Router();
const gestionan = autenticar(['Administrador', 'Almacenero']);

router.get('/', autenticar(), listar);
router.get('/:id', autenticar(), obtener);
router.post('/', gestionan, crear);
router.put('/:id', gestionan, actualizar);
router.delete('/:id', autenticar(['Administrador']), eliminar);

module.exports = router;
