// Comprobaciones del bloque 2 por HTTP. Modos: principal | login | general
const R = 'C:/laragon/www/api-db/';
require(R + 'node_modules/dotenv').config({ quiet: true });
const jwt = require(R + 'node_modules/jsonwebtoken');
const { sequelize, Usuario, Categoria, Producto } = require(R + 'models');

if (process.env.DB_NAME !== 'api_db_test') throw new Error('Solo contra api_db_test');

const API = 'http://localhost:3106';
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLO'} ${m}`); if (!c) fallos++; };

const pedir = async (ruta, { metodo = 'GET', token, cuerpo, crudo, headers = {} } = {}) => {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    if (cuerpo !== undefined || crudo !== undefined) h['Content-Type'] ??= 'application/json';
    const r = await fetch(API + ruta, { method: metodo, headers: h, body: crudo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)) });
    const texto = await r.text();
    let json = null; try { json = JSON.parse(texto); } catch { /* no es JSON */ }
    return { status: r.status, json, texto, headers: r.headers };
};
const uniforme = (r) => r.json?.ok === false && typeof r.json.error === 'string' && 'detalles' in r.json;
const entrar = (email, password) => pedir('/api/auth/login', { metodo: 'POST', cuerpo: { email, password } });

const principal = async () => {
    const adminMail = process.env.ADMIN_EMAIL.trim();
    const adminPass = process.env.ADMIN_PASSWORD.trim();
    const almPass = process.env.SEED_ALMACENERO_PASSWORD.trim();

    // Login
    const l = await entrar(adminMail, adminPass);
    ok(l.status === 200 && l.json.token && l.json.usuario.rol === 'Administrador', 'login correcto');
    ok(!l.texto.includes('password') && !l.texto.includes('$2'), 'login sin password ni hash');
    const pay = jwt.decode(l.json.token);
    ok(pay.exp - pay.iat === 7200, 'token expira en 2h');
    ok(Object.keys(pay).sort().join() === 'exp,iat,id', 'token sin datos sensibles');
    const adm = l.json.token;
    ok((await entrar(adminMail.toUpperCase(), adminPass)).status === 200, 'login no distingue mayusculas en correo');
    const m1 = await entrar(adminMail, 'incorrecta');
    const m2 = await entrar('nadie@test.com', 'incorrecta');
    ok(m1.status === 401 && uniforme(m1), 'clave incorrecta 401');
    ok(m2.status === 401 && m1.json.error === m2.json.error, 'mismo mensaje si el correo no existe');

    const vacio = await pedir('/api/auth/login', { metodo: 'POST' });
    ok(vacio.status === 400 && vacio.json.detalles?.email && vacio.json.detalles?.password, 'login sin body: 400 por campo, no 500');
    const inj = await pedir('/api/auth/login', { metodo: 'POST', cuerpo: { email: { gt: '' }, password: { a: 1 } } });
    ok(inj.status === 400, 'login con objetos en vez de texto: 400');
    const mal = await pedir('/api/auth/login', { metodo: 'POST', crudo: '{mal json' });
    ok(mal.status === 400 && uniforme(mal), 'JSON mal formado: 400 uniforme');

    // Tokens
    ok((await pedir('/api/auth/perfil')).status === 401, 'perfil sin token 401');
    ok((await pedir('/api/auth/perfil', { token: 'basura' })).status === 401, 'token invalido 401');
    ok((await pedir('/api/auth/perfil', { headers: { Authorization: `Basic ${adm}` } })).status === 401, 'esquema distinto de Bearer 401');
    const exp = await pedir('/api/auth/perfil', { token: jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -10 }) });
    ok(exp.status === 401 && /expir/.test(exp.json.error), `token expirado 401: ${exp.json.error}`);
    ok((await pedir('/api/auth/perfil', { token: jwt.sign({ id: 1 }, 'otra-clave') })).status === 401, 'token firmado con otra clave 401');
    const sinFirma = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"id":1}').toString('base64url')}.`;
    ok((await pedir('/api/auth/perfil', { token: sinFirma })).status === 401, 'token alg none 401');
    const p = await pedir('/api/auth/perfil', { token: adm });
    ok(p.status === 200 && p.json.usuario.email === adminMail && !p.texto.includes('$2'), 'perfil correcto sin hash');

    // Register
    const nuevo = { nombre: 'Supervisor T', email: 'SUPER@test.com', password: 'clave12345', rol: 'Supervisor' };
    ok((await pedir('/api/auth/register', { metodo: 'POST', cuerpo: nuevo })).status === 401, 'register sin token 401');
    const alm = (await entrar('almacenero@inventario.test', almPass)).json.token;
    const f = await pedir('/api/auth/register', { metodo: 'POST', token: alm, cuerpo: nuevo });
    ok(f.status === 403 && uniforme(f), 'register como Almacenero 403');
    const c = await pedir('/api/auth/register', { metodo: 'POST', token: adm, cuerpo: nuevo });
    ok(c.status === 201 && c.json.usuario.email === 'super@test.com' && !c.texto.includes('password'), 'register como Administrador 201, sin hash');
    const dup = await pedir('/api/auth/register', { metodo: 'POST', token: adm, cuerpo: nuevo });
    ok(dup.status === 409 && uniforme(dup) && dup.json.detalles?.email, `correo repetido 409 con detalles: ${JSON.stringify(dup.json.detalles)}`);
    const inv = await pedir('/api/auth/register', { metodo: 'POST', token: adm, cuerpo: { nombre: '', email: 'x', password: 'c', rol: 'Rey' } });
    ok(inv.status === 400 && inv.json.detalles?.email && inv.json.detalles?.password && inv.json.detalles?.nombre && inv.json.detalles?.rol, `validacion por campo: ${Object.keys(inv.json.detalles || {})}`);
    const sinCuerpo = await pedir('/api/auth/register', { metodo: 'POST', token: adm });
    ok(sinCuerpo.status === 400, 'register sin body: 400, no 500');

    // Usuario desactivado o con rol cambiado: efecto inmediato sobre un token vigente
    const sup = (await entrar('super@test.com', 'clave12345')).json.token;
    ok((await pedir('/api/auth/perfil', { token: sup })).status === 200, 'supervisor entra');
    ok((await pedir('/api/auth/register', { metodo: 'POST', token: sup, cuerpo: nuevo })).status === 403, 'supervisor no puede registrar');
    await Usuario.update({ rol: 'Administrador' }, { where: { email: 'super@test.com' } });
    const ascendido = await pedir('/api/auth/register', { metodo: 'POST', token: sup, cuerpo: { ...nuevo, email: 'otro@test.com' } });
    ok(ascendido.status === 201, 'el rol vigente es el de la BD');
    await Usuario.update({ rol: 'Supervisor', activo: false }, { where: { email: 'super@test.com' } });
    const des = await pedir('/api/auth/perfil', { token: sup });
    ok(des.status === 401 && uniforme(des), 'usuario desactivado: su token deja de valer');
    ok((await entrar('super@test.com', 'clave12345')).status === 403, 'usuario desactivado no puede entrar');
    await Usuario.destroy({ where: { email: 'super@test.com' } });
    ok((await pedir('/api/auth/perfil', { token: sup })).status === 401, 'usuario borrado: 401');

    // Errores centrales
    const nf = await pedir('/api/no-existe');
    ok(nf.status === 404 && uniforme(nf), `404 uniforme: ${nf.json?.error}`);
    ok((await pedir('/otra-cosa')).status === 404, '404 fuera de /api');
    ok(uniforme(await pedir('/api/auth/perfil', { metodo: 'DELETE' })), 'metodo no soportado: 404 uniforme');

    // Traduccion de errores de Sequelize a traves de las rutas temporales
    const v = await pedir('/productos', { metodo: 'POST', cuerpo: { nombre: '', precio: 'abc' } });
    ok(v.status === 400 && uniforme(v) && v.json.detalles?.nombre && v.json.detalles?.precio, `ValidationError: ${JSON.stringify(v.json.detalles)}`);
    const cat = await Categoria.findOne();
    const conFk = await Producto.create({ nombre: 'FK', precio: 1, categoria_id: cat.id });
    const usado = await pedir(`/productos/${conFk.id}`, { metodo: 'DELETE' });
    ok(usado.status === 204, 'producto sin movimientos se elimina');
    const prueba = await sequelize.models.Categoria.findOne();
    const err = await prueba.destroy().catch((e) => e);
    ok(err.name === 'SequelizeForeignKeyConstraintError' && err.reltype === 'parent', `reltype parent (${err.reltype})`);
    const err2 = await Producto.create({ nombre: 'X', precio: 1, categoria_id: 99999 }).catch((e) => e);
    console.log('     fk hijo:', err2.reltype, JSON.stringify(err2.fields));
    ok(err2.reltype === 'child' && [].concat(err2.fields ?? [])[0] === 'categoria_id', 'reltype child con campo');

    // Cabeceras
    const raiz = await pedir('/');
    ok(raiz.status === 200 && raiz.headers.get('x-content-type-options') === 'nosniff', 'helmet activo');
    ok(!raiz.headers.get('x-powered-by'), 'sin x-powered-by');
    const permitido = await pedir('/api/auth/perfil', { headers: { Origin: 'http://localhost:5173' } });
    ok(permitido.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS: origen permitido');
    const ajeno = await pedir('/api/auth/perfil', { headers: { Origin: 'http://evil.example.com' } });
    ok(!ajeno.headers.get('access-control-allow-origin'), 'CORS: origen ajeno sin cabecera');
    const pre = await fetch(`${API}/api/auth/perfil`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'authorization' } });
    ok(pre.status === 204 && /PATCH/.test(pre.headers.get('access-control-allow-methods')) && /Authorization/i.test(pre.headers.get('access-control-allow-headers')), 'preflight permite PATCH y Authorization');
};

