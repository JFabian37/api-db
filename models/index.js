const sequelize = require('../config/db');
const Categoria = require('./Categoria');
const Proveedor = require('./Proveedor');
const Usuario = require('./Usuario');
const Producto = require('./Producto');
const Movimiento = require('./Movimiento');

// Registra los dos lados de una relacion 1-N con la misma regla de borrado
const unoAMuchos = (padre, hijo, { fk, comoHijos, comoPadre, obligatoria, onDelete }) => {
    const opciones = { onDelete, onUpdate: 'CASCADE' };

    padre.hasMany(hijo, {
        ...opciones,
        as: comoHijos,
        foreignKey: { name: fk, allowNull: !obligatoria }
    });
    hijo.belongsTo(padre, {
        ...opciones,
        as: comoPadre,
        foreignKey: { name: fk, allowNull: !obligatoria }
    });
};

// Una categoria con productos no se puede borrar
unoAMuchos(Categoria, Producto, {
    fk: 'categoria_id',
    comoHijos: 'productos',
    comoPadre: 'categoria',
    obligatoria: true,
    onDelete: 'RESTRICT'
});

// Si se borra un proveedor, el producto queda sin proveedor
unoAMuchos(Proveedor, Producto, {
    fk: 'proveedor_id',
    comoHijos: 'productos',
    comoPadre: 'proveedor',
    obligatoria: false,
    onDelete: 'SET NULL'
});

// El historial del kardex no se pierde
unoAMuchos(Producto, Movimiento, {
    fk: 'producto_id',
    comoHijos: 'movimientos',
    comoPadre: 'producto',
    obligatoria: true,
    onDelete: 'RESTRICT'
});

unoAMuchos(Usuario, Movimiento, {
    fk: 'usuario_id',
    comoHijos: 'movimientos',
    comoPadre: 'usuario',
    obligatoria: true,
    onDelete: 'RESTRICT'
});

unoAMuchos(Proveedor, Movimiento, {
    fk: 'proveedor_id',
    comoHijos: 'movimientos',
    comoPadre: 'proveedor',
    obligatoria: false,
    onDelete: 'SET NULL'
});

module.exports = { sequelize, Categoria, Proveedor, Usuario, Producto, Movimiento };
