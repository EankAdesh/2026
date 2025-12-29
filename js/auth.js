// ================== CONFIG ==================
const API = "https://script.google.com/macros/s/AKfycbwLsl-rkY_bkde91Ix5iVJw46o8o5Z79blidbdIh4g9ANYcrJZQlKRmHK1WxiLAWYbYkw/exec";

// ================== REGISTER ==================
async function register() {
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value.trim();
  const role = document.getElementById('role')?.value || "member";

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      body: JSON.stringify({ sheet: "Users", action: "add", email, password, role })
    });
    const data = await res.json();

    if (data.success) {
      alert("Registered successfully! Please login.");
      document.getElementById('regEmail').value = "";
      document.getElementById('regPassword').value = "";
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (err) {
    console.error(err);
    alert("Error connecting to server: " + err);
  }
}

// ================== LOGIN ==================
async function login() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value.trim();

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  try {
    const res = await fetch(API, { method: "POST", body: JSON.stringify({ sheet: "Users", action: "list" }) });
    const data = await res.json();
    const users = data.items || [];

    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify({ email: user.email, role: user.role }));
      window.location.href = "dashboard.html";
    } else {
      alert("Invalid login credentials");
    }
  } catch (err) {
    console.error(err);
    alert("Error connecting to server: " + err);
  }
}

// ================== LOGOUT ==================
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
