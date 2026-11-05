const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Busca el siguiente codigo libre con el formato P-0001
const generarCodigo = async (Modelo, transaction) => {
    let numero = ((await Modelo.max('id', { transaction })) || 0) + 1;
    let codigo = `P-${String(numero).padStart(4, '0')}`;

    while (await Modelo.findOne({ where: { codigo }, attributes: ['id'], transaction })) {
        numero += 1;
        codigo = `P-${String(numero).padStart(4, '0')}`;
    }

    return codigo;
};

const Producto = sequelize.define('Producto', {
    // allowNull queda en true porque las validaciones corren antes de beforeCreate,
    // que es donde se genera el codigo cuando no se envia
    codigo: {
        type: DataTypes.STRING(20),
        unique: { name: 'uq_productos_codigo', msg: 'Ya existe un producto con ese código' }
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: { msg: 'El nombre es obligatorio' },
            notEmpty: { msg: 'El nombre es obligatorio' }
        }
    },
    descripcion: {
        type: DataTypes.TEXT
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        // MySQL devuelve DECIMAL como texto; la API lo entrega como numero
        get() {
            const valor = this.getDataValue('precio');
            return valor === null || valor === undefined ? valor : Number(valor);
        },
        validate: {
            notNull: { msg: 'El precio es obligatorio' },
            isDecimal: { msg: 'El precio debe ser un número' },
            min: { args: [0], msg: 'El precio no puede ser negativo' }
        }
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            isInt: { msg: 'El stock debe ser un número entero' },
            min: { args: [0], msg: 'El stock no puede ser negativo' }
        }
    },
    stock_minimo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
            isInt: { msg: 'El stock mínimo debe ser un número entero' },
            min: { args: [0], msg: 'El stock mínimo no puede ser negativo' }
        }
    },
    categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            notNull: { msg: 'La categoría es obligatoria' }
        }
    },
    proveedor_id: {
        type: DataTypes.INTEGER
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'productos',
    hooks: {
        beforeCreate: async (producto, opciones) => {
            if (!producto.codigo) {
                producto.codigo = await generarCodigo(Producto, opciones.transaction);
            }
        }
    }
});

module.exports = Producto;
