// Google Apps Script Web App URL
const API = "https://script.google.com/macros/s/AKfycbzT4WoXTksqitPCep2ohxQMVu78G4qgYG56ArgU8d980DoQvTPrGFcs14Kdwea6chnf9A/exec";

// ===== REGISTER =====
function register() {
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const role = document.getElementById('role').value;

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  fetch(API, {
    method: "POST",
    body: JSON.stringify({
      sheet: "Users",
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
  .catch(err => alert("Error: " + err));
}

// ===== LOGIN =====
function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  fetch(API, {
    method: "POST",
    body: JSON.stringify({
      sheet: "Users",
      action: "login",
      email,
      password
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role: data.role }));
      window.location.href = "dashboard.html";
    } else {
      alert("Invalid login credentials");
    }
  })
  .catch(err => alert("Error: " + err));
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
