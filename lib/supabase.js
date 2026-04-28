const _SUPABASE_URL = "https://eeomxkdmyuybgkgzbynv.supabase.co";
const _SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb214a2RteXV5YmdrZ3pieW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNDA2MDMsImV4cCI6MjA5MjkxNjYwM30.PiHEdWAQs6h0NyggqigtOqMH_yDcO_Kvqkff42QKbb4"; // ← replace

// Load the Supabase JS client from CDN (loaded in HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

let supabase;

function initSupabase() {
  if (typeof window.supabase !== "undefined") {
    // Using CDN build
    supabase = window.supabase.createClient(_SUPABASE_URL, _SUPABASE_KEY);
  } else {
    console.error("Supabase JS not loaded. Add CDN script to HTML.");
  }
  return supabase;
}

// Auto-init on load
document.addEventListener("DOMContentLoaded", initSupabase);