const limiteLogin = async () => {
    const r = [];
    for (let i = 0; i < 12; i++) r.push(await entrar('nadie@test.com', 'mala'));
    const estados = r.map((x) => x.status);
    console.log('     ', estados.join(' '));
    ok(estados.slice(0, 10).every((s) => s === 401), '10 intentos pasan');
    ok(estados[10] === 429 && uniforme(r[10]), `intento 11: 429 uniforme (${r[10].json?.error})`);
    ok((await entrar(process.env.ADMIN_EMAIL.trim(), process.env.ADMIN_PASSWORD.trim())).status === 429, 'bloqueado tambien con clave correcta');
    ok((await pedir('/api/auth/perfil')).status === 401, 'el resto de /api sigue disponible');
};

const limiteGeneral = async () => {
    const r = [];
    for (let i = 0; i < 6; i++) r.push(await pedir('/api/auth/perfil'));
    console.log('     ', r.map((x) => x.status).join(' '));
    ok(r[4].status === 401 && r[5].status === 429 && uniforme(r[5]), 'limite general en /api/ con RATE_LIMIT_MAX=5');
    ok((await pedir('/')).status === 200, 'fuera de /api no aplica');
};

({ principal, login: limiteLogin, general: limiteGeneral })[process.argv[2]]()
    .catch((e) => { console.error('ERROR:', e); fallos++; })
    .finally(async () => {
        await sequelize.close();
        console.log(fallos ? `${fallos} FALLO(S)` : 'TODO OK');
        process.exit(fallos ? 1 : 0);
    });
