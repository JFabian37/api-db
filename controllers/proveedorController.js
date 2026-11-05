const { Proveedor } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { leerPaginacion, respuestaPaginada } = require('../utils/paginar');
const { buscarOFallar, elegirCampos, leerBusqueda, condicionBusqueda, filtroActivo } = require('../utils/consultas');

const CAMPOS = ['razon_social', 'ruc', 'contacto', 'telefono', 'email', 'activo'];
const NO_ENCONTRADO = 'Proveedor no encontrado';

const listar = asyncHandler(async (req, res) => {
    const paginacion = leerPaginacion(req.query);
    const texto = leerBusqueda(req.query);

    const resultado = await Proveedor.findAndCountAll({
        where: {
            ...filtroActivo(req.query),
            ...(texto && condicionBusqueda(texto, ['razon_social', 'ruc', 'contacto']))
        },
        order: [['razon_social', 'ASC']],
        limit: paginacion.limit,
        offset: paginacion.offset
    });

    res.json(respuestaPaginada(resultado, paginacion));
});

const crear = asyncHandler(async (req, res) => {
    const proveedor = await Proveedor.create(elegirCampos(req.body, CAMPOS));
    res.status(201).json({ data: proveedor });
});

const actualizar = asyncHandler(async (req, res) => {
    const proveedor = await buscarOFallar(Proveedor, req.params.id, NO_ENCONTRADO);
    await proveedor.update(elegirCampos(req.body, CAMPOS));
    res.json({ data: proveedor });
});

// Los productos y movimientos del proveedor quedan sin proveedor (SET NULL)
const eliminar = asyncHandler(async (req, res) => {
    const proveedor = await buscarOFallar(Proveedor, req.params.id, NO_ENCONTRADO);
    await proveedor.destroy();
    res.json({ mensaje: 'Proveedor eliminado' });
});

module.exports = { listar, crear, actualizar, eliminar };
