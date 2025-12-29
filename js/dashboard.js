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
  const loanSelect = document.getElementById('loanMemberEmail');
  if(!select && !loanSelect) return;
  if(select) select.innerHTML = '<option value="">Select Member</option>';
  if(loanSelect) loanSelect.innerHTML = '<option value="">Select Member</option>';

  members.forEach(m=>{
    const opt1 = document.createElement('option');
    opt1.value = m.email; opt1.innerText = m.email;
    if(select) select.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = m.email; opt2.innerText = m.email;
    if(loanSelect) loanSelect.appendChild(opt2);
  });
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

// ================== LOANS ==================
async function addLoan() {
  const email = document.getElementById('loanMemberEmail')?.value;
  const amount = Number(document.getElementById('loanAmount')?.value);
  const reason = document.getElementById('loanReason')?.value || "";

  if(!email || !amount || amount <= 0){
    alert('Fill all fields correctly');
    return;
  }

  const res = await addSheetItem("Loans", {
    email,
    amount,
    date: new Date().toISOString(),
    status: "pending",
    reason
  });

  if(res.success){
    alert("Loan requested successfully!");
    populateLoans();
  } else alert(res.message || "Failed to request loan");
}

async function populateLoans(){
  const loans = await fetchSheet("Loans");
  const loanListEl = document.getElementById('loanList');
  if(!loanListEl) return;

  loanListEl.innerHTML = '';
  loans.forEach(l => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${l.email} | KES ${l.amount} | Status: <b>${l.status}</b> | ${l.reason || ""}
      ${currentUser.role === 'admin' && l.status === 'pending' ? `<button onclick="approveLoan('${l.email}','${l.date}')">Approve</button>` : ""}
      ${currentUser.role === 'admin' && l.status === 'approved' ? `<button onclick="markRepaid('${l.email}','${l.date}')">Mark Repaid</button>` : ""}
    `;
    loanListEl.appendChild(li);
  });
}

async function updateLoanStatus(email, date, status){
  const loans = await fetchSheet("Loans");
  const loan = loans.find(l => l.email===email && l.date===date);
  if(!loan) return alert("Loan not found");

  await addSheetItem("Loans", { ...loan, status });
  alert(`Loan status updated to ${status}`);
  populateLoans();
}

function approveLoan(email, date){ updateLoanStatus(email, date, "approved"); }
function markRepaid(email, date){ updateLoanStatus(email, date, "repaid"); }

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

// ================== LOGOUT ==================
function logout(){
  localStorage.removeItem('currentUser');
  window.location.href='index.html';
}

// ================== INIT ==================
window.onload = function(){
  populateMembers();
  populateLoans();
  updateSummary();
  drawMemberTrend();
};
