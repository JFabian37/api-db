const { Op } = require('sequelize');
const { Movimiento, Producto, Usuario, Proveedor } = require('../models');
const { TIPOS, registrarMovimiento, anularMovimiento } = require('../services/kardexService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { leerPaginacion, respuestaPaginada } = require('../utils/paginar');
const { leerId, elegirCampos, leerBusqueda, condicionBusqueda } = require('../utils/consultas');

const NO_ENCONTRADO = 'Movimiento no encontrado';

const incluirRelaciones = (filtroProducto) => [
    {
        model: Producto,
        as: 'producto',
        attributes: ['id', 'codigo', 'nombre'],
        ...(filtroProducto && { where: filtroProducto, required: true })
    },
    { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
    { model: Proveedor, as: 'proveedor', attributes: ['id', 'razon_social'] }
];

// Una fecha sin hora cubre el dia completo: "hasta" incluye hasta su ultimo milisegundo
const leerFecha = (valor, campo, horaDelDia) => {
    const texto = String(valor);
    const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T${horaDelDia}` : texto);

    if (Number.isNaN(fecha.getTime())) {
        throw new ApiError(400, 'Datos inválidos', { [campo]: 'La fecha no es válida' });
    }
    return fecha;
};

const filtroFechas = ({ desde, hasta }) => {
    const rango = {};
    if (desde) rango[Op.gte] = leerFecha(desde, 'desde', '00:00:00');
    if (hasta) rango[Op.lte] = leerFecha(hasta, 'hasta', '23:59:59.999');
    return Object.getOwnPropertySymbols(rango).length > 0 ? { fecha_hora: rango } : {};
};

const filtroTipo = ({ tipo }) => {
    if (!tipo) return {};
    if (!TIPOS.includes(tipo)) {
        throw new ApiError(400, 'Datos inválidos', { tipo: 'El tipo de movimiento no es válido' });
    }
    return { tipo_movimiento: tipo };
};

const listar = asyncHandler(async (req, res) => {
    const paginacion = leerPaginacion(req.query);
    const texto = leerBusqueda(req.query);
    const productoId = Number(req.query.producto_id);

    const resultado = await Movimiento.findAndCountAll({
        include: incluirRelaciones(texto && condicionBusqueda(texto, ['nombre', 'codigo'])),
        where: {
            ...filtroTipo(req.query),
            ...filtroFechas(req.query),
            ...(Number.isInteger(productoId) && productoId > 0 && { producto_id: productoId })
        },
        order: [['fecha_hora', 'DESC'], ['id', 'DESC']],
        limit: paginacion.limit,
        offset: paginacion.offset
    });

    res.json(respuestaPaginada(resultado, paginacion));
});

const buscarConRelaciones = (id) => Movimiento.findByPk(id, { include: incluirRelaciones() });

const crear = asyncHandler(async (req, res) => {
    // El autor sale del token, nunca del body: asi no se puede falsificar
    const datos = elegirCampos(req.body, ['producto_id', 'proveedor_id', 'tipo_movimiento', 'cantidad', 'observaciones']);
    const movimiento = await registrarMovimiento({ ...datos, usuario_id: req.usuario.id });

    res.status(201).json({ data: await buscarConRelaciones(movimiento.id) });
});

const anular = asyncHandler(async (req, res) => {
    const movimiento = await anularMovimiento(leerId(req.params.id, NO_ENCONTRADO));

    res.json({ data: await buscarConRelaciones(movimiento.id), mensaje: 'Movimiento anulado' });
});

module.exports = { listar, crear, anular };
