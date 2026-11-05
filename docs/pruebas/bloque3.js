// Comprobaciones del bloque 3 por HTTP contra api_db_test
const R = 'C:/laragon/www/api-db/';
require(R + 'node_modules/dotenv').config({ quiet: true });
const { sequelize, Producto, Movimiento, Usuario } = require(R + 'models');

if (process.env.DB_NAME !== 'api_db_test') throw new Error('Solo contra api_db_test');

const API = 'http://localhost:3106/api';
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLO'} ${m}`); if (!c) fallos++; };
const pedir = async (ruta, { m = 'GET', t, b } = {}) => {
    const h = {};
    if (t) h.Authorization = `Bearer ${t}`;
    if (b !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(API + ruta, { method: m, headers: h, body: b === undefined ? undefined : JSON.stringify(b) });
    const texto = await r.text();
    let j = null; try { j = JSON.parse(texto); } catch { /* */ }
    return { s: r.status, j, texto };
};
const entrar = async (email, password) => (await pedir('/auth/login', { m: 'POST', b: { email, password } })).j.token;
const lista = (r) => Array.isArray(r.j?.data) && ['total', 'page', 'limit', 'pages'].every((k) => typeof r.j.meta?.[k] === 'number');
const uni = (r) => r.j?.ok === false && typeof r.j.error === 'string' && 'detalles' in r.j;

(async () => {
    const adm = await entrar(process.env.ADMIN_EMAIL.trim(), process.env.ADMIN_PASSWORD.trim());
    const alm = await entrar('almacenero@inventario.test', process.env.SEED_ALMACENERO_PASSWORD.trim());
    const creado = await pedir('/auth/register', { m: 'POST', t: adm, b: { nombre: 'Sup', email: 'sup@test.com', password: 'clave12345', rol: 'Supervisor' } });
    const sup = await entrar('sup@test.com', 'clave12345');
    const supId = creado.j.usuario.id;
    const almId = (await Usuario.findOne({ where: { email: 'almacenero@inventario.test' } })).id;
    const admId = (await Usuario.findOne({ where: { email: process.env.ADMIN_EMAIL.trim() } })).id;

    // Matriz de permisos: ruta -> estado esperado [sin token, supervisor, almacenero, admin]
    // Las escrituras con admin se prueban aparte; 'P' significa "paso el permiso" (ni 401 ni 403)
    const matriz = [
        ['GET', '/auth/perfil', [401, 'P', 'P', 'P']],
        ['GET', '/categorias', [401, 'P', 'P', 'P']],
        ['POST', '/categorias', [401, 403, 403, 'P']],
        ['PUT', '/categorias/99999', [401, 403, 403, 'P']],
        ['DELETE', '/categorias/99999', [401, 403, 403, 'P']],
        ['GET', '/proveedores', [401, 'P', 'P', 'P']],
        ['POST', '/proveedores', [401, 403, 403, 'P']],
        ['PUT', '/proveedores/99999', [401, 403, 403, 'P']],
        ['DELETE', '/proveedores/99999', [401, 403, 403, 'P']],
        ['GET', '/productos', [401, 'P', 'P', 'P']],
        ['GET', '/productos/99999', [401, 'P', 'P', 'P']],
        ['POST', '/productos', [401, 403, 'P', 'P']],
        ['PUT', '/productos/99999', [401, 403, 'P', 'P']],
        ['DELETE', '/productos/99999', [401, 403, 403, 'P']],
        ['GET', '/movimientos', [401, 'P', 'P', 'P']],
        ['POST', '/movimientos', [401, 403, 'P', 'P']],
        ['PATCH', '/movimientos/99999/anular', [401, 403, 403, 'P']],
        ['GET', '/usuarios', [401, 403, 403, 'P']],
        ['PUT', '/usuarios/99999', [401, 403, 403, 'P']],
        ['PATCH', '/usuarios/99999/estado', [401, 403, 403, 'P']],
        ['GET', '/dashboard', [401, 'P', 'P', 'P']]
    ];
    let malos = 0;
    for (const [m, ruta, esperado] of matriz) {
        const b = ['GET', 'DELETE'].includes(m) ? undefined : {};
        for (const [i, t] of [undefined, sup, alm, adm].entries()) {
            const { s } = await pedir(ruta, { m, t, b });
            const bien = esperado[i] === 'P' ? ![401, 403].includes(s) && s < 500 : s === esperado[i];
            if (!bien) { malos++; console.log('     ', m, ruta, 'rol', i, 'dio', s); }
        }
    }
    ok(malos === 0, `matriz de permisos: ${matriz.length} rutas x 4 perfiles, ${malos} incorrectas`);

    // Categorias
    const cats = await pedir('/categorias?limit=2&page=2', { t: alm });
    ok(lista(cats) && cats.j.data.length === 2 && cats.j.meta.total === 5 && cats.j.meta.pages === 3 && cats.j.meta.page === 2, 'categorias paginadas');
    const todasCats = (await pedir('/categorias', { t: alm })).j.data;
    ok(todasCats.reduce((a, c) => a + Number(c.cantidad_productos), 0) === 15, 'categorias incluyen cantidad de productos');
    ok((await pedir('/categorias?limit=1000', { t: alm })).j.meta.limit === 100, 'limit topado a 100');
    ok((await pedir('/categorias?page=abc&limit=-5', { t: alm })).j.meta.page === 1, 'paginacion invalida usa valores por defecto');
    ok((await pedir('/categorias?q=red', { t: alm })).j.data.some((c) => c.nombre === 'Redes'), 'categorias con busqueda');
    const nc = await pedir('/categorias', { m: 'POST', t: adm, b: { nombre: 'Temporal', id: 777 } });
    ok(nc.s === 201 && nc.j.data.id !== 777, 'crear categoria ignora campos extra');
    const dupC = await pedir('/categorias', { m: 'POST', t: adm, b: { nombre: 'Redes' } });
    ok(dupC.s === 409 && dupC.j.detalles?.nombre, `categoria repetida 409: ${JSON.stringify(dupC.j.detalles)}`);
    const faltaC = await pedir('/categorias', { m: 'POST', t: adm, b: {} });
    ok(faltaC.s === 400 && faltaC.j.detalles?.nombre, 'categoria sin nombre 400 por campo');
    const ec = await pedir(`/categorias/${nc.j.data.id}`, { m: 'PUT', t: adm, b: { descripcion: 'Editada' } });
    ok(ec.s === 200 && ec.j.data.descripcion === 'Editada' && ec.j.data.nombre === 'Temporal', 'editar categoria parcial');
    const conProd = todasCats.find((c) => c.nombre === 'Redes');
    const delC = await pedir(`/categorias/${conProd.id}`, { m: 'DELETE', t: adm });
    ok(delC.s === 409 && uni(delC), `categoria con productos 409: ${delC.j.error}`);
    ok((await pedir(`/categorias/${nc.j.data.id}`, { m: 'DELETE', t: adm })).s === 200, 'categoria vacia se elimina');
    ok((await pedir(`/categorias/${nc.j.data.id}`, { m: 'DELETE', t: adm })).s === 404, 'borrar categoria inexistente 404');
    ok((await pedir('/categorias/1abc', { m: 'DELETE', t: adm })).s === 404, 'id "1abc" 404, MySQL no lo convierte en 1');

    // Proveedores
    const provs = await pedir('/proveedores', { t: sup });
    ok(lista(provs) && provs.j.meta.total === 5, 'proveedores paginados');
    ok((await pedir('/proveedores?q=20999000003', { t: sup })).j.meta.total === 1, 'proveedores buscan por RUC');
    const badP = await pedir('/proveedores', { m: 'POST', t: adm, b: { razon_social: 'Mal', ruc: '1', email: 'x' } });
    ok(badP.s === 400 && badP.j.detalles?.ruc && badP.j.detalles?.email, 'proveedor invalido: errores por campo');
    const np = await pedir('/proveedores', { m: 'POST', t: adm, b: { razon_social: 'Prov Temporal', ruc: '', email: '' } });
    ok(np.s === 201 && np.j.data.ruc === null, 'proveedor con opcionales vacios');
    const provId = np.j.data.id;

    // Productos
    const prods = await pedir('/productos?limit=100', { t: sup });
    ok(lista(prods) && prods.j.meta.total === 15, 'productos paginados');
    ok(prods.j.data.every((p) => p.categoria?.nombre && p.proveedor?.razon_social && typeof p.precio === 'number'), 'incluyen categoria y proveedor, precio numerico');
    const redes = await pedir(`/productos?categoria_id=${conProd.id}`, { t: sup });
    ok(redes.j.data.length === 3 && redes.j.data.every((p) => p.categoria.id === conProd.id), 'filtro por categoria');
    const bajos = await pedir('/productos?bajo_stock=1&limit=100', { t: sup });
    const esperadoBajos = prods.j.data.filter((p) => p.stock <= p.stock_minimo).length;
    ok(bajos.j.meta.total === esperadoBajos && esperadoBajos > 0 && bajos.j.data.every((p) => p.stock <= p.stock_minimo), `filtro bajo_stock (${esperadoBajos}) con count correcto`);
    ok((await pedir('/productos?q=monitor', { t: sup })).j.meta.total === 2, 'busqueda por nombre');
    ok((await pedir('/productos?q=P-0001', { t: sup })).j.meta.total === 1, 'busqueda por codigo');
    ok((await pedir('/productos?q=monitor&bajo_stock=1', { t: sup })).j.meta.total >= 1, 'filtros combinados');

    const sinCat = await pedir('/productos', { m: 'POST', t: alm, b: { nombre: 'X', precio: 10, categoria_id: '' } });
    ok(sinCat.s === 400 && sinCat.j.detalles?.categoria_id, 'producto sin categoria 400 por campo');
    const catMal = await pedir('/productos', { m: 'POST', t: alm, b: { nombre: 'X', precio: 10, categoria_id: 99999 } });
    ok(catMal.s === 400 && catMal.j.detalles?.categoria_id, `categoria inexistente 400: ${JSON.stringify(catMal.j.detalles)}`);
    const stkMal = await pedir('/productos', { m: 'POST', t: alm, b: { nombre: 'X', precio: 10, categoria_id: conProd.id, stock: -1 } });
    ok(stkMal.s === 400 && stkMal.j.detalles?.stock, 'stock negativo 400');
    ok(!(await Producto.findOne({ where: { nombre: 'X' } })), 'los fallos no dejaron productos');

    const cp = await pedir('/productos', { m: 'POST', t: alm, b: { nombre: 'Kit Prueba', precio: '10.50', categoria_id: conProd.id, proveedor_id: provId, stock: 12 } });
    ok(cp.s === 201 && /^P-\d{4}$/.test(cp.j.data.codigo) && cp.j.data.stock === 12 && cp.j.data.precio === 10.5 && cp.j.data.proveedor.id === provId, `crear producto ${cp.j.data.codigo}`);
    const pid = cp.j.data.id;
    const ini = await Movimiento.findAll({ where: { producto_id: pid } });
    ok(ini.length === 1 && ini[0].tipo_movimiento === 'Entrada' && ini[0].stock_nuevo === 12 && ini[0].usuario_id === almId, 'stock inicial registrado en el kardex');
    const ct = await pedir('/productos', { m: 'POST', t: alm, b: { nombre: 'Sin stock', precio: 1, categoria_id: conProd.id, proveedor_id: '' } });
    ok(ct.s === 201 && ct.j.data.stock === 0 && ct.j.data.proveedor === null, 'crear con stock 0 y proveedor vacio');
    ok((await Movimiento.count({ where: { producto_id: ct.j.data.id } })) === 0, 'sin stock inicial no hay movimiento');
    const upd = await pedir(`/productos/${pid}`, { m: 'PUT', t: alm, b: { nombre: 'Kit Editado', stock: 9999, precio: 20 } });
    ok(upd.s === 200 && upd.j.data.nombre === 'Kit Editado' && upd.j.data.stock === 12 && upd.j.data.precio === 20, 'PUT ignora stock');
    ok((await pedir(`/productos/${pid}`, { t: sup })).j.data.categoria.id === conProd.id, 'GET por id con relaciones');
    ok((await pedir('/productos/99999', { t: sup })).s === 404, 'producto inexistente 404');

    // Kardex
    const mov = (b, t = alm) => pedir('/movimientos', { m: 'POST', t, b });
    const e = await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: 8, proveedor_id: provId, usuario_id: admId, stock_nuevo: 5000, fecha_hora: '2000-01-01' });
    ok(e.s === 201 && e.j.data.stock_anterior === 12 && e.j.data.stock_nuevo === 20, 'Entrada 12 -> 20');
    ok(e.j.data.usuario.id === almId, 'usuario_id del body ignorado: autor tomado del token');
    ok(new Date(e.j.data.fecha_hora).getFullYear() > 2000, 'fecha_hora del body ignorada');
    ok(e.j.data.producto.nombre === 'Kit Editado' && e.j.data.proveedor.id === provId, 'respuesta con relaciones');
    const s = await mov({ producto_id: pid, tipo_movimiento: 'Salida', cantidad: 5 });
    ok(s.j.data.stock_nuevo === 15, 'Salida 20 -> 15');
    const sx = await mov({ producto_id: pid, tipo_movimiento: 'Salida', cantidad: 16 });
    ok(sx.s === 409 && uni(sx), `Salida sin stock 409: ${sx.j.error}`);
    const aj = await mov({ producto_id: pid, tipo_movimiento: 'Ajuste', cantidad: 30 });
    ok(aj.j.data.stock_anterior === 15 && aj.j.data.stock_nuevo === 30, 'Ajuste 15 -> 30');
    ok((await mov({ producto_id: pid, tipo_movimiento: 'Ajuste', cantidad: '' })).s === 400, 'Ajuste vacio 400, no deja stock en 0');
    ok((await mov({ producto_id: pid, tipo_movimiento: 'Ajuste', cantidad: null })).s === 400, 'Ajuste null 400');
    ok((await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: 1.5 })).s === 400, 'cantidad decimal 400');
    ok((await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: -1 })).s === 400, 'cantidad negativa 400');
    ok((await mov({ producto_id: pid, tipo_movimiento: 'Robo', cantidad: 1 })).j.detalles?.tipo_movimiento, 'tipo invalido por campo');
    ok((await mov({ tipo_movimiento: 'Entrada', cantidad: 1 })).j.detalles?.producto_id, 'sin producto por campo');
    ok((await mov({ producto_id: 99999, tipo_movimiento: 'Entrada', cantidad: 1 })).s === 404, 'producto inexistente 404');
    const fkMov = await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: 1, proveedor_id: 99999 });
    ok(fkMov.s === 400 && fkMov.j.detalles?.proveedor_id, 'proveedor inexistente 400');
    ok((await Producto.findByPk(pid)).stock === 30, 'el fallo revirtio la transaccion: stock intacto');

    // Concurrencia real por HTTP
    await mov({ producto_id: pid, tipo_movimiento: 'Ajuste', cantidad: 10 });
    const salidas = await Promise.all(Array.from({ length: 8 }, () => mov({ producto_id: pid, tipo_movimiento: 'Salida', cantidad: 3 })));
    const estados = salidas.map((r) => r.s).sort();
    const prod = await Producto.findByPk(pid);
    ok(estados.filter((x) => x === 201).length === 3 && estados.filter((x) => x === 409).length === 5 && prod.stock === 1, `8 salidas simultaneas: ${estados.join(' ')}, stock ${prod.stock}`);

    // Filtros de movimientos
    const mp = await pedir(`/movimientos?producto_id=${pid}&limit=100`, { t: sup });
    ok(lista(mp) && mp.j.data.every((x) => x.producto.id === pid) && mp.j.data[0].id > mp.j.data.at(-1).id, 'movimientos por producto, recientes primero');
    ok((await pedir('/movimientos?tipo=Ajuste&limit=100', { t: sup })).j.data.every((x) => x.tipo_movimiento === 'Ajuste'), 'filtro por tipo');
    ok((await pedir('/movimientos?tipo=Otro', { t: sup })).s === 400, 'tipo invalido 400');
    ok((await pedir('/movimientos?desde=basura', { t: sup })).s === 400, 'fecha invalida 400');
    const hoy = new Date(); const dia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const hoyR = await pedir(`/movimientos?desde=${dia}&hasta=${dia}&limit=100`, { t: sup });
    ok(hoyR.j.meta.total >= 8, `rango de un dia incluye el dia completo (${hoyR.j.meta.total})`);
    ok((await pedir('/movimientos?hasta=2001-01-01', { t: sup })).j.meta.total === 0, 'rango sin resultados');
    const bq = await pedir('/movimientos?q=Kit&limit=5', { t: sup });
    ok(bq.j.data.length === 5 && bq.j.meta.total === mp.j.meta.total, `busqueda por producto con total correcto (${bq.j.meta.total})`);

    // Anulacion
    const anular = (id, t = adm) => pedir(`/movimientos/${id}/anular`, { m: 'PATCH', t });
    await mov({ producto_id: pid, tipo_movimiento: 'Ajuste', cantidad: 50 });
    const aE = await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: 10 });
    const aS = await mov({ producto_id: pid, tipo_movimiento: 'Salida', cantidad: 20 });
    ok((await Producto.findByPk(pid)).stock === 40, 'estado previo 40');
    const r1 = await anular(aS.j.data.id);
    ok(r1.s === 200 && r1.j.data.anulado === true && (await Producto.findByPk(pid)).stock === 60, 'anular Salida devuelve stock (60)');
    ok((await anular(aS.j.data.id)).s === 409, 'no se anula dos veces');
    ok((await Producto.findByPk(pid)).stock === 60, 'la doble anulacion no toca el stock');
    await anular(aE.j.data.id);
    ok((await Producto.findByPk(pid)).stock === 50, 'anular Entrada resta (50)');
    const aj2 = await mov({ producto_id: pid, tipo_movimiento: 'Ajuste', cantidad: 80 });
    await mov({ producto_id: pid, tipo_movimiento: 'Salida', cantidad: 5 });
    await anular(aj2.j.data.id);
    ok((await Producto.findByPk(pid)).stock === 45, 'anular Ajuste revierte su diferencia y respeta la salida posterior (45)');
    const eg = await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: 100 });
    await mov({ producto_id: pid, tipo_movimiento: 'Salida', cantidad: 130 });
    const neg = await anular(eg.j.data.id);
    ok(neg.s === 409 && uni(neg) && (await Producto.findByPk(pid)).stock === 15, `anular que dejaria stock negativo 409: ${neg.j.error}`);
    ok(!(await Movimiento.findByPk(eg.j.data.id)).anulado, 'ese movimiento sigue sin anular');
    ok((await anular(99999)).s === 404 && (await anular('abc')).s === 404, 'anular inexistente 404');
    const doble = await Promise.all([1, 2, 3, 4].map(async () => { const m = await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: 1 }); return m.j.data.id; }));
    const antes = (await Producto.findByPk(pid)).stock;
    const simul = await Promise.all([anular(doble[0]), anular(doble[0]), anular(doble[0])]);
    ok(simul.filter((r) => r.s === 200).length === 1 && (await Producto.findByPk(pid)).stock === antes - 1, 'anulaciones simultaneas: solo una aplica');

    // Borrado de productos
    const so = await pedir(`/productos/${pid}`, { m: 'DELETE', t: adm });
    ok(so.s === 200 && /inactivo/.test(so.j.mensaje) && (await Producto.findByPk(pid)).activo === false, `soft delete: ${so.j.mensaje}`);
    ok((await pedir(`/productos?q=Kit`, { t: sup })).j.meta.total === 0, 'inactivo oculto en el listado');
    ok((await pedir(`/productos?q=Kit&incluir_inactivos=1`, { t: sup })).j.meta.total === 1, 'visible con incluir_inactivos=1');
    ok((await mov({ producto_id: pid, tipo_movimiento: 'Entrada', cantidad: 1 })).s === 409, 'inactivo no acepta movimientos');
    ok((await Movimiento.count({ where: { producto_id: pid } })) > 0, 'el historial se conserva');
    const fisico = await pedir(`/productos/${ct.j.data.id}`, { m: 'DELETE', t: adm });
    ok(fisico.s === 200 && !(await Producto.findByPk(ct.j.data.id)), `borrado fisico sin movimientos: ${fisico.j.mensaje}`);

    // Proveedor con productos y movimientos: SET NULL
    const dp = await pedir(`/proveedores/${provId}`, { m: 'DELETE', t: adm });
    ok(dp.s === 200 && (await Producto.findByPk(pid)).proveedor_id === null, 'borrar proveedor deja productos sin proveedor');
    ok((await Movimiento.findByPk(e.j.data.id)).proveedor_id === null, 'y movimientos sin proveedor');

    // Usuarios
    const us = await pedir('/usuarios?limit=100', { t: adm });
    ok(lista(us) && us.j.meta.total === 3 && !us.texto.includes('password') && !us.texto.includes('$2'), 'usuarios sin hash');
    ok((await pedir('/usuarios?rol=Supervisor', { t: adm })).j.meta.total === 1, 'filtro por rol');
    ok((await pedir('/usuarios?q=sup@', { t: adm })).j.meta.total === 1, 'busqueda por correo');
    const eu = await pedir(`/usuarios/${supId}`, { m: 'PUT', t: adm, b: { nombre: 'Sup 2', password: '', activo: false } });
    ok(eu.s === 200 && eu.j.data.nombre === 'Sup 2' && eu.j.data.activo === true && !eu.texto.includes('$2'), 'PUT usuario: clave vacia y activo ignorados');
    ok(Boolean(await entrar('sup@test.com', 'clave12345')), 'la clave no cambio');
    await pedir(`/usuarios/${supId}`, { m: 'PUT', t: adm, b: { password: 'nuevaclave1' } });
    ok(Boolean(await entrar('sup@test.com', 'nuevaclave1')), 'la clave nueva funciona');
    ok((await pedir(`/usuarios/${supId}`, { m: 'PUT', t: adm, b: { email: 'almacenero@inventario.test' } })).s === 409, 'correo repetido 409');
    ok((await pedir(`/usuarios/${admId}`, { m: 'PUT', t: adm, b: { rol: 'Almacenero' } })).s === 409, 'admin no se quita el rol');
    ok((await pedir(`/usuarios/${admId}`, { m: 'PUT', t: adm, b: { rol: 'Administrador', nombre: 'Administrador' } })).s === 200, 'enviar su mismo rol esta permitido');
    ok((await pedir(`/usuarios/${admId}/estado`, { m: 'PATCH', t: adm, b: { activo: false } })).s === 409, 'admin no se desactiva');
    ok((await pedir(`/usuarios/${supId}/estado`, { m: 'PATCH', t: adm, b: {} })).s === 400, 'estado sin boolean 400');
    const des = await pedir(`/usuarios/${supId}/estado`, { m: 'PATCH', t: adm, b: { activo: false } });
    ok(des.s === 200 && des.j.data.activo === false, 'desactivar usuario');
    ok((await pedir('/usuarios', { t: adm })).j.meta.total === 2, 'desactivado oculto');
    ok((await pedir('/usuarios?incluir_inactivos=1', { t: adm })).j.meta.total === 3, 'visible con incluir_inactivos=1');
    ok((await pedir(`/usuarios/${supId}/estado`, { m: 'PATCH', t: adm, b: { activo: true } })).j.data.activo === true, 'reactivar usuario');

    // Dashboard
    const d = await pedir('/dashboard', { t: sup });
    const activos = await Producto.findAll({ where: { activo: true } });
    const valor = Math.round(activos.reduce((a, p) => a + p.precio * p.stock, 0) * 100) / 100;
    const dd = d.j.data;
    ok(d.s === 200 && dd.total_productos === activos.length, `total productos ${dd.total_productos}`);
    ok(dd.total_categorias === 5 && dd.total_proveedores === 5, 'totales de categorias y proveedores');
    ok(dd.bajo_stock === activos.filter((p) => p.stock <= p.stock_minimo).length, `bajo stock ${dd.bajo_stock}`);
    ok(typeof dd.valorizacion === 'number' && Math.abs(dd.valorizacion - valor) < 0.01, `valorizacion ${dd.valorizacion} = ${valor}`);
    ok(dd.movimientos_recientes.length === 5 && dd.movimientos_recientes[0].producto.nombre && dd.movimientos_recientes[0].usuario.nombre, '5 movimientos con producto y usuario');
    ok(dd.stock_por_categoria.length === 5 && dd.stock_por_categoria.every((c) => typeof c.stock === 'number'), 'stock por categoria numerico');
    ok(dd.stock_por_categoria.reduce((a, c) => a + c.stock, 0) === activos.reduce((a, p) => a + p.stock, 0), 'la suma del grafico cuadra con el stock activo');
    ok(!d.texto.includes('$2'), 'dashboard sin hash');

    // Integridad final
    const [desc] = await sequelize.query(`SELECT COUNT(*) AS n FROM productos WHERE stock < 0`);
    ok(Number(desc[0].n) === 0, 'ningun stock negativo');

    await sequelize.close();
    console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK');
    process.exitCode = fallos ? 1 : 0;
})().catch((e) => { console.error('ERROR:', e); process.exitCode = 2; return sequelize.close(); });
