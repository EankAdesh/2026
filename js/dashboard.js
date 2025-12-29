// ================== CONFIG ==================
const API = "https://script.google.com/macros/s/AKfycbwLsl-rkY_bkde91Ix5iVJw46o8o5Z79blidbdIh4g9ANYcrJZQlKRmHK1WxiLAWYbYkw/exec";
let chart;
let memberChart;

// ================== LOGIN CHECK ==================
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if(!currentUser){
  alert('Please login first');
  window.location.href = 'index.html';
} else {
  const userRoleEl = document.getElementById('userRole');
  if(userRoleEl) userRoleEl.innerText = `Welcome, ${currentUser.email} (${currentUser.role})`;

  if(currentUser.role !== 'admin'){
    const adminSection = document.getElementById('adminSection');
    if(adminSection) adminSection.style.display = 'none';
  }
}

// ================== HELPER FUNCTIONS ==================
async function fetchSheet(sheet){
  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({ sheet, action: "list" })
  });
  const data = await res.json();
  return data.items || [];
}

async function addSheetItem(sheet, obj){
  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({ sheet, action: "add", ...obj })
  });
  const data = await res.json();
  return data;
}

// ================== MEMBERS ==================
async function populateMembers(){
  const users = await fetchSheet("Users");
  const members = users.filter(u => u.role === "member");
  const select = document.getElementById('memberSelect');
  if(select){
    select.innerHTML = '<option value="">Select Member</option>';
    members.forEach(m=>{
      const opt = document.createElement('option');
      opt.value = m.email;
      opt.innerText = m.email;
      select.appendChild(opt);
    });
  }

  const loanSelect = document.getElementById('loanEmail');
  if(loanSelect){
    loanSelect.innerHTML = '<option value="">Select Member</option>';
    members.forEach(m=>{
      const opt = document.createElement('option');
      opt.value = m.email;
      opt.innerText = m.email;
      loanSelect.appendChild(opt);
    });
  }
}

// ================== CONTRIBUTIONS ==================
async function addContribution(){
  const email = document.getElementById('memberEmail')?.value;
  const amount = Number(document.getElementById('amount')?.value);
  if(!email || !amount || amount <= 0){ 
    alert('Fill fields correctly'); 
    return; 
  }

  const res = await addSheetItem("Contributions",{ email, amount, date: new Date().toISOString() });
  if(res.success){
    alert("Contribution added!");
    updateSummary();
    populateMembers();
    drawMemberTrend();
  } else alert(res.message || "Failed to add contribution");
}

// ================== PENALTIES ==================
async function calculatePenalties(){
  const users = await fetchSheet("Users");
  const contributions = await fetchSheet("Contributions");
  const penalties = await fetchSheet("Penalties");

  const members = users.filter(u => u.role === 'member');
  const now = new Date();
  const month = now.getMonth()+1;
  const year = now.getFullYear();

  for(const m of members){
    const paid = contributions.some(c=>{
      const d = new Date(c.date);
      return c.email===m.email && d.getMonth()+1===month && d.getFullYear()===year;
    });

    const alreadyPenalized = penalties.some(p=>p.email===m.email && p.month==month && p.year==year);
    if(!paid && !alreadyPenalized){
      await addSheetItem("Penalties",{ email: m.email, amount: 100, month, year, reason: "Missed contribution" });
    }
  }
  alert("Penalties applied");
  updateSummary();
}

