const { Op } = require('sequelize');
const ApiError = require('./ApiError');

// Valida :id antes de consultar: MySQL convertiria "1abc" en 1
const leerId = (valor, mensaje) => {
    const id = Number(valor);
    if (!Number.isInteger(id) || id < 1) throw new ApiError(404, mensaje);
    return id;
};

const buscarOFallar = async (Modelo, valorId, mensaje, opciones = {}) => {
    const registro = await Modelo.findByPk(leerId(valorId, mensaje), opciones);
    if (!registro) throw new ApiError(404, mensaje);
    return registro;
};

// Copia solo los campos permitidos: lo demas que envie el cliente se ignora
const elegirCampos = (cuerpo, campos) => {
    const elegidos = {};
    for (const campo of campos) {
        if (cuerpo?.[campo] !== undefined) elegidos[campo] = cuerpo[campo];
    }
    return elegidos;
};

const leerBusqueda = (query) => String(query.q ?? '').trim();

// Condicion LIKE sobre varias columnas
const condicionBusqueda = (texto, columnas) => ({
    [Op.or]: columnas.map((columna) => ({ [columna]: { [Op.like]: `%${texto}%` } }))
});

// Los listados ocultan lo inactivo salvo que se pida con ?incluir_inactivos=1
const filtroActivo = (query) => (query.incluir_inactivos === '1' ? {} : { activo: true });

module.exports = { leerId, buscarOFallar, elegirCampos, leerBusqueda, condicionBusqueda, filtroActivo };
