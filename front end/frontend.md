# Guía de Construcción: Frontend SPA con HTML, CSS y JavaScript Vanilla

Este documento contiene la arquitectura, el diseño de interfaz y el código fuente completo para un cliente web capaz de consumir todos los endpoints de la API REST de productos (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) alojada en `http://localhost:5051/api/productos`.

---

## 1. Estructura del Proyecto Frontend

Puedes organizar los archivos en un directorio dedicado `frontend/`:

```
frontend/
├── index.html       # Estructura semántica, formularios y modales
├── styles.css       # Diseño moderno, responsivo y adaptable
└── app.js           # Lógica de consumo de API (Fetch), DOM y estados
```

> **Nota sobre CORS en el Backend:**  
> Como el frontend se suele abrir con Live Server (`http://127.0.0.1:5500`) o como archivo local y el backend corre en el puerto `5051`, asegúrate de habilitar CORS en tu backend instalando `npm install cors` y agregando `const cors = require('cors'); app.use(cors());` antes de tus rutas en `app.js`.

---

## 2. Maquetado Web (`index.html`)

Contiene el panel de control, la tabla con paginación, el buscador por ID, el formulario de creación y los diálogos modales para actualizaciones totales (`PUT`) y parciales (`PATCH`).

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestión de Productos - Catálogo</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app-container">
    <!-- Encabezado -->
    <header class="main-header">
      <div class="header-content">
        <h1>📦 Panel de Productos</h1>
        <p>Cliente REST (GET, POST, PUT, PATCH, DELETE)</p>
      </div>
      <div class="api-status" id="api-status">
        <span class="status-dot"></span> <span id="status-text">Conectando a puerto 5051...</span>
      </div>
    </header>

    <!-- Notificaciones Toast -->
    <div id="toast-container" class="toast-container"></div>

    <!-- Barra de acciones rápidas y búsqueda -->
    <section class="toolbar-section">
      <div class="search-box">
        <input type="number" id="search-id-input" placeholder="Buscar por ID..." min="1">
        <button id="btn-search-id" class="btn btn-secondary">🔍 Buscar (GET)</button>
        <button id="btn-refresh" class="btn btn-outline">🔄 Refrescar lista</button>
      </div>
      <button id="btn-open-create" class="btn btn-primary">➕ Nuevo Producto (POST)</button>
    </section>

    <!-- Contenedor Principal: Tabla y Paginación -->
    <main class="table-card">
      <div class="table-header">
        <h2>Catálogo de Alimentos</h2>
        <div class="limit-selector">
          <label for="select-limit">Por página:</label>
          <select id="select-limit">
            <option value="5">5</option>
            <option value="10" selected>10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre del Producto</th>
              <th>Categoría</th>
              <th>PVP ($)</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody id="products-tbody">
            <tr>
              <td colspan="5" class="text-center">Cargando productos...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Controles de Paginación -->
      <footer class="pagination-footer">
        <span id="pagination-info" class="pagination-info">Mostrando página 1 de 1</span>
        <div class="pagination-controls">
          <button id="btn-prev-page" class="btn btn-sm btn-outline" disabled>⬅ Anterior</button>
          <span id="current-page-badge" class="page-badge">1</span>
          <button id="btn-next-page" class="btn btn-sm btn-outline" disabled>Siguiente ➡</button>
        </div>
      </footer>
    </main>
  </div>

  <!-- MODAL: Crear Producto (POST) -->
  <div id="modal-create" class="modal-backdrop hidden">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Registrar Nuevo Producto</h3>
        <button class="btn-close" data-close="modal-create">&times;</button>
      </div>
      <form id="form-create">
        <div class="form-group">
          <label for="create-nombre">Nombre del Producto</label>
          <input type="text" id="create-nombre" required placeholder="Ej. Queso Mozzarella 500g">
        </div>
        <div class="form-group">
          <label for="create-categoria">Categoría</label>
          <input type="text" id="create-categoria" required placeholder="Ej. Lácteos y Huevos">
        </div>
        <div class="form-group">
          <label for="create-pvp">Precio PVP ($)</label>
          <input type="number" id="create-pvp" step="0.01" min="0" required placeholder="0.00">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-close="modal-create">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Producto</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Actualización Completa (PUT) -->
  <div id="modal-put" class="modal-backdrop hidden">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Actualización Completa (PUT)</h3>
        <button class="btn-close" data-close="modal-put">&times;</button>
      </div>
      <form id="form-put">
        <input type="hidden" id="put-id">
        <div class="form-group">
          <label for="put-nombre">Nombre del Producto (Obligatorio)</label>
          <input type="text" id="put-nombre" required>
        </div>
        <div class="form-group">
          <label for="put-categoria">Categoría (Obligatoria)</label>
          <input type="text" id="put-categoria" required>
        </div>
        <div class="form-group">
          <label for="put-pvp">Precio PVP ($) (Obligatorio)</label>
          <input type="number" id="put-pvp" step="0.01" min="0" required>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-close="modal-put">Cancelar</button>
          <button type="submit" class="btn btn-warning">Reemplazar Todo (PUT)</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Actualización Parcial (PATCH) -->
  <div id="modal-patch" class="modal-backdrop hidden">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Actualización Parcial (PATCH)</h3>
        <button class="btn-close" data-close="modal-patch">&times;</button>
      </div>
      <form id="form-patch">
        <input type="hidden" id="patch-id">
        <p class="patch-instruction">Modifica solo los campos que deseas actualizar:</p>
        <div class="form-group">
          <label for="patch-nombre">Nombre del Producto</label>
          <input type="text" id="patch-nombre" placeholder="Dejar vacío para mantener">
        </div>
        <div class="form-group">
          <label for="patch-categoria">Categoría</label>
          <input type="text" id="patch-categoria" placeholder="Dejar vacío para mantener">
        </div>
        <div class="form-group">
          <label for="patch-pvp">Precio PVP ($)</label>
          <input type="number" id="patch-pvp" step="0.01" min="0" placeholder="Dejar vacío para mantener">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-close="modal-patch">Cancelar</button>
          <button type="submit" class="btn btn-info">Aplicar Parche (PATCH)</button>
        </div>
      </form>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