// ================== SUMMARY ==================
async function updateSummary(){
  const users = await fetchSheet("Users");
  const members = users.filter(u=>u.role==='member');
  const contributions = await fetchSheet("Contributions");
  const penalties = await fetchSheet("Penalties");

  const now = new Date();
  const month = now.getMonth()+1;
  const year = now.getFullYear();

  const totalC = contributions.filter(c=>{
    const d = new Date(c.date);
    return d.getMonth()+1===month && d.getFullYear()===year;
  }).reduce((a,b)=>a+Number(b.amount),0);

  const totalP = penalties.filter(p=>p.month===month && p.year===year)
    .reduce((a,b)=>a+Number(b.amount),0);

  const contribEl = document.getElementById('cardTotalContributions');
  const penaltyEl = document.getElementById('cardTotalPenalties');
  const missedEl = document.getElementById('cardMissedMembers');
  if(contribEl) contribEl.innerText = `KES ${totalC}`;
  if(penaltyEl) penaltyEl.innerText = `KES ${totalP}`;

  const missedList = document.getElementById('missedList');
  if(!missedList) return;
  missedList.innerHTML = '';
  let missed = 0;

  for(const m of members){
    const paid = contributions.some(c=>{
      const d = new Date(c.date);
      return c.email===m.email && d.getMonth()+1===month && d.getFullYear()===year;
    });
    if(!paid){
      missed++;
      const li = document.createElement('li');
      li.style.color = '#ff5722';
      li.style.fontWeight = 'bold';
      li.innerText = `${m.email} has not contributed this month!`;
      missedList.appendChild(li);
    }
  }

  if(missed===0){
    const li = document.createElement('li');
    li.style.color = '#4caf50';
    li.style.fontWeight = 'bold';
    li.innerText = 'All members have contributed this month ✅';
    missedList.appendChild(li);
  }

  if(missedEl) missedEl.innerText = missed;
}

// ================== MEMBER TREND CHART ==================
async function drawMemberTrend(){
  const emailEl = document.getElementById('memberSelect');
  if(!emailEl) return;
  const email = emailEl.value;
  if(!email) return;

  const contributions = await fetchSheet("Contributions");
  const dataArr = Array(12).fill(0);
  const year = new Date().getFullYear();

  contributions.forEach(c=>{
    const d = new Date(c.date);
    if(c.email===email && d.getFullYear()===year) dataArr[d.getMonth()]+=Number(c.amount);
  });

  const ctx = document.getElementById('memberChart')?.getContext('2d');
  if(!ctx) return;
  if(memberChart) memberChart.destroy();

  memberChart = new Chart(ctx,{
    type:'line',
    data:{
      labels:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets:[{
        label:`${email} Contribution`,
        data:dataArr,
        borderColor:'rgba(255,193,7,1)',
        backgroundColor:'rgba(255,193,7,0.2)',
        fill:true,
        tension:0.3
      }]
    },
    options:{
      plugins:{title:{display:true,text:`Contribution Trend for ${email}`}},
      animation:{duration:1200,easing:'easeOutQuart'}
    }
  });
}

// ================== GENERAL CHART ==================
function drawChart(labels,data,title){
  const ctx = document.getElementById('chart')?.getContext('2d');
  if(!ctx) return;
  if(chart) chart.destroy();
  chart = new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{label:"KES",data}]},
    options:{plugins:{title:{display:true,text:title}}, animation:{duration:1000,easing:'easeOutQuart'}}
  });
}

// ================== REPORTS ==================
async function monthlyReport(){
  const monthYear = document.getElementById('monthPicker')?.value.split('-');
  if(!monthYear[0]) return;
  const month = Number(monthYear[1]);
  const year = Number(monthYear[0]);

  const contributions = await fetchSheet("Contributions");
  const total = contributions.filter(c=>{
    const d = new Date(c.date);
    return d.getMonth()+1===month && d.getFullYear()===year;
  }).reduce((a,b)=>a+Number(b.amount),0);

  const reportEl = document.getElementById('reportResult');
  if(reportEl) reportEl.innerText = `Total: KES ${total}`;
  drawChart(["Total"],[total],"Monthly");
}

async function yearlyReport(){
  const year = Number(document.getElementById('yearPicker')?.value);
  if(!year) return;

  const contributions = await fetchSheet("Contributions");
  const arr = Array(12).fill(0);
  contributions.forEach(c=>{
    const d = new Date(c.date);
    if(d.getFullYear()===year) arr[d.getMonth()]+=Number(c.amount);
  });

  const total = arr.reduce((a,b)=>a+b,0);
  const reportEl = document.getElementById('reportResult');
  if(reportEl) reportEl.innerText = `Total: KES ${total}`;
  drawChart(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],arr,"Yearly");
}

