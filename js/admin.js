const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMMw48PHFg3--Eo4jbEbz1sSkoZP4I_zUk18bFyKk8_OpuKgsqw2-Rsiu8kpaoSm0H/exec';
const BASE_URL   = 'https://ignacio0828.github.io/boda-ana-jorge';
let adminUser='', adminPass='', cachedData=null, editingCode='';

// ── LOGIN ──
document.getElementById('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
document.getElementById('loginUser').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});

async function doLogin(){
  const user=document.getElementById('loginUser').value.trim();
  const pass=document.getElementById('loginPass').value.trim();
  if(!user||!pass) return;
  showLoading(true);
  try{
    const r=await api({action:'adminLogin',user,pass});
    if(r.auth){
      adminUser=user; adminPass=pass;
      document.getElementById('loginScreen').style.display='none';
      document.getElementById('adminScreen').classList.add('show');
      showLoading(false);
      loadData();
    } else {
      showLoading(false);
      const err=document.getElementById('loginError');
      err.classList.add('show');
      setTimeout(()=>err.classList.remove('show'),3000);
    }
  }catch(e){showLoading(false);showToast('Error de conexión');}
}

function doLogout(){
  adminUser='';adminPass='';cachedData=null;
  document.getElementById('adminScreen').classList.remove('show');
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginPass').value='';
}

// ── DATA ──
async function loadData(){
  const btn=document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  try{
    const r=await api({action:'adminGetAll',user:adminUser,pass:adminPass});
    if(!r.ok){showToast('Error: '+r.error);btn.classList.remove('spinning');return;}
    cachedData=r;
    renderAll(r);
    document.getElementById('lastUpdate').textContent='Actualizado: '+new Date().toLocaleTimeString('es-ES');
  }catch(e){showToast('Error de conexión');}
  btn.classList.remove('spinning');
}

