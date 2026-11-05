# Plan: Panel Administrativo de Inventario (Labs 9, 10 y 11)

## Contexto

El proyecto es un CRUD simple de productos y debe convertirse en un panel de inventario relacional con
JWT, kardex y una interfaz propia. Se trabaja por 6 bloques y se detiene el trabajo al final de cada uno
para que pruebes.

### Diferencias entre tu texto y lo que existe

| Tu texto | Realidad | Decisión |
|---|---|---|
| `miApi/` | `C:\laragon\www\api-db` | Trabajar aquí. Es la única copia que existe |
| `appInventario/` | `C:\laragon\www\app-inventario` | Trabajar aquí |
| `src/services/api.js` | `services/api.js` | Moverlo a `src/services/api.js` |
| `crudProductos.jsx` | `curdProductos.jsx` (con erratas) | Se reemplaza por `src/pages/Productos.jsx` en el bloque 5 |

### Riesgos detectados

- **`sync({ force: false })` no altera tablas existentes.** La tabla `productos` tiene el esquema viejo
  (`createdAt`, sin FK). Hoy tiene **0 filas**, así que se puede reconstruir. Si tuviera filas, el proceso
  se detiene con un mensaje y no borra nada.
- **Pantalla actual entre bloques.** `categoria_id NOT NULL` rompería el `POST /productos` viejo desde el
  bloque 1. Las rutas `/productos` viejas se mantienen (sin token) hasta el bloque 4, con un ajuste mínimo
  para que la pantalla actual siga funcionando. Se eliminan al llegar el frontend nuevo.
- **`.env` y `node_modules` están versionados en `api-db`** y no hay `.gitignore`. Añadirlo no basta: hay
  que sacarlos del índice con `git rm --cached`, sin borrar nada del disco.
- **Los repos son de `JFabian37`.** No haré commit ni push salvo que me lo pidas. Las correcciones
  anteriores también siguen sin commit.

## Decisiones de diseño

Cosas que tu texto deja abiertas o donde hay una trampa técnica:

- **Stock solo por kardex.** `PUT /api/productos/:id` ignora `stock`. `POST` acepta un stock inicial y, si
  es mayor que 0, registra una `Entrada` "Stock inicial" en la misma transacción. Efecto: ese producto ya
  tiene movimientos y su eliminación será soft delete.
- **`codigo`.** Las validaciones de Sequelize corren antes de `beforeCreate`, así que `allowNull: false`
  fallaría. Se deja `allowNull: true` en el modelo con índice único. El hook siempre lo rellena.
- **Anular un `Ajuste`.** Se revierte la diferencia (`stock_nuevo - stock_anterior`), no se vuelve a
  `stock_anterior`, para no pisar movimientos posteriores. 409 si dejaría stock negativo. Las filas
  posteriores del kardex no se reescriben.
- **`cantidad`.** Entrada y Salida exigen >= 1. Ajuste permite >= 0.
- **Producto inactivo.** No acepta movimientos (409).
- **`Movimiento.proveedor_id`.** `onDelete: SET NULL`, igual que en Producto (tu texto no lo indica).
- **Listados.** Solo muestran activos, salvo `?incluir_inactivos=1`.
- **Usuarios.** Un Administrador no puede desactivarse ni quitarse el rol a sí mismo, para evitar quedar
  sin administradores (409).
- **Campos vacíos.** `""` en `ruc`/`email` de Proveedor se convierte en `null` con un setter; si no,
  `isEmail` rechazaría formularios con esos campos vacíos.
- **`morgan`.** Va antes de `helmet()`, sin alterar el orden relativo que pediste, para registrar también
  las peticiones rechazadas.
- **Interceptor 401.** Ignora `/auth/login`; si no, una contraseña incorrecta recargaría la página en vez
  de mostrar el error.
- **Sesión.** `AuthContext` valida el token con `/auth/perfil` al iniciar y no confía en el rol guardado
  en localStorage. `cargando` evita el parpadeo hacia `/login`.
