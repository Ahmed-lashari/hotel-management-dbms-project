// pages/dashboard.js — Dashboard UI Logic

document.addEventListener('DOMContentLoaded', async () => {
  // Show today's date
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('en-PK', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  await refreshDashboard();
});

async function refreshDashboard() {
  // ── Load stat counts ──
  const stats = await loadDashboardStats();
  document.getElementById('statCustomers').textContent = stats.customers;
  document.getElementById('statRooms').textContent     = stats.rooms;
  document.getElementById('statAvailable').textContent = stats.available;
  document.getElementById('statBookings').textContent  = stats.bookings;

  // ── Load recent bookings table ──
  const bookings = await Bookings.getAll();
  const tbody = document.getElementById('dashBookingsBody');
  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No bookings yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = bookings.slice(0, 8).map(b => `
    <tr>
      <td class="mono">#${b.booking_id}</td>
      <td><strong>${b.customers?.name || '—'}</strong></td>
      <td class="mono">${b.rooms?.room_number || '—'}</td>
      <td>${b.rooms?.room_type || '—'}</td>
      <td class="mono">${b.check_in}</td>
      <td class="mono">${b.check_out}</td>
      <td>${statusBadge(b.status)}</td>
      <td>
        <a href="bookings.html" class="btn btn-outline btn-sm">View</a>
      </td>
    </tr>
  `).join('');
}

function statusBadge(status) {
  const map = {
    'Booked':     'badge-booked',
    'Checked-in': 'badge-checkedin',
    'Completed':  'badge-completed',
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}