function renderAll(d){
  document.getElementById('st-total').textContent    =d.stats.totalGuests;
  document.getElementById('st-confirmed').textContent=d.stats.confirmed;
  document.getElementById('st-pending').textContent  =d.stats.pending;
  document.getElementById('st-cancelled').textContent=d.stats.cancelled;
  document.getElementById('st-pax').textContent      =d.stats.totalPax;
  document.getElementById('st-allergies').textContent=d.stats.allergies;

  // Pending
  const pending=d.guests.filter(g=>g.rsvpStatus==='Pendiente');
  document.getElementById('pendingCount').textContent=`${pending.length} pendientes`;
  document.getElementById('pendingTable').innerHTML=pending.length?pending.map(g=>`
    <tr>
      <td class="code-cell">${g.code}</td><td>${esc(g.name)}</td>
      <td style="text-align:center">${g.maxSeats}</td>
      <td>${g.phone?`<button class="btn btn-wa" onclick="sendWA('${g.phone}','${g.code}','${esc(g.name)}')">💬 WhatsApp</button>`:'<span style="font-size:12px;color:#ccc">Sin teléfono</span>'}</td>
    </tr>`).join(''):'<tr><td colspan="4" class="empty-state">🎉 ¡Todos han respondido!</td></tr>';

  // Guests
  document.getElementById('guestsTable').innerHTML=d.guests.map(g=>{
    const badge=g.rsvpStatus==='Confirmado'?'<span class="badge badge-green">✅ Confirmado</span>'
               :g.rsvpStatus==='No asiste' ?'<span class="badge badge-red">❌ No asiste</span>'
               :g.rsvpStatus==='Cancelado' ?'<span class="badge badge-yellow">🗑 Cancelado</span>'
               :'<span class="badge badge-grey">⏳ Pendiente</span>';
    return `<tr>
      <td class="code-cell">${g.code}</td><td>${esc(g.name)}</td>
      <td style="text-align:center">${g.maxSeats}</td>
      <td style="font-size:12px">${g.phone||'<span style="color:#ccc">—</span>'}</td>
      <td>${badge}</td>
      <td style="text-align:center">${g.rsvpSeats!=null?g.rsvpSeats:'—'}</td>
      <td><div class="btn-row">
        <button class="btn btn-edit" onclick="openEdit('${g.code}')">✏️ Editar</button>
        <button class="btn btn-del" onclick="delGuest('${g.code}','${esc(g.name)}')">🗑</button>
        ${g.phone?`<button class="btn btn-wa" onclick="sendWA('${g.phone}','${g.code}','${esc(g.name)}')">💬</button>`:''}
      </div></td>
    </tr>`;
  }).join('')||'<tr><td colspan="7" class="empty-state">No hay invitados</td></tr>';

  // Confirmed
  const conf=d.rsvp.filter(r=>r.status==='Confirmado');
  document.getElementById('confirmedCount').textContent=`${conf.length} confirmados · ${conf.reduce((s,r)=>s+(parseInt(r.seats)||0),0)} personas`;
  document.getElementById('confirmedTable').innerHTML=conf.map(r=>`
    <tr>
      <td class="code-cell">${r.code}</td><td>${esc(r.name)}</td>
      <td style="text-align:center"><strong>${r.seats}</strong></td>
      <td>${r.allergy&&r.allergy!=='—'?`<span class="badge badge-yellow">${esc(r.allergy)}</span>`:'<span style="color:#ccc;font-size:12px">Ninguna</span>'}</td>
      <td style="font-size:12px;color:#999">${r.date||'—'}</td>
    </tr>`).join('')||'<tr><td colspan="5" class="empty-state">Nadie ha confirmado aún</td></tr>';

  // Cancelled
  const canc=d.rsvp.filter(r=>r.status==='Cancelado'||r.status==='No asiste');
  document.getElementById('cancelledCount').textContent=`${canc.length} cancelados`;
  document.getElementById('cancelledTable').innerHTML=canc.map(r=>`
    <tr>
      <td class="code-cell">${r.code}</td><td>${esc(r.name)}</td>
      <td>${r.status==='Cancelado'?'<span class="badge badge-yellow">Canceló tras confirmar</span>':'<span class="badge badge-red">No puede asistir</span>'}</td>
      <td style="font-size:12px;color:#999">${r.date||'—'}</td>
    </tr>`).join('')||'<tr><td colspan="4" class="empty-state">Nadie ha cancelado</td></tr>';

  // Allergies
  const allerg=d.rsvp.filter(r=>r.allergy&&r.allergy!=='—'&&r.status==='Confirmado');
  document.getElementById('allergiesCount').textContent=`${allerg.length} invitados`;
  document.getElementById('allergiesTable').innerHTML=allerg.map(r=>`
    <tr>
      <td>${esc(r.name)}</td>
      <td style="text-align:center">${r.seats}</td>
      <td><span class="badge badge-yellow">🥗 ${esc(r.allergy)}</span></td>
    </tr>`).join('')||'<tr><td colspan="3" class="empty-state">Sin restricciones alimentarias 🎉</td></tr>';
}

// ── ADD GUEST ──
function toggleAddForm(){
  const form=document.getElementById('addForm');
  if(!form.classList.contains('show')){
    document.getElementById('f-name').value='';
    document.getElementById('f-seats').value='';
    document.getElementById('f-phone').value='';
    document.getElementById('f-code-preview').value='';
    document.getElementById('addFormError').classList.remove('show');
  }
  form.classList.toggle('show');
}

function updateCodePreview(){
  const name =document.getElementById('f-name').value.trim();
  const seats=document.getElementById('f-seats').value.trim();
  if(name&&seats){
    const first=name.split(' ')[0].toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z]/g,'');
    document.getElementById('f-code-preview').value=first+seats;
  } else {
    document.getElementById('f-code-preview').value='';
  }
}

function showFormErr(id,msg){
  const el=document.getElementById(id);
  el.textContent='⚠️ '+msg;
  el.classList.add('show');
}

