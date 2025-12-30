const API = "https://script.google.com/macros/s/AKfycby65QtyNl1PV0k0R_dk3bg17S5kCa9tiWmyl7C2eOSJBU_a1Gzg2k7tbet2m8YTu9aKlw/exec";
let chart, memberChart;

const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
  alert("Please login first");
  window.location.href="index.html";
} else {
  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) userRoleEl.innerText = `Welcome, ${currentUser.email} (${currentUser.role})`;
  if (currentUser.role !== "admin") {
    const adminSection = document.getElementById('adminSection');
    if (adminSection) adminSection.style.display = "none";
  }
}

// Fetch list of items from a sheet
async function fetchSheet(sheet) {
  try {
    const res = await fetch(API, {
      method:"POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet, action:"list" })
    });
    const data = await res.json();
    return Array.isArray(data.items)? data.items : [];
  } catch(err) {
    console.error(err);
    return [];
  }
}

// Add a row to a sheet
async function addSheetItem(sheet, obj) {
  try {
    const res = await fetch(API, {
      method:"POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet, action:"add", ...obj })
    });
    const data = await res.json();
    return data;
  } catch(err) {
    console.error(err);
    return { success:false, message:"Network error" };
  }
}

// Populate dropdowns with member emails
async function populateMembers() {
  const users = await fetchSheet("Users");
  const members = users.filter(u=>u?.role==="member");
  const select = document.getElementById('memberSelect'),
        loanSelect = document.getElementById('loanEmail');
  if (!select || !loanSelect) return;
  select.innerHTML = loanSelect.innerHTML = '<option value="">Select Member</option>';
  members.forEach(m => {
    let opt1 = document.createElement('option'); opt1.value = m.email; opt1.innerText = m.email; select.appendChild(opt1);
    let opt2 = document.createElement('option'); opt2.value = m.email; opt2.innerText = m.email; loanSelect.appendChild(opt2);
  });
}

// Update summary values and alerts
async function updateSummary() {
  const users = await fetchSheet("Users") || [];
  const members = users.filter(u=>u?.role==="member");
  const contributions = await fetchSheet("Contributions") || [];
  const penalties = await fetchSheet("Penalties") || [];
  const now = new Date(), month = now.getMonth()+1, year = now.getFullYear();

  const totalC = contributions
    .filter(c=>c?.date && new Date(c.date).getMonth()+1===month && new Date(c.date).getFullYear()===year)
    .reduce((a,b)=>a+Number(b.amount||0),0);

  const totalP = penalties
    .filter(p=>p?.month===month && p?.year===year)
    .reduce((a,b)=>a+Number(b.amount||0),0);

  document.getElementById('cardTotalContributions') &&
    (document.getElementById('cardTotalContributions').innerText = `KES ${totalC}`);
  document.getElementById('cardTotalPenalties') &&
    (document.getElementById('cardTotalPenalties').innerText = `KES ${totalP}`);

  const missedList = document.getElementById('missedList');
  if (!missedList) return;
  missedList.innerHTML = '';
  let missed = 0;

  members.forEach(m => {
    const paid = contributions.some(c => c?.email === m.email &&
      new Date(c.date).getMonth()+1 === month &&
      new Date(c.date).getFullYear() === year);
    if (!paid) {
      missed++;
      let li = document.createElement('li');
      li.style.color = '#ff5722';
      li.style.fontWeight = 'bold';
      li.innerText = `${m.email} has not contributed this month!`;
      missedList.appendChild(li);
    }
  });

  if (missed === 0) {
    let li = document.createElement('li');
    li.style.color = '#4caf50';
    li.style.fontWeight = 'bold';
    li.innerText = 'All members have contributed this month ✅';
    missedList.appendChild(li);
  }

  document.getElementById('cardMissedMembers') &&
    (document.getElementById('cardMissedMembers').innerText = missed);
}

// Init
window.onload = function() {
  populateMembers();
  updateSummary();
};
