const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const leerToken = (req) => {
    const [esquema, token] = (req.headers.authorization || '').split(' ');
    if (esquema !== 'Bearer' || !token) {
        throw new ApiError(401, 'Debes iniciar sesión');
    }
    return token;
};

const verificarToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (error) {
        const expirado = error.name === 'TokenExpiredError';
        throw new ApiError(401, expirado ? 'Tu sesión expiró. Inicia sesión de nuevo.' : 'Token inválido');
    }
};

// autenticar()                 -> cualquier usuario con sesion
// autenticar(['Administrador']) -> ademas exige uno de esos roles
const autenticar = (roles = []) => asyncHandler(async (req, res, next) => {
    const { id } = verificarToken(leerToken(req));

    // Se consulta la BD en cada peticion: un usuario desactivado pierde el acceso al
    // momento, y el rol vigente es el de la BD, no el que tenia cuando se creo el token
    const usuario = await Usuario.findByPk(id);
    if (!usuario || !usuario.activo) {
        throw new ApiError(401, 'Tu cuenta no está disponible');
    }

    req.usuario = usuario;

    if (roles.length > 0 && !roles.includes(usuario.rol)) {
        throw new ApiError(403, 'No tienes permisos para esta acción');
    }

    next();
});

module.exports = { autenticar };
