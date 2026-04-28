// pages/bookings.js — Bookings CRUD + Check-in/Out Logic

let allBookings = [];
let availableRooms = [];
let allCustomers_b = [];
let deleteBookingId = null;
let currentStatusFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadBookings(), loadDropdowns()]);

  // Handle URL params: ?action=add or ?filter=checkin or ?customer=id
  const params = new URLSearchParams(location.search);
  if (params.get('action') === 'add') openNewBookingModal();
  if (params.get('filter') === 'checkin') filterByStatus('Booked', document.querySelector('.tab'));
  if (params.get('customer')) filterByCustomer(params.get('customer'));
});

// ── LOAD BOOKINGS ─────────────────────────────────────────
// SQL:
//   SELECT b.*, c.name, c.phone, r.room_number, r.room_type, r.price
//   FROM bookings b
//   JOIN customers c ON b.customer_id = c.customer_id
//   JOIN rooms r ON b.room_id = r.room_id
//   ORDER BY b.booking_id DESC
async function loadBookings() {
  allBookings = await Bookings.getAll();
  renderBookings(allBookings);
}

// ── LOAD DROPDOWNS (customers + available rooms) ──────────
async function loadDropdowns() {
  [allCustomers_b, availableRooms] = await Promise.all([
    Customers.getAll(),
    Rooms.getAvailable()
  ]);
  populateCustomerSelect();
  populateRoomSelect();
}

function populateCustomerSelect(selectedId) {
  const sel = document.getElementById('bCustomer');
  sel.innerHTML = `<option value="">— Select Customer —</option>` +
    allCustomers_b.map(c =>
      `<option value="${c.customer_id}" ${selectedId == c.customer_id ? 'selected' : ''}>
        #${c.customer_id} — ${c.name}${c.phone ? ' (' + c.phone + ')' : ''}
      </option>`
    ).join('');
}

function populateRoomSelect(selectedId, extraRoom) {
  const sel = document.getElementById('bRoom');
  const rooms = extraRoom
    ? [...availableRooms.filter(r => r.room_id !== extraRoom.room_id), extraRoom]
    : availableRooms;

  sel.innerHTML = `<option value="">— Select Available Room —</option>` +
    rooms.map(r =>
      `<option value="${r.room_id}" data-type="${r.room_type}" data-price="${r.price}"
        ${selectedId == r.room_id ? 'selected' : ''}>
        Room ${r.room_number} — ${r.room_type} — PKR ${Number(r.price).toLocaleString()}/night
      </option>`
    ).join('');

  if (selectedId) showRoomDetail();
}

