const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Movimiento = sequelize.define('Movimiento', {
    producto_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    proveedor_id: {
        type: DataTypes.INTEGER
    },
    tipo_movimiento: {
        type: DataTypes.ENUM('Entrada', 'Salida', 'Ajuste'),
        allowNull: false
    },
    // En un Ajuste, cantidad es el stock final deseado
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: { args: [0], msg: 'La cantidad no puede ser negativa' }
        }
    },
    stock_anterior: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stock_nuevo: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_hora: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    observaciones: {
        type: DataTypes.TEXT
    },
    anulado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'movimientos'
});

module.exports = Movimiento;
