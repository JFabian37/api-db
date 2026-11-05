// Error controlado de la API: lleva el codigo HTTP y, opcionalmente, errores por campo
class ApiError extends Error {
    constructor(status, mensaje, detalles = null) {
        super(mensaje);
        this.name = 'ApiError';
        this.status = status;
        this.detalles = detalles;
    }
}

module.exports = ApiError;