---

## 3. Hoja de Estilos (`styles.css`)

Estilo visual moderno con variables CSS, sombras suaves, layout responsivo y estados interactivos:

```css
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --secondary: #475569;
  --secondary-hover: #334155;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --danger-hover: #b91c1c;
  --info: #0284c7;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --radius: 8px;
  --transition: all 0.2s ease-in-out;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

body {
  background-color: var(--bg);
  color: var(--text-main);
  padding: 24px;
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.main-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
}

.main-header p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.api-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  background: var(--card-bg);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-dot.online { background: var(--success); }
.status-dot.offline { background: var(--danger); }

/* Toolbar */
.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 500px;
}

.search-box input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  outline: none;
}

/* Botones */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--transition);
}

.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }

.btn-secondary { background: var(--secondary); color: #fff; }
.btn-secondary:hover { background: var(--secondary-hover); }

.btn-outline { background: transparent; border-color: var(--border); color: var(--text-main); }
.btn-outline:hover { background: #f1f5f9; }

.btn-warning { background: var(--warning); color: #fff; }
.btn-info { background: var(--info); color: #fff; }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { background: var(--danger-hover); }

.btn-sm {
  padding: 4px 8px;
  font-size: 0.775rem;
}

/* Tabla */
.table-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th, .data-table td {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}

.data-table th {
  background: #f8fafc;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.data-table tbody tr:hover {
  background: #f1f5f9;
}

.text-center { text-align: center; }

.actions-cell {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.badge-cat {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  background: #e0e7ff;
  color: #3730a3;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Paginación */
.pagination-footer {
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
}

.pagination-info {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-badge {
  padding: 4px 10px;
  background: var(--primary);
  color: #fff;
  border-radius: var(--radius);
  font-size: 0.85rem;
  font-weight: 600;
}

/* Modales */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-backdrop.hidden {
  display: none;
}

.modal-box {
  background: var(--card-bg);
  border-radius: var(--radius);
  width: 100%;
  max-width: 450px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  outline: none;
}

.patch-instruction {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

/* Toasts */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  padding: 12px 18px;
  border-radius: var(--radius);
  color: #fff;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
}

.toast.success { background: var(--success); }
.toast.error { background: var(--danger); }
.toast.info { background: var(--info); }

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

---

## 4. Lógica de Interacción y Consumo REST (`app.js`)

Implementa las llamadas `fetch` con las operaciones HTTP correspondientes, control de errores y sincronización con el DOM:

```javascript
// Configuración base de la API
const API_BASE_URL = 'http://localhost:5051/api/productos';

