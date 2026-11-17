# Guía de Construcción: Backend REST API con Arquitectura N-Capas (MVC)

Este documento detalla la estructura, configuración y código fuente para implementar una API RESTful basada en Node.js, Express, Prisma y PostgreSQL sobre el puerto `5051`.

---

## 1. Estructura del Proyecto

```text
backend-productos/
├── .env
├── .env.example
├── package.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── config/
    │   └── db.js
    ├── controllers/
    │   └── productos.controller.js
    ├── middlewares/
    │   ├── errorHandler.middleware.js
    │   ├── hash.middleware.js
    │   ├── pagination.middleware.js
    │   └── validation.middleware.js
    ├── models/
    │   └── productos.model.js
    ├── routes/
    │   └── productos.routes.js
    └── app.js
```

---

## 2. Configuración de Dependencias (`package.json`)

Ejecuta el siguiente comando para inicializar el proyecto e instalar las dependencias:

```bash
npm init -y
npm install express @prisma/client dotenv
npm install --save-dev prisma
npm install --save-dev nodemon
npx prisma generate
```

Contenido de `package.json`:

```json
{
  "name": "backend-productos",
  "version": "1.0.0",
  "description": "API REST de productos con arquitectura N-capas en Express, PostgreSQL y Prisma",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "prisma:generate": "prisma generate",
    "prisma:validate": "prisma validate"
  },
  "dependencies": {
    "@prisma/client": "^6.19.0",
    "cors": "^2.8.6",
    "dotenv": "^16.4.5",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.7",
    "prisma": "^6.19.0"
  }
}
```

---

## 3. Variables de Entorno (`.env`)

Crea el archivo `.env` en la raíz del proyecto para salvaguardar las credenciales:

```env
# Configuración del Servidor
PORT=5051
NODE_ENV=development

# Configuración de Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/BDD_Productos?schema=public"
```

---

## 4. Configuración de Prisma

`prisma/schema.prisma` mapea el modelo al esquema existente; no renombra ni recrea la tabla `producto`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Producto {
  id_producto        Int     @id @default(autoincrement())
  nombre_producto    String
  categoria_producto String
  pvp_producto       Decimal @db.Decimal(10, 2)

  @@map("producto")
}
```

El servidor reutiliza una instancia de Prisma desde `src/config/db.js`. Para mantener la configuración existente, acepta las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` cuando no se define `DATABASE_URL`. Los comandos de Prisma que validan o consultan el esquema requieren `DATABASE_URL`; la API puede seguir usando la configuración heredada.

---

## 5. Capa de Middlewares

### 5.1. Paginación (`src/middlewares/pagination.middleware.js`)
Procesa los parámetros de consulta `page` y `limit`, asegurando valores acotados:

```javascript
const paginate = (req, res, next) => {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  page = (!Number.isNaN(page) && page > 0) ? page : 1;
  limit = (!Number.isNaN(limit) && limit > 0 && limit <= 100) ? limit : 10;

  const offset = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    offset
  };

  next();
};

module.exports = paginate;
```

### 5.2. Validación, Sanitización y Verificación de Caracteres (`src/middlewares/validation.middleware.js`)
Limpia entradas maliciosas (XSS / SQL injection patterns), suprime caracteres inválidos y comprueba tipos:

