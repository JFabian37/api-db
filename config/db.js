const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false, // Para no saturar la consola con consultas SQL
        define: {
            underscored: true // created_at, updated_at y llaves foraneas en snake_case
        }
    }
);

module.exports = sequelize;
