// Auditoria con axe-core (WCAG 2 A/AA) de todas las pantallas
const { chromium } = require('playwright-core');
const fs = require('fs');
const URL = 'http://localhost:5174';
const fuente = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
let total = 0;
const auditar = async (p, nombre) => {
  await p.evaluate(fuente);
  const r = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
  console.log(`${r.violations.length ? 'FALLO' : 'OK   '} ${nombre}: ${r.violations.length} reglas, ${r.passes.length} superadas`);
  for (const v of r.violations) {
    total++;
    console.log(`     [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const n of v.nodes.slice(0, 3)) console.log('       ', n.target.join(' '), '|', (n.any[0]?.message || n.failureSummary || '').slice(0, 130));
  }
};
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [modo, viewport] of [['escritorio', { width: 1280, height: 800 }], ['movil', { width: 400, height: 800 }]]) {
    const c = await b.newContext({ viewport });
    const p = await c.newPage();
    await p.goto(`${URL}/login`);
    await p.waitForSelector('input[name=email]');
    await p.click('button[type=submit]');
    await p.waitForTimeout(150);
    await auditar(p, `${modo} login con errores`);
    await p.fill('input[name=email]', 'admin@inventario.test');
    await p.fill('input[name=password]', process.env.CLAVE_ADMIN);
    await p.click('button[type=submit]');
    await p.waitForSelector('main h1');
    await p.waitForSelector('main svg[role=img]');
    await p.waitForTimeout(300);
    await auditar(p, `${modo} dashboard`);
    for (const [ruta, h1, boton] of [['/productos', 'Productos', 'Nuevo producto'], ['/categorias', 'Categorías', 'Nueva categoría'], ['/proveedores', 'Proveedores', 'Nuevo proveedor'], ['/kardex', 'Kardex', 'Registrar movimiento'], ['/usuarios', 'Usuarios', 'Nuevo usuario']]) {
      await p.goto(URL + ruta);
      await p.waitForFunction((h) => document.querySelector('main h1')?.textContent === h, h1);
      await p.waitForSelector('main tbody tr td:not(:has(span[aria-hidden]))');
      await p.waitForTimeout(250);
      await auditar(p, `${modo} ${h1}`);
      await p.click(`button:has-text("${boton}")`);
      await p.waitForSelector('dialog[open]');
      await p.waitForTimeout(250);
      await p.click('dialog button[type=submit]');
      await p.waitForTimeout(250);
      await auditar(p, `${modo} modal ${h1} con errores`);
      await p.keyboard.press('Escape');
      await p.waitForSelector('dialog[open]', { state: 'detached' });
    }
    if (modo === 'movil') {
      await p.click('button[aria-label="Alternar menú"]');
      await p.waitForTimeout(250);
      await auditar(p, 'movil menu abierto');
    } else {
      await p.goto(`${URL}/productos`);
      await p.waitForSelector('main tbody tr td:has-text("P-00")');
      await p.click('main tbody button:has-text("Eliminar") >> nth=0');
      await p.waitForSelector('dialog[open]');
      await p.waitForTimeout(250);
      await auditar(p, 'escritorio confirmacion');
      await p.keyboard.press('Escape');
      await p.waitForSelector('dialog[open]', { state: 'detached' });
      // Cabecera sticky
      await p.setViewportSize({ width: 1280, height: 520 });
      await p.waitForTimeout(200);
      const r = await p.evaluate(() => {
        const th = document.querySelector('main thead th');
        const caja = th.closest('table').parentElement;
        const antes = th.getBoundingClientRect().top;
        caja.scrollTop = 120;
        return { altoCaja: caja.clientHeight, altoTabla: caja.scrollHeight, desplazado: caja.scrollTop, antes, despues: th.getBoundingClientRect().top };
      });
      console.log(`${r.desplazado > 0 && r.antes === r.despues ? 'OK   ' : 'FALLO'} cabecera sticky`, JSON.stringify(r));
    }
    await c.close();
  }
  await b.close();
  console.log(`\nviolaciones: ${total}`);
})().catch((e) => { console.error('ERROR', e.message.slice(0, 400)); process.exit(1); });
