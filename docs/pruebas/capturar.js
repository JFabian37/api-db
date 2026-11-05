// Recorre la app contra api_db_test y captura listados, dialogos y toasts de cada vista
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:5174';
const DIR = path.join(__dirname, '..', 'vista');
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR);
const items = [];

const LISTA = 'Listado';
const DIALOGO = 'Diálogo';
const TOAST = 'Toast';
const VALIDACION = 'Validación';

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();

  const foto = async (pg, vista, tipo, titulo, nota, opciones = {}) => {
    const id = `${String(items.length + 1).padStart(2, '0')}.png`;
    await pg.mouse.move(2, 2);
    await pg.waitForTimeout(260);
    await pg.screenshot({ path: path.join(DIR, id), ...opciones });
    items.push({ id, vista, tipo, titulo, nota, movil: pg.viewportSize().width < 500 });
    console.log(id, vista, '-', titulo);
  };
  const toast = (t) => p.waitForSelector(`[popover] >> text=${t}`, { timeout: 5000 });
  const sinToasts = async () => {
    while (await p.locator('[aria-label="Cerrar aviso"]').count()) await p.locator('[aria-label="Cerrar aviso"]').first().click();
    await p.waitForTimeout(80);
  };
  const cerrado = () => p.waitForSelector('dialog[open]', { state: 'detached' });
  const ir = async (t) => {
    await sinToasts();
    await p.click(`aside a:has-text("${t}")`);
    await p.waitForFunction((h) => document.querySelector('main h1')?.textContent === h, t);
    await p.waitForSelector('main tbody tr td:not(:has(span[aria-hidden]))');
  };
  const buscar = async (t, n) => {
    await p.fill('input[type=search]', t);
    await p.waitForFunction((x) => document.querySelectorAll('main tbody tr').length === x, n);
    await p.waitForTimeout(100);
  };

  // ---------- Acceso ----------
  await p.goto(`${URL}/login`);
  await p.waitForSelector('input[name=email]');
  await p.fill('input[name=email]', 'admin@inventario.test');
  await p.fill('input[name=password]', 'clave-incorrecta');
  await p.click('button[type=submit]');
  await p.waitForSelector('[role=alert]');
  await foto(p, 'Acceso', VALIDACION, 'Contraseña incorrecta', 'El error de la API aparece en el formulario, sin recargar la página.');
  await p.fill('input[name=password]', process.env.CLAVE_ADMIN);
  await p.click('button[type=submit]');
  await p.waitForSelector('main svg[role=img]');

  // ---------- Inicio ----------
  await foto(p, 'Inicio', LISTA, 'Panel de inicio', 'Cinco indicadores, movimientos recientes y stock por categoría.');
  const punto = await p.locator('main svg[role=img] circle').nth(1).evaluate((c) => {
    const caja = c.ownerSVGElement.getBoundingClientRect();
    const k = caja.width / 184;
    const a = ((-Number(c.getAttribute('stroke-dashoffset')) + parseFloat(c.getAttribute('stroke-dasharray')) / 2) / (2 * Math.PI * 70)) * 2 * Math.PI;
    return { x: caja.x + (92 + 70 * Math.sin(a)) * k, y: caja.y + (92 - 70 * Math.cos(a)) * k };
  });
  await p.evaluate((y) => window.scrollTo(0, y), Math.max(0, punto.y - 400));
  await p.waitForTimeout(100);
  const punto2 = await p.locator('main svg[role=img] circle').nth(1).evaluate((c) => {
    const caja = c.ownerSVGElement.getBoundingClientRect();
    const k = caja.width / 184;
    const a = ((-Number(c.getAttribute('stroke-dashoffset')) + parseFloat(c.getAttribute('stroke-dasharray')) / 2) / (2 * Math.PI * 70)) * 2 * Math.PI;
    return { x: caja.x + (92 + 70 * Math.sin(a)) * k, y: caja.y + (92 - 70 * Math.cos(a)) * k };
  });
  await p.mouse.move(punto2.x, punto2.y);
  await p.waitForTimeout(260);
  const idHover = `${String(items.length + 1).padStart(2, '0')}.png`;
  await p.screenshot({ path: path.join(DIR, idHover) });
  items.push({ id: idHover, vista: 'Inicio', tipo: LISTA, titulo: 'Donut con el cursor encima', nota: 'El segmento crece y el centro muestra la categoría. La leyenda da las cifras exactas.', movil: false });
  await p.evaluate(() => window.scrollTo(0, 0));

  // ---------- Productos ----------
  await ir('Productos');
  await foto(p, 'Productos', LISTA, 'Listado', 'Búsqueda, filtros, paginación del servidor y aviso de bajo stock.');
  await buscar('zzzz', 0).catch(() => {});
  await p.waitForSelector('text=Sin resultados');
  await foto(p, 'Productos', LISTA, 'Búsqueda sin resultados', 'Estado vacío con una indicación de qué hacer.');
  await buscar('', 10);
  await p.click('button:has-text("Nuevo producto")');
  await p.waitForSelector('dialog[open]');
  await p.click('dialog button[type=submit]');
  await foto(p, 'Productos', VALIDACION, 'Crear: campos obligatorios', 'No se guarda sin categoría. Cada error aparece junto a su campo.');
  await p.fill('dialog input[name=nombre]', 'Webcam Full HD');
  await p.selectOption('dialog select[name=categoria_id]', { label: 'Accesorios' });
  await p.selectOption('dialog select[name=proveedor_id]', { index: 2 });
  await p.fill('dialog input[name=precio]', '159.90');
  await p.fill('dialog input[name=codigo]', 'P-0001');
  await p.fill('dialog input[name=stock]', '12');
  await p.fill('dialog textarea[name=descripcion]', 'Cámara USB con micrófono integrado');
  await p.click('dialog button[type=submit]');
  await p.waitForSelector('dialog >> text=Ya existe un producto con ese código');
  await foto(p, 'Productos', VALIDACION, 'Crear: error devuelto por la API', 'El código ya existe: la API rechaza el registro y el error se pinta en su campo.');
  await p.fill('dialog input[name=codigo]', '');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Producto creado');
  await buscar('Webcam', 1);
  await foto(p, 'Productos', TOAST, 'Crear: producto guardado', 'Toast de éxito. El código P-0016 se generó solo y el stock inicial entró por el kardex.');
  await sinToasts();
  await p.click('main tbody button:has-text("Editar")');
  await p.waitForSelector('dialog[open]');
  await p.fill('dialog input[name=precio]', '149.90');
  await foto(p, 'Productos', DIALOGO, 'Editar', 'Modal con los datos cargados. El stock queda bloqueado porque solo cambia por el kardex.');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Producto actualizado');
  await p.waitForSelector('main tbody tr:has-text("149.90")');
  await foto(p, 'Productos', TOAST, 'Editar: cambios guardados', 'La fila se actualiza sin recargar la página.');
  await sinToasts();
  await p.click('main tbody button:has-text("Eliminar")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Productos', DIALOGO, 'Eliminar: confirmación', 'Diálogo propio, sin window.confirm. El foco inicia en Cancelar.');
  await p.click('dialog button:has-text("Eliminar")');
  await toast('se marcó como inactivo');
  await p.waitForSelector('text=Sin resultados');
  await foto(p, 'Productos', TOAST, 'Eliminar con historial', 'Tiene movimientos, así que queda inactivo. El toast explica lo que pasó.');
  await buscar('', 10);

  // ---------- Categorias ----------
  await ir('Categorías');
  await foto(p, 'Categorías', LISTA, 'Listado', 'Cada categoría muestra cuántos productos activos tiene.');
  await p.click('button:has-text("Nueva categoría")');
  await p.waitForSelector('dialog[open]');
  await p.fill('dialog input[name=nombre]', 'Redes');
  await p.click('dialog button[type=submit]');
  await p.waitForSelector('dialog >> text=Ya existe una categoría con ese nombre');
  await foto(p, 'Categorías', VALIDACION, 'Crear: nombre repetido', 'El nombre debe ser único. El error llega de la API.');
  await p.fill('dialog input[name=nombre]', 'Impresoras');
  await p.fill('dialog textarea[name=descripcion]', 'Impresoras y consumibles');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Categoría creada');
  await buscar('Impresoras', 1);
  await foto(p, 'Categorías', TOAST, 'Crear: categoría guardada', 'Toast de éxito con la fila nueva en el listado.');
  await sinToasts();
  await p.click('main tbody button:has-text("Editar")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Categorías', DIALOGO, 'Editar', 'Al editar aparece la casilla para activar o desactivar.');
  await p.click('dialog button:has-text("Cancelar")');
  await cerrado();
  await p.click('main tbody button:has-text("Eliminar")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Categorías', DIALOGO, 'Eliminar: confirmación', 'Avisa que no se podrá eliminar si tiene productos.');
  await p.click('dialog button:has-text("Eliminar")');
  await toast('Categoría eliminada');
  await p.waitForSelector('text=Sin resultados');
  await foto(p, 'Categorías', TOAST, 'Eliminar: categoría vacía', 'Sin productos asociados, se borra.');
  await buscar('Redes', 1);
  await sinToasts();
  await p.click('main tbody button:has-text("Eliminar")');
  await p.click('dialog button:has-text("Eliminar")');
  await toast('tiene registros asociados');
  await p.waitForSelector('dialog[open]', { state: 'detached' });
  await foto(p, 'Categorías', TOAST, 'Eliminar: categoría en uso', 'Toast de error con el 409 de la API. La categoría sigue en la lista.');
  await buscar('', 5);

  // ---------- Proveedores ----------
  await ir('Proveedores');
  await foto(p, 'Proveedores', LISTA, 'Listado', 'Razón social, RUC, contacto, teléfono y correo.');
  await p.click('button:has-text("Nuevo proveedor")');
  await p.waitForSelector('dialog[open]');
  await p.fill('dialog input[name=razon_social]', 'Importadora Norte SAC');
  await p.fill('dialog input[name=ruc]', '123');
  await p.fill('dialog input[name=email]', 'correo-invalido');
  await p.click('dialog button[type=submit]');
  await foto(p, 'Proveedores', VALIDACION, 'Crear: formato inválido', 'RUC de 11 dígitos y correo válido, comprobados en el navegador.');
  await p.fill('dialog input[name=ruc]', '20999000006');
  await p.fill('dialog input[name=email]', 'ventas@norte.example.com');
  await p.fill('dialog input[name=contacto]', 'Marta Salas');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Proveedor creado');
  await buscar('Importadora', 1);
  await foto(p, 'Proveedores', TOAST, 'Crear: proveedor guardado', 'Toast de éxito.');
  await sinToasts();
  await p.click('main tbody button:has-text("Editar")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Proveedores', DIALOGO, 'Editar', 'Modal con los datos cargados.');
  await p.click('dialog button:has-text("Cancelar")');
  await cerrado();
  await p.click('main tbody button:has-text("Eliminar")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Proveedores', DIALOGO, 'Eliminar: confirmación', 'Avisa que sus productos y movimientos quedarán sin proveedor.');
  await p.click('dialog button:has-text("Eliminar")');
  await toast('Proveedor eliminado');
  await p.waitForSelector('text=Sin resultados');
  await foto(p, 'Proveedores', TOAST, 'Eliminar: proveedor borrado', 'Toast de éxito.');
  await buscar('', 5);

  // ---------- Kardex ----------
  await ir('Kardex');
  await foto(p, 'Kardex', LISTA, 'Listado', 'Historial con tipo, stock anterior y nuevo, usuario y observaciones.');
  await p.click('button:has-text("Registrar movimiento")');
  await p.waitForSelector('dialog[open]');
  await p.waitForSelector('dialog ul button');
  await foto(p, 'Kardex', DIALOGO, 'Registrar: buscar producto', 'Busca por nombre o código y muestra el stock de cada resultado.');
  await p.fill('dialog input[type=search]', 'Router');
  await p.waitForFunction(() => document.querySelectorAll('dialog ul button').length === 1);
  await p.click('dialog ul button');
  await p.selectOption('dialog select[name=tipo_movimiento]', 'Salida');
  await p.fill('dialog input[name=cantidad]', '20');
  await p.click('dialog button[type=submit]');
  await p.waitForSelector('dialog >> text=No puede superar el stock disponible');
  await foto(p, 'Kardex', VALIDACION, 'Registrar: salida mayor al stock', 'Se valida en el navegador, antes de llamar a la API.');
  await p.fill('dialog input[name=cantidad]', '4');
  await foto(p, 'Kardex', DIALOGO, 'Registrar: salida válida', 'Muestra el stock que quedará después del movimiento.');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Movimiento registrado');
  await p.waitForFunction(() => /14 → 10/.test(document.querySelector('main tbody tr')?.innerText));
  await foto(p, 'Kardex', TOAST, 'Registrar: movimiento guardado', 'La salida aparece primero, de 14 a 10 unidades.');
  await sinToasts();
  await p.click('main tbody tr >> nth=0 >> button:has-text("Anular")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Kardex', DIALOGO, 'Anular: confirmación', 'Solo el Administrador puede anular un movimiento.');
  await p.click('dialog button:has-text("Anular")');
  await toast('Movimiento anulado');
  await p.waitForSelector('main tbody tr >> nth=0 >> text=Anulado');
  await foto(p, 'Kardex', TOAST, 'Anular: stock devuelto', 'La fila queda marcada, se conserva en el historial y ya no se puede anular otra vez.');

  // ---------- Usuarios ----------
  await ir('Usuarios');
  await foto(p, 'Usuarios', LISTA, 'Listado', 'Solo visible para el Administrador. Tu propia cuenta no se puede desactivar.');
  await p.click('button:has-text("Nuevo usuario")');
  await p.waitForSelector('dialog[open]');
  await p.click('dialog button[type=submit]');
  await foto(p, 'Usuarios', VALIDACION, 'Crear: campos obligatorios', 'Nombre, correo y contraseña son obligatorios al crear.');
  await p.fill('dialog input[name=nombre]', 'Sara Supervisora');
  await p.fill('dialog input[name=email]', 'sara@inventario.test');
  await p.fill('dialog input[name=password]', 'Clave12345');
  await p.selectOption('dialog select[name=rol]', 'Supervisor');
  await p.click('dialog button[type=submit]');
  await cerrado();
  await toast('Usuario creado');
  await p.waitForSelector('main tbody tr:has-text("sara@inventario.test")');
  await foto(p, 'Usuarios', TOAST, 'Crear: usuario guardado', 'La cuenta queda lista para iniciar sesión.');
  await sinToasts();
  await p.click('main tbody tr:has-text("admin@inventario.test") >> button:has-text("Editar")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Usuarios', DIALOGO, 'Editar tu propia cuenta', 'El rol queda bloqueado para no perder el acceso de administrador.');
  await p.click('dialog button:has-text("Cancelar")');
  await cerrado();
  await p.click('main tbody tr:has-text("sara@inventario.test") >> button:has-text("Desactivar")');
  await p.waitForSelector('dialog[open]');
  await foto(p, 'Usuarios', DIALOGO, 'Desactivar: confirmación', 'Avisa que perderá el acceso de inmediato.');
  await p.click('dialog button:has-text("Desactivar")');
  await toast('Estado actualizado');
  await p.waitForSelector('main tbody tr:has-text("sara@inventario.test") >> text=Inactivo');
  await foto(p, 'Usuarios', TOAST, 'Desactivar: estado actualizado', 'El botón cambia a Activar para poder revertirlo.');
  await sinToasts();
  await p.click('main tbody tr:has-text("sara@inventario.test") >> button:has-text("Activar")');
  await p.click('dialog button:has-text("Activar")');
  await toast('Estado actualizado');
  await sinToasts();

  // ---------- Roles ----------
  const s = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const q = await s.newPage();
  await q.goto(`${URL}/login`);
  await q.waitForSelector('input[name=email]');
  await q.fill('input[name=email]', 'sara@inventario.test');
  await q.fill('input[name=password]', 'Clave12345');
  await q.click('button[type=submit]');
  await q.waitForSelector('aside');
  await q.click('aside a:has-text("Productos")');
  await q.waitForSelector('main tbody tr td:has-text("P-00")');
  await foto(q, 'Permisos', LISTA, 'Supervisor: solo lectura', 'Sin botón de crear ni columna de acciones, y sin Usuarios en el menú.');
  await q.goto(`${URL}/usuarios`);
  await q.waitForSelector('text=Sin permisos');
  await foto(q, 'Permisos', VALIDACION, 'Pantalla 403', 'Entrar a una dirección sin permiso muestra el motivo, sin redirigir en silencio.');
  await s.close();

  // ---------- Movil ----------
  const m = await b.newContext({ viewport: { width: 400, height: 800 } });
  const t = await m.newPage();
  await t.goto(`${URL}/login`);
  await t.waitForSelector('input[name=email]');
  await t.fill('input[name=email]', 'admin@inventario.test');
  await t.fill('input[name=password]', process.env.CLAVE_ADMIN);
  await t.click('button[type=submit]');
  await t.waitForSelector('main svg[role=img]');
  const alternar = 'button[aria-label="Alternar menú"]';
  await t.click(alternar);
  await t.waitForTimeout(220);
  await foto(t, 'Móvil', LISTA, 'Menú deslizable', 'Por debajo de 768 px, el menú lateral se abre sobre la página.');
  await t.click('aside a:has-text("Productos")');
  await t.waitForSelector('main tbody tr td:has-text("P-00")');
  await foto(t, 'Móvil', LISTA, 'Tabla como tarjetas', 'Cada fila se vuelve una tarjeta con sus etiquetas.');
  await t.click('main button:has-text("Nuevo producto")');
  await t.waitForSelector('dialog[open]');
  await t.click('dialog button[type=submit]');
  await foto(t, 'Móvil', VALIDACION, 'Modal en móvil', 'El formulario pasa a una columna y desplaza por dentro.');
  await t.keyboard.press('Escape');
  await t.waitForSelector('dialog[open]', { state: 'detached' });
  await t.click('main tbody button:has-text("Eliminar") >> nth=0');
  await t.waitForSelector('dialog[open]');
  await foto(t, 'Móvil', DIALOGO, 'Confirmación en móvil', 'El mismo diálogo, ajustado a la pantalla.');
  await m.close();

  await b.close();
  fs.writeFileSync(path.join(DIR, 'items.json'), JSON.stringify(items, null, 2));
  console.log(`\ncapturas: ${items.length}`);
})().catch((e) => { console.error('ERROR:', e.message.slice(0, 500)); process.exit(2); });
