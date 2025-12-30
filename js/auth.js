// ===== CONFIG =====
const API = "https://script.google.com/macros/s/AKfycby65QtyNl1PV0k0R_dk3bg17S5kCa9tiWmyl7C2eOSJBU_a1Gzg2k7tbet2m8YTu9aKlw/exec";
// CORS proxy (temporary for testing)
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";

// ===== REGISTER =====
function register() {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const role = document.getElementById('role').value;

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  fetch(CORS_PROXY + API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheet: "Users",        // must include sheet
      action: "register",
      email,
      password,
      role
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Registered successfully! Please login.");
        document.getElementById('regEmail').value = "";
        document.getElementById('regPassword').value = "";
      } else {
        alert(data.message || "Registration failed");
      }
    })
    .catch(err => alert("Error: " + err.message));
}

// ===== LOGIN =====
function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  fetch(CORS_PROXY + API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sheet: "Users",   // must include sheet
      action: "login",
      email,
      password
    })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert(data.message || "Invalid login credentials");
        return;
      }
      // Store in localStorage in expected format
      localStorage.setItem("currentUser", JSON.stringify({ email, role: data.role }));
      window.location.href = "dashboard.html";
    })
    .catch(err => alert("Error: " + err.message));
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
