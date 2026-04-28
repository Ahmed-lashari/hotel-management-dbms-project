// pages/rooms.js — Rooms CRUD UI Logic

let allRooms = [];
let currentView = 'grid';
let deleteRoomId = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadRooms();
  if (new URLSearchParams(location.search).get('action') === 'add') openAddModal();
  setView('grid');
});

// ── LOAD ─────────────────────────────────────────────────
// SQL: SELECT * FROM rooms ORDER BY room_number ASC
async function loadRooms() {
  allRooms = await Rooms.getAll();
  applyFilter();
}

// ── FILTER + RENDER ──────────────────────────────────────
function applyFilter() {
  const status = document.getElementById('filterStatus').value;
  const type   = document.getElementById('filterType').value;
  let filtered = allRooms;
  if (status) filtered = filtered.filter(r => r.status === status);
  if (type)   filtered = filtered.filter(r => r.room_type === type);
  document.getElementById('roomCount').textContent = `${filtered.length} room${filtered.length !== 1 ? 's' : ''}`;
  renderGrid(filtered);
  renderTable(filtered);
}

// ── GRID VIEW ─────────────────────────────────────────────
function renderGrid(data) {
  const el = document.getElementById('gridView');
  if (!data.length) {
    el.innerHTML = `<div class="empty-state"><div class="es-icon">▦</div><div class="es-title">No rooms found</div></div>`;
    return;
  }
  el.innerHTML = data.map(r => `
    <div class="room-card ${r.status === 'Occupied' ? 'occupied' : 'available'}">
      <div class="room-number">${r.room_number}</div>
      <div class="room-type">${r.room_type}</div>
      <div class="room-price">PKR ${Number(r.price).toLocaleString()}<span style="font-size:.7rem;font-weight:400;color:var(--ink-soft)">/night</span></div>
      <div>${statusBadge(r.status)}</div>
      <div class="room-actions">
        <button class="btn btn-outline btn-sm" onclick="openEditModal(${r.room_id})">✏ Edit</button>
        <button class="btn btn-danger  btn-sm" onclick="openRoomConfirm(${r.room_id})">✕</button>
      </div>
    </div>
  `).join('');
}

// ── TABLE VIEW ────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('roomsBody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No rooms found.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td class="mono">#${r.room_id}</td>
      <td><strong class="mono">${r.room_number}</strong></td>
      <td>${r.room_type}</td>
      <td class="mono">PKR ${Number(r.price).toLocaleString()}</td>
      <td>${statusBadge(r.status)}</td>
      <td style="display:flex;gap:.4rem;">
        <button class="btn btn-outline btn-sm" onclick="openEditModal(${r.room_id})">✏ Edit</button>
        <button class="btn btn-danger  btn-sm" onclick="openRoomConfirm(${r.room_id})">✕ Delete</button>
      </td>
    </tr>
  `).join('');
}

// ── VIEW TOGGLE ───────────────────────────────────────────
function setView(v) {
  currentView = v;
  document.getElementById('gridView').style.display  = v === 'grid'  ? 'grid' : 'none';
  document.getElementById('tableView').style.display = v === 'table' ? 'block' : 'none';
}

// ── MODAL OPEN / CLOSE ───────────────────────────────────
function openAddModal() {
  document.getElementById('roomModalTitle').textContent = 'Add Room';
  document.getElementById('roomEditId').value = '';
  document.getElementById('fRoomNumber').value = '';
  document.getElementById('fPrice').value = '';
  document.getElementById('fRoomType').value = 'Single';
  document.getElementById('fStatus').value = 'Available';
  document.getElementById('roomModal').classList.add('open');
}

function openEditModal(id) {
  const r = allRooms.find(x => x.room_id === id);
  if (!r) return;
  document.getElementById('roomModalTitle').textContent = 'Edit Room';
  document.getElementById('roomEditId').value     = r.room_id;
  document.getElementById('fRoomNumber').value    = r.room_number;
  document.getElementById('fRoomType').value      = r.room_type;
  document.getElementById('fPrice').value         = r.price;
  document.getElementById('fStatus').value        = r.status;
  document.getElementById('roomModal').classList.add('open');
}

function closeRoomModal() {
  document.getElementById('roomModal').classList.remove('open');
}

// ── SAVE ─────────────────────────────────────────────────
async function saveRoom() {
  const room_number = parseInt(document.getElementById('fRoomNumber').value);
  const room_type   = document.getElementById('fRoomType').value;
  const price       = parseFloat(document.getElementById('fPrice').value);
  const status      = document.getElementById('fStatus').value;
  const id          = document.getElementById('roomEditId').value;

  if (!room_number || !price) { toast('Room number and price are required', 'error'); return; }

  if (id) {
    // SQL: UPDATE rooms SET room_number=$1, room_type=$2, price=$3, status=$4 WHERE room_id=$5
    await Rooms.update(id, { room_number, room_type, price, status });
  } else {
    // SQL: INSERT INTO rooms (room_number, room_type, price, status) VALUES (...)
    await Rooms.create({ room_number, room_type, price, status });
  }

  closeRoomModal();
  await loadRooms();
}

// ── DELETE ────────────────────────────────────────────────
function openRoomConfirm(id) { deleteRoomId = id; document.getElementById('confirmRoomModal').classList.add('open'); }
function closeRoomConfirm()  { deleteRoomId = null; document.getElementById('confirmRoomModal').classList.remove('open'); }
async function confirmRoomDelete() {
  if (!deleteRoomId) return;
  // SQL: DELETE FROM rooms WHERE room_id=$1
  await Rooms.delete(deleteRoomId);
  closeRoomConfirm();
  await loadRooms();
}

// Badge helper
function statusBadge(status) {
  const cls = status === 'Available' ? 'badge-available' : 'badge-occupied';
  return `<span class="badge ${cls}">${status}</span>`;
}

// Backdrop close
document.getElementById('roomModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeRoomModal(); });
document.getElementById('confirmRoomModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeRoomConfirm(); });
