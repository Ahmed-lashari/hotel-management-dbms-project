// Every function maps 1-to-1 with a SQL operation.
// Supabase JS SDK translates these into PostgreSQL queries.
// Equivalent raw SQL is shown in comments for reference.

function getDb() {
  if (!supabase) initSupabase();
  return supabase;
}

// Toast helper (UI feedback)
function toast(msg, type = "default") {
  const container =
    document.querySelector(".toast-container") ||
    (() => {
      const c = document.createElement("div");
      c.className = "toast-container";
      document.body.appendChild(c);
      return c;
    })();
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ─────────────────────────────────────────
// CUSTOMERS CRUD
// ─────────────────────────────────────────

const Customers = {
  // READ ALL
  async getAll() {
    const { data, error } = await getDb()
      .from("customers")
      .select("*")
      .order("customer_id", { ascending: false });
    if (error) {
      toast("Error loading customers", "error");
      return [];
    }
    return data;
  },

  // READ BY ID
  async getById(id) {
    const { data, error } = await getDb()
      .from("customers")
      .select("*")
      .eq("customer_id", id)
      .single();
    if (error) return null;
    return data;
  },

  // CREATE
  async create({ name, phone }) {
    const { data, error } = await getDb()
      .from("customers")
      .insert([{ name, phone }])
      .select()
      .single();
    if (error) {
      toast("Error creating customer: " + error.message, "error");
      return null;
    }
    toast("Customer added successfully!", "success");
    return data;
  },

  // UPDATE
  async update(id, { name, phone }) {
    const { data, error } = await getDb()
      .from("customers")
      .update({ name, phone })
      .eq("customer_id", id)
      .select()
      .single();
    if (error) {
      toast("Error updating customer", "error");
      return null;
    }
    toast("Customer updated!", "success");
    return data;
  },

  // DELETE
  // SQL: DELETE FROM customers WHERE customer_id=$1
  // NOTE: Will fail if customer has active bookings (FK constraint)
  async delete(id) {
    const { error } = await getDb()
      .from("customers")
      .delete()
      .eq("customer_id", id);
    if (error) {
      toast("Cannot delete — customer has bookings", "error");
      return false;
    }
    toast("Customer deleted.", "success");
    return true;
  },

  // SEARCH
  // SQL: SELECT * FROM customers WHERE name ILIKE '%query%' OR phone ILIKE '%query%'
  async search(query) {
    const { data, error } = await getDb()
      .from("customers")
      .select("*")
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .order("customer_id", { ascending: false });
    if (error) return [];
    return data;
  },

  // COUNT
  // SQL: SELECT COUNT(*) FROM customers
  async count() {
    const { count, error } = await getDb()
      .from("customers")
      .select("*", { count: "exact", head: true });
    if (error) return 0;
    return count;
  },
};

// ─────────────────────────────────────────
// ROOMS CRUD
// ─────────────────────────────────────────

const Rooms = {
  // READ ALL
  // SQL: SELECT * FROM rooms ORDER BY room_number ASC
  async getAll() {
    const { data, error } = await getDb()
      .from("rooms")
      .select("*")
      .order("room_number", { ascending: true });
    if (error) {
      toast("Error loading rooms", "error");
      return [];
    }
    return data;
  },

  // READ AVAILABLE ONLY
  // SQL: SELECT * FROM rooms WHERE status = 'Available' ORDER BY room_number
  async getAvailable() {
    const { data, error } = await getDb()
      .from("rooms")
      .select("*")
      .eq("status", "Available")
      .order("room_number", { ascending: true });
    if (error) return [];
    return data;
  },

  // CREATE
  // SQL: INSERT INTO rooms (room_number, room_type, price, status) VALUES (...)
  async create({ room_number, room_type, price, status }) {
    const { data, error } = await getDb()
      .from("rooms")
      .insert([
        { room_number, room_type, price, status: status || "Available" },
      ])
      .select()
      .single();
    if (error) {
      toast("Error: " + error.message, "error");
      return null;
    }
    toast("Room added!", "success");
    return data;
  },

  // UPDATE
  // SQL: UPDATE rooms SET room_number=$1, room_type=$2, price=$3, status=$4 WHERE room_id=$5
  async update(id, fields) {
    const { data, error } = await getDb()
      .from("rooms")
      .update(fields)
      .eq("room_id", id)
      .select()
      .single();
    if (error) {
      toast("Error updating room", "error");
      return null;
    }
    toast("Room updated!", "success");
    return data;
  },

  // DELETE
  // SQL: DELETE FROM rooms WHERE room_id=$1
  async delete(id) {
    const { error } = await getDb().from("rooms").delete().eq("room_id", id);
    if (error) {
      toast("Cannot delete — room has bookings", "error");
      return false;
    }
    toast("Room deleted.", "success");
    return true;
  },

  // COUNT AVAILABLE
  // SQL: SELECT COUNT(*) FROM rooms WHERE status='Available'
  async countAvailable() {
    const { count } = await getDb()
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("status", "Available");
    return count || 0;
  },

  // COUNT ALL
  async countAll() {
    const { count } = await getDb()
      .from("rooms")
      .select("*", { count: "exact", head: true });
    return count || 0;
  },
};

// ─────────────────────────────────────────
// BOOKINGS CRUD
// ─────────────────────────────────────────

const Bookings = {
  // READ ALL with JOINs
  // SQL:
  //   SELECT b.*, c.name AS customer_name, c.phone,
  //          r.room_number, r.room_type, r.price
  //   FROM bookings b
  //   JOIN customers c ON b.customer_id = c.customer_id
  //   JOIN rooms r ON b.room_id = r.room_id
  //   ORDER BY b.booking_id DESC
  async getAll() {
    const { data, error } = await getDb()
      .from("bookings")
      .select(
        `
        *,
        customers ( customer_id, name, phone ),
        rooms ( room_id, room_number, room_type, price )
      `,
      )
      .order("booking_id", { ascending: false });
    if (error) {
      toast("Error loading bookings", "error");
      return [];
    }
    return data;
  },

  // READ BY STATUS
  // SQL: SELECT ... FROM bookings b JOIN ... WHERE b.status = $1
  async getByStatus(status) {
    const { data, error } = await getDb()
      .from("bookings")
      .select(`*, customers(name), rooms(room_number, room_type)`)
      .eq("status", status)
      .order("booking_id", { ascending: false });
    if (error) return [];
    return data;
  },

  // CREATE BOOKING
  // SQL:
  //   INSERT INTO bookings (customer_id, room_id, check_in, check_out, status)
  //   VALUES ($1, $2, $3, $4, 'Booked') RETURNING *;
  //   -- Then update room status:
  //   UPDATE rooms SET status='Occupied' WHERE room_id=$2;
  async create({ customer_id, room_id, check_in, check_out }) {
    const { data, error } = await getDb()
      .from("bookings")
      .insert([{ customer_id, room_id, check_in, check_out, status: "Booked" }])
      .select()
      .single();
    if (error) {
      toast("Booking failed: " + error.message, "error");
      return null;
    }

    // Mark room as Occupied
    await Rooms.update(room_id, { status: "Occupied" });

    toast("Booking created!", "success");
    return data;
  },

  // CHECK-IN
  // SQL:
  //   UPDATE bookings SET status='Checked-in' WHERE booking_id=$1;
  async checkIn(booking_id) {
    const { data, error } = await getDb()
      .from("bookings")
      .update({ status: "Checked-in" })
      .eq("booking_id", booking_id)
      .select()
      .single();
    if (error) {
      toast("Check-in failed", "error");
      return null;
    }
    toast("Guest checked in!", "success");
    return data;
  },

  // CHECK-OUT
  // SQL:
  //   UPDATE bookings SET status='Completed' WHERE booking_id=$1;
  //   UPDATE rooms SET status='Available' WHERE room_id = (
  //     SELECT room_id FROM bookings WHERE booking_id=$1
  //   );
  async checkOut(booking_id, room_id) {
    const { data, error } = await getDb()
      .from("bookings")
      .update({ status: "Completed" })
      .eq("booking_id", booking_id)
      .select()
      .single();
    if (error) {
      toast("Check-out failed", "error");
      return null;
    }

    // Free the room
    await Rooms.update(room_id, { status: "Available" });

    toast("Guest checked out. Room now available.", "success");
    return data;
  },

  // UPDATE BOOKING
  // SQL: UPDATE bookings SET customer_id=$1, room_id=$2, check_in=$3, check_out=$4 WHERE booking_id=$5
  async update(id, fields) {
    const { data, error } = await getDb()
      .from("bookings")
      .update(fields)
      .eq("booking_id", id)
      .select()
      .single();
    if (error) {
      toast("Update failed", "error");
      return null;
    }
    toast("Booking updated!", "success");
    return data;
  },

  // DELETE
  // SQL: DELETE FROM bookings WHERE booking_id=$1
  async delete(id) {
    // First get the booking to release room if needed
    const { data: booking } = await getDb()
      .from("bookings")
      .select("room_id, status")
      .eq("booking_id", id)
      .single();

    const { error } = await getDb()
      .from("bookings")
      .delete()
      .eq("booking_id", id);
    if (error) {
      toast("Delete failed", "error");
      return false;
    }

    // If booking was active, free the room
    if (booking && ["Booked", "Checked-in"].includes(booking.status)) {
      await Rooms.update(booking.room_id, { status: "Available" });
    }
    toast("Booking deleted.", "success");
    return true;
  },

  // COUNT ACTIVE
  // SQL: SELECT COUNT(*) FROM bookings WHERE status IN ('Booked','Checked-in')
  async countActive() {
    const { count } = await getDb()
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("status", ["Booked", "Checked-in"]);
    return count || 0;
  },
};

// ─────────────────────────────────────────
// DASHBOARD STATS (aggregate counts)
// ─────────────────────────────────────────
async function loadDashboardStats() {
  const [customers, rooms, available, bookings] = await Promise.all([
    Customers.count(),
    Rooms.countAll(),
    Rooms.countAvailable(),
    Bookings.countActive(),
  ]);
  return { customers, rooms, available, bookings };
}
