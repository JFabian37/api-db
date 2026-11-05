const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Categoria = sequelize.define('Categoria', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: { name: 'uq_categorias_nombre', msg: 'Ya existe una categoría con ese nombre' },
        validate: {
            notNull: { msg: 'El nombre es obligatorio' },
            notEmpty: { msg: 'El nombre es obligatorio' }
        }
    },
    descripcion: {
        type: DataTypes.TEXT
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'categorias'
});

module.exports = Categoria;
