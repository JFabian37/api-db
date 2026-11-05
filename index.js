require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const prepararBaseDatos = require('./src/prepararBaseDatos');
const rutasApi = require('./routes');
const { limiteGeneral } = require('./middleware/rateLimiters');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

// Sin esta clave cualquier token seria inseguro: mejor no arrancar
if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en .env');
    process.exit(1);
}

const origenesPermitidos = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);

const app = express();

// --- MIDDLEWARES ---
// El orden importa. morgan va primero para registrar tambien las peticiones rechazadas
app.use(morgan('dev'));
app.use(helmet());
// Habilitar CORS solo para los origenes configurados en .env
app.use(cors({
    origin: origenesPermitidos,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Parsear el body de las peticiones a JSON. Debe ir antes de las rutas: si no, req.body llega undefined
app.use(express.json());
app.use('/api/', limiteGeneral);

// --- RUTAS BASICAS DE PRUEBA ---
app.get('/', (req, res) => {
    res.send('¡API Backend funcionando exitosamente!');
});

app.use('/api', rutasApi);

// --- MANEJO DE ERRORES ---
// Siempre al final: solo reciben lo que ninguna ruta atendio
app.use(notFound);
app.use(errorHandler);

// --- SINCRONIZACION Y ARRANQUE ---
const PORT = process.env.PORT || 3006;

prepararBaseDatos()
    .then(() => {
        console.log('Base de datos conectada y sincronizada.');
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error('Error al conectar con la base de datos:', error);
    });
