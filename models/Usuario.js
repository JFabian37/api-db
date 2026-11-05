const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const SALT_ROUNDS = 10;

const Usuario = sequelize.define('Usuario', {
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notNull: { msg: 'El nombre es obligatorio' },
            notEmpty: { msg: 'El nombre es obligatorio' }
        }
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: { name: 'uq_usuarios_email', msg: 'Ya existe un usuario con ese correo' },
        set(valor) {
            this.setDataValue('email', typeof valor === 'string' ? valor.trim().toLowerCase() : valor);
        },
        validate: {
            notNull: { msg: 'El correo es obligatorio' },
            isEmail: { msg: 'El correo no es válido' }
        }
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notNull: { msg: 'La contraseña es obligatoria' },
            len: { args: [8, 72], msg: 'La contraseña debe tener entre 8 y 72 caracteres' }
        }
    },
    rol: {
        type: DataTypes.ENUM('Administrador', 'Almacenero', 'Supervisor'),
        allowNull: false,
        defaultValue: 'Almacenero',
        validate: {
            isIn: {
                args: [['Administrador', 'Almacenero', 'Supervisor']],
                msg: 'El rol no es válido'
            }
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'usuarios',
    // Ninguna consulta normal devuelve el hash
    defaultScope: {
        attributes: { exclude: ['password'] }
    },
    scopes: {
        // Solo para el login, que necesita comparar la contrasena
        conPassword: {}
    },
    hooks: {
        // Las validaciones ya corrieron sobre el texto plano; aqui solo se cifra
        beforeSave: async (usuario) => {
            if (usuario.changed('password')) {
                usuario.password = await bcrypt.hash(usuario.password, SALT_ROUNDS);
            }
        }
    }
});

Usuario.prototype.validarPassword = function (plano) {
    return bcrypt.compare(plano, this.password);
};

// create() y save() conservan el hash en la instancia: nunca debe salir en un JSON
Usuario.prototype.toJSON = function () {
    const { password, ...datos } = this.get();
    return datos;
};

module.exports = Usuario;