```javascript
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Elimina caracteres que facilitan inyecciones HTML/XSS
    .replace(/['";\\]/g, '') // Filtra caracteres propensos a escape SQL
    .trim();
};

const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  const parsedId = Number(id);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'El parámetro "id" debe ser un número entero positivo'
    });
  }

  req.params.id = parsedId;
  next();
};

const validateCreateProduct = (req, res, next) => {
  let { nombre_producto, categoria_producto, pvp_producto } = req.body;

  if (!nombre_producto || !categoria_producto || pvp_producto === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Campos obligatorios: nombre_producto, categoria_producto, pvp_producto'
    });
  }

  nombre_producto = sanitizeString(nombre_producto);
  categoria_producto = sanitizeString(categoria_producto);
  const pvp = Number(pvp_producto);

  // Verificación de caracteres permitidos (alfanuméricos, espacios, guiones y acentos)
  const regexPermitido = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#\-_()]+$/;

  if (!regexPermitido.test(nombre_producto) || !regexPermitido.test(categoria_producto)) {
    return res.status(422).json({
      success: false,
      error: 'Los campos contienen caracteres no válidos o sospechosos'
    });
  }

  if (Number.isNaN(pvp) || pvp < 0) {
    return res.status(400).json({
      success: false,
      error: 'El campo pvp_producto debe ser un número mayor o igual a cero'
    });
  }

  req.body.nombre_producto = nombre_producto;
  req.body.categoria_producto = categoria_producto;
  req.body.pvp_producto = Number(pvp.toFixed(2));

  next();
};

const validatePatchProduct = (req, res, next) => {
  const allowedKeys = ['nombre_producto', 'categoria_producto', 'pvp_producto'];
  const bodyKeys = Object.keys(req.body);

  if (bodyKeys.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Debe enviar al menos un campo para actualizar'
    });
  }

  const hasInvalidKey = bodyKeys.some((k) => !allowedKeys.includes(k));
  if (hasInvalidKey) {
    return res.status(400).json({
      success: false,
      error: 'Uno o más campos enviados no están permitidos'
    });
  }

  const regexPermitido = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,#\-_()]+$/;

  if (req.body.nombre_producto !== undefined) {
    req.body.nombre_producto = sanitizeString(req.body.nombre_producto);
    if (!regexPermitido.test(req.body.nombre_producto)) {
      return res.status(422).json({ success: false, error: 'nombre_producto contiene caracteres no válidos' });
    }
  }

  if (req.body.categoria_producto !== undefined) {
    req.body.categoria_producto = sanitizeString(req.body.categoria_producto);
    if (!regexPermitido.test(req.body.categoria_producto)) {
      return res.status(422).json({ success: false, error: 'categoria_producto contiene caracteres no válidos' });
    }
  }

  if (req.body.pvp_producto !== undefined) {
    const pvp = Number(req.body.pvp_producto);
    if (Number.isNaN(pvp) || pvp < 0) {
      return res.status(400).json({ success: false, error: 'pvp_producto debe ser un número válido >= 0' });
    }
    req.body.pvp_producto = Number(pvp.toFixed(2));
  }

  next();
};

module.exports = {
  validateIdParam,
  validateCreateProduct,
  validatePatchProduct
};
```

### 5.3. Hashing de Integridad y Cache (`src/middlewares/hash.middleware.js`)
Calcula un hash SHA-256 de las respuestas para proveer cabeceras `ETag` y validación de integridad:

```javascript
const crypto = require('crypto');

const responseIntegrityHash = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    if (body) {
      const payloadString = JSON.stringify(body);
      const hash = crypto.createHash('sha256').update(payloadString).digest('hex');

      res.setHeader('ETag', `"${hash}"`);
      res.setHeader('X-Payload-Hash', hash);

      // Si el cliente envía 'If-None-Match' y coincide con el hash, responde 304 Not Modified
      if (req.headers['if-none-match'] === `"${hash}"`) {
        return res.status(304).end();
      }
    }
    return originalJson.call(this, body);
  };

  next();
};

module.exports = responseIntegrityHash;
```

### 5.4. Gestor Global de Errores (`src/middlewares/errorHandler.middleware.js`)
Centraliza el manejo de excepciones no capturadas evitando caídas de proceso:

```javascript
const errorHandler = (err, req, res, next) => {
  console.error('[Error Tracker]:', err);

  const status = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    success: false,
    status,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

---

## 6. Capa de Modelo (`src/models/productos.model.js`)

Usa el cliente Prisma desde la misma capa de modelo, preservando la interfaz que consumen los controladores:

```javascript
const db = require('../config/db');

const productoFields = {
  id_producto: true,
  nombre_producto: true,
  categoria_producto: true,
  pvp_producto: true
};

const ProductoModel = {
  async countAll() {
    return db.producto.count();
  },

  async findAll(limit, offset) {
    return db.producto.findMany({
      select: productoFields,
      orderBy: { id_producto: 'asc' },
      take: limit,
      skip: offset
    });
  },

  async findById(id) {
    return db.producto.findUnique({
      where: { id_producto: id },
      select: productoFields
    });
  },

  async create({ nombre_producto, categoria_producto, pvp_producto }) {
    return db.producto.create({
      data: { nombre_producto, categoria_producto, pvp_producto },
      select: productoFields
    });
  },

  async update(id, { nombre_producto, categoria_producto, pvp_producto }) {
    return db.producto.update({
      where: { id_producto: id },
      data: { nombre_producto, categoria_producto, pvp_producto },
      select: productoFields
    });
  },

  async patch(id, fields) {
    return db.producto.update({
      where: { id_producto: id },
      data: fields,
      select: productoFields
    });
  },

  async delete(id) {
    const { count } = await db.producto.deleteMany({ where: { id_producto: id } });
    return count > 0;
  }
};

module.exports = ProductoModel;
```

---

## 7. Capa de Controlador (`src/controllers/productos.controller.js`)

Orquesta las peticiones, procesa respuestas en formato JSON y aplica los códigos HTTP estándar (200, 201, 204, 400, 404, 500):

```javascript
const ProductoModel = require('../models/productos.model');