// ── RENDER TABLE ──────────────────────────────────────────
function renderBookings(data) {
  document.getElementById('bookingCount').textContent =
    `${data.length} booking${data.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('bookingsBody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="es-icon">◷</div>
      <div class="es-title">No bookings found</div>
      <div class="es-text">Create your first booking using the button above.</div>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(b => {
    // Determine which action buttons to show based on booking status
    let actions = '';
    if (b.status === 'Booked') {
      actions = `
        <button class="btn btn-success btn-sm" onclick="doCheckIn(${b.booking_id})">✓ Check-in</button>
        <button class="btn btn-outline btn-sm" onclick="openEditModal(${b.booking_id})">✏ Edit</button>
        <button class="btn btn-danger  btn-sm" onclick="openBookingConfirm(${b.booking_id})">✕</button>
      `;
    } else if (b.status === 'Checked-in') {
      actions = `
        <button class="btn btn-primary btn-sm" onclick="doCheckOut(${b.booking_id}, ${b.room_id})">⇥ Check-out</button>
        <button class="btn btn-danger  btn-sm" onclick="openBookingConfirm(${b.booking_id})">✕</button>
      `;
    } else {
      // Completed
      actions = `<button class="btn btn-outline btn-sm" onclick="openBookingConfirm(${b.booking_id})">✕ Remove</button>`;
    }

    return `
      <tr>
        <td class="mono">#${b.booking_id}</td>
        <td><strong>${escHtml(b.customers?.name || '—')}</strong><br>
            <span class="mono" style="font-size:.72rem;color:var(--ink-soft)">${b.customers?.phone || ''}</span></td>
        <td class="mono">${b.rooms?.room_number || '—'}</td>
        <td>${b.rooms?.room_type || '—'}</td>
        <td class="mono">${b.check_in}</td>
        <td class="mono">${b.check_out}</td>
        <td>${statusBadge(b.status)}</td>
        <td><div class="action-row">${actions}</div></td>
      </tr>
    `;
  }).join('');
}

// ── STATUS FILTER TABS ─────────────────────────────────────
function filterByStatus(status, el) {
  currentStatusFilter = status;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  const filtered = status === 'all'
    ? allBookings
    : allBookings.filter(b => b.status === status);

  document.getElementById('tableHeading').textContent =
    status === 'all' ? 'All Bookings' : `${status} Bookings`;
  renderBookings(filtered);
}

// Filter by customer (from URL param)
function filterByCustomer(customerId) {
  const filtered = allBookings.filter(b => b.customer_id == customerId);
  renderBookings(filtered);
}

// ── ROOM DETAIL PREVIEW ───────────────────────────────────
function showRoomDetail() {
  const sel = document.getElementById('bRoom');
  const opt = sel.selectedOptions[0];
  if (!opt || !opt.value) {
    document.getElementById('roomDetail').style.display = 'none';
    return;
  }
  const type  = opt.dataset.type;
  const price = parseFloat(opt.dataset.price);
  document.getElementById('dpType').textContent  = type;
  document.getElementById('dpPrice').textContent = `PKR ${price.toLocaleString()}`;
  document.getElementById('roomDetail').style.display = 'block';
  calcTotal();
}

function calcTotal() {
  const ci = document.getElementById('bCheckIn').value;
  const co = document.getElementById('bCheckOut').value;
  const sel = document.getElementById('bRoom').selectedOptions[0];
  if (!ci || !co || !sel?.value) return;

  const nights = Math.max(0, (new Date(co) - new Date(ci)) / 86400000);
  const price  = parseFloat(sel.dataset.price || 0);
  const total  = nights * price;
  document.getElementById('dpTotal').textContent =
    nights > 0 ? `PKR ${total.toLocaleString()} (${nights} night${nights !== 1 ? 's' : ''})` : '—';
}

// ── MODAL OPEN / CLOSE ────────────────────────────────────
async function openNewBookingModal() {
  await loadDropdowns(); // refresh available rooms
  document.getElementById('bookingModalTitle').textContent = 'New Booking';
  document.getElementById('bEditId').value = '';
  document.getElementById('bCustomer').value = '';
  document.getElementById('bRoom').value = '';
  document.getElementById('bCheckIn').value  = '';
  document.getElementById('bCheckOut').value = '';
  document.getElementById('roomDetail').style.display = 'none';
  // Set min date to today
  document.getElementById('bCheckIn').min  = new Date().toISOString().split('T')[0];
  document.getElementById('bCheckOut').min = new Date().toISOString().split('T')[0];
  document.getElementById('bookingModal').classList.add('open');
}

async function openEditModal(id) {
  const b = allBookings.find(x => x.booking_id === id);
  if (!b) return;

  await loadDropdowns(); // reload available rooms
  // Also add the currently booked room to the dropdown (even if occupied)
  const currentRoom = await Rooms.getAll().then ? null : null; // handled in populateRoomSelect
  populateRoomSelect(b.room_id, b.rooms);
  populateCustomerSelect(b.customer_id);

  document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
  document.getElementById('bEditId').value    = b.booking_id;
  document.getElementById('bCheckIn').value   = b.check_in;
  document.getElementById('bCheckOut').value  = b.check_out;
  showRoomDetail();
  document.getElementById('bookingModal').classList.add('open');
}

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('open');
}

// ── SAVE BOOKING ──────────────────────────────────────────
async function saveBooking() {
  const customer_id = document.getElementById('bCustomer').value;
  const room_id     = document.getElementById('bRoom').value;
  const check_in    = document.getElementById('bCheckIn').value;
  const check_out   = document.getElementById('bCheckOut').value;
  const id          = document.getElementById('bEditId').value;

  if (!customer_id || !room_id || !check_in || !check_out) {
    toast('All fields are required', 'error'); return;
  }
  if (new Date(check_out) <= new Date(check_in)) {
    toast('Check-out must be after check-in', 'error'); return;
  }

  if (id) {
    // UPDATE: SQL: UPDATE bookings SET customer_id=$1, room_id=$2, check_in=$3, check_out=$4 WHERE booking_id=$5
    await Bookings.update(id, { customer_id, room_id, check_in, check_out });
  } else {
    // INSERT + mark room occupied
    // SQL: INSERT INTO bookings (customer_id, room_id, check_in, check_out, status) VALUES (..., 'Booked')
    // SQL: UPDATE rooms SET status='Occupied' WHERE room_id=$1
    await Bookings.create({ customer_id, room_id, check_in, check_out });
  }

  closeBookingModal();
  await loadBookings();
}

// ── CHECK-IN ──────────────────────────────────────────────
// SQL: UPDATE bookings SET status='Checked-in' WHERE booking_id=$1
async function doCheckIn(booking_id) {
  await Bookings.checkIn(booking_id);
  await loadBookings();
}

// ── CHECK-OUT ─────────────────────────────────────────────
// SQL: UPDATE bookings SET status='Completed' WHERE booking_id=$1
// SQL: UPDATE rooms SET status='Available' WHERE room_id=$1
async function doCheckOut(booking_id, room_id) {
  await Bookings.checkOut(booking_id, room_id);
  await loadBookings();
}

// ── DELETE ────────────────────────────────────────────────
function openBookingConfirm(id) {
  deleteBookingId = id;
  document.getElementById('confirmBookingModal').classList.add('open');
}
function closeBookingConfirm() {
  deleteBookingId = null;
  document.getElementById('confirmBookingModal').classList.remove('open');
}
async function confirmBookingDelete() {
  if (!deleteBookingId) return;
  // SQL: DELETE FROM bookings WHERE booking_id=$1
  // Also frees room if active
  await Bookings.delete(deleteBookingId);
  closeBookingConfirm();
  await loadBookings();
}

// Helpers
function statusBadge(status) {
  const map = { 'Booked':'badge-booked', 'Checked-in':'badge-checkedin', 'Completed':'badge-completed' };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}
function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}

// Backdrop close
document.getElementById('bookingModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeBookingModal();
});
document.getElementById('confirmBookingModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeBookingConfirm();
});