- **Variables extra en `.env`.** `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `SEED_ALMACENERO_PASSWORD` para el seed.
  El servidor no arranca sin `JWT_SECRET`.
- **Inter.** Con `@fontsource-variable/inter`, para que funcione sin internet.
- **Postman.** `register` exige ser Administrador, así que `login` va primero en la colección.
- **`.env` del frontend.** Se añade al `.gitignore` y se crea `.env.example`.

## Archivos

### Backend (`C:\laragon\www\api-db`)

**Crear:**
- `.gitignore`, `.env.example`, `README.md`
- `models/index.js`, `models/Categoria.js`, `models/Proveedor.js`, `models/Usuario.js`, `models/Movimiento.js`
- `controllers/`: `authController.js`, `categoriaController.js`, `proveedorController.js`,
  `productoController.js`, `movimientoController.js`, `usuarioController.js`, `dashboardController.js`
- `routes/`: `index.js` y una por recurso (`auth`, `categorias`, `proveedores`, `productos`, `movimientos`,
  `usuarios`, `dashboard`)
- `middleware/`: `authMiddleware.js`, `errorHandler.js`, `notFound.js`, `rateLimiters.js`
- `utils/`: `ApiError.js`, `asyncHandler.js`, `paginar.js`
- `services/kardexService.js`: lógica del kardex, compartida por controller y seed
- `src/prepararBaseDatos.js`: creación de la BD, detección de la tabla vieja y `sync`
- `src/seed.js`
- `postman/inventario.postman_collection.json`, `postman/local.postman_environment.json`

**Modificar:**
- `index.js`: orden de middlewares y rutas. `crearBaseDeDatos` pasa a `src/prepararBaseDatos.js`
- `models/Producto.js`, `package.json`, `.env`, `config/db.js` (`define: { underscored: true }`)

### Frontend (`C:\laragon\www\app-inventario`)

**Crear:**
- `.env`, `.env.example`
- `src/services/api.js` (movido desde `services/api.js`), `src/context/AuthContext.jsx`
- `src/hooks/`: `useListado.js` (búsqueda con debounce, filtros, paginación), `useToast`
- `src/pages/`: `Login`, `Dashboard`, `Productos`, `Categorias`, `Proveedores`, `Kardex`, `Usuarios`, `SinPermisos`
- `src/components/layout/`: `AppLayout`, `Sidebar`, `Topbar`, `ProtectedRoute`
- `src/components/ui/`: `Card`, `Button`, `Input`, `Select`, `Table`, `Badge`, `Modal`, `ConfirmDialog`,
  `Toast`, `Pagination`, `Skeleton`, `EmptyState`
- `src/components/DonutChart.jsx` (SVG puro) y formularios `ProductoForm`, `MovimientoForm`, etc.

**Modificar:** `src/App.jsx`, `src/main.jsx`, `src/index.css` (variables en `:root`), `package.json`,
`.gitignore`, `index.html`, `README.md`

**Eliminar:** `services/api.js`, `src/components/Productos/curdProductos.jsx`, `src/App.css`, `src/assets/*`
de la plantilla y la dependencia `bootstrap`.

## Bloques

Cada bloque termina con un resumen y una parada para que pruebes.

1. **Modelos + asociaciones + seed.** Dependencias, `.gitignore`, `.env`, modelos, `kardexService`,
   `prepararBaseDatos`, `seed`. El seed crea los movimientos con `kardexService` para que el stock
   coincida con el kardex. Solo este bloque instala `bcryptjs`, necesario para el hook de Usuario.
2. **Auth/JWT/middlewares.** Orden de `index.js`, `helmet`, CORS, límites, errores centralizados y
   `autenticar(roles)`.
3. **Endpoints + kardex.** Todo `/api`, transacciones con `Transaction.LOCK.UPDATE`, anulación, dashboard
   y paginación común con `paginar.js`.
4. **Base del frontend.** Router, axios, `AuthContext`, `ProtectedRoute`, layout, login. Aquí se eliminan
   las rutas viejas `/productos`.
5. **Dashboard y vistas CRUD.** KPIs, donut, modales, confirmación, toasts, skeletons, errores por campo.
6. **Diseño fino y entregables.** Pulido, responsive, accesibilidad, README, diagrama ER y Postman.

## Reglas de código

- Español en explicaciones y comentarios. Sin tildes dentro del código; con tildes en la interfaz.
- Reutilizar `crearBaseDeDatos` (`index.js`) y `config/db.js`.
- ESLint de React es estricto (`react-hooks/set-state-in-effect`): la petición se separa del estado, como
  en `pedirProductos`, en vez de silenciar la regla.
- Tablas responsive: filas como tarjetas por debajo de 768px con `data-label`.

## Verificación

Las pruebas automáticas usan una BD aparte (`DB_NAME=api_db_test`, puerto 3106) que se borra al terminar,
para no ensuciar `api-db`. Los scripts quedan en el scratchpad, fuera de los repos.

- **Bloque 1:** tablas, FK y reglas de borrado con `SHOW CREATE TABLE`. Ejecutar el seed dos veces no
  duplica nada. Stock de cada producto igual al último `stock_nuevo`. El hash nunca sale en consultas. Las
  rutas viejas siguen funcionando.
- **Bloque 2:** 401 sin token, con token inválido y con usuario desactivado. 403 por rol. Límite de login
  en el intento 11. Formato uniforme de errores y 404.
- **Bloque 3:** cada endpoint por rol. Salidas simultáneas que no dejan stock negativo. Doble anulación
  rechazada. `usuario_id` del body ignorado. 409 al borrar categoría con productos. Soft delete con mensaje.
- **Bloques 4–6:** `npm run lint` y `npm run build` limpios. Pruebas en Chrome con Playwright desde el
  login hasta cada CRUD, por rol, sin errores de consola, y capturas a 1280px y 400px revisadas a mano.
- **Final:** una vuelta completa en la BD real `api-db` con MySQL de Laragon, y la colección de Postman
  ejecutada de principio a fin.
