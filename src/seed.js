// Datos de ejemplo. Se puede ejecutar varias veces: solo crea lo que falta.
const prepararBaseDatos = require('./prepararBaseDatos');
const { sequelize, Categoria, Proveedor, Usuario, Producto, Movimiento } = require('../models');
const { registrarMovimiento } = require('../services/kardexService');

const CATEGORIAS = [
    { nombre: 'Accesorios', descripcion: 'Mouse, teclados y otros accesorios de escritorio' },
    { nombre: 'Almacenamiento', descripcion: 'Discos SSD, discos externos y memorias USB' },
    { nombre: 'Componentes', descripcion: 'Memorias RAM, fuentes y tarjetas' },
    { nombre: 'Monitores', descripcion: 'Monitores y soportes' },
    { nombre: 'Redes', descripcion: 'Routers, switches y cableado' }
];

const PROVEEDORES = [
    { razon_social: 'Distribuidora Andina SAC', ruc: '20999000001', contacto: 'Ana Quispe', telefono: '900000001', email: 'ventas@andina.example.com' },
    { razon_social: 'Global Partes SAC', ruc: '20999000002', contacto: 'Luis Rojas', telefono: '900000002', email: 'contacto@globalpartes.example.com' },
    { razon_social: 'Compu Mayorista SAC', ruc: '20999000003', contacto: 'Rosa Vargas', telefono: '900000003', email: 'pedidos@compumayorista.example.com' },
    { razon_social: 'Redes del Sur EIRL', ruc: '20999000004', contacto: 'Carlos Huaman', telefono: '900000004', email: 'ventas@redesdelsur.example.com' },
    { razon_social: 'Suministros Lima SAC', ruc: '20999000005', contacto: 'Elena Flores', telefono: '900000005', email: 'atencion@suministroslima.example.com' }
];

// entrada: stock que llega al inicio. extras: movimientos posteriores [tipo, cantidad]
const PRODUCTOS = [
    { nombre: 'Mouse USB', precio: 25.5, stock_minimo: 10, categoria: 'Accesorios', proveedor: 'Distribuidora Andina SAC', entrada: 40, extras: [['Salida', 12]] },
    { nombre: 'Teclado USB', precio: 49.9, stock_minimo: 8, categoria: 'Accesorios', proveedor: 'Distribuidora Andina SAC', entrada: 30, extras: [['Salida', 25]] },
    { nombre: 'Audifonos con microfono', precio: 79, stock_minimo: 5, categoria: 'Accesorios', proveedor: 'Suministros Lima SAC', entrada: 18 },
    { nombre: 'Base para laptop', precio: 65, stock_minimo: 5, categoria: 'Accesorios', proveedor: 'Suministros Lima SAC', entrada: 3 },
    { nombre: 'SSD 480 GB', precio: 139.9, stock_minimo: 6, categoria: 'Almacenamiento', proveedor: 'Compu Mayorista SAC', entrada: 24, extras: [['Salida', 6]] },
    { nombre: 'SSD 1 TB', precio: 249, stock_minimo: 4, categoria: 'Almacenamiento', proveedor: 'Compu Mayorista SAC', entrada: 12 },
    { nombre: 'Memoria USB 64 GB', precio: 29.9, stock_minimo: 15, categoria: 'Almacenamiento', proveedor: 'Global Partes SAC', entrada: 20, extras: [['Salida', 9]] },
    { nombre: 'Memoria RAM 16 GB', precio: 189, stock_minimo: 5, categoria: 'Componentes', proveedor: 'Global Partes SAC', entrada: 16 },
    { nombre: 'Fuente 650 W', precio: 299, stock_minimo: 3, categoria: 'Componentes', proveedor: 'Global Partes SAC', entrada: 7 },
    { nombre: 'Tarjeta de video 8 GB', precio: 1299, stock_minimo: 2, categoria: 'Componentes', proveedor: 'Compu Mayorista SAC', entrada: 5, extras: [['Ajuste', 4]] },
    { nombre: 'Monitor 24 pulgadas', precio: 649, stock_minimo: 4, categoria: 'Monitores', proveedor: 'Compu Mayorista SAC', entrada: 10 },
    { nombre: 'Monitor 27 pulgadas', precio: 899, stock_minimo: 3, categoria: 'Monitores', proveedor: 'Compu Mayorista SAC', entrada: 2 },
    { nombre: 'Router WiFi 6', precio: 229, stock_minimo: 5, categoria: 'Redes', proveedor: 'Redes del Sur EIRL', entrada: 14 },
    { nombre: 'Switch 8 puertos', precio: 119, stock_minimo: 4, categoria: 'Redes', proveedor: 'Redes del Sur EIRL', entrada: 9 },
    { nombre: 'Cable de red Cat6 305 m', precio: 349, stock_minimo: 5, categoria: 'Redes', proveedor: 'Redes del Sur EIRL', entrada: 11, extras: [['Salida', 8]] }
];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const crearUsuarios = async () => {
    const [administrador] = await Usuario.findOrCreate({
        where: { email: process.env.ADMIN_EMAIL.trim().toLowerCase() },
        defaults: {
            nombre: 'Administrador',
            password: process.env.ADMIN_PASSWORD,
            rol: 'Administrador'
        }
    });

    const [almacenero] = await Usuario.findOrCreate({
        where: { email: 'almacenero@inventario.test' },
        defaults: {
            nombre: 'Almacenero',
            password: process.env.SEED_ALMACENERO_PASSWORD,
            rol: 'Almacenero'
        }
    });

    return { administrador, almacenero };
};

