// Vuelta completa en el entorno real (5173 + 3006 + api-db). Solo crea registros marcados [QA]
const { chromium } = require('playwright-core');
const URL = 'http://localhost:5173';
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? 'OK   ' : 'FALLO'} ${m}`); if (!c) fallos++; };

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const mal = [];
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) mal.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => mal.push(e.message));

  const ir = async (t) => { await p.click(`aside a:has-text("${t}")`); await p.waitForFunction((h) => document.querySelector('main h1')?.textContent === h, t); await p.waitForSelector('main tbody tr td:not(:has(span[aria-hidden]))'); };
  const toast = (t) => p.waitForSelector(`[popover] >> text=${t}`, { timeout: 5000 });
  const cerrado = () => p.waitForSelector('dialog[open]', { state: 'detached' });
  const buscar = async (t, n) => { await p.fill('input[type=search]', t); await p.waitForFunction((x) => document.querySelectorAll('main tbody tr').length === x, n); };

  await p.goto(`${URL}/login`);
  await p.waitForSelector('input[name=email]');
  await p.fill('input[name=email]', 'admin@inventario.test');
  await p.fill('input[name=password]', process.env.CLAVE_ADMIN);
  await p.click('button[type=submit]');
  await p.waitForSelector('main svg[role=img]');
  const token = await p.evaluate(() => localStorage.getItem('inventario_token'));
  const api = async (r) => (await fetch(`http://localhost:3006/api${r}`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const inicial = (await api('/dashboard')).data;

  await ir('Categorías');
  await p.click('button:has-text("Nueva categoría")');
  await p.fill('dialog input[name=nombre]', '[QA] Categoria');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Categoría creada');
  ok(true, 'crear categoria');

  await ir('Proveedores');
  await p.click('button:has-text("Nuevo proveedor")');
  await p.fill('dialog input[name=razon_social]', '[QA] Proveedor');
  await p.fill('dialog input[name=ruc]', '20000000000');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Proveedor creado');
  ok(true, 'crear proveedor');

  await ir('Productos');
  await p.click('button:has-text("Nuevo producto")');
  await p.fill('dialog input[name=nombre]', '[QA] Producto');
  await p.waitForFunction(() => [...document.querySelectorAll('dialog select[name=categoria_id] option')].some((o) => o.textContent === '[QA] Categoria'));
  await p.selectOption('dialog select[name=categoria_id]', { label: '[QA] Categoria' });
  await p.selectOption('dialog select[name=proveedor_id]', { label: '[QA] Proveedor' });
  await p.fill('dialog input[name=precio]', '10');
  await p.fill('dialog input[name=stock]', '20');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Producto creado');
  await buscar('[QA]', 1);
  ok(/\[QA\] Categoria/.test(await p.locator('main tbody tr').innerText()), 'crear producto con sus relaciones');
  await p.click('main tbody button:has-text("Editar")');
  await p.fill('dialog input[name=precio]', '12');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Producto actualizado');
  await p.waitForSelector('main tbody tr:has-text("12.00")');
  ok(true, 'editar producto');

  await ir('Kardex');
  await p.click('button:has-text("Registrar movimiento")');
  await p.fill('dialog input[type=search]', '[QA]');
  await p.waitForFunction(() => document.querySelectorAll('dialog ul button').length === 1);
  await p.click('dialog ul button');
  await p.selectOption('dialog select[name=tipo_movimiento]', 'Salida');
  await p.fill('dialog input[name=cantidad]', '5');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Movimiento registrado');
  await p.waitForFunction(() => /20 → 15/.test(document.querySelector('main tbody tr')?.innerText));
  ok(true, 'registrar salida 20 -> 15');
  const durante = (await api('/dashboard')).data;
  ok(durante.total_productos === inicial.total_productos + 1 && Math.abs(durante.valorizacion - inicial.valorizacion - 180) < 0.01, `dashboard al dia: valorizacion +${(durante.valorizacion - inicial.valorizacion).toFixed(2)} (15 x S/ 12)`);
  await p.click('main tbody tr >> nth=0 >> button:has-text("Anular")');
  await p.click('dialog button:has-text("Anular")');
  await toast('Movimiento anulado');
  const prod = (await api(`/productos?q=${encodeURIComponent('[QA]')}`)).data[0];
  ok(prod.stock === 20, 'anular devuelve el stock a 20');

  await ir('Productos');
  await buscar('[QA]', 1);
  await p.click('main tbody button:has-text("Eliminar")');
  await p.click('dialog button:has-text("Eliminar")');
  await toast('se marcó como inactivo');
  await p.waitForSelector('text=Sin resultados');
  ok(true, 'producto con historial queda inactivo');

  await ir('Categorías');
  await buscar('[QA]', 1);
  await p.click('main tbody button:has-text("Eliminar")');
  await p.click('dialog button:has-text("Eliminar")');
  await toast('tiene registros asociados');
  ok(true, 'categoria en uso no se borra');

  await ir('Proveedores');
  await buscar('[QA]', 1);
  await p.click('main tbody button:has-text("Eliminar")');
  await p.click('dialog button:has-text("Eliminar")');
  await toast('Proveedor eliminado');
  ok(true, 'proveedor se borra y el producto queda sin proveedor');

  await p.click('button:has-text("Cerrar sesión")');
  await p.waitForFunction(() => location.pathname === '/login');
  ok(mal.length === 0, `sin errores en consola (${mal.length}) ${mal.join(' | ')}`);
  await b.close();
  console.log(fallos ? `${fallos} FALLO(S)` : 'TODO OK');
  process.exitCode = fallos ? 1 : 0;
})().catch((e) => { console.error('ERROR:', e.message.slice(0, 500)); process.exitCode = 2; process.exit(2); });
