// Google Apps Script Web App URL
const API = "https://script.google.com/macros/s/AKfycbwLsl-rkY_bkde91Ix5iVJw46o8o5Z79blidbdIh4g9ANYcrJZQlKRmHK1WxiLAWYbYkw/exec";

// ===== REGISTER =====
function register() {
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value.trim();
  const role = document.getElementById('role')?.value;

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  fetch(API, {
    method: "POST",
    body: JSON.stringify({ sheet: "Users", action: "register", email, password, role })
  })
  .then(res => res.json())
  .then(data => {
    if (data && data.success) {
      alert("Registered successfully! Please login.");
      if(document.getElementById('regEmail')) document.getElementById('regEmail').value = "";
      if(document.getElementById('regPassword')) document.getElementById('regPassword').value = "";
    } else {
      alert((data && data.message) || "Registration failed");
    }
  })
  .catch(err => alert("Error: " + err));
}

// ===== LOGIN =====
function login() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value.trim();

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  fetch(API, {
    method: "POST",
    body: JSON.stringify({ sheet: "Users", action: "login", email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data && data.success) {
      // Store currentUser safely
      localStorage.setItem("currentUser", JSON.stringify({ email, role: data.role || "member" }));
      window.location.href = "dashboard.html";
    } else {
      alert((data && data.message) || "Invalid login credentials");
    }
  })
  .catch(err => alert("Error: " + err));
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
