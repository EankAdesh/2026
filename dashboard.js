// ===== Globals =====
let chart;
let memberChart;

// ===== Login Check & Role Handling =====
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

// ===== Load Data =====
const contributions = JSON.parse(localStorage.getItem('contributions') || '[]');
const penalties = JSON.parse(localStorage.getItem('penalties') || '[]');

// ===== Save Functions =====
function saveContributions(){ localStorage.setItem('contributions', JSON.stringify(contributions)); }
function savePenalties(){ localStorage.setItem('penalties', JSON.stringify(penalties)); }

// ===== Add Contribution =====
function addContribution(){
  const email = document.getElementById('memberEmail')?.value;
  const amount = Number(document.getElementById('amount')?.value);
  if(!email || !amount || amount <= 0){ 
    alert('Fill fields correctly'); 
    return; 
  }
  contributions.push({email, amount, date: new Date().toISOString()});
  saveContributions();
  alert('Contribution added');
  updateSummary();
  populateMembers();
  drawMemberTrend();
  animateSummary();
}

// ===== Calculate Penalties =====
function calculatePenalties(){
  const allMembers = JSON.parse(localStorage.getItem('users') || '[]').filter(u => u.role === 'member');
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  allMembers.forEach(m => {
    const paid = contributions.some(c => {
      const d = new Date(c.date);
      return c.email === m.email && d.getMonth()+1 === month && d.getFullYear() === year;
    });
    if(!paid && !penalties.some(p => p.email===m.email && p.month===month && p.year===year)){
      penalties.push({email:m.email, amount:100, month, year, reason:'Missed contribution'});
    }
  });
  savePenalties();
  alert('Penalties applied');
  updateSummary();
  animateSummary();
}

// ===== Populate Members Dropdown =====
function populateMembers(){
  const members = JSON.parse(localStorage.getItem('users')||'[]').filter(u => u.role === 'member');
  const select = document.getElementById('memberSelect');
  if(!select) return;
  select.innerHTML = '<option value="">Select Member</option>';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.email;
    opt.innerText = m.email;
    select.appendChild(opt);
  });
}
populateMembers();

// ===== Draw Member Trend Chart =====
function drawMemberTrend(){
  const emailEl = document.getElementById('memberSelect');
  if(!emailEl) return;
  const email = emailEl.value;
  if(!email) return;

  const dataArr = Array(12).fill(0);
  const year = new Date().getFullYear();

  contributions.forEach(c => {
    const d = new Date(c.date);
    if(c.email === email && d.getFullYear() === year){
      dataArr[d.getMonth()] += c.amount;
    }
  });

  const ctx = document.getElementById('memberChart')?.getContext('2d');
  if(!ctx) return;
  if(memberChart) memberChart.destroy();

  memberChart = new Chart(ctx, {
    type:'line',
    data:{
      labels:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets:[{
        label:`${email} Contribution`,
        data:dataArr,
        borderColor:'rgba(255, 193, 7, 1)',
        backgroundColor:'rgba(255, 193, 7, 0.2)',
        fill:true,
        tension:0.3
      }]
    },
    options:{
      plugins:{title:{display:true,text:`Contribution Trend for ${email}`}},
      animation: { duration: 1200, easing: 'easeOutQuart' }
    }
  });
}

// ===== Charts =====
function drawChart(labels, data, title){
  const ctx = document.getElementById('chart')?.getContext('2d');
  if(!ctx) return;
  if(chart) chart.destroy();
  chart = new Chart(ctx,{
    type:'bar',
    data:{labels, datasets:[{label:"KES",data}]},
    options:{plugins:{title:{display:true,text:title}}, animation:{duration:1000,easing:'easeOutQuart'}}
  });
}

// ===== Reports =====
let lastReport = {};

function monthlyReport(){ 
  const monthYear = document.getElementById('monthPicker')?.value.split('-');
  if(!monthYear[0]) return;
  const month = Number(monthYear[1]);
  const year = Number(monthYear[0]);

  const total = contributions.filter(c=>{
    const d = new Date(c.date);
    return d.getMonth()+1===month && d.getFullYear()===year;
  }).reduce((a,b)=>a+b.amount,0);

  lastReport = {title:`${month}/${year}`, total};
  const reportEl = document.getElementById('reportResult');
  if(reportEl) reportEl.innerText = `Total: KES ${total}`;
  drawChart([`Total`],[total],`Monthly`);
}

function yearlyReport(){
  const year = Number(document.getElementById('yearPicker')?.value);
  if(!year) return;

  const arr = Array(12).fill(0);
  contributions.forEach(c=>{
    const d = new Date(c.date);
    if(d.getFullYear()===year) arr[d.getMonth()]+=c.amount;
  });

  const total = arr.reduce((a,b)=>a+b,0);
  lastReport = {title:`Year ${year}`, total};
  const reportEl = document.getElementById('reportResult');
  if(reportEl) reportEl.innerText = `Total: KES ${total}`;
  drawChart(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],arr,"Yearly");
}

