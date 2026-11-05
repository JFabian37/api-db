const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Un formulario envia "" en los campos vacios; se guardan como null para que
// las validaciones de formato solo se apliquen cuando hay un valor real
const vacioANull = (campo) => function (valor) {
    const limpio = typeof valor === 'string' ? valor.trim() : valor;
    this.setDataValue(campo, limpio === '' ? null : limpio);
};

const Proveedor = sequelize.define('Proveedor', {
    razon_social: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            notNull: { msg: 'La razón social es obligatoria' },
            notEmpty: { msg: 'La razón social es obligatoria' }
        }
    },
    ruc: {
        type: DataTypes.STRING(11),
        set: vacioANull('ruc'),
        validate: {
            is: { args: /^\d{11}$/, msg: 'El RUC debe tener 11 dígitos' }
        }
    },
    contacto: {
        type: DataTypes.STRING(100),
        set: vacioANull('contacto')
    },
    telefono: {
        type: DataTypes.STRING(20),
        set: vacioANull('telefono')
    },
    email: {
        type: DataTypes.STRING(150),
        set: vacioANull('email'),
        validate: {
            isEmail: { msg: 'El correo no es válido' }
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'proveedores'
});

module.exports = Proveedor;
