const mysql = require('mysql2/promise');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

// Sequelize crea las tablas, pero no la base de datos: hay que crearla antes de conectar
const crearBaseDeDatos = async () => {
    const conexion = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    });
    await conexion.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await conexion.end();
};

// sync() no modifica tablas existentes, asi que la tabla del CRUD anterior (con createdAt
// y sin llaves foraneas) debe retirarse. Nunca se borra si contiene datos.
const retirarTablaAnterior = async () => {
    const [{ total }] = await sequelize.query(
        `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productos' AND COLUMN_NAME = 'createdAt'`,
        { type: QueryTypes.SELECT }
    );
    if (Number(total) === 0) return;

    const [{ filas }] = await sequelize.query('SELECT COUNT(*) AS filas FROM productos', {
        type: QueryTypes.SELECT
    });
    if (Number(filas) > 0) {
        throw new Error(
            `La tabla productos usa el esquema anterior y tiene ${filas} fila(s). ` +
            'No se borro nada: respalda esos datos y vacia la tabla antes de continuar.'
        );
    }

    await sequelize.query('DROP TABLE productos');
    console.log('Tabla productos anterior retirada (estaba vacia).');
};

const prepararBaseDatos = async () => {
    await crearBaseDeDatos();
    await retirarTablaAnterior();
    // force: false evita que se borren los datos cada vez que se reinicia el servidor
    await sequelize.sync({ force: false });
};

module.exports = prepararBaseDatos;
