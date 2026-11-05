const { Op, col } = require('sequelize');
const { sequelize, Producto, Categoria, Proveedor, Movimiento } = require('../models');
const { registrarMovimiento } = require('../services/kardexService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { leerPaginacion, respuestaPaginada } = require('../utils/paginar');
const { buscarOFallar, elegirCampos, leerBusqueda, condicionBusqueda, filtroActivo } = require('../utils/consultas');

// stock no esta aqui: despues de crearse, solo el kardex puede cambiarlo
const CAMPOS = ['codigo', 'nombre', 'descripcion', 'precio', 'stock_minimo', 'categoria_id', 'proveedor_id', 'activo'];
const NO_ENCONTRADO = 'Producto no encontrado';

const RELACIONES = [
    { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
    { model: Proveedor, as: 'proveedor', attributes: ['id', 'razon_social'] }
];

// Un select vacio envia "": categoria debe fallar como obligatoria y proveedor queda sin asignar
const normalizarCampos = (cuerpo) => {
    const campos = elegirCampos(cuerpo, CAMPOS);
    if (campos.categoria_id === '') campos.categoria_id = null;
    if (campos.proveedor_id === '') campos.proveedor_id = null;
    if (campos.codigo === '') delete campos.codigo;
    return campos;
};

const leerStockInicial = (valor) => {
    const stock = valor === undefined || valor === null || valor === '' ? 0 : Number(valor);
    if (!Number.isInteger(stock) || stock < 0) {
        throw new ApiError(400, 'Datos inválidos', { stock: 'El stock debe ser un entero mayor o igual a 0' });
    }
    return stock;
};

const buscarConRelaciones = (id) => buscarOFallar(Producto, id, NO_ENCONTRADO, { include: RELACIONES });

const listar = asyncHandler(async (req, res) => {
    const paginacion = leerPaginacion(req.query);
    const texto = leerBusqueda(req.query);
    const categoriaId = Number(req.query.categoria_id);

    const resultado = await Producto.findAndCountAll({
        include: RELACIONES,
        where: {
            ...filtroActivo(req.query),
            ...(texto && condicionBusqueda(texto, ['nombre', 'codigo'])),
            ...(Number.isInteger(categoriaId) && categoriaId > 0 && { categoria_id: categoriaId }),
            ...(req.query.bajo_stock === '1' && { stock: { [Op.lte]: col('Producto.stock_minimo') } })
        },
        order: [['nombre', 'ASC']],
        limit: paginacion.limit,
        offset: paginacion.offset
    });

    res.json(respuestaPaginada(resultado, paginacion));
});

const obtener = asyncHandler(async (req, res) => {
    res.json({ data: await buscarConRelaciones(req.params.id) });
});

// El stock inicial entra por el kardex, en la misma transaccion: si falla, no queda el producto
const crear = asyncHandler(async (req, res) => {
    const stockInicial = leerStockInicial(req.body?.stock);

    const { id } = await sequelize.transaction(async (transaction) => {
        const producto = await Producto.create(normalizarCampos(req.body), { transaction });

        if (stockInicial > 0) {
            await registrarMovimiento({
                producto_id: producto.id,
                usuario_id: req.usuario.id,
                proveedor_id: producto.proveedor_id,
                tipo_movimiento: 'Entrada',
                cantidad: stockInicial,
                observaciones: 'Stock inicial'
            }, { transaction });
        }

        return producto;
    });

    res.status(201).json({ data: await buscarConRelaciones(id) });
});

const actualizar = asyncHandler(async (req, res) => {
    const producto = await buscarOFallar(Producto, req.params.id, NO_ENCONTRADO);
    await producto.update(normalizarCampos(req.body));
    res.json({ data: await buscarConRelaciones(producto.id) });
});

const eliminar = asyncHandler(async (req, res) => {
    const producto = await buscarOFallar(Producto, req.params.id, NO_ENCONTRADO);

    // Con historial no se borra: se desactiva para conservar el kardex
    if (await Movimiento.count({ where: { producto_id: producto.id } })) {
        await producto.update({ activo: false });
        return res.json({ mensaje: 'El producto tiene movimientos: se marcó como inactivo' });
    }

    await producto.destroy();
    res.json({ mensaje: 'Producto eliminado' });
});

module.exports = { listar, obtener, crear, actualizar, eliminar };
