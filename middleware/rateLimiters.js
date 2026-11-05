const { rateLimit } = require('express-rate-limit');

const VENTANA_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const crearLimite = (limite, mensaje) => rateLimit({
    windowMs: VENTANA_MS,
    limit: limite,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: mensaje, detalles: null }
});

const limiteGeneral = crearLimite(
    Number(process.env.RATE_LIMIT_MAX) || 1000,
    'Demasiadas peticiones. Intenta de nuevo más tarde.'
);

const limiteLogin = crearLimite(
    Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
    'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'
);

module.exports = { limiteGeneral, limiteLogin };
