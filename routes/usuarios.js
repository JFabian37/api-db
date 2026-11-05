const { Router } = require('express');
const { listar, actualizar, cambiarEstado } = require('../controllers/usuarioController');
const { autenticar } = require('../middleware/authMiddleware');

const router = Router();

// Todas las rutas de este recurso son solo para Administrador
router.use(autenticar(['Administrador']));

router.get('/', listar);
router.put('/:id', actualizar);
router.patch('/:id/estado', cambiarEstado);

module.exports = router;
