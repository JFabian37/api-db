const { literal } = require('sequelize');
const { Categoria } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { leerPaginacion, respuestaPaginada } = require('../utils/paginar');
const { buscarOFallar, elegirCampos, leerBusqueda, condicionBusqueda, filtroActivo } = require('../utils/consultas');

const CAMPOS = ['nombre', 'descripcion', 'activo'];
const NO_ENCONTRADA = 'Categoría no encontrada';

const CANTIDAD_PRODUCTOS = literal(
    '(SELECT COUNT(*) FROM productos AS p WHERE p.categoria_id = `Categoria`.`id` AND p.activo = 1)'
);

const listar = asyncHandler(async (req, res) => {
    const paginacion = leerPaginacion(req.query);
    const texto = leerBusqueda(req.query);

    const resultado = await Categoria.findAndCountAll({
        attributes: { include: [[CANTIDAD_PRODUCTOS, 'cantidad_productos']] },
        where: {
            ...filtroActivo(req.query),
            ...(texto && condicionBusqueda(texto, ['nombre', 'descripcion']))
        },
        order: [['nombre', 'ASC']],
        limit: paginacion.limit,
        offset: paginacion.offset
    });

    res.json(respuestaPaginada(resultado, paginacion));
});

const crear = asyncHandler(async (req, res) => {
    const categoria = await Categoria.create(elegirCampos(req.body, CAMPOS));
    res.status(201).json({ data: categoria });
});

const actualizar = asyncHandler(async (req, res) => {
    const categoria = await buscarOFallar(Categoria, req.params.id, NO_ENCONTRADA);
    await categoria.update(elegirCampos(req.body, CAMPOS));
    res.json({ data: categoria });
});

// La llave foranea RESTRICT impide el borrado y errorHandler lo responde como 409
const eliminar = asyncHandler(async (req, res) => {
    const categoria = await buscarOFallar(Categoria, req.params.id, NO_ENCONTRADA);
    await categoria.destroy();
    res.json({ mensaje: 'Categoría eliminada' });
});

module.exports = { listar, crear, actualizar, eliminar };
