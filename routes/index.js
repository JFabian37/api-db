const { Router } = require('express');
const authRoutes = require('./auth');
const categoriaRoutes = require('./categorias');
const proveedorRoutes = require('./proveedores');
const productoRoutes = require('./productos');
const movimientoRoutes = require('./movimientos');
const usuarioRoutes = require('./usuarios');
const dashboardRoutes = require('./dashboard');

const router = Router();

router.use('/auth', authRoutes);
router.use('/categorias', categoriaRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/productos', productoRoutes);
router.use('/movimientos', movimientoRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
