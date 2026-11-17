const isLocal = window.location.protocol === 'file:'
  || window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1';
const API_BASE_URL = `${isLocal
  ? 'http://localhost:5051'
  : 'https://testenrender-api.onrender.com'}/api/productos`;

const state = {
  currentPage: 1,
  limit: 10,
  totalPages: 1,
  totalRecords: 0,
  products: []
};

const tbody = document.getElementById('products-tbody');
const btnPrev = document.getElementById('btn-prev-page');
const btnNext = document.getElementById('btn-next-page');
const pageBadge = document.getElementById('current-page-badge');
const paginationInfo = document.getElementById('pagination-info');
const selectLimit = document.getElementById('select-limit');
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-id-input');
const btnSearch = document.getElementById('btn-search-id');

const modalCreate = document.getElementById('modal-create');
const formCreate = document.getElementById('form-create');
const btnOpenCreate = document.getElementById('btn-open-create');

const modalPut = document.getElementById('modal-put');
const formPut = document.getElementById('form-put');

const modalPatch = document.getElementById('modal-patch');
const formPatch = document.getElementById('form-patch');

const statusDot = document.querySelector('.status-dot');
const statusText = document.getElementById('status-text');

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
    statusText.textContent = isLocal ? 'API local conectada' : 'API de Render conectada';
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

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    closeModal(document.getElementById(modalId));
  });
});

async function fetchProducts(page = 1, limit = 10) {
  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Consultando registros...</td></tr>';
  let apiResponded = false;
  try {
    const response = await fetch(`${API_BASE_URL}?page=${page}&limit=${limit}`, {
      headers: { Accept: 'application/json' }
    });
    apiResponded = true;
    updateServerStatus(true);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const resData = await response.json();

    if (resData.success && Array.isArray(resData.data)) {
      state.products = resData.data;
      state.currentPage = resData.pagination.currentPage;
      state.totalPages = resData.pagination.totalPages;
      state.totalRecords = resData.pagination.totalRecords;
      renderTable();
      renderPaginationControls();
    }
  } catch (err) {
    updateServerStatus(apiResponded);
    const errorMessage = apiResponded
      ? 'La API respondió con un error'
      : 'No se pudo conectar a la API';
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger)">${errorMessage} (${err.message})</td></tr>`;
    showToast('Error al obtener productos del backend', 'error');
  }
}

async function fetchProductById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      headers: { Accept: 'application/json' }
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

function renderTable() {
  if (state.products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay productos disponibles.</td></tr>';
    return;
  }

  tbody.innerHTML = state.products.map((p) => `
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
  return str.replace(/[&<>"']/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[tag] || tag));
}

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
        Accept: 'application/json'
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

window.openPutModal = function (id) {
  const prod = state.products.find((p) => p.id_producto === id);
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
        Accept: 'application/json'
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

window.openPatchModal = function (id) {
  const prod = state.products.find((p) => p.id_producto === id);
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
        Accept: 'application/json'
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

window.deleteProduct = async function (id) {
  const confirmDelete = window.confirm(`¿Estás seguro de eliminar permanentemente el producto #${id}?`);
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE'
    });

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

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts(state.currentPage, state.limit);
});