// Estado de la aplicación
const state = {
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  totalRecords: 0,
  products: []
};

// Referencias del DOM
const tbody = document.getElementById('products-tbody');
const btnPrev = document.getElementById('btn-prev-page');
const btnNext = document.getElementById('btn-next-page');
const pageBadge = document.getElementById('current-page-badge');
const paginationInfo = document.getElementById('pagination-info');
const selectLimit = document.getElementById('select-limit');
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-id-input');
const btnSearch = document.getElementById('btn-search-id');

// Modales y formularios
const modalCreate = document.getElementById('modal-create');
const formCreate = document.getElementById('form-create');
const btnOpenCreate = document.getElementById('btn-open-create');

const modalPut = document.getElementById('modal-put');
const formPut = document.getElementById('form-put');

const modalPatch = document.getElementById('modal-patch');
const formPatch = document.getElementById('form-patch');

const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('status-text');

// ==========================================
// 1. UTILIDADES Y NOTIFICACIONES
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateServerStatus(online) {
  if (online) {
    statusDot.className = 'status-dot online';
    statusText.textContent = 'Servidor Conectado (:5051)';
  } else {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Servidor Desconectado';
  }
}

function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

// Escuchador global para botones de cierre de modales
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    closeModal(document.getElementById(modalId));
  });
});

// ==========================================
// 2. OPERACIÓN GET (Listado Paginado y por ID)
// ==========================================
async function fetchProducts(page = 1, limit = 10) {
  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Consultando registros...</td></tr>';
  try {
    const response = await fetch(`${API_BASE_URL}?page=${page}&limit=${limit}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const resData = await response.json();
    updateServerStatus(true);

    if (resData.success && Array.isArray(resData.data)) {
      state.products = resData.data;
      state.currentPage = resData.pagination.currentPage;
      state.totalPages = resData.pagination.totalPages;
      state.totalRecords = resData.pagination.totalRecords;
      renderTable();
      renderPaginationControls();
    }
  } catch (err) {
    updateServerStatus(false);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger)">No se pudo conectar a la API (${err.message})</td></tr>`;
    showToast('Error al obtener productos del backend', 'error');
  }
}

async function fetchProductById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 404) {
      showToast(`El producto con ID ${id} no existe`, 'error');
      return;
    }

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const resData = await response.json();
    if (resData.success && resData.data) {
      state.products = [resData.data];
      state.currentPage = 1;
      state.totalPages = 1;
      state.totalRecords = 1;
      renderTable();
      renderPaginationControls();
      showToast(`Producto #${id} cargado con éxito`, 'success');
    }
  } catch (err) {
    showToast(`Error al consultar ID: ${err.message}`, 'error');
  }
}