// ===== Update Summary & Alerts =====
function updateSummary(){
  const now = new Date();
  const month = now.getMonth()+1;
  const year = now.getFullYear();
  const members = JSON.parse(localStorage.getItem('users')||'[]').filter(u=>u.role==='member');

  // Total Contributions & Penalties
  const totalC = contributions.filter(c=>{ const d=new Date(c.date); return d.getMonth()+1===month && d.getFullYear()===year; }).reduce((a,b)=>a+b.amount,0);
  const totalP = penalties.filter(p=>p.month===month && p.year===year).reduce((a,b)=>a+b.amount,0);

  const contribEl = document.getElementById('cardTotalContributions');
  const penaltyEl = document.getElementById('cardTotalPenalties');
  const missedEl = document.getElementById('cardMissedMembers');
  if(contribEl) contribEl.innerText = `KES ${totalC}`;
  if(penaltyEl) penaltyEl.innerText = `KES ${totalP}`;

  // Missing members
  let missed = 0;
  const missedList = document.getElementById('missedList');
  if(missedList) missedList.innerHTML = '';

  members.forEach(member=>{
    const paid = contributions.some(c=>{ const d=new Date(c.date); return c.email===member.email && d.getMonth()+1===month && d.getFullYear()===year; });
    if(!paid){
      missed++;
      if(missedList){
        const li = document.createElement('li');
        li.style.color = '#ff5722';
        li.style.fontWeight = 'bold';
        li.innerText = `${member.email} has not contributed this month!`;
        missedList.appendChild(li);
      }
    }
  });

  if(missed===0 && missedList){
    const li = document.createElement('li');
    li.style.color = '#4caf50';
    li.style.fontWeight = 'bold';
    li.innerText = 'All members have contributed this month ✅';
    missedList.appendChild(li);
  }

  if(missedEl) missedEl.innerText = missed;
}

// ===== Calendar =====
function drawCalendar(){
  const monthYear = document.getElementById('calendarMonth')?.value.split('-');
  if(!monthYear[0]) return;
  const year = Number(monthYear[0]);
  const month = Number(monthYear[1])-1;
  const members = JSON.parse(localStorage.getItem('users')||'[]').filter(u=>u.role==='member');
  const table = document.getElementById('calendarTable');
  if(!table) return;

  table.innerHTML = '';
  let header = '<tr><th>Member</th>';
  const daysInMonth = new Date(year, month+1, 0).getDate();
  for(let d=1; d<=daysInMonth; d++) header += `<th>${d}</th>`;
  header += '</tr>';
  table.innerHTML = header;

  members.forEach(m=>{
    let row = `<tr><td>${m.email}</td>`;
    for(let d=1; d<=daysInMonth; d++){
      const contribsToday = contributions.filter(c=>{
        const date = new Date(c.date);
        return c.email===m.email && date.getFullYear()===year && date.getMonth()===month && date.getDate()===d;
      });
      if(contribsToday.length){
        const amount = contribsToday.reduce((a,b)=>a+b.amount,0);
        row += `<td style="background-color:#4caf50;color:#fff;cursor:pointer;" title="KES ${amount} contributed">✔</td>`;
      } else {
        row += `<td style="background-color:#f44336;color:#fff;" title="No contribution">✖</td>`;
      }
    }
    row += '</tr>';
    table.innerHTML += row;
  });
}

// ===== Smooth Number Animation =====
function animateValue(id, start, end, duration){
  const obj = document.getElementById(id);
  if(!obj) return;
  let range = end - start;
  let current = start;
  const increment = end > start ? 1 : -1;
  let stepTime = Math.abs(Math.floor(duration / range));
  if(stepTime < 20) stepTime = 20;

  const timer = setInterval(()=>{
    current += increment;
    obj.innerText = current;
    if(current===end) clearInterval(timer);
  }, stepTime);
}

function animateSummary(){
  const now = new Date();
  const month = now.getMonth()+1;
  const year = now.getFullYear();
  const members = JSON.parse(localStorage.getItem('users')||'[]').filter(u=>u.role==='member');

  const totalC = contributions.filter(c=>{ const d=new Date(c.date); return d.getMonth()+1===month && d.getFullYear()===year; }).reduce((a,b)=>a+b.amount,0);
  const totalP = penalties.filter(p=>p.month===month && p.year===year).reduce((a,b)=>a+b.amount,0);
  let missed = 0;
  members.forEach(m=>{
    const paid = contributions.some(c=>{ const d=new Date(c.date); return c.email===m.email && d.getMonth()+1===month && d.getFullYear()===year; });
    if(!paid) missed++;
  });

  animateValue('cardTotalContributions',0,totalC,800);
  animateValue('cardTotalPenalties',0,totalP,800);
  animateValue('cardMissedMembers',0,missed,800);
}

// ===== PDF Export =====
function exportPDF(){
  const pdf = new jspdf.jsPDF();
  pdf.text(`Report: ${new Date().toLocaleDateString()}`,10,10);
  pdf.text(`Total Contributions: KES ${document.getElementById('cardTotalContributions')?.innerText}`,10,20);
  pdf.text(`Total Penalties: KES ${document.getElementById('cardTotalPenalties')?.innerText}`,10,30);
  const chartEl = document.getElementById('chart');
  if(chartEl) pdf.addImage(chartEl.toDataURL(),'PNG',10,40,180,80);
  pdf.save('report.pdf');
}

// ===== Backup & Restore =====
function backupData(){
  const data = {users:JSON.parse(localStorage.getItem('users')||'[]'), contributions, penalties};
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)]));
  a.download='chama-backup.json';
  a.click();
}

function restoreData(file){
  const reader = new FileReader();
  reader.onload = e=>{
    const data = JSON.parse(e.target.result);
    localStorage.setItem('users',JSON.stringify(data.users||[]));
    localStorage.setItem('contributions',JSON.stringify(data.contributions||[]));
    localStorage.setItem('penalties',JSON.stringify(data.penalties||[]));
    alert('Data restored');
    location.reload();
  };
  reader.readAsText(file);
}

// ===== Logout =====
function logout(){
  localStorage.removeItem('currentUser');
  window.location.href='index.html';
}

// ===== Init =====
window.onload = function(){
  populateMembers();
  updateSummary();
  drawMemberTrend();
};
