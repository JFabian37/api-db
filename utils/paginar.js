const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 100;

const leerPositivo = (valor, porDefecto) => {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : porDefecto;
};

// Lee ?page= y ?limit= sin confiar en lo que llegue
const leerPaginacion = (query) => {
    const page = leerPositivo(query.page, 1);
    const limit = Math.min(leerPositivo(query.limit, LIMITE_POR_DEFECTO), LIMITE_MAXIMO);

    return { page, limit, offset: (page - 1) * limit };
};

// Forma comun de todos los listados
const respuestaPaginada = ({ rows, count }, { page, limit }) => ({
    data: rows,
    meta: { total: count, page, limit, pages: Math.ceil(count / limit) }
});

module.exports = { leerPaginacion, respuestaPaginada };
