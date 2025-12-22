// Get saved users from localStorage
function getUsers(){
  return JSON.parse(localStorage.getItem('users')||'[]');
}

// Save users to localStorage
function saveUsers(users){
  localStorage.setItem('users', JSON.stringify(users));
}

// Register new user
function register(){
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value.trim();
  const role = document.getElementById('role').value;

  if(!email || !pass){
    alert('Email and password are required');
    return;
  }

  const users = getUsers();
  if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())){
    alert('User already exists');
    return;
  }

  users.push({email, password:pass, role});
  saveUsers(users);
  alert('Registered! Now login.');
}

// Login user
function login(){
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();

  if(!email || !pass){
    alert('Email and password are required');
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase()===email.toLowerCase() && u.password===pass);

  if(!user){
    alert('Invalid login');
    return;
  }

  localStorage.setItem('currentUser', JSON.stringify(user));
  window.location.href='dashboard.html';
}

// Logout user
function logout(){
  localStorage.removeItem('currentUser');
  window.location.href='index.html';
}
