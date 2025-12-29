// ================== CONFIG ==================
const API = "https://script.google.com/macros/s/AKfycbwLsl-rkY_bkde91Ix5iVJw46o8o5Z79blidbdIh4g9ANYcrJZQlKRmHK1WxiLAWYbYkw/exec";
let chart;
let memberChart;

// ================== LOGIN CHECK ==================
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
  alert('Please login first');
  window.location.href = 'index.html';
} else {
  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) userRoleEl.innerText = `Welcome, ${currentUser.email} (${currentUser.role})`;

  if (currentUser.role !== 'admin') {
    const adminSection = document.getElementById('adminSection');
    if (adminSection) adminSection.style.display = 'none';
  }
}

// ================== HELPER FUNCTIONS ==================
async function fetchSheet(sheet) {
  try {
    const res = await fetch(API, {
      method: "POST",
      body: JSON.stringify({ sheet, action: "list" })
    });
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.error(`Failed to fetch sheet: ${sheet}`, err);
    return [];
  }
}

async function addSheetItem(sheet, obj) {
  try {
    const res = await fetch(API, {
      method: "POST",
      body: JSON.stringify({ sheet, action: "add", ...obj })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`Failed to add item to sheet: ${sheet}`, err);
    return { success: false, message: "Network or API error" };
  }
}

// ================== MEMBERS ==================
async function populateMembers() {
  const users = await fetchSheet("Users");
  const members = Array.isArray(users) ? users.filter(u => u && u.role === "member") : [];

  const select = document.getElementById('memberSelect');
  const loanSelect = document.getElementById('loanEmail');
  if (!select || !loanSelect) return;

  select.innerHTML = '<option value="">Select Member</option>';
  loanSelect.innerHTML = '<option value="">Select Member</option>';

  members.forEach(m => {
    if (!m || !m.email) return;
    const opt1 = document.createElement('option');
    opt1.value = m.email;
    opt1.innerText = m.email;
    select.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = m.email;
    opt2.innerText = m.email;
    loanSelect.appendChild(opt2);
  });
}

// ================== CONTRIBUTIONS ==================
async function addContribution() {
  const email = document.getElementById('memberEmail')?.value;
  const amount = Number(document.getElementById('amount')?.value);
  if (!email || !amount || amount <= 0) {
    alert('Fill fields correctly');
    return;
  }

  const res = await addSheetItem("Contributions", { email, amount, date: new Date().toISOString() });
  if (res.success) {
    alert("Contribution added!");
    updateSummary();
    populateMembers();
    drawMemberTrend();
  } else alert(res.message || "Failed to add contribution");
}

// ================== PENALTIES ==================
async function calculatePenalties() {
  const users = await fetchSheet("Users");
  const contributions = await fetchSheet("Contributions");
  const penalties = await fetchSheet("Penalties");

  const members = Array.isArray(users) ? users.filter(u => u && u.role === 'member') : [];
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  for (const m of members) {
    const paid = Array.isArray(contributions) && contributions.some(c => c && c.email === m.email && c.date && new Date(c.date).getMonth() + 1 === month && new Date(c.date).getFullYear() === year);
    const alreadyPenalized = Array.isArray(penalties) && penalties.some(p => p && p.email === m.email && p.month == month && p.year == year);

    if (!paid && !alreadyPenalized) {
      await addSheetItem("Penalties", { email: m.email, amount: 100, month, year, reason: "Missed contribution" });
    }
  }

  alert("Penalties applied");
  updateSummary();
}

// ================== SUMMARY ==================
async function updateSummary() {
  const users = await fetchSheet("Users");
  const members = Array.isArray(users) ? users.filter(u => u && u.role === 'member') : [];
  const contributions = await fetchSheet("Contributions") || [];
  const penalties = await fetchSheet("Penalties") || [];

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const totalC = contributions
    .filter(c => c && c.date && new Date(c.date).getMonth() + 1 === month && new Date(c.date).getFullYear() === year)
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  const totalP = penalties
    .filter(p => p && p.month === month && p.year === year)
    .reduce((a, b) => a + Number(b.amount || 0), 0);

  const contribEl = document.getElementById('cardTotalContributions');
  const penaltyEl = document.getElementById('cardTotalPenalties');
  const missedEl = document.getElementById('cardMissedMembers');

  if (contribEl) contribEl.innerText = `KES ${totalC}`;
  if (penaltyEl) penaltyEl.innerText = `KES ${totalP}`;

  const missedList = document.getElementById('missedList');
  if (!missedList) return;
  missedList.innerHTML = '';
  let missed = 0;

  for (const m of members) {
    const paid = contributions.some(c => c && c.email === m.email && c.date && new Date(c.date).getMonth() + 1 === month && new Date(c.date).getFullYear() === year);
    if (!paid) {
      missed++;
      const li = document.createElement('li');
      li.style.color = '#ff5722';
      li.style.fontWeight = 'bold';
      li.innerText = `${m.email} has not contributed this month!`;
      missedList.appendChild(li);
    }
  }

  if (missed === 0) {
    const li = document.createElement('li');
    li.style.color = '#4caf50';
    li.style.fontWeight = 'bold';
    li.innerText = 'All members have contributed this month ✅';
    missedList.appendChild(li);
  }

  if (missedEl) missedEl.innerText = missed;
}

// ================== INIT ==================
window.onload = function () {
  populateMembers();
  updateSummary();
};
