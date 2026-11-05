// Comprobaciones del bloque 1 contra la BD de prueba (DB_NAME=api_db_test)
const R = 'C:/laragon/www/api-db/';
const { QueryTypes } = require(R + 'node_modules/sequelize');
const { sequelize, Categoria, Proveedor, Usuario, Producto, Movimiento } = require(R + 'models');
const { registrarMovimiento } = require(R + 'services/kardexService');

if (process.env.DB_NAME !== 'api_db_test') throw new Error('Solo contra api_db_test');

let fallos = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLO'} ${m}`); if (!c) fallos++; };
const rechaza = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const q = (s) => sequelize.query(s, { type: QueryTypes.SELECT });

(async () => {
    const fks = await q(`SELECT rc.TABLE_NAME t, kcu.COLUMN_NAME c, rc.DELETE_RULE d
        FROM information_schema.REFERENTIAL_CONSTRAINTS rc
        JOIN information_schema.KEY_COLUMN_USAGE kcu ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
        WHERE rc.CONSTRAINT_SCHEMA = DATABASE()`);
    const regla = (t, c) => (fks.filter(f => f.t === t && f.c === c).map(f => f.d)).join();
    ok(regla('productos', 'categoria_id') === 'RESTRICT', `FK productos.categoria_id ${regla('productos', 'categoria_id')}`);
    ok(regla('productos', 'proveedor_id') === 'SET NULL', `FK productos.proveedor_id ${regla('productos', 'proveedor_id')}`);
    ok(regla('movimientos', 'producto_id') === 'RESTRICT', `FK movimientos.producto_id ${regla('movimientos', 'producto_id')}`);
    ok(regla('movimientos', 'usuario_id') === 'RESTRICT', `FK movimientos.usuario_id ${regla('movimientos', 'usuario_id')}`);
    ok(regla('movimientos', 'proveedor_id') === 'SET NULL', `FK movimientos.proveedor_id ${regla('movimientos', 'proveedor_id')}`);
    ok(fks.length === 5, `5 llaves foraneas, sin duplicar (${fks.length})`);

    const cols = await q(`SELECT COLUMN_NAME n, IS_NULLABLE nul FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productos'`);
    ok(cols.some(c => c.n === 'created_at') && !cols.some(c => c.n === 'createdAt'), 'columnas en snake_case');
    ok(cols.find(c => c.n === 'categoria_id').nul === 'NO', 'categoria_id NOT NULL en MySQL');
    const uniq = await q(`SELECT DISTINCT TABLE_NAME t, INDEX_NAME i FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'`);
    console.log('     unicos:', uniq.map(u => `${u.t}.${u.i}`).join(', '));
    ok(uniq.length === 3, '3 indices unicos');

    // Kardex y seed coherentes
    const descuadre = await q(`SELECT p.id FROM productos p
        LEFT JOIN movimientos m ON m.id = (SELECT id FROM movimientos WHERE producto_id = p.id ORDER BY fecha_hora DESC, id DESC LIMIT 1)
        WHERE p.stock <> COALESCE(m.stock_nuevo, 0)`);
    ok(descuadre.length === 0, `stock = ultimo stock_nuevo en todos (${descuadre.length} descuadres)`);
    ok((await q('SELECT id FROM productos WHERE stock <= stock_minimo')).length >= 3, 'hay productos en bajo stock');
    ok((await Producto.findAll({ attributes: ['codigo'] })).every(p => /^P-\d{4}$/.test(p.codigo)), 'codigos P-0001');
    const unP = await Producto.findOne();
    ok(typeof unP.precio === 'number' && typeof unP.toJSON().precio === 'number', `precio numerico (${unP.precio})`);

    // Usuario
    const admin = await Usuario.findOne({ where: { email: process.env.ADMIN_EMAIL.trim() } });
    ok(admin.password === undefined && !('password' in admin.toJSON()), 'defaultScope oculta el hash');
    const lista = await Movimiento.findOne({ include: [{ model: Usuario, as: 'usuario' }] });
    ok(lista.usuario && !('password' in lista.toJSON().usuario), 'include tampoco devuelve el hash');
    const conPass = await Usuario.scope('conPassword').findByPk(admin.id);
    ok(/^\$2[aby]\$10\$/.test(conPass.password), 'hash bcrypt con salt 10');
    ok(await conPass.validarPassword(process.env.ADMIN_PASSWORD.trim()) === true, 'validarPassword correcta');
    ok(await conPass.validarPassword('mala-clave') === false, 'validarPassword incorrecta');
    const hashAntes = conPass.password;
    await conPass.update({ nombre: 'Admin X' });
    await conPass.reload();
    ok(conPass.password === hashAntes, 'no re-hashea si la clave no cambio');
    await conPass.update({ nombre: 'Administrador' });
    const nuevo = await Usuario.create({ nombre: 'T', email: '  MAYUS@Test.COM ', password: 'clave12345' });
    ok(nuevo.email === 'mayus@test.com', 'email en minusculas');
    ok(!('password' in nuevo.toJSON()), 'create no expone el hash en JSON');
    await nuevo.update({ password: 'otraclave123' });
    const n2 = await Usuario.scope('conPassword').findByPk(nuevo.id);
    ok(await n2.validarPassword('otraclave123'), 're-hashea si la clave cambio');
    ok((await rechaza(() => Usuario.create({ nombre: 'T', email: 'mayus@test.com', password: 'clave12345' })))?.name === 'SequelizeUniqueConstraintError', 'email unico');
    ok((await rechaza(() => Usuario.create({ nombre: 'T', email: 'no-es-correo', password: 'clave12345' })))?.name === 'SequelizeValidationError', 'email validado');
    ok((await rechaza(() => Usuario.create({ nombre: 'T', email: 'b@test.com', password: 'corta' })))?.name === 'SequelizeValidationError', 'clave corta rechazada');
    ok((await Usuario.findByPk(nuevo.id)).rol === 'Almacenero', 'rol por defecto Almacenero');

    // Categoria y proveedor
    const cat = await Categoria.findOne();
    ok((await rechaza(() => Categoria.create({ nombre: cat.nombre })))?.name === 'SequelizeUniqueConstraintError', 'categoria unica');
    ok((await rechaza(() => cat.destroy()))?.name === 'SequelizeForeignKeyConstraintError', 'RESTRICT: categoria con productos no se borra');
    ok((await rechaza(() => Proveedor.create({ razon_social: 'X', ruc: '123' })))?.name === 'SequelizeValidationError', 'RUC de 11 digitos');
    const prv = await Proveedor.create({ razon_social: 'Vacio', ruc: '', email: '', contacto: '', telefono: '' });
    ok(prv.ruc === null && prv.email === null, 'campos vacios guardados como null');

    // Producto y codigo
    ok((await rechaza(() => Producto.create({ nombre: 'Sin cat', precio: 1 })))?.name === 'SequelizeValidationError', 'producto sin categoria rechazado');
    const propio = await Producto.create({ nombre: 'Propio', precio: 1, categoria_id: cat.id, codigo: 'ABC-1', proveedor_id: prv.id });
    ok(propio.codigo === 'ABC-1' && propio.stock_minimo === 5, 'respeta codigo enviado y stock_minimo 5');
    await Producto.create({ nombre: 'Choque', precio: 1, categoria_id: cat.id, codigo: `P-${String(propio.id + 1).padStart(4, '0')}` });
    const sig = await Producto.create({ nombre: 'Auto', precio: 1, categoria_id: cat.id });
    ok(sig.codigo !== `P-${String(propio.id + 1).padStart(4, '0')}` && /^P-\d{4}$/.test(sig.codigo), `salta codigos ocupados (${sig.codigo})`);
    await prv.destroy();
    await propio.reload();
    ok(propio.proveedor_id === null, 'SET NULL: borrar proveedor deja el producto');

    // Kardex
    const u = admin.id;
    const mov = (d) => registrarMovimiento({ producto_id: propio.id, usuario_id: u, ...d });
    await mov({ tipo_movimiento: 'Entrada', cantidad: 10 });
    await mov({ tipo_movimiento: 'Salida', cantidad: 4 });
    const aj = await mov({ tipo_movimiento: 'Ajuste', cantidad: 20 });
    ok(aj.stock_anterior === 6 && aj.stock_nuevo === 20, 'entrada, salida y ajuste');
    const sal = await rechaza(() => mov({ tipo_movimiento: 'Salida', cantidad: 21 }));
    ok(sal?.status === 409, `salida sin stock: ${sal?.message}`);
    ok((await rechaza(() => mov({ tipo_movimiento: 'Salida', cantidad: 0 })))?.status === 400, 'salida de 0 rechazada');
    ok((await rechaza(() => mov({ tipo_movimiento: 'Otro', cantidad: 1 })))?.status === 400, 'tipo invalido rechazado');
    ok((await mov({ tipo_movimiento: 'Ajuste', cantidad: 0 })).stock_nuevo === 0, 'ajuste a 0 permitido');
    await mov({ tipo_movimiento: 'Ajuste', cantidad: 10 });
    const res = await Promise.allSettled(Array.from({ length: 6 }, () => mov({ tipo_movimiento: 'Salida', cantidad: 3 })));
    await propio.reload();
    ok(res.filter(r => r.status === 'fulfilled').length === 3 && propio.stock === 1, `salidas simultaneas: 3 de 6 pasan, stock ${propio.stock}`);
    ok((await rechaza(() => propio.destroy()))?.name === 'SequelizeForeignKeyConstraintError', 'RESTRICT: producto con movimientos no se borra');
    await propio.update({ activo: false });
    ok((await rechaza(() => mov({ tipo_movimiento: 'Entrada', cantidad: 1 })))?.status === 409, 'producto inactivo no acepta movimientos');

    console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK');
    await sequelize.close();
    process.exit(fallos ? 1 : 0);
})().catch(e => { console.error('ERROR:', e); process.exit(2); });
