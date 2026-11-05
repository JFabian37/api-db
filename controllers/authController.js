const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const firmarToken = (usuario) => jwt.sign(
    { id: usuario.id },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
);

const registrar = asyncHandler(async (req, res) => {
    const { nombre, email, password, rol } = req.body ?? {};
    const usuario = await Usuario.create({ nombre, email, password, rol });

    res.status(201).json({ usuario });
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    const detalles = {};
    if (typeof email !== 'string' || !email.trim()) detalles.email = 'El correo es obligatorio';
    if (typeof password !== 'string' || !password) detalles.password = 'La contraseña es obligatoria';
    if (Object.keys(detalles).length > 0) throw new ApiError(400, 'Datos inválidos', detalles);

    const usuario = await Usuario.scope('conPassword').findOne({
        where: { email: email.trim().toLowerCase() }
    });

    // El mismo mensaje en ambos casos: no se revela si el correo existe
    if (!usuario || !(await usuario.validarPassword(password))) {
        throw new ApiError(401, 'Correo o contraseña incorrectos');
    }

    if (!usuario.activo) {
        throw new ApiError(403, 'Tu cuenta está desactivada');
    }

    res.json({ token: firmarToken(usuario), usuario });
});

const perfil = (req, res) => {
    res.json({ usuario: req.usuario });
};

module.exports = { registrar, login, perfil };