// ================== PDF EXPORT ==================
function exportPDF(){
  const pdf = new jspdf.jsPDF();
  pdf.text(`Report: ${new Date().toLocaleDateString()}`,10,10);
  const contrib = document.getElementById('cardTotalContributions')?.innerText;
  const penalty = document.getElementById('cardTotalPenalties')?.innerText;
  pdf.text(`Total Contributions: ${contrib}`,10,20);
  pdf.text(`Total Penalties: ${penalty}`,10,30);

  const chartEl = document.getElementById('chart');
  if(chartEl) pdf.addImage(chartEl.toDataURL(),'PNG',10,40,180,80);
  pdf.save('report.pdf');
}

// ================== LOANS ==================
async function populateLoans() {
  const loans = await fetchSheet("Loans");
  const loansTable = document.getElementById("loansTable");
  if(!loansTable) return;

  loansTable.innerHTML = `
    <tr>
      <th>Member</th>
      <th>Amount</th>
      <th>Status</th>
      <th>Reason</th>
      ${currentUser.role === "admin" ? "<th>Actions</th>" : ""}
    </tr>
  `;

  loans.forEach(loan => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${loan.email}</td>
      <td>${loan.amount}</td>
      <td>${loan.status}</td>
      <td>${loan.reason || ""}</td>
      ${currentUser.role === "admin" ? `
        <td>
          ${loan.status === "pending" ? `<button onclick="updateLoan('${loan.id}','approved')">Approve</button>` : ""}
          ${loan.status !== "repaid" ? `<button onclick="updateLoan('${loan.id}','repaid')">Mark Repaid</button>` : ""}
        </td>
      ` : ""}
    `;
    loansTable.appendChild(tr);
  });
}

async function addLoan() {
  const email = document.getElementById("loanEmail")?.value;
  const amount = Number(document.getElementById("loanAmount")?.value);
  const reason = document.getElementById("loanReason")?.value || "";

  if(!email || !amount || amount <= 0) {
    alert("Fill fields correctly");
    return;
  }

  const id = "loan_" + Date.now();

  const res = await addSheetItem("Loans", {id, email, amount, status: "pending", reason});
  if(res.success) {
    alert("Loan request added!");
    populateLoans();
  } else alert(res.message || "Failed to add loan");
}

async function updateLoan(id, status) {
  const reason = prompt("Optional reason for status change:") || "";
  const res = await fetch(API, {
    method: "POST",
    body: JSON.stringify({
      sheet: "Loans",
      action: "update",
      id,
      status,
      reason
    })
  });
  const data = await res.json();
  if(data.success){
    alert("Loan updated!");
    populateLoans();
  } else {
    alert(data.message || "Failed to update loan");
  }
}

// ================== LOGOUT ==================
function logout(){
  localStorage.removeItem('currentUser');
  window.location.href='index.html';
}

// ================== INIT ==================
window.onload = function(){
  populateMembers();
  updateSummary();
  drawMemberTrend();
  populateLoans();
};
// ================== BACKUP & RESTORE ==================
async function backupData() {
  const users = await fetchSheet("Users");
  const contributions = await fetchSheet("Contributions");
  const penalties = await fetchSheet("Penalties");
  const loans = await fetchSheet("Loans");

  const backup = { users, contributions, penalties, loans };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `chama_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  alert("Backup downloaded!");
}

async function restoreData(file) {
  if(!file) return alert("No file selected");
  const reader = new FileReader();
  reader.onload = async function(e){
    try {
      const data = JSON.parse(e.target.result);

      // Optional: clear current sheets first
      // await clearSheet("Users");
      // await clearSheet("Contributions");
      // await clearSheet("Penalties");
      // await clearSheet("Loans");

      for(const user of data.users || []) await addSheetItem("Users", user);
      for(const c of data.contributions || []) await addSheetItem("Contributions", c);
      for(const p of data.penalties || []) await addSheetItem("Penalties", p);
      for(const l of data.loans || []) await addSheetItem("Loans", l);

      alert("Data restored successfully!");
      // Refresh UI
      populateMembers();
      updateSummary();
      drawMemberTrend();
      populateLoans();
    } catch(err) {
      alert("Failed to restore: " + err.message);
    }
  };
  reader.readAsText(file);
}

// Optional: function to clear a sheet before restoring (if needed)
async function clearSheet(sheetName){
  const items = await fetchSheet(sheetName);
  for(const item of items){
    // Here you can implement deletion if your GAS script supports it
    // Currently, this just skips, since GAS code does not support delete
  }
}
