# Continuar el proyecto desde otra computadora

Guía para retomar el Panel de Inventario (Laboratorios 9, 10 y 11) en cualquier equipo.

## Qué hay en GitHub

| Repositorio | Contenido |
|---|---|
| [api-db](https://github.com/JFabian37/api-db) | API, base de datos (`database/`), plan, pruebas y Postman |
| [app-inventario](https://github.com/JFabian37/app-inventario) | Frontend y capturas (`docs/capturas/`) |

El archivo `.env` no está en GitHub porque guarda secretos. Se crea de nuevo en el paso 4.

## 1. Instala lo necesario

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 20.19 o superior
- [Laragon](https://laragon.org/), que ya trae MySQL y HeidiSQL

Comprueba tu versión con `node -v`. La terminal de Laragon puede usar Node 18, que no sirve para el frontend.

## 2. Descarga los proyectos

```bash
cd C:\laragon\www
git clone https://github.com/JFabian37/api-db
git clone https://github.com/JFabian37/app-inventario
```

Si la carpeta `C:\laragon\www` no existe, primero instala Laragon.

## 3. Restaura la base de datos

1. Abre Laragon y pulsa **Iniciar todo**.
2. Pulsa **Base de datos** para abrir HeidiSQL y conéctate. Usuario `root`, contraseña vacía, puerto `3306`.
3. Ve a **Archivo → Ejecutar archivo SQL** y elige `C:\laragon\www\api-db\database\api-db.sql`.
4. Pulsa **F5**. Aparecerá `api-db` con sus 5 tablas.

Otra opción, sin HeidiSQL, es crear los datos de ejemplo con `npm run seed` después del paso 4.

## 4. Configura y arranca el backend

```bash
cd C:\laragon\www\api-db
npm install
copy .env.example .env
node -p "require('crypto').randomBytes(48).toString('hex')"
```

Abre `.env` y completa estos valores:

| Variable | Valor |
|---|---|
| `JWT_SECRET` | El texto que imprimió el último comando |
| `ADMIN_PASSWORD` | `Admin123*` |
| `SEED_ALMACENERO_PASSWORD` | `Almacen123*` |

Después arranca la API:

```bash
npm run dev
```

Debe mostrar `Servidor corriendo en http://localhost:3006`.

## 5. Configura y arranca el frontend

En otra terminal:

```bash
cd C:\laragon\www\app-inventario
npm install
copy .env.example .env
npm run dev
```

Abre `http://localhost:5173`.

## 6. Entra al panel

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@inventario.test` | `Admin123*` |
| Almacenero | `almacenero@inventario.test` | `Almacen123*` |

Son cuentas de prueba, solo para desarrollo.

## 7. Subir tus cambios

```bash
git config --global user.name "JFabian37"
git config --global user.email "josuedelriomontoya@gmail.com"
git add -A
git commit -m "Describe tu cambio"
git push
```

La primera vez, Git abrirá el navegador para iniciar sesión en GitHub.

Si cambias datos en la base y quieres conservarlos, vuelve a exportarla antes de subir:

```bash
C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqldump.exe -h127.0.0.1 -uroot --single-transaction --databases api-db > database\api-db.sql
```

La ruta de `mysqldump.exe` cambia si tu Laragon trae otra versión de MySQL.

## Material para la documentación

| Necesitas | Dónde está |
|---|---|
| Diagrama entidad-relación | `README.md` de api-db, sección Modelo de datos |
| Tabla de endpoints | `README.md` de api-db, sección Endpoints |
| Reglas del kardex | `README.md` de api-db, sección Reglas del kardex |
| Variables e instalación | `README.md` de cada repositorio |
| Permisos por rol | `README.md` de app-inventario |
| Design system | `README.md` de app-inventario |
| 44 capturas por vista | `docs/capturas/README.md` de app-inventario |
| Colección de Postman | `postman/` de api-db |
| Requisitos y decisiones | `docs/plan-labs-9-10-11.md` de api-db |
| Scripts de verificación | `docs/pruebas/` de api-db |

## Resultados de la verificación

Última revisión completa: 5 de noviembre de 2026.

| Prueba | Resultado |
|---|---|
| API por HTTP | 102 de 102 |
| Login y sesión en Chrome | 51 de 51 |
| Vistas CRUD en Chrome, con 3 roles | 80 de 80 |
| Accesibilidad con `axe-core`, 27 pantallas | 0 violaciones |
| Colección de Postman | 37 de 37 |

Los scripts de `docs/pruebas/` son evidencia de esas pruebas. Tienen rutas de la computadora donde se ejecutaron, así que hay que ajustarlas antes de volver a correrlos.

## Seguir con Claude Code

La conversación anterior se queda en la computadora donde ocurrió. En un equipo nuevo, abre Claude Code en `C:\laragon\www` y empieza con:

> Lee `api-db/docs/CONTINUAR.md` y los README de `api-db` y `app-inventario`. Quiero seguir con la documentación de los Laboratorios 9, 10 y 11.
