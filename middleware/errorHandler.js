const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const ApiError = require('../utils/ApiError');

// Convierte la lista de errores de Sequelize en { campo: mensaje }
const erroresPorCampo = (error) => {
    const detalles = {};
    for (const { path, message } of error.errors) {
        if (path && !detalles[path]) detalles[path] = message;
    }
    return detalles;
};

// Mismo significado, misma forma de respuesta: { status, error, detalles }
const traducirError = (error) => {
    if (error instanceof ApiError) {
        return { status: error.status, error: error.message, detalles: error.detalles };
    }

    // UniqueConstraintError hereda de ValidationError: debe evaluarse primero
    if (error instanceof UniqueConstraintError) {
        return { status: 409, error: 'El registro ya existe', detalles: erroresPorCampo(error) };
    }

    if (error instanceof ValidationError) {
        return { status: 400, error: 'Datos inválidos', detalles: erroresPorCampo(error) };
    }

    if (error instanceof ForeignKeyConstraintError) {
        // parent: se intento borrar un registro que otros usan. child: se referencio uno inexistente
        if (error.reltype === 'parent') {
            return { status: 409, error: 'No se puede eliminar: tiene registros asociados', detalles: null };
        }
        const campo = [].concat(error.fields ?? [])[0];
        return {
            status: 400,
            error: 'Datos inválidos',
            detalles: campo ? { [campo]: 'El registro seleccionado no existe' } : null
        };
    }

    // Errores de express.json(): cuerpo mal formado o demasiado grande
    if (error.type === 'entity.parse.failed') {
        return { status: 400, error: 'El cuerpo de la petición no es JSON válido', detalles: null };
    }
    if (error.type === 'entity.too.large') {
        return { status: 413, error: 'El cuerpo de la petición es demasiado grande', detalles: null };
    }

    return null;
};

// Express reconoce un manejador de errores porque recibe cuatro parametros
// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    const traducido = traducirError(error);
    if (traducido) {
        const { status, ...cuerpo } = traducido;
        return res.status(status).json({ ok: false, detalles: null, ...cuerpo });
    }

    // Error inesperado: el detalle queda en el servidor, nunca en la respuesta
    console.error(error);
    res.status(500).json({ ok: false, error: 'Error interno del servidor', detalles: null });
};

module.exports = errorHandler;
