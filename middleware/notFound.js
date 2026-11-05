const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
    next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
