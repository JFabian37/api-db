// Bloque 5: vistas completas en Chrome contra api_db_test (front 5174, API 3106)
const { chromium } = require('playwright-core');
const path = require('path');

const URL = 'http://localhost:5174';
const API = 'http://localhost:3106/api';
const ADMIN = ['admin@inventario.test', process.env.CLAVE_ADMIN];
const ALM = ['almacenero@inventario.test', process.env.CLAVE_ALM];
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLO'} ${m}`); if (!c) fallos++; };
const foto = (p, n) => p.screenshot({ path: path.join(__dirname, n) });
const ruta = (pg, f) => pg.waitForFunction((x) => location.pathname === x, f);

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    const problemas = [];
    const peticiones = [];
    let dialogosNativos = 0;
    p.on('console', (m) => {
        if (['error', 'warning'].includes(m.type()) && !/Failed to load resource/.test(m.text())) problemas.push(`${m.type()}: ${m.text()}`);
    });
    p.on('pageerror', (e) => problemas.push(`pageerror: ${e.message}`));
    p.on('request', (r) => { if (r.url().includes('/api/')) peticiones.push(`${r.method()} ${r.url().replace(API, '')}`); });
    p.on('dialog', (d) => { dialogosNativos++; d.dismiss(); });

    const entrar = async (pg, [email, clave]) => {
        await pg.fill('input[name=email]', email);
        await pg.fill('input[name=password]', clave);
        await pg.click('button[type=submit]');
        await pg.waitForSelector('aside');
    };
    const ir = async (texto) => { await p.click(`aside a:has-text("${texto}")`); await p.waitForSelector(`main h1:has-text("${texto}")`); await p.waitForSelector('main tbody tr td:not(:has(span[aria-hidden]))'); };
    const filas = () => p.locator('main tbody tr').count();
    const estable = () => p.waitForTimeout(450);
    const toast = async (texto) => { await p.waitForSelector(`[popover] >> text=${texto}`, { timeout: 4000 }); return true; };
    const dialogo = () => p.locator('dialog[open]');
    const cerrada = () => p.waitForSelector('dialog[open]', { state: 'detached' });

    await p.goto(`${URL}/login`);
    await entrar(p, ADMIN);
    const token = await p.evaluate(() => localStorage.getItem('inventario_token'));
    const api = async (m, r, b) => (await fetch(API + r, { method: m, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined })).json();

    // ---------- Dashboard ----------
    await p.waitForSelector('main table tbody tr td:has-text("Administrador"), main table tbody tr td:has-text("Almacenero")');
    const d = (await api('GET', '/dashboard')).data;
    const main = await p.innerText('main');
    for (const v of [d.total_productos, d.total_categorias, d.total_proveedores, d.bajo_stock]) ok(main.includes(String(v)), `KPI ${v} visible`);
    ok(main.includes('S/') && /32,340\.60/.test(main), 'valorizacion en soles');
    ok((await p.locator('main h1').innerText()) === 'Inicio', 'h1 Inicio');
    ok((await p.locator('main tbody tr').count()) === 5, '5 movimientos recientes');
    const badge = p.locator('main tbody span:text-is("Entrada")').first();
    ok((await badge.evaluate((e) => getComputedStyle(e).color)) === 'rgb(14, 122, 75)', 'Entrada verde');
    const segs = p.locator('main svg[role=img] circle');
    ok((await segs.count()) === 5, 'donut con 5 segmentos');
    ok((await p.locator('main svg[role=img]').getAttribute('aria-label')).includes('Accesorios: 54'), 'donut describe los datos');
    ok(await p.evaluate(() => [...document.querySelectorAll('script[src]')].every((s) => !/chart|d3|recharts/i.test(s.src))), 'sin librerias de graficos');
    const colorAcc = await p.locator('main li:has-text("Accesorios") span').first().getAttribute('style');
    // Punto real sobre el anillo: el centro geometrico del circulo es el hueco del donut
    const punto = await segs.nth(1).evaluate((c) => {
        const caja = c.ownerSVGElement.getBoundingClientRect();
        const escala = caja.width / 184;
        const inicio = -Number(c.getAttribute('stroke-dashoffset'));
        const arco = parseFloat(c.getAttribute('stroke-dasharray'));
        const angulo = ((inicio + arco / 2) / (2 * Math.PI * 70)) * 2 * Math.PI;
        return { x: caja.x + (92 + 70 * Math.sin(angulo)) * escala, y: caja.y + (92 - 70 * Math.cos(angulo)) * escala };
    });
    await p.mouse.move(punto.x, punto.y);
    await p.waitForTimeout(200);
    ok(/Almacenamiento/.test(await p.locator('main svg[role=img] ~ div').innerText()), 'hover muestra la categoria en el centro');
    await p.mouse.move(5, 5);
    await p.waitForTimeout(100);
    await foto(p, 'b5-dashboard.png');

    // ---------- Productos ----------
    await ir('Productos');
    ok(await filas() === 10, 'productos: 10 por pagina');
    ok((await p.innerText('main nav')).includes('1–10 de 15'), 'resumen de paginacion');
    ok(await p.locator('main button:has-text("Anterior")').isDisabled(), 'Anterior deshabilitado en la pagina 1');
    await p.click('main button:has-text("Siguiente")');
    await p.waitForFunction(() => document.querySelector('main nav')?.innerText.includes('11–15'));
    ok(await filas() === 5, 'pagina 2 con 5 filas');
    await foto(p, 'b5-productos.png');
    peticiones.length = 0;
    await p.locator('input[type=search]').pressSequentially('monitor', { delay: 40 });
    await p.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 2);
    await estable();
    const buscadas = peticiones.filter((r) => r.startsWith('GET /productos?') && r.includes('q=')).length;
    ok(buscadas === 1, `debounce: 7 teclas, ${buscadas} peticion con q`);
    await p.fill('input[type=search]', 'zzzzz');
    await p.waitForSelector('text=Sin resultados');
    ok(true, 'estado vacio al buscar');
    await p.fill('input[type=search]', '');
    await p.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 10);
    await p.selectOption('main select', { label: 'Redes' });
    await p.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 3);
    ok(true, 'filtro por categoria');
    await p.selectOption('main select', { label: 'Todas' });
    await p.check('main label:has-text("Solo bajo stock") input');
    await p.waitForFunction(() => [...document.querySelectorAll('main tbody tr')].length === 5);
    ok((await p.locator('main tbody span:text-is("Bajo")').count()) === 5, 'bajo stock con badge');
    await p.uncheck('main label:has-text("Solo bajo stock") input');
    await p.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 10);

    // Modal producto
    await p.click('button:has-text("Nuevo producto")');
    await dialogo().waitFor();
    ok(await p.evaluate(() => document.activeElement.name) === 'nombre', 'el foco entra al primer campo');
    await foto(p, 'b5-modal-producto.png');
    await p.keyboard.press('Escape');
    await cerrada();
    ok(await p.evaluate(() => document.activeElement.textContent) === 'Nuevo producto', 'Escape cierra y devuelve el foco');
    await p.click('button:has-text("Nuevo producto")');
    await p.click('dialog button[type=submit]');
    const textoD = await dialogo().innerText();
    ok(/El nombre es obligatorio/.test(textoD) && /Selecciona una categoría/.test(textoD) && /El precio es obligatorio/.test(textoD), 'no se guarda sin categoria: errores por campo');
    const opts = await p.locator('dialog select[name=categoria_id] option').allInnerTexts();
    ok(opts.includes('Redes') && opts.length === 6, 'select de categorias cargado de la API');
    ok((await p.locator('dialog select[name=proveedor_id] option').count()) === 6, 'select de proveedores cargado de la API');
    await p.fill('dialog input[name=nombre]', 'Mouse Duplicado');
    await p.selectOption('dialog select[name=categoria_id]', { label: 'Redes' });
    await p.fill('dialog input[name=precio]', '19.90');
    await p.fill('dialog input[name=codigo]', 'P-0001');
    await p.fill('dialog input[name=stock]', '7');
    await p.click('dialog button[type=submit]');
    await p.waitForSelector('dialog >> text=Ya existe un producto con ese código');
    ok(await p.getAttribute('dialog input[name=codigo]', 'aria-invalid') === 'true', 'error de la API pintado en su campo');
    ok(await p.locator('dialog [role=alert]').innerText() === 'El registro ya existe', 'error general dentro del modal');
    await p.fill('dialog input[name=codigo]', '');
    await p.click('dialog button[type=submit]');
    await cerrada();
    ok(await toast('Producto creado'), 'toast de exito');
    ok(await p.evaluate(() => { const el = [...document.querySelectorAll('[popover] p')].find((x) => x.textContent === 'Producto creado'); const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + 4, r.y + 4)); }), 'el toast queda encima de todo');
    await p.fill('input[type=search]', 'Mouse Duplicado');
    await p.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 1);
    const filaNueva = await p.locator('main tbody tr').innerText();
    ok(/P-\d{4}/.test(filaNueva) && /Redes/.test(filaNueva) && /S\/ 19\.90|S\/\s19\.90/.test(filaNueva) && /\b7\b/.test(filaNueva), `fila creada: ${filaNueva.replace(/\s+/g, ' ').slice(0, 60)}`);
    await p.click('main tbody button:has-text("Editar")');
    await dialogo().waitFor();
    ok(await p.inputValue('dialog input[name=nombre]') === 'Mouse Duplicado', 'editar precarga los datos');
    ok(await p.locator('dialog label:has-text("Stock actual") + input').isDisabled(), 'stock no editable: va por kardex');
    await p.fill('dialog input[name=nombre]', 'Mouse Editado');
    await p.click('dialog button[type=submit]');
    await cerrada();
    await toast('Producto actualizado');
    await p.fill('input[type=search]', 'Mouse Editado');
    await p.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 1);
    await p.click('main tbody button:has-text("Eliminar")');
    await dialogo().waitFor();
    ok(await p.evaluate(() => document.activeElement.textContent) === 'Cancelar', 'confirmacion enfoca Cancelar');
    await foto(p, 'b5-confirmar.png');
    await p.click('dialog button:has-text("Cancelar")');
    await cerrada();
    ok(await filas() === 1, 'cancelar no elimina');
    await p.click('main tbody button:has-text("Eliminar")');
    await p.click('dialog button:has-text("Eliminar")');
    ok(await toast('se marcó como inactivo'), 'soft delete con mensaje claro');
    await p.waitForSelector('text=Sin resultados');
    await p.check('main label:has-text("Incluir inactivos") input');
    await p.waitForSelector('main tbody span:text-is("Inactivo")');
    ok(true, 'inactivo visible con el filtro');

    // ---------- Kardex ----------
    await ir('Kardex');
    await p.click('button:has-text("Registrar movimiento")');
    await dialogo().waitFor();
    ok(await p.evaluate(() => document.activeElement.placeholder) === 'Busca por nombre o código', 'foco en el buscador de producto');
    await p.click('dialog button[type=submit]');
    ok(await p.locator('dialog >> text=Selecciona un producto').isVisible(), 'exige producto');
    await p.fill('dialog input[type=search]', 'Router');
    await p.waitForFunction(() => document.querySelectorAll('dialog ul button').length === 1);
    await p.click('dialog ul button');
    ok(/Stock actual\s*14/.test(await dialogo().innerText()), 'muestra el stock actual');
    await p.selectOption('dialog select[name=tipo_movimiento]', 'Salida');
    ok(!(await p.locator('dialog select[name=proveedor_id]').count()), 'proveedor solo en Entrada');
    await p.fill('dialog input[name=cantidad]', '15');
    ok(/Stock después del movimiento:\s*-1/.test(await dialogo().innerText()), 'calcula el stock resultante');
    peticiones.length = 0;
    await p.click('dialog button[type=submit]');
    await p.waitForSelector('dialog >> text=No puede superar el stock disponible (14)');
    ok(!peticiones.some((r) => r.startsWith('POST')), 'salida excesiva: validada en el cliente, sin llamar a la API');
    await p.fill('dialog input[name=cantidad]', '4');
    await foto(p, 'b5-modal-movimiento.png');
    await p.click('dialog button[type=submit]');
    await cerrada();
    await toast('Movimiento registrado');
    await p.waitForFunction(() => /14 → 10/.test(document.querySelector('main tbody tr')?.innerText));
    ok(/Router/.test(await p.locator('main tbody tr').first().innerText()), 'movimiento al inicio del kardex');
    await p.click('button:has-text("Registrar movimiento")');
    await p.fill('dialog input[type=search]', 'Router');
    await p.waitForFunction(() => document.querySelectorAll('dialog ul button').length === 1);
    await p.click('dialog ul button');
    await p.selectOption('dialog select[name=tipo_movimiento]', 'Ajuste');
    ok(await p.locator('dialog label:has-text("Stock final")').isVisible(), 'Ajuste pide stock final');
    await p.click('dialog button:has-text("Cancelar")');
    await cerrada();
    await p.click('main tbody tr >> nth=0 >> button:has-text("Anular")');
    await p.waitForSelector('dialog >> text=Se revertirá su efecto');
    await p.click('dialog button:has-text("Anular")');
    await toast('Movimiento anulado');
    await p.waitForSelector('main tbody tr >> nth=0 >> text=Anulado');
    ok(!(await p.locator('main tbody tr').first().locator('button').count()), 'anulado sin boton Anular');
    ok((await api('GET', '/productos?q=Router')).data[0].stock === 14, 'anular devolvio el stock');
    await p.selectOption('main select', 'Ajuste');
    await p.waitForFunction(() => { const r = [...document.querySelectorAll('main tbody tr')]; return r.length > 0 && r.every((f) => f.innerText.includes('Ajuste')); });
    ok(true, 'filtro por tipo');
    await p.selectOption('main select', { label: 'Todos' });
    await p.fill('input[type=date] >> nth=1', '2001-01-01');
    await p.waitForSelector('text=Sin resultados');
    ok(true, 'filtro por fecha');
    await p.fill('input[type=date] >> nth=1', '');
    await p.waitForSelector('main tbody tr');
    await estable();
    await foto(p, 'b5-kardex.png');

    // ---------- Categorias ----------
    await ir('Categorías');
    ok(/Accesorios[\s\S]*?\b4\b/.test(await p.locator('main tbody tr').first().innerText()), 'muestra cantidad de productos');
    await p.click('main tbody tr >> nth=0 >> button:has-text("Eliminar")');
    await p.click('dialog button:has-text("Eliminar")');
    ok(await toast('tiene registros asociados'), 'categoria con productos: toast de error 409');
    await p.waitForSelector('dialog[open]', { state: 'detached' });
    for (let i = 1; i <= 6; i++) await api('POST', '/categorias', { nombre: `Zona ${i}` });
    await p.reload();
    await p.waitForSelector('main tbody tr:has-text("Accesorios")');
    await p.click('main button:has-text("Siguiente")');
    await p.waitForSelector('main tbody tr:has-text("Zona 6")');
    ok(await filas() === 1, 'pagina 2 con una sola fila');
    await p.click('main tbody button:has-text("Eliminar")');
    await p.click('dialog button:has-text("Eliminar")');
    await p.waitForFunction(() => document.querySelector('main nav')?.innerText.includes('Página 1 de 1'));
    ok(await filas() === 10, 'al vaciar la ultima pagina vuelve a la anterior');
    await p.click('button:has-text("Nueva categoría")');
    await p.fill('dialog input[name=nombre]', 'Redes');
    await p.click('dialog button[type=submit]');
    await p.waitForSelector('dialog >> text=Ya existe una categoría con ese nombre');
    ok(true, 'categoria repetida: error en el campo');
    await p.click('dialog button:has-text("Cancelar")');
    await cerrada();

    // ---------- Proveedores ----------
    await ir('Proveedores');
    await p.click('button:has-text("Nuevo proveedor")');
    await p.fill('dialog input[name=razon_social]', 'Prov E2E');
    await p.fill('dialog input[name=ruc]', '123');
    await p.fill('dialog input[name=email]', 'x');
    await p.click('dialog button[type=submit]');
    ok(await p.locator('dialog >> text=El RUC debe tener 11 dígitos').isVisible() && await p.locator('dialog >> text=El correo no es válido').isVisible(), 'proveedor validado en el cliente');
    await p.fill('dialog input[name=ruc]', '20999999999');
    await p.fill('dialog input[name=email]', '');
    await p.click('dialog button[type=submit]');
    await cerrada();
    await toast('Proveedor creado');
    await p.fill('input[type=search]', 'Prov E2E');
    await p.waitForFunction(() => document.querySelectorAll('main tbody tr').length === 1);
    await p.click('main tbody button:has-text("Eliminar")');
    await p.click('dialog button:has-text("Eliminar")');
    await toast('Proveedor eliminado');
    await p.waitForSelector('text=Sin resultados');
    ok(true, 'proveedor creado y eliminado');

    // ---------- Usuarios ----------
    await ir('Usuarios');
    const propia = p.locator('main tbody tr:has-text("admin@inventario.test")');
    ok(!(await propia.locator('button:has-text("Desactivar")').count()), 'no puede desactivarse a si mismo');
    await propia.locator('button:has-text("Editar")').click();
    await dialogo().waitFor();
    ok(await p.locator('dialog select[name=rol]').isDisabled(), 'no puede cambiar su propio rol');
    await p.click('dialog button:has-text("Cancelar")');
    await cerrada();
    await p.click('button:has-text("Nuevo usuario")');
    await p.click('dialog button[type=submit]');
    ok(await p.locator('dialog >> text=La contraseña es obligatoria').isVisible(), 'clave obligatoria al crear');
    await p.fill('dialog input[name=nombre]', 'Sara Sup');
    await p.fill('dialog input[name=email]', 'almacenero@inventario.test');
    await p.fill('dialog input[name=password]', 'Clave12345');
    await p.selectOption('dialog select[name=rol]', 'Supervisor');
    await p.click('dialog button[type=submit]');
    await p.waitForSelector('dialog >> text=Ya existe un usuario con ese correo');
    ok(true, 'correo repetido en su campo');
    await p.fill('dialog input[name=email]', 'sara@test.com');
    await p.click('dialog button[type=submit]');
    await cerrada();
    await toast('Usuario creado');
    await p.waitForSelector('main tbody tr:has-text("sara@test.com")');
    await foto(p, 'b5-usuarios.png');

    // ---------- Supervisor: solo lectura ----------
    const s = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const q = await s.newPage();
    q.on('pageerror', (e) => problemas.push(`supervisor: ${e.message}`));
    await q.goto(`${URL}/login`);
    await entrar(q, ['sara@test.com', 'Clave12345']);
    for (const [ruta2, boton] of [['Productos', 'Nuevo producto'], ['Categorías', 'Nueva categoría'], ['Proveedores', 'Nuevo proveedor'], ['Kardex', 'Registrar movimiento']]) {
        await q.click(`aside a:has-text("${ruta2}")`);
        await q.waitForSelector(`main h1:has-text("${ruta2}")`);
        await q.waitForSelector('main tbody tr');
        await q.waitForTimeout(200);
        ok(!(await q.locator(`button:has-text("${boton}")`).count()) && !(await q.locator('main th:has-text("Acciones")').count()), `supervisor en ${ruta2}: solo lectura`);
    }
    await s.close();

    // Usuario desactivado mientras tiene sesion abierta
    const a = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const r = await a.newPage();
    await r.goto(`${URL}/login`);
    await entrar(r, ALM);
    await r.click('aside a:has-text("Productos")');
    await r.waitForSelector('main tbody tr td:has-text("P-00")');
    for (const [boton, visible] of [['Nuevo producto', true]]) ok((await r.locator(`button:has-text("${boton}")`).count() > 0) === visible, 'almacenero puede crear productos');
    ok(!(await r.locator('main tbody button:has-text("Eliminar")').count()) && await r.locator('main tbody button:has-text("Editar")').count() > 0, 'almacenero edita pero no elimina');
    await r.click('aside a:has-text("Categorías")');
    await r.waitForSelector('main tbody tr td:has-text("Accesorios")');
    ok(!(await r.locator('button:has-text("Nueva categoría")').count()), 'almacenero no crea categorias');
    await p.click('main tbody tr:has-text("almacenero@inventario.test") >> button:has-text("Desactivar")');
    await p.click('dialog button:has-text("Desactivar")');
    await p.waitForSelector('main tbody tr:has-text("almacenero@inventario.test") >> text=Inactivo');
    await r.click('aside a:has-text("Proveedores")');
    await r.waitForFunction(() => location.pathname === '/login');
    ok(true, 'cuenta desactivada: el 401 lo saca al login en la siguiente peticion');
    await a.close();
    await p.click('main tbody tr:has-text("almacenero@inventario.test") >> button:has-text("Activar")');
    await p.click('dialog button:has-text("Activar")');
    await toast('Estado actualizado');

    // ---------- Estados de carga y error ----------
    await p.route('**/api/proveedores**', async (rt) => { await new Promise((x) => setTimeout(x, 700)); rt.continue(); });
    await p.click('aside a:has-text("Proveedores")');
    await p.waitForSelector('main table[class] span[aria-hidden=true]');
    ok((await p.locator('main tbody tr').count()) === 5, 'skeleton durante la carga');
    await foto(p, 'b5-skeleton.png');
    await p.waitForSelector('main tbody tr:has-text("Distribuidora")');
    await p.unroute('**/api/proveedores**');
    await p.route('**/api/categorias**', (rt) => rt.abort());
    await p.click('aside a:has-text("Categorías")');
    await p.waitForSelector('text=No se pudo cargar la información');
    ok(await p.locator('text=No se pudo conectar con el servidor').isVisible(), 'error de red con mensaje');
    await p.unroute('**/api/categorias**');
    await p.click('button:has-text("Reintentar")');
    await p.waitForSelector('main tbody tr:has-text("Accesorios")');
    ok(true, 'Reintentar recupera la vista');

    ok(dialogosNativos === 0, 'sin window.confirm ni alert');
    ok(!(await p.evaluate(() => [...document.styleSheets].some((h) => { try { return [...h.cssRules].some((c) => /\.btn-primary/.test(c.cssText)); } catch { return false; } }))), 'sin Bootstrap');

    // ---------- Movil ----------
    const m = await browser.newContext({ viewport: { width: 400, height: 800 } });
    const t = await m.newPage();
    t.on('pageerror', (e) => problemas.push(`movil: ${e.message}`));
    await t.goto(`${URL}/login`);
    await t.fill('input[name=email]', ADMIN[0]);
    await t.fill('input[name=password]', ADMIN[1]);
    await t.click('button[type=submit]');
    await t.waitForSelector('header');
    await t.waitForSelector('main table tbody tr td:has-text("Administrador"), main table tbody tr td:has-text("Almacenero")');
    ok(!(await t.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'dashboard sin desborde a 400px');
    await t.screenshot({ path: path.join(__dirname, 'b5-movil-dashboard.png'), fullPage: true });
    for (const [paso, url] of [['Productos', '/productos'], ['Categorías', '/categorias'], ['Proveedores', '/proveedores'], ['Kardex', '/kardex'], ['Usuarios', '/usuarios']]) {
        await t.click('button[aria-label="Alternar menú"]');
        await t.waitForTimeout(220);
        await t.click(`aside a:has-text("${paso}")`);
        await t.waitForFunction((x) => location.pathname === x, url);
        await t.waitForFunction((h) => document.querySelector('main h1')?.textContent === h, paso);
        await t.waitForSelector('main tbody tr td:not(:has(span[aria-hidden]))', { timeout: 8000 }).catch(async () => console.log('     SIN FILAS en', paso, '| main:', (await t.innerText('main')).replace(/s+/g, ' ').slice(0, 200)));
        await t.waitForTimeout(250);
        const info = await t.evaluate(() => {
            const td = document.querySelector('main tbody td');
            return { desborde: document.documentElement.scrollWidth > innerWidth, display: getComputedStyle(td).display, etiqueta: getComputedStyle(td, '::before').content, th: document.querySelector('main thead').getBoundingClientRect().height };
        });
        ok(!info.desborde && info.display === 'flex' && info.etiqueta !== 'none' && info.th <= 1, `${paso}: tarjetas a 400px, etiqueta ${info.etiqueta}`);
        await t.screenshot({ path: path.join(__dirname, `b5-movil-${url.slice(1)}.png`), fullPage: true });
    }
    await t.click('main button:has-text("Nuevo usuario")');
    await t.waitForSelector('dialog[open]');
    const anchoModal = await t.locator('dialog[open]').evaluate((e) => e.getBoundingClientRect().width);
    ok(anchoModal <= 368, `modal cabe a 400px (${anchoModal}px)`);
    await t.screenshot({ path: path.join(__dirname, 'b5-movil-modal.png') });
    await m.close();

    ok(problemas.length === 0, `consola limpia (${problemas.length})`);
    problemas.slice(0, 8).forEach((x) => console.log('    ', x.slice(0, 200)));
    await browser.close();
    console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTODO OK');
    process.exitCode = fallos ? 1 : 0;
})().catch((e) => { console.error('ERROR:', e.message.slice(0, 600)); process.exitCode = 2; process.exit(2); });
