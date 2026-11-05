// Bloque 4: frontend contra api_db_test (front 5174, API 3106)
const { chromium } = require('playwright-core');
const path = require('path');

const URL = 'http://localhost:5174';
const ADMIN = ['admin@inventario.test', process.env.CLAVE_ADMIN];
const ALM = ['almacenero@inventario.test', process.env.CLAVE_ALM];
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLO'} ${m}`); if (!c) fallos++; };
const foto = (p, n) => p.screenshot({ path: path.join(__dirname, n) });
const esperar = (pg, patron) => pg.waitForFunction((f) => (f.startsWith('**') ? location.pathname.endsWith(f.slice(2)) : location.href === f), patron);

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    const problemas = [];
    const auth = [];
    p.on('console', (m) => {
        if (['error', 'warning'].includes(m.type()) && !/Failed to load resource/.test(m.text())) problemas.push(`${m.type()}: ${m.text()}`);
    });
    p.on('pageerror', (e) => problemas.push(`pageerror: ${e.message}`));
    p.on('request', (r) => { if (r.url().includes('/api/auth/perfil') && r.method() === 'GET') auth.push(r.headers().authorization); });

    const entrar = async ([email, clave]) => {
        await p.fill('input[name=email]', email);
        await p.fill('input[name=password]', clave);
        await p.click('button[type=submit]');
    };
    const salir = () => p.click('button:has-text("Cerrar sesión")');
    const local = (k) => p.evaluate((c) => localStorage.getItem(c), k);

    // Sin sesion
    await p.goto(`${URL}/`);
    await esperar(p, '**/login');
    ok(true, 'sin token redirige a /login');
    ok(await p.locator('html').getAttribute('lang') === 'es', 'html lang=es');
    ok((await p.title()) === 'Panel de Inventario', 'titulo de la pagina');
    const fuente = await p.evaluate(() => getComputedStyle(document.body).fontFamily);
    ok(/Inter/.test(fuente), `fuente ${fuente.slice(0, 20)}`);
    await p.waitForTimeout(300);
    await foto(p, 'b4-login.png');
    ok(await p.evaluate(() => document.activeElement.name) === 'email', 'el foco inicia en el correo');

    // Validacion cliente
    await p.click('button[type=submit]');
    ok(await p.locator('text=Ingresa tu correo').isVisible() && await p.locator('text=Ingresa tu contraseña').isVisible(), 'errores por campo sin llamar a la API');
    ok(await p.getAttribute('input[name=email]', 'aria-invalid') === 'true', 'aria-invalid');
    const desc = await p.getAttribute('input[name=email]', 'aria-describedby');
    ok(await p.locator(`[id="${desc}"]`).innerText() === 'Ingresa tu correo', 'aria-describedby apunta al error');
    await p.fill('input[name=email]', 'malo');
    await p.click('button[type=submit]');
    ok(await p.locator('text=El correo no es válido').isVisible(), 'formato de correo');
    await p.fill('input[name=email]', 'a@b.co');
    ok(!(await p.locator('text=El correo no es válido').isVisible()), 'el error se limpia al escribir');

    // Credenciales incorrectas: no recarga ni redirige
    await p.evaluate(() => { window.__marca = 1; });
    await entrar([ADMIN[0], 'incorrecta']);
    await p.waitForSelector('[role=alert]');
    ok((await p.innerText('[role=alert]')) === 'Correo o contraseña incorrectos', 'clave incorrecta muestra el error de la API');
    ok(await p.evaluate(() => window.__marca === 1) && p.url().endsWith('/login'), 'el 401 del login no recarga la pagina');
    await foto(p, 'b4-login-error.png');

    // Admin
    await entrar(ADMIN);
    await esperar(p, `${URL}/`);
    await p.waitForSelector('aside');
    ok(await p.locator('header').getByText('Administrador', { exact: false }).first().isVisible(), 'topbar con nombre y rol');
    ok(await p.locator('aside a:has-text("Usuarios")').isVisible(), 'admin ve Usuarios');
    ok((await p.locator('aside a').count()) === 6, 'sidebar con 6 enlaces');
    ok(Boolean(await local('inventario_token')), 'token en localStorage');
    ok(JSON.parse(await local('inventario_usuario')).email === ADMIN[0], 'usuario en localStorage');
    ok(!(await local('inventario_usuario')).includes('password'), 'sin password en localStorage');
    await p.reload();
    await p.waitForSelector('aside');
    ok(auth.at(-1)?.startsWith('Bearer '), 'el interceptor inyecta Bearer');
    ok(p.url() === `${URL}/`, 'la sesion sobrevive a recargar');
    await p.click('aside a:has-text("Usuarios")');
    await esperar(p, '**/usuarios');
    await p.waitForSelector('main h1:has-text("Usuarios")', { timeout: 5000 }); ok(true, 'admin entra a /usuarios');
    ok(await p.locator('aside a[aria-current=page]').innerText() === 'Usuarios', 'enlace activo marcado');
    await p.goto(`${URL}/no-existe`);
    await p.waitForSelector('text=Página no encontrada');
    ok(true, '404 dentro del panel');
    await foto(p, 'b4-404.png');
    await p.goto(`${URL}/login`);
    await esperar(p, `${URL}/`);
    ok(true, 'con sesion, /login lleva al inicio');

    // Sidebar colapsable
    const ancho = () => p.locator('aside').evaluate((e) => e.getBoundingClientRect().width);
    ok(await ancho() === 248, 'sidebar abierto 248px');
    await p.click('button[aria-label="Alternar menú"]');
    await p.waitForTimeout(250);
    ok(await ancho() === 72, 'sidebar colapsado 72px');
    ok(await p.locator('aside a').first().getAttribute('title') === 'Inicio', 'colapsado mantiene el nombre en title');
    await foto(p, 'b4-colapsado.png');
    await p.reload();
    await p.waitForSelector('aside');
    ok(await ancho() === 72, 'el colapso persiste al recargar');
    await p.click('button[aria-label="Alternar menú"]');
    await p.waitForTimeout(250);
    await foto(p, 'b4-panel.png');

    // Logout
    await salir();
    await esperar(p, '**/login');
    ok(await local('inventario_token') === null && await local('inventario_usuario') === null, 'logout borra la sesion');
    await p.goto(`${URL}/productos`);
    await esperar(p, '**/login');
    await entrar(ALM);
    await esperar(p, '**/productos');
    ok(true, 'tras login vuelve a la pagina pedida');

    // Almacenero
    await p.waitForSelector('aside');
    ok(!(await p.locator('aside a:has-text("Usuarios")').count()), 'almacenero no ve Usuarios');
    await p.goto(`${URL}/usuarios`);
    await p.waitForSelector('text=Sin permisos');
    ok(p.url().endsWith('/usuarios') && await p.locator('text=403').isVisible(), '403 visible sin redirect mudo');
    ok(await p.locator('aside').isVisible(), '403 dentro del panel');
    await foto(p, 'b4-403.png');

    // Rol alterado a mano: manda la API
    await p.evaluate(() => {
        const u = JSON.parse(localStorage.getItem('inventario_usuario'));
        localStorage.setItem('inventario_usuario', JSON.stringify({ ...u, rol: 'Administrador' }));
    });
    await p.reload();
    await p.waitForSelector('aside');
    await p.waitForTimeout(300);
    ok(!(await p.locator('aside a:has-text("Usuarios")').count()) && await p.locator('text=Sin permisos').isVisible(), 'rol editado en localStorage no da acceso');
    ok(JSON.parse(await local('inventario_usuario')).rol === 'Almacenero', 'localStorage corregido por la API');

    // Token invalido: el interceptor limpia y manda al login
    await p.evaluate(() => localStorage.setItem('inventario_token', 'basura'));
    await p.goto(`${URL}/kardex`);
    await esperar(p, '**/login');
    ok(await local('inventario_token') === null, 'token invalido: sesion borrada y a /login');
    await entrar(ALM);
    await esperar(p, '**/kardex');
    ok(true, 'y al entrar vuelve a la pagina');

    // JSON corrupto en localStorage no rompe la app
    await p.evaluate(() => localStorage.setItem('inventario_usuario', '{roto'));
    await p.reload();
    await p.waitForSelector('aside');
    ok(true, 'localStorage corrupto se recupera');

    // Sesion cerrada desde otro lado con la API viva: usuario desactivado
    await salir();
    await esperar(p, '**/login');

    // Movil
    const m = await browser.newContext({ viewport: { width: 400, height: 760 } });
    const q = await m.newPage();
    q.on('pageerror', (e) => problemas.push(`pageerror movil: ${e.message}`));
    await q.goto(`${URL}/login`);
    await q.waitForSelector('input[name=email]');
    ok(!(await q.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'login sin desborde a 400px');
    await q.screenshot({ path: path.join(__dirname, 'b4-login-movil.png') });
    await q.fill('input[name=email]', ADMIN[0]);
    await q.fill('input[name=password]', ADMIN[1]);
    await q.click('button[type=submit]');
    await q.waitForSelector('header');
    const visible = () => q.locator('aside').evaluate((e) => getComputedStyle(e).visibility === 'visible' && e.getBoundingClientRect().left >= 0);
    ok(!(await visible()), 'drawer cerrado al inicio');
    ok(!(await q.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'panel sin desborde a 400px');
    ok(await q.getByText('Administrador').first().isVisible(), 'nombre visible en movil');
    await q.screenshot({ path: path.join(__dirname, 'b4-panel-movil.png') });
    const boton = q.locator('button[aria-label="Alternar menú"]');
    await boton.click();
    await q.waitForTimeout(250);
    ok(await visible() && await boton.getAttribute('aria-expanded') === 'true', 'drawer abre');
    await q.screenshot({ path: path.join(__dirname, 'b4-drawer.png') });
    await q.keyboard.press('Escape');
    await q.waitForTimeout(250);
    ok(!(await visible()), 'Escape cierra el drawer');
    ok(await q.evaluate(() => document.activeElement.getAttribute('aria-label')) === 'Alternar menú', 'el foco vuelve al boton');
    await boton.click();
    await q.waitForTimeout(250);
    await q.mouse.click(380, 400);
    await q.waitForTimeout(250);
    ok(!(await visible()), 'tocar el velo cierra el drawer');
    await boton.click();
    await q.waitForTimeout(250);
    await q.click('aside a:has-text("Productos")');
    await q.waitForTimeout(250);
    ok(q.url().endsWith('/productos') && !(await visible()), 'elegir un enlace navega y cierra');
    await boton.click();
    await q.waitForTimeout(250);
    await q.click('button[aria-label="Cerrar menú"]');
    await q.waitForTimeout(250);
    ok(!(await visible()), 'boton X cierra');
    await m.close();

    // Teclado: enlace para saltar al contenido
    await p.goto(`${URL}/login`);
    await entrar(ADMIN);
    await p.waitForSelector('aside');
    await p.keyboard.press('Tab');
    const saltar = await p.evaluate(() => document.activeElement.textContent);
    ok(saltar === 'Saltar al contenido', 'primer Tab: saltar al contenido');
    const contorno = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    ok(contorno === 'solid', 'foco visible');

    ok(problemas.length === 0, `consola limpia (${problemas.length})`);
    problemas.slice(0, 8).forEach((x) => console.log('    ', x));
    await browser.close();
    console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK');
    process.exitCode = fallos ? 1 : 0;
})().catch((e) => { console.error('ERROR:', e.message); process.exitCode = 2; process.exit(2); });