const productosController = {
  // GET /api/productos (con paginación) -> 200 OK
  async getAll(req, res, next) {
    try {
      const { page, limit, offset } = req.pagination;
      const [totalRecords, items] = await Promise.all([
        ProductoModel.countAll(),
        ProductoModel.findAll(limit, offset)
      ]);

      const totalPages = Math.ceil(totalRecords / limit);

      return res.status(200).json({
        success: true,
        data: items,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalRecords,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/productos/:id -> 200 OK o 404 Not Found
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const producto = await ProductoModel.findById(id);

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no encontrado`
        });
      }

      return res.status(200).json({
        success: true,
        data: producto
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/productos -> 201 Created
  async create(req, res, next) {
    try {
      const nuevoProducto = await ProductoModel.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: nuevoProducto
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/productos/:id -> 200 OK o 404 Not Found
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const productoActualizado = await ProductoModel.update(id, req.body);

      if (!productoActualizado) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no existe para ser actualizado`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Producto actualizado completamente',
        data: productoActualizado
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/productos/:id -> 200 OK o 404 Not Found
  async patch(req, res, next) {
    try {
      const { id } = req.params;
      const productoModificado = await ProductoModel.patch(id, req.body);

      if (!productoModificado) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no existe para ser modificado`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Producto modificado parcialmente',
        data: productoModificado
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/productos/:id -> 204 No Content o 404 Not Found
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const eliminado = await ProductoModel.delete(id);

      if (!eliminado) {
        return res.status(404).json({
          success: false,
          error: `Producto con id ${id} no encontrado para eliminar`
        });
      }

      // 204 No Content: no incluye cuerpo
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};

module.exports = productosController;
```

---

## 8. Capa de Rutas (`src/routes/productos.routes.js`)

Asocia los endpoints HTTP con sus middlewares de sanitización, validación, paginación y controlador:

```javascript
const { Router } = require('express');
const productosController = require('../controllers/productos.controller');
const paginate = require('../middlewares/pagination.middleware');
const {
  validateIdParam,
  validateCreateProduct,
  validatePatchProduct
} = require('../middlewares/validation.middleware');

const router = Router();

// GET: Listado paginado
router.get('/', paginate, productosController.getAll);

// GET: Búsqueda por ID
router.get('/:id', validateIdParam, productosController.getById);

// POST: Creación de producto
router.post('/', validateCreateProduct, productosController.create);

// PUT: Reemplazo / actualización completa
router.put('/:id', validateIdParam, validateCreateProduct, productosController.update);

// PATCH: Actualización parcial
router.patch('/:id', validateIdParam, validatePatchProduct, productosController.patch);

// DELETE: Eliminación
router.delete('/:id', validateIdParam, productosController.delete);

module.exports = router;
```

---

## 9. Servidor Principal (`src/app.js`)

Inicia la aplicación en el puerto `5051`, habilitando el parser JSON, middlewares globales y el manejador de errores:

```javascript
require('dotenv').config();
const express = require('express');
const productosRoutes = require('./routes/productos.routes');
const responseIntegrityHash = require('./middlewares/hash.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();
const PORT = process.env.PORT || 5051;

// Middlewares globales
app.use(express.json({ limit: '1mb' }));
app.use(responseIntegrityHash);

// Rutas de la API
app.use('/api/productos', productosRoutes);

// Manejo de ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.originalUrl} no encontrada en el servidor`
  });
});

// Middleware centralizado de errores
app.use(errorHandler);

// Inicialización del servicio
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
  console.log(`Endpoints base: http://localhost:${PORT}/api/productos`);
});
```

---

## 10. Manual de Pruebas Rápidas con `curl`

### GET (Paginación)
```bash
curl -X GET "http://localhost:5051/api/productos?page=1&limit=5" -H "Accept: application/json"
```

### POST (Crear)
```bash
curl -X POST "http://localhost:5051/api/productos" \
  -H "Content-Type: application/json" \
  -d '{"nombre_producto": "Cereal de Avena 500g", "categoria_producto": "Abarrotes", "pvp_producto": 3.75}'
```

### PUT (Actualizar completo)
```bash
curl -X PUT "http://localhost:5051/api/productos/1" \
  -H "Content-Type: application/json" \
  -d '{"nombre_producto": "Cereal de Avena Integral 500g", "categoria_producto": "Abarrotes", "pvp_producto": 4.10}'
```

### PATCH (Actualizar parcial)
```bash
curl -X PATCH "http://localhost:5051/api/productos/1" \
  -H "Content-Type: application/json" \
  -d '{"pvp_producto": 4.50}'
```

### DELETE (Eliminar)
```bash
curl -X DELETE "http://localhost:5051/api/productos/1"
```