# CI/CD y despliegue del backend en Render

## Objetivo

Publicar la API de productos en Render a partir del repositorio de GitHub, con validaciones automáticas antes del despliegue. Ningún cambio debe llegar a producción si falla la instalación, la validación del esquema, las pruebas o las comprobaciones de seguridad.

## Estado actual

| Elemento | Estado |
|---|---|
| Repositorio | [phoschrome/TestenRender](https://github.com/phoschrome/TestenRender) |
| Rama principal | `main` |
| Directorio del backend | `backend-productos/` |
| Base de datos | PostgreSQL, acceso mediante Prisma |
| Node.js objetivo | `26.13.0` |
| Express | `4.22.3` (fijado en `package.json`) |
| Prisma | `7.10.1` con adaptador PostgreSQL |
| API | `1.0.0` |
| Workflow de CI/CD | `.github/workflows/backend-ci.yml` |
| URL pública de Render | Pendiente de completar el despliegue |

El repositorio también contiene el frontend en `front end/`. El flujo descrito aquí construye, valida y despliega únicamente `backend-productos/`.

Node.js se fija en `backend-productos/.node-version`, en `package.json` y en Render. El workflow comprueba que las versiones ejecutadas sean Node.js `26.13.0` y Express `4.22.3`.

## Flujo propuesto

1. **Desarrollo:** realizar cambios en una rama de trabajo y abrir un Pull Request hacia `main`.
2. **Integración continua (GitHub Actions):** instalar dependencias reproducibles y ejecutar generación y validación de Prisma, pruebas de API y auditoría de dependencias.
3. **Revisión:** corregir cualquier fallo de CI y revisar los cambios antes de aprobar el Pull Request.
4. **Despliegue:** el job `deploy` solo se habilita en `main`, después de pasar `verify`, y requiere un secreto de deploy hook de Render.
5. **Comprobación posterior:** probar la API desplegada, revisar los logs de Render y confirmar que la conexión a PostgreSQL funciona.

## Verificaciones de CI

El workflow `.github/workflows/backend-ci.yml` se ejecuta para cambios del backend y cubre:

- Instalar dependencias reproducibles con `npm ci`.
- Confirmar las versiones exactas de Node.js y Express.
- Generar el cliente mediante `npm run prisma:generate`.
- Validar `prisma/schema.prisma` mediante `npm run prisma:validate`.
- Ejecutar pruebas HTTP de endpoints, validación de entradas, CORS y respuestas de error.
- Ejecutar `npm audit --audit-level=moderate`.

CI usa una URL PostgreSQL ficticia para cargar y validar el esquema; no conecta a la base de producción. Las pruebas actuales simulan el acceso a la capa de persistencia, por lo que la verificación real de conexión se completa con `/health` después del despliegue.

## Revisión de API y seguridad

Antes de habilitar el despliegue automático, confirmar que:

- Los endpoints existentes mantienen sus contratos, códigos HTTP y validaciones.
- Las pruebas cubren lectura paginada, búsqueda por ID, creación, actualización, eliminación y errores.
- CORS permite únicamente los orígenes requeridos por el frontend desplegado; no dejar acceso abierto por defecto en producción.
- Las credenciales y tokens se guardan en GitHub Secrets o en las variables privadas de Render; nunca en Git.
- Los errores internos y las trazas no exponen secretos ni detalles de conexión.
- Los parámetros de entrada se validan y las operaciones de base de datos usan Prisma.
- `GET /health` comprueba la conexión a PostgreSQL y expone la versión de la API.
- La auditoría de dependencias finaliza sin vulnerabilidades conocidas.

## Configuración de Render

Crear un servicio web conectado al repositorio y configurarlo con:

| Opción | Valor |
|---|---|
| Root Directory | `backend-productos` |
| Runtime | Node.js `26.13.0` |
| Build Command | `npm ci --include=dev && npm run prisma:generate` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Base de datos | PostgreSQL accesible desde el servicio |

Configurar en Render las variables de entorno requeridas, al menos:

- `DATABASE_URL`: cadena de conexión PostgreSQL privada y protegida.
- `NODE_ENV=production`.
- `CORS_ORIGINS=https://phoschrome.github.io`.

Render proporciona el puerto de ejecución mediante `PORT`; la aplicación debe continuar escuchando ese puerto. No incluir archivos `.env` en el repositorio ni copiar credenciales locales a la configuración de producción.

El esquema Prisma actual no incluye un historial de migraciones. Antes de automatizar cambios de esquema en producción, definir y revisar una estrategia de migraciones compatible con los datos existentes. No ejecutar `prisma db push` automáticamente en producción.

### Puerta de despliegue

El despliegue desde GitHub Actions permanece deshabilitado hasta que el servicio de Render y las credenciales estén listos:

1. Rota en Render la contraseña de PostgreSQL que se compartió durante la configuración y actualiza `DATABASE_URL` con la URL nueva. No reutilices la credencial expuesta.
2. Crea un Deploy Hook para el servicio web de Render.
3. En los ajustes del repositorio de GitHub, guarda la URL del hook como secreto `RENDER_DEPLOY_HOOK_URL`.
4. Crea la variable del repositorio `RENDER_DEPLOY_ENABLED` con valor `true`.

El workflow solo llama el hook después de que pasen las pruebas, la validación del esquema, las versiones y la auditoría. La URL de la base de datos se configura únicamente como variable privada en Render; no se necesita en GitHub Actions.

## Criterios para autorizar el despliegue

El despliegue se considera listo únicamente cuando:

1. El workflow de CI finaliza correctamente.
2. Las pruebas de la API pasan.
3. La auditoría no encuentra vulnerabilidades críticas, altas o moderadas.
4. Render inicia el servicio sin errores y logra conectarse a PostgreSQL.
5. El health check y una solicitud real a la API responden correctamente.

**URL pública:** agregar aquí la URL asignada al servicio una vez creado en Render: `PENDIENTE`.
