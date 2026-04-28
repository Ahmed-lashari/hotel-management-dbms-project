// pages/customers.js — Customers CRUD UI Logic

let allCustomers = [];
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadCustomers();
  // Auto-open add form if ?action=add in URL
  if (new URLSearchParams(location.search).get('action') === 'add') openAddModal();
});

// ── LOAD / READ ──────────────────────────────────────────
// SQL: SELECT * FROM customers ORDER BY customer_id DESC
async function loadCustomers() {
  allCustomers = await Customers.getAll();
  renderTable(allCustomers);
  document.getElementById('totalCount').textContent =
    `${allCustomers.length} customer${allCustomers.length !== 1 ? 's' : ''}`;
}

// ── RENDER TABLE ─────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('customersBody');
  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="es-icon">◉</div>
          <div class="es-title">No customers found</div>
          <div class="es-text">Add your first customer to get started.</div>
        </div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td class="mono">#${c.customer_id}</td>
      <td><strong>${escHtml(c.name)}</strong></td>
      <td class="mono">${escHtml(c.phone || '—')}</td>
      <td>
        <a href="bookings.html?customer=${c.customer_id}" class="btn btn-outline btn-sm">View Bookings</a>
      </td>
      <td style="display:flex;gap:.4rem;align-items:center;">
        <button class="btn btn-outline btn-sm" onclick="openEditModal(${c.customer_id})">✏ Edit</button>
        <button class="btn btn-danger  btn-sm" onclick="openConfirm(${c.customer_id})">✕ Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── SEARCH ───────────────────────────────────────────────
// SQL: SELECT * FROM customers WHERE name ILIKE '%q%' OR phone ILIKE '%q%'
function handleSearch(query) {
  if (!query.trim()) { renderTable(allCustomers); return; }
  const q = query.toLowerCase();
  const filtered = allCustomers.filter(c =>
    c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)
  );
  renderTable(filtered);
}

// ── MODAL OPEN / CLOSE ───────────────────────────────────
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Customer';
  document.getElementById('editId').value = '';
  document.getElementById('fieldName').value  = '';
  document.getElementById('fieldPhone').value = '';
  document.getElementById('customerModal').classList.add('open');
}

async function openEditModal(id) {
  const c = allCustomers.find(x => x.customer_id === id);
  if (!c) return;
  document.getElementById('modalTitle').textContent = 'Edit Customer';
  document.getElementById('editId').value    = c.customer_id;
  document.getElementById('fieldName').value  = c.name;
  document.getElementById('fieldPhone').value = c.phone || '';
  document.getElementById('customerModal').classList.add('open');
}

function closeModal() {
  document.getElementById('customerModal').classList.remove('open');
}

// ── SAVE (CREATE or UPDATE) ───────────────────────────────
async function saveCustomer() {
  const name  = document.getElementById('fieldName').value.trim();
  const phone = document.getElementById('fieldPhone').value.trim();
  const id    = document.getElementById('editId').value;

  if (!name) { toast('Name is required', 'error'); return; }

  if (id) {
    // UPDATE: SQL: UPDATE customers SET name=$1, phone=$2 WHERE customer_id=$3
    await Customers.update(id, { name, phone });
  } else {
    // INSERT: SQL: INSERT INTO customers (name, phone) VALUES ($1, $2)
    await Customers.create({ name, phone });
  }

  closeModal();
  await loadCustomers();
}

// ── DELETE ────────────────────────────────────────────────
function openConfirm(id) {
  deleteTargetId = id;
  document.getElementById('confirmModal').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('open');
  deleteTargetId = null;
}
async function confirmDelete() {
  if (!deleteTargetId) return;
  // SQL: DELETE FROM customers WHERE customer_id=$1
  await Customers.delete(deleteTargetId);
  closeConfirm();
  await loadCustomers();
}

// Close modal on backdrop click
document.getElementById('customerModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('confirmModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeConfirm();
});

// Utility: prevent XSS
function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}