// Renderizado de tabla
function renderTable() {
  if (state.products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay productos disponibles.</td></tr>';
    return;
  }

  tbody.innerHTML = state.products.map(p => `
    <tr>
      <td><strong>#${p.id_producto}</strong></td>
      <td>${escapeHTML(p.nombre_producto)}</td>
      <td><span class="badge-cat">${escapeHTML(p.categoria_producto)}</span></td>
      <td>$${Number(p.pvp_producto).toFixed(2)}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-warning" onclick="openPutModal(${p.id_producto})">PUT</button>
        <button class="btn btn-sm btn-info" onclick="openPatchModal(${p.id_producto})">PATCH</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id_producto})">DELETE</button>
      </td>
    </tr>
  `).join('');
}

function renderPaginationControls() {
  pageBadge.textContent = state.currentPage;
  paginationInfo.textContent = `Página ${state.currentPage} de ${state.totalPages || 1} (${state.totalRecords} totales)`;
  btnPrev.disabled = state.currentPage <= 1;
  btnNext.disabled = state.currentPage >= state.totalPages;
}

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ==========================================
// 3. OPERACIÓN POST (Crear Producto)
// ==========================================
formCreate.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    nombre_producto: document.getElementById('create-nombre').value.trim(),
    categoria_producto: document.getElementById('create-categoria').value.trim(),
    pvp_producto: parseFloat(document.getElementById('create-pvp').value)
  };

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.status === 201 && data.success) {
      showToast('Producto creado exitosamente', 'success');
      formCreate.reset();
      closeModal(modalCreate);
      fetchProducts(state.currentPage, state.limit);
    } else {
      showToast(data.error || 'No se pudo crear el producto', 'error');
    }
  } catch (err) {
    showToast(`Error de red al crear: ${err.message}`, 'error');
  }
});

// ==========================================
// 4. OPERACIÓN PUT (Actualización Completa)
// ==========================================
window.openPutModal = function(id) {
  const prod = state.products.find(p => p.id_producto === id);
  if (!prod) return;

  document.getElementById('put-id').value = prod.id_producto;
  document.getElementById('put-nombre').value = prod.nombre_producto;
  document.getElementById('put-categoria').value = prod.categoria_producto;
  document.getElementById('put-pvp').value = prod.pvp_producto;

  openModal(modalPut);
};

formPut.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('put-id').value;

  const payload = {
    nombre_producto: document.getElementById('put-nombre').value.trim(),
    categoria_producto: document.getElementById('put-categoria').value.trim(),
    pvp_producto: parseFloat(document.getElementById('put-pvp').value)
  };

  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.status === 200 && data.success) {
      showToast(`Producto #${id} actualizado totalmente (PUT)`, 'success');
      closeModal(modalPut);
      fetchProducts(state.currentPage, state.limit);
    } else {
      showToast(data.error || 'Error al ejecutar PUT', 'error');
    }
  } catch (err) {
    showToast(`Error en la petición PUT: ${err.message}`, 'error');
  }
});

// ==========================================
// 5. OPERACIÓN PATCH (Actualización Parcial)
// ==========================================
window.openPatchModal = function(id) {
  const prod = state.products.find(p => p.id_producto === id);
  if (!prod) return;

  document.getElementById('patch-id').value = prod.id_producto;
  document.getElementById('patch-nombre').placeholder = `Actual: ${prod.nombre_producto}`;
  document.getElementById('patch-categoria').placeholder = `Actual: ${prod.categoria_producto}`;
  document.getElementById('patch-pvp').placeholder = `Actual: $${prod.pvp_producto}`;

  document.getElementById('patch-nombre').value = '';
  document.getElementById('patch-categoria').value = '';
  document.getElementById('patch-pvp').value = '';

  openModal(modalPatch);
};