async function addGuest(){
  document.getElementById('addFormError').classList.remove('show');
  const name =document.getElementById('f-name').value.trim();
  const seats=document.getElementById('f-seats').value.trim();
  const phone=document.getElementById('f-phone').value.trim();
  const code =document.getElementById('f-code-preview').value.trim();
  if(!name)                        {showFormErr('addFormError','El nombre es obligatorio');return;}
  if(!seats)                       {showFormErr('addFormError','El número de asientos es obligatorio');return;}
  if(parseInt(seats)<1||parseInt(seats)>20){showFormErr('addFormError','Los asientos deben estar entre 1 y 20');return;}
  if(!phone)                       {showFormErr('addFormError','El teléfono es obligatorio');return;}
  if(!/^\+34[0-9]{9}$/.test(phone)){showFormErr('addFormError','El teléfono debe ser +34 seguido de exactamente 9 dígitos. Ej: +34620642781');return;}
  if(cachedData&&cachedData.guests.find(g=>g.code===code)){showFormErr('addFormError',`El código "${code}" ya existe. Cambia el nombre o el número de asientos.`);return;}
  showLoading(true);
  const r=await api({action:'adminAddGuest',user:adminUser,pass:adminPass,code,name,maxSeats:seats,phone});
  showLoading(false);
  if(r.ok){document.getElementById('addForm').classList.remove('show');await loadData();}
  else     {showFormErr('addFormError',r.error||'No se pudo guardar');}
}

// ── EDIT ──
function openEdit(code){
  const g=cachedData.guests.find(g=>g.code===code);
  if(!g)return;
  editingCode=code;
  document.getElementById('e-code').value =g.code;
  document.getElementById('e-name').value =g.name;
  document.getElementById('e-seats').value=g.maxSeats;
  document.getElementById('e-phone').value=g.phone||'';
  document.getElementById('editFormError').classList.remove('show');
  document.getElementById('editModal').classList.add('show');
}

async function saveEdit(){
  document.getElementById('editFormError').classList.remove('show');
  const newCode=document.getElementById('e-code').value.trim().toUpperCase();
  const name   =document.getElementById('e-name').value.trim();
  const seats  =document.getElementById('e-seats').value.trim();
  const phone  =document.getElementById('e-phone').value.trim();
  if(!newCode) {showFormErr('editFormError','El código es obligatorio');return;}
  if(!name)    {showFormErr('editFormError','El nombre es obligatorio');return;}
  if(!seats)   {showFormErr('editFormError','Los asientos son obligatorios');return;}
  if(phone&&!/^\+34[0-9]{9}$/.test(phone)){showFormErr('editFormError','El teléfono debe ser +34 seguido de 9 dígitos');return;}
  showLoading(true);
  closeModal('editModal');
  const r=await api({action:'adminUpdateGuest',user:adminUser,pass:adminPass,code:editingCode,newCode,name,maxSeats:seats,phone});
  showLoading(false);
  if(r.ok){await loadData();}
  else    {showFormErr('editFormError',r.error||'No se pudo actualizar');document.getElementById('editModal').classList.add('show');}
}

// ── DELETE ──
async function delGuest(code,name){
  if(!confirm(`¿Eliminar a "${name}"?

Su código dejará de funcionar.`))return;
  showLoading(true);
  const r=await api({action:'adminDeleteGuest',user:adminUser,pass:adminPass,code});
  showLoading(false);
  if(r.ok){await loadData();}
  else    {showToast('Error: '+(r.error||'No se pudo eliminar'));}
}

// ── WHATSAPP ──
function sendWA(phone,code,name){
  const clean=phone.replace(/\s/g,'').replace('+','');
  const link=`${BASE_URL}?codigo=${code}`;
  const msg=`Hola ${name}! 🌸\n\nTe enviamos tu invitación personal a la boda de Ana y Jorge:\n\n👉 ${link}\n\nCon mucho cariño,\nAna & Jorge 💛`;
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`,'_blank');
}

// ── NAV ──
function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  document.getElementById('nav-'+id).classList.add('active');
  if(window.innerWidth<=768)document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');}
function closeModal(id){document.getElementById(id).classList.remove('show');}

// ── API ──
async function api(params){
  const r=await fetch(SCRIPT_URL+'?'+new URLSearchParams(params).toString());
  return r.json();
}

// ── HELPERS ──
function showLoading(v){document.getElementById('loadingOverlay').classList.toggle('show',v);}
function showToast(msg){
  const t=document.createElement('div')
  t.className='toast';t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

// Auto-refresh 60s
setInterval(()=>{if(adminUser)loadData();},60000);
