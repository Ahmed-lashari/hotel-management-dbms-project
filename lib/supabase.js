const _SUPABASE_URL = "https://jogdrjxowjerhhwekkjw.supabase.co";
const _SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZ2Ryanhvd2plcmhod2Vra2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTYzMDUsImV4cCI6MjA5MjkzMjMwNX0.QzDo7PJu2gIaa2DJbhHQq6H6bNjrGuTl8_QmOSrjpQ4";

// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

window.supabaseClient = null;

function initSupabase() {
  if (!window.supabase) {
    console.error("Supabase CDN not loaded");
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    _SUPABASE_URL,
    _SUPABASE_KEY,
  );

  console.log("Supabase initialized: ", window.supabaseClient);
}

initSupabase();
