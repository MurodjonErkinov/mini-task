const $ = (selector) => document.querySelector(selector);
const money = (amount) => new Intl.NumberFormat('uz-UZ').format(amount) + ' so‘m';
const monthInput = $('#month');
const today = new Date();
monthInput.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
$('#payment-date').value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

async function api(url, options={}) {
  const response = await fetch(url, {...options, headers:{'Content-Type':'application/json', ...(options.headers||{})}});
  if (!response.ok) {
    const body = await response.json().catch(()=>({}));
    throw new Error(body.detail || `Xatolik (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}

async function loadDebtors() {
  const rows = await api(`/debtors?month=${encodeURIComponent(monthInput.value)}`);
  $('#debt-count').textContent = `${rows.length} ta`;
  $('#empty-debt').hidden = rows.length > 0;
  $('#debtors').innerHTML = rows.map(row => `<tr><td><strong>${escapeHtml(row.name)}</strong></td><td>${escapeHtml(row.group)}</td><td>${money(row.paid)} / ${money(row.monthly_fee)}</td><td>${money(row.debt)}</td></tr>`).join('');
}

async function loadStudents() {
  const rows = await api('/students');
  $('#student-select').innerHTML = rows.length ? rows.map(s=>`<option value="${s.id}">${escapeHtml(s.name)} · ${escapeHtml(s.group)}</option>`).join('') : '<option value="">Avval o‘quvchi qo‘shing</option>';
  $('#student-select').disabled = rows.length === 0;
  $('#payment-form button').disabled = rows.length === 0;
  $('#students').innerHTML = rows.length ? rows.map(s=>`<article class="student"><div class="student-info"><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.phone)} · ${escapeHtml(s.group)} · ID: ${s.id}</small></div><div class="fee">${money(s.monthly_fee)}<br><small>oyiga</small></div><div class="student-actions"><button class="secondary" data-action="history" data-id="${s.id}">To‘lovlar</button><button class="secondary" data-action="edit" data-id="${s.id}">Tahrirlash</button><button class="danger" data-action="delete" data-id="${s.id}">O‘chirish</button></div></article>`).join('') : '<p class="empty">Hozircha o‘quvchilar yo‘q.</p>';
  $('#students').querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>handleStudentAction(button.dataset.action, Number(button.dataset.id), rows)));
}

function escapeHtml(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }
async function refresh() { await Promise.all([loadStudents(), loadDebtors()]); }
monthInput.addEventListener('change', () => loadDebtors().catch(showError));
$('#payment-form').addEventListener('submit', async event => {
  event.preventDefault(); const form=event.currentTarget; const data = Object.fromEntries(new FormData(form));
  data.student_id = Number(data.student_id); data.amount = Number(data.amount);
  try { await api('/payments',{method:'POST',body:JSON.stringify(data)}); form.elements.amount.value=''; showNotice('To‘lov saqlandi.'); await loadDebtors(); }
  catch(error) { showError(error); }
});
$('#toggle-student').addEventListener('click',()=>{ $('#student-form').hidden = !$('#student-form').hidden; });
$('#cancel-student').addEventListener('click', resetStudentForm);
$('#student-form').addEventListener('submit',async event=>{
  event.preventDefault(); const form=event.currentTarget; const values=Object.fromEntries(new FormData(form));
  const id=values.student_id; const data={name:values.name,phone:values.phone,group:values.group,monthly_fee:Number(values.monthly_fee)};
  try { await api(id?`/students/${id}`:'/students',{method:id?'PUT':'POST',body:JSON.stringify(data)}); resetStudentForm(); showNotice(id?'O‘quvchi ma’lumotlari yangilandi.':'O‘quvchi qo‘shildi.'); await refresh(); }
  catch(error) { showError(error); }
});
$('#close-history').addEventListener('click',()=>$('#history-card').hidden=true);

async function handleStudentAction(action,id,students) {
  const student=students.find(item=>item.id===id);
  if (action==='edit') {
    const form=$('#student-form'); form.elements.student_id.value=student.id; form.elements.name.value=student.name; form.elements.phone.value=student.phone; form.elements.group.value=student.group; form.elements.monthly_fee.value=student.monthly_fee;
    $('#student-form-title').textContent='O‘quvchini tahrirlash'; $('#student-submit').textContent='O‘zgarishlarni saqlash'; form.hidden=false; form.scrollIntoView({behavior:'smooth',block:'center'});
  }
  if (action==='delete') {
    if (!window.confirm(`${student.name}ni va unga tegishli barcha to‘lovlarni o‘chirasizmi?`)) return;
    try { await api(`/students/${id}`,{method:'DELETE'}); showNotice('O‘quvchi o‘chirildi.'); if ($('#history-card').dataset.studentId===String(id)) $('#history-card').hidden=true; await refresh(); }
    catch(error) { showError(error); }
  }
  if (action==='history') {
    try {
      const payments=await api(`/students/${id}/payments`); $('#history-card').dataset.studentId=String(id); $('#history-title').textContent=`${student.name} · to‘lovlar`; $('#history-card').hidden=false;
      $('#payment-history').innerHTML=payments.length?`<div class="table-wrap"><table><thead><tr><th>Sana</th><th>Summa</th><th>ID</th></tr></thead><tbody>${payments.map(p=>`<tr><td>${escapeHtml(p.paid_on)}</td><td>${money(p.amount)}</td><td>${p.id}</td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">Hozircha to‘lovlar kiritilmagan.</p>';
      $('#history-card').scrollIntoView({behavior:'smooth',block:'start'});
    } catch(error) { showError(error); }
  }
}

function resetStudentForm() { const form=$('#student-form'); form.reset(); form.elements.student_id.value=''; form.hidden=true; $('#student-form-title').textContent='Yangi o‘quvchi'; $('#student-submit').textContent='O‘quvchini qo‘shish'; }
function showNotice(message) { $('#notice').textContent=message; $('#notice').style.color=''; }
function showError(error) { $('#notice').textContent=error.message; $('#notice').style.color='#b14e3e'; }
refresh().catch(showError);
