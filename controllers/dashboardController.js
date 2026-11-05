const { Op, col, fn, literal, QueryTypes } = require('sequelize');
const { sequelize, Categoria, Proveedor, Producto, Movimiento, Usuario } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const SOLO_ACTIVOS = { where: { activo: true } };

const contarBajoStock = () => Producto.count({
    where: { activo: true, stock: { [Op.lte]: col('stock_minimo') } }
});

const calcularValorizacion = async () => {
    const fila = await Producto.findOne({
        attributes: [[fn('COALESCE', fn('SUM', literal('precio * stock')), 0), 'valorizacion']],
        where: { activo: true },
        raw: true
    });
    return Number(fila.valorizacion);
};

const movimientosRecientes = () => Movimiento.findAll({
    include: [
        { model: Producto, as: 'producto', attributes: ['id', 'codigo', 'nombre'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] }
    ],
    order: [['fecha_hora', 'DESC'], ['id', 'DESC']],
    limit: 5
});

const stockPorCategoria = async () => {
    const filas = await sequelize.query(
        `SELECT c.id, c.nombre, COALESCE(SUM(p.stock), 0) AS stock
         FROM categorias AS c
         LEFT JOIN productos AS p ON p.categoria_id = c.id AND p.activo = 1
         WHERE c.activo = 1
         GROUP BY c.id, c.nombre
         ORDER BY stock DESC, c.nombre ASC`,
        { type: QueryTypes.SELECT }
    );
    return filas.map((fila) => ({ ...fila, stock: Number(fila.stock) }));
};

const resumen = asyncHandler(async (req, res) => {
    const [
        total_productos,
        total_categorias,
        total_proveedores,
        bajo_stock,
        valorizacion,
        movimientos_recientes,
        stock_por_categoria
    ] = await Promise.all([
        Producto.count(SOLO_ACTIVOS),
        Categoria.count(SOLO_ACTIVOS),
        Proveedor.count(SOLO_ACTIVOS),
        contarBajoStock(),
        calcularValorizacion(),
        movimientosRecientes(),
        stockPorCategoria()
    ]);

    res.json({
        data: {
            total_productos,
            total_categorias,
            total_proveedores,
            bajo_stock,
            valorizacion,
            movimientos_recientes,
            stock_por_categoria
        }
    });
});

module.exports = { resumen };
