const { Usuario } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { leerPaginacion, respuestaPaginada } = require('../utils/paginar');
const { buscarOFallar, elegirCampos, leerBusqueda, condicionBusqueda, filtroActivo } = require('../utils/consultas');

const NO_ENCONTRADO = 'Usuario no encontrado';

const listar = asyncHandler(async (req, res) => {
    const paginacion = leerPaginacion(req.query);
    const texto = leerBusqueda(req.query);
    const { rol } = req.query;

    const resultado = await Usuario.findAndCountAll({
        where: {
            ...filtroActivo(req.query),
            ...(texto && condicionBusqueda(texto, ['nombre', 'email'])),
            ...(rol && { rol })
        },
        order: [['nombre', 'ASC']],
        limit: paginacion.limit,
        offset: paginacion.offset
    });

    res.json(respuestaPaginada(resultado, paginacion));
});

const actualizar = asyncHandler(async (req, res) => {
    const usuario = await buscarOFallar(Usuario, req.params.id, NO_ENCONTRADO);
    const campos = elegirCampos(req.body, ['nombre', 'email', 'rol', 'password']);

    // Un formulario de edicion envia la clave vacia cuando no se quiere cambiar
    if (campos.password === '') delete campos.password;

    if (usuario.id === req.usuario.id && campos.rol !== undefined && campos.rol !== usuario.rol) {
        throw new ApiError(409, 'No puedes cambiar tu propio rol');
    }

    await usuario.update(campos);
    res.json({ data: usuario });
});

const cambiarEstado = asyncHandler(async (req, res) => {
    const { activo } = req.body ?? {};

    if (typeof activo !== 'boolean') {
        throw new ApiError(400, 'Datos inválidos', { activo: 'El estado debe ser true o false' });
    }

    const usuario = await buscarOFallar(Usuario, req.params.id, NO_ENCONTRADO);

    if (usuario.id === req.usuario.id && !activo) {
        throw new ApiError(409, 'No puedes desactivar tu propia cuenta');
    }

    await usuario.update({ activo });
    res.json({ data: usuario });
});

module.exports = { listar, actualizar, cambiarEstado };