const crearPorNombre = async (Modelo, campo, filas) => {
    const creadas = {};
    for (const fila of filas) {
        const [registro] = await Modelo.findOrCreate({ where: { [campo]: fila[campo] }, defaults: fila });
        creadas[fila[campo]] = registro;
    }
    return creadas;
};

// Los movimientos pasan por el kardex real para que el stock siempre coincida con el historial.
// Solo los productos creados en esta ejecucion reciben movimientos, asi nada se duplica.
const crearProductos = async ({ categorias, proveedores, administrador, almacenero }) => {
    let creados = 0;
    let dias = PRODUCTOS.length + 10;

    for (const { categoria, proveedor, entrada, extras = [], ...datos } of PRODUCTOS) {
        const existe = await Producto.findOne({ where: { nombre: datos.nombre } });
        if (existe) continue;

        const proveedor_id = proveedores[proveedor].id;
        const producto = await Producto.create({
            ...datos,
            descripcion: `${datos.nombre} para inventario de ejemplo`,
            categoria_id: categorias[categoria].id,
            proveedor_id
        });
        creados += 1;

        const fechaBase = Date.now() - dias * MS_POR_DIA;
        dias -= 1;

        await registrarMovimiento({
            producto_id: producto.id,
            usuario_id: almacenero.id,
            proveedor_id,
            tipo_movimiento: 'Entrada',
            cantidad: entrada,
            fecha_hora: new Date(fechaBase),
            observaciones: 'Stock inicial de ejemplo'
        });

        for (const [indice, [tipo_movimiento, cantidad]] of extras.entries()) {
            await registrarMovimiento({
                producto_id: producto.id,
                usuario_id: tipo_movimiento === 'Ajuste' ? administrador.id : almacenero.id,
                tipo_movimiento,
                cantidad,
                fecha_hora: new Date(fechaBase + (indice + 3) * MS_POR_DIA),
                observaciones: tipo_movimiento === 'Ajuste' ? 'Conteo fisico' : 'Despacho de ejemplo'
            });
        }
    }

    return creados;
};

const ejecutar = async () => {
    const faltantes = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SEED_ALMACENERO_PASSWORD']
        .filter((nombre) => !process.env[nombre]);
    if (faltantes.length > 0) {
        throw new Error(`Faltan variables en .env: ${faltantes.join(', ')}`);
    }

    await prepararBaseDatos();

    const { administrador, almacenero } = await crearUsuarios();
    const categorias = await crearPorNombre(Categoria, 'nombre', CATEGORIAS);
    const proveedores = await crearPorNombre(Proveedor, 'razon_social', PROVEEDORES);
    const creados = await crearProductos({ categorias, proveedores, administrador, almacenero });

    console.log(`Productos nuevos en esta ejecucion: ${creados}`);
    console.log('Totales:', {
        usuarios: await Usuario.count(),
        categorias: await Categoria.count(),
        proveedores: await Proveedor.count(),
        productos: await Producto.count(),
        movimientos: await Movimiento.count()
    });
};

ejecutar()
    .catch((error) => {
        console.error('Error en el seed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