formPatch.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('patch-id').value;

  const nombreVal = document.getElementById('patch-nombre').value.trim();
  const categoriaVal = document.getElementById('patch-categoria').value.trim();
  const pvpVal = document.getElementById('patch-pvp').value.trim();

  const payload = {};
  if (nombreVal !== '') payload.nombre_producto = nombreVal;
  if (categoriaVal !== '') payload.categoria_producto = categoriaVal;
  if (pvpVal !== '') payload.pvp_producto = parseFloat(pvpVal);

  if (Object.keys(payload).length === 0) {
    showToast('Debes ingresar al menos un campo para modificar', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.status === 200 && data.success) {
      showToast(`Producto #${id} modificado parcialmente (PATCH)`, 'success');
      closeModal(modalPatch);
      fetchProducts(state.currentPage, state.limit);
    } else {
      showToast(data.error || 'Error al ejecutar PATCH', 'error');
    }
  } catch (err) {
    showToast(`Error en la petición PATCH: ${err.message}`, 'error');
  }
});

// ==========================================
// 6. OPERACIÓN DELETE (Eliminación)
// ==========================================
window.deleteProduct = async function(id) {
  const confirmDelete = window.confirm(`¿Estás seguro de eliminar permanentemente el producto #${id}?`);
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE'
    });

    // 204 No Content indica eliminación exitosa
    if (response.status === 204) {
      showToast(`Producto #${id} eliminado correctamente (DELETE)`, 'success');
      fetchProducts(state.currentPage, state.limit);
    } else {
      const data = await response.json();
      showToast(data.error || 'No se pudo eliminar el producto', 'error');
    }
  } catch (err) {
    showToast(`Error al ejecutar DELETE: ${err.message}`, 'error');
  }
};

// ==========================================
// 7. LISTENERS DE PAGINACIÓN Y EVENTOS
// ==========================================
btnOpenCreate.addEventListener('click', () => openModal(modalCreate));

btnRefresh.addEventListener('click', () => {
  searchInput.value = '';
  fetchProducts(state.currentPage, state.limit);
});

btnSearch.addEventListener('click', () => {
  const id = parseInt(searchInput.value, 10);
  if (Number.isInteger(id) && id > 0) {
    fetchProductById(id);
  } else {
    showToast('Ingresa un ID numérico válido', 'warning');
  }
});

selectLimit.addEventListener('change', (e) => {
  state.limit = parseInt(e.target.value, 10);
  state.currentPage = 1;
  fetchProducts(state.currentPage, state.limit);
});

btnPrev.addEventListener('click', () => {
  if (state.currentPage > 1) {
    state.currentPage--;
    fetchProducts(state.currentPage, state.limit);
  }
});

btnNext.addEventListener('click', () => {
  if (state.currentPage < state.totalPages) {
    state.currentPage++;
    fetchProducts(state.currentPage, state.limit);
  }
});

// Carga inicial
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts(state.currentPage, state.limit);
});
```

---

## 5. Instrucciones de Ejecución

1. **Asegurar Backend y CORS:**
   Verifica que tu servidor Express esté corriendo en `http://localhost:5051` y tenga habilitado el middleware de CORS:
   ```bash
   npm install cors
   ```
   En `src/app.js`:
   ```javascript
   const cors = require('cors');
   app.use(cors());
   ```
2. **Lanzar el Frontend:**
   * Abre el archivo `index.html` con la extensión **Live Server** de VS Code (típicamente en `http://127.0.0.1:5500`), o bien ejecútalo con `npx serve frontend`.
3. **Pruebas en la Interfaz:**
   * **GET:** Navega entre páginas usando los botones "Anterior" y "Siguiente", o busca un producto por ID en la barra superior.
   * **POST:** Haz clic en "➕ Nuevo Producto" y completa el formulario.
   * **PUT:** Presiona el botón amarillo "PUT" en cualquier fila para reemplazar todos los datos de esa fila.
   * **PATCH:** Presiona el botón celeste "PATCH" y actualiza únicamente el campo que desees (ej. solo el precio).
   * **DELETE:** Haz clic en el botón rojo "DELETE" para suprimir el registro mediante el código HTTP `204`.