// Genera la coleccion y el entorno de Postman del proyecto
const fs = require('fs');
const path = require('path');

const destino = 'C:/laragon/www/api-db/postman';

const pruebas = (lineas) => [{ listen: 'test', script: { type: 'text/javascript', exec: lineas } }];
const estado = (codigo) => `pm.test('Responde ${codigo}', () => pm.response.to.have.status(${codigo}));`;

const peticion = ({ nombre, metodo, ruta, cuerpo, tests = [], publica = false, descripcion }) => ({
  name: nombre,
  event: pruebas(tests),
  request: {
    method: metodo,
    ...(publica && { auth: { type: 'noauth' } }),
    header: cuerpo ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    ...(cuerpo && { body: { mode: 'raw', raw: JSON.stringify(cuerpo, null, 2) } }),
    url: {
      raw: `{{baseUrl}}${ruta}`,
      host: ['{{baseUrl}}'],
      path: ruta.split('?')[0].split('/').filter(Boolean),
      ...(ruta.includes('?') && {
        query: ruta.split('?')[1].split('&').map((par) => {
          const [key, value] = par.split('=');
          return { key, value };
        }),
      }),
    },
    ...(descripcion && { description: descripcion }),
  },
  response: [],
});

const coleccion = {
  info: {
    name: 'Panel de Inventario API',
    description: 'Ejecuta primero "Login": guarda el token en el entorno y las demas peticiones lo usan.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
  item: [
    {
      name: '1. Autenticacion',
      item: [
        peticion({
          nombre: 'Login',
          metodo: 'POST',
          ruta: '/auth/login',
          publica: true,
          cuerpo: { email: '{{admin_email}}', password: '{{admin_password}}' },
          descripcion: 'Guarda el token en la variable de entorno token.',
          tests: [
            estado(200),
            "const cuerpo = pm.response.json();",
            "pm.test('Devuelve un token', () => pm.expect(cuerpo.token).to.be.a('string'));",
            "pm.test('No devuelve la contrasena', () => pm.expect(cuerpo.usuario).to.not.have.property('password'));",
            "pm.environment.set('token', cuerpo.token);",
          ],
        }),
        peticion({
          nombre: 'Perfil',
          metodo: 'GET',
          ruta: '/auth/perfil',
          tests: [estado(200), "pm.test('Devuelve el usuario', () => pm.expect(pm.response.json().usuario.email).to.be.a('string'));"],
        }),
        peticion({
          nombre: 'Register (requiere Administrador)',
          metodo: 'POST',
          ruta: '/auth/register',
          cuerpo: { nombre: 'Usuario Postman', email: 'postman.{{$timestamp}}@inventario.test', password: 'Clave12345', rol: 'Supervisor' },
          descripcion: 'Solo un Administrador puede registrar usuarios: por eso va despues de Login.',
          tests: [estado(201), "pm.test('Asigna el rol enviado', () => pm.expect(pm.response.json().usuario.rol).to.equal('Supervisor'));"],
        }),
        peticion({
          nombre: 'Perfil sin token',
          metodo: 'GET',
          ruta: '/auth/perfil',
          publica: true,
          tests: [estado(401), "pm.test('Error uniforme', () => pm.expect(pm.response.json().ok).to.equal(false));"],
        }),
      ],
    },
    {
      name: '2. Productos',
      item: [
        peticion({
          nombre: 'Listar categorias',
          metodo: 'GET',
          ruta: '/categorias?limit=1',
          descripcion: 'Guarda una categoria para crear el producto.',
          tests: [estado(200), "pm.environment.set('categoria_id', pm.response.json().data[0].id);"],
        }),
        peticion({
          nombre: 'Listar productos',
          metodo: 'GET',
          ruta: '/productos?page=1&limit=5&q=',
          tests: [
            estado(200),
            "const respuesta = pm.response.json();",
            "pm.test('Respuesta paginada', () => { pm.expect(respuesta.data).to.be.an('array'); pm.expect(respuesta.meta).to.have.all.keys('total', 'page', 'limit', 'pages'); });",
          ],
        }),
        peticion({
          nombre: 'Productos en bajo stock',
          metodo: 'GET',
          ruta: '/productos?bajo_stock=1',
          tests: [estado(200), "pm.test('Todos bajo el minimo', () => pm.response.json().data.forEach((p) => pm.expect(p.stock).to.be.at.most(p.stock_minimo)));"],
        }),
        peticion({
          nombre: 'Crear producto',
          metodo: 'POST',
          ruta: '/productos',
          cuerpo: { nombre: 'Producto Postman {{$timestamp}}', descripcion: 'Creado desde Postman', precio: 49.9, stock: 10, stock_minimo: 3, categoria_id: '{{categoria_id}}' },
          descripcion: 'El stock inicial queda registrado como una Entrada en el kardex.',
          tests: [
            estado(201),
            "const registro = pm.response.json().data;",
            "pm.test('Genera el codigo', () => pm.expect(registro.codigo).to.match(/^P-\\d{4}$/));",
            "pm.test('Precio numerico', () => pm.expect(registro.precio).to.be.a('number'));",
            "pm.environment.set('producto_id', registro.id);",
          ],
        }),
        peticion({
          nombre: 'Obtener producto',
          metodo: 'GET',
          ruta: '/productos/{{producto_id}}',
          tests: [estado(200), "pm.test('Incluye la categoria', () => pm.expect(pm.response.json().data.categoria.nombre).to.be.a('string'));"],
        }),
        peticion({
          nombre: 'Editar producto',
          metodo: 'PUT',
          ruta: '/productos/{{producto_id}}',
          cuerpo: { precio: 59.9, stock: 9999 },
          descripcion: 'El campo stock se ignora: solo el kardex puede cambiarlo.',
          tests: [
            estado(200),
            "const registro = pm.response.json().data;",
            "pm.test('Actualiza el precio', () => pm.expect(registro.precio).to.equal(59.9));",
            "pm.test('Ignora el stock', () => pm.expect(registro.stock).to.equal(10));",
          ],
        }),
      ],
    },
    {
      name: '3. Movimientos',
      item: [
        peticion({
          nombre: 'Registrar entrada',
          metodo: 'POST',
          ruta: '/movimientos',
          cuerpo: { producto_id: '{{producto_id}}', tipo_movimiento: 'Entrada', cantidad: 5, observaciones: 'Desde Postman' },
          tests: [estado(201), "pm.test('Stock 10 a 15', () => pm.expect(pm.response.json().data.stock_nuevo).to.equal(15));"],
        }),
        peticion({
          nombre: 'Registrar salida',
          metodo: 'POST',
          ruta: '/movimientos',
          cuerpo: { producto_id: '{{producto_id}}', tipo_movimiento: 'Salida', cantidad: 3 },
          tests: [
            estado(201),
            "const registro = pm.response.json().data;",
            "pm.test('Stock 15 a 12', () => pm.expect(registro.stock_nuevo).to.equal(12));",
            "pm.environment.set('movimiento_id', registro.id);",
          ],
        }),
        peticion({
          nombre: 'Salida sin stock suficiente',
          metodo: 'POST',
          ruta: '/movimientos',
          cuerpo: { producto_id: '{{producto_id}}', tipo_movimiento: 'Salida', cantidad: 9999 },
          tests: [estado(409), "pm.test('Explica el motivo', () => pm.expect(pm.response.json().error).to.include('Stock insuficiente'));"],
        }),
        peticion({
          nombre: 'Listar movimientos del producto',
          metodo: 'GET',
          ruta: '/movimientos?producto_id={{producto_id}}',
          tests: [estado(200), "pm.test('Entrada inicial, entrada y salida', () => pm.expect(pm.response.json().meta.total).to.equal(3));"],
        }),
        peticion({
          nombre: 'Anular movimiento',
          metodo: 'PATCH',
          ruta: '/movimientos/{{movimiento_id}}/anular',
          tests: [estado(200), "pm.test('Queda anulado', () => pm.expect(pm.response.json().data.anulado).to.equal(true));"],
        }),
        peticion({
          nombre: 'Anular dos veces',
          metodo: 'PATCH',
          ruta: '/movimientos/{{movimiento_id}}/anular',
          tests: [estado(409)],
        }),
      ],
    },
    {
      name: '4. Resumen y cierre',
      item: [
        peticion({
          nombre: 'Dashboard',
          metodo: 'GET',
          ruta: '/dashboard',
          tests: [
            estado(200),
            "const registro = pm.response.json().data;",
            "pm.test('Trae los indicadores', () => pm.expect(registro).to.include.keys('total_productos', 'bajo_stock', 'valorizacion', 'movimientos_recientes', 'stock_por_categoria'));",
          ],
        }),
        peticion({
          nombre: 'Eliminar producto',
          metodo: 'DELETE',
          ruta: '/productos/{{producto_id}}',
          descripcion: 'Tiene movimientos: queda inactivo para conservar el historial.',
          tests: [estado(200), "pm.test('Avisa que quedo inactivo', () => pm.expect(pm.response.json().mensaje).to.include('inactivo'));"],
        }),
      ],
    },
  ],
};

const entorno = {
  name: 'Inventario local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:3006/api', type: 'default', enabled: true },
    { key: 'admin_email', value: 'admin@inventario.test', type: 'default', enabled: true },
    { key: 'admin_password', value: 'Admin123*', type: 'secret', enabled: true },
    { key: 'token', value: '', type: 'secret', enabled: true },
    { key: 'categoria_id', value: '', type: 'default', enabled: true },
    { key: 'producto_id', value: '', type: 'default', enabled: true },
    { key: 'movimiento_id', value: '', type: 'default', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

fs.writeFileSync(path.join(destino, 'inventario.postman_collection.json'), `${JSON.stringify(coleccion, null, 2)}\n`);
fs.writeFileSync(path.join(destino, 'local.postman_environment.json'), `${JSON.stringify(entorno, null, 2)}\n`);
console.log('postman generado');
