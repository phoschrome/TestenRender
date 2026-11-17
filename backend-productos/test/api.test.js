import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import app from '../src/app.js';
import db from '../src/config/db.js';
import ProductoModel from '../src/models/productos.model.js';

const require = createRequire(import.meta.url);
const expressVersion = require('express/package.json').version;
let server;
let baseUrl;

const producto = {
  id_producto: 7,
  nombre_producto: 'Café Molido',
  categoria_producto: 'Bebidas',
  pvp_producto: '12.50',
};

const withModelMocks = async (mocks, operation) => {
  const originals = new Map();
  for (const [method, implementation] of Object.entries(mocks)) {
    originals.set(method, ProductoModel[method]);
    ProductoModel[method] = implementation;
  }

  try {
    return await operation();
  } finally {
    for (const [method, implementation] of originals) {
      ProductoModel[method] = implementation;
    }
  }
};

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await db.$disconnect();
});

test('usa las versiones requeridas de Node.js y Express', () => {
  assert.equal(process.versions.node, '26.13.0');
  assert.equal(expressVersion, '4.22.3');
});

test('GET /health verifica PostgreSQL y expone la versión de la API', async () => {
  const originalQueryRaw = db.$queryRaw;
  db.$queryRaw = async () => [{ '?column?': 1 }];

  try {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      status: 'ok',
      version: '1.0.0',
    });
  } finally {
    db.$queryRaw = originalQueryRaw;
  }
});

test('permite CORS al frontend publicado y rechaza otros orígenes', async () => {
  const allowed = await fetch(`${baseUrl}/cors-check`, {
    headers: { Origin: 'https://phoschrome.github.io' },
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://phoschrome.github.io');

  const denied = await fetch(`${baseUrl}/cors-check`, {
    headers: { Origin: 'https://untrusted.example' },
  });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('GET /api/productos conserva paginación y orden', async () => {
  await withModelMocks({
    countAll: async () => 21,
    findAll: async (limit, offset) => {
      assert.equal(limit, 5);
      assert.equal(offset, 5);
      return [producto];
    },
  }, async () => {
    const response = await fetch(`${baseUrl}/api/productos?page=2&limit=5`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.pagination.totalRecords, 21);
    assert.equal(body.pagination.totalPages, 5);
    assert.equal(body.pagination.hasPrevPage, true);
    assert.equal(body.data[0].id_producto, 7);
  });
});

test('GET /api/productos/:id valida el ID antes de consultar', async () => {
  const response = await fetch(`${baseUrl}/api/productos/0`);
  assert.equal(response.status, 400);
});

test('respuestas 500 no filtran detalles internos', async () => {
  const originalConsoleError = console.error;
  const originalNodeEnv = process.env.NODE_ENV;
  console.error = () => {};
  process.env.NODE_ENV = 'production';

  try {
    await withModelMocks({
      findById: async () => {
        throw new Error('database connection secret');
      },
    }, async () => {
      const response = await fetch(`${baseUrl}/api/productos/7`);
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        success: false,
        status: 500,
        error: 'Error interno del servidor',
      });
    });
  } finally {
    console.error = originalConsoleError;
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  }
});

test('POST /api/productos valida, normaliza y crea el producto', async () => {
  await withModelMocks({
    create: async (data) => {
      assert.deepEqual(data, {
        nombre_producto: 'Cafe Premium',
        categoria_producto: 'Bebidas',
        pvp_producto: 12.35,
      });
      return { ...producto, ...data };
    },
  }, async () => {
    const response = await fetch(`${baseUrl}/api/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_producto: 'Cafe <Premium>',
        categoria_producto: 'Bebidas',
        pvp_producto: 12.345,
      }),
    });
    assert.equal(response.status, 201);
  });
});

test('POST rechaza arreglos y precios fuera de rango', async () => {
  const nullBody = await fetch(`${baseUrl}/api/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '[]',
  });
  assert.equal(nullBody.status, 400);

  const invalidPrice = await fetch(`${baseUrl}/api/productos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre_producto: 'Producto',
      categoria_producto: 'Varios',
      pvp_producto: 100000000,
    }),
  });
  assert.equal(invalidPrice.status, 400);
});

test('PATCH rechaza campos no permitidos y tipos inválidos', async () => {
  const invalidKey = await fetch(`${baseUrl}/api/productos/7`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin: true }),
  });
  assert.equal(invalidKey.status, 400);

  const invalidText = await fetch(`${baseUrl}/api/productos/7`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre_producto: 42 }),
  });
  assert.equal(invalidText.status, 422);
});

test('PUT, PATCH, DELETE mantienen sus contratos HTTP', async () => {
  await withModelMocks({
    update: async () => producto,
    patch: async (id, fields) => ({ ...producto, ...fields }),
    delete: async () => true,
  }, async () => {
    const put = await fetch(`${baseUrl}/api/productos/7`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_producto: producto.nombre_producto,
        categoria_producto: producto.categoria_producto,
        pvp_producto: 12.5,
      }),
    });
    assert.equal(put.status, 200);

    const patch = await fetch(`${baseUrl}/api/productos/7`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pvp_producto: 13 }),
    });
    assert.equal(patch.status, 200);

    const deleted = await fetch(`${baseUrl}/api/productos/7`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
  });
});
