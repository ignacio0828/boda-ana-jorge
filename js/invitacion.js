const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMMw48PHFg3--Eo4jbEbz1sSkoZP4I_zUk18bFyKk8_OpuKgsqw2-Rsiu8kpaoSm0H/exec';
const WEDDING = {
  title:    'Boda de Ana & Jorge 🌸',
  start:    '20260912T120000Z',
  end:      '20260912T220000Z',
  location: 'Hugo Caro Espacio, C/ Santa María de la Colina 11, Villanueva del Pardillo, Madrid',
  detail:   '¡Nos casamos! Únete a la celebración de Ana y Jorge.'
};

let currentGuest   = null;
let selectedSeats  = 0;
let selectedAttend = null;
let updateSeats    = 0;

// Detectar código de URL en segundo plano (sin redirigir)
const _autoCode = new URLSearchParams(window.location.search).get('codigo');

document.getElementById('codeInput').addEventListener('keydown', e => { if(e.key==='Enter') checkCode(); });

async function checkCode(){
  const code = document.getElementById('codeInput').value.trim().toUpperCase();
  if(!code) return;
  document.getElementById('codeGate').classList.add('hidden');
  document.getElementById('codeLoading').style.display = 'block';
  try {
    const res  = await fetch(SCRIPT_URL + '?codigo=' + encodeURIComponent(code));
    const data = await res.json();
    document.getElementById('codeLoading').style.display = 'none';
    if(!data.ok){ document.getElementById('codeGate').classList.remove('hidden'); showCodeError(); return; }
    currentGuest = { name: data.name, maxSeats: data.maxSeats, code };
    // ¿Ya registrado?
    if(data.alreadyConfirmed){
      showAlreadyRegistered(data);
    } else {
      showForm(currentGuest);
    }
  } catch(e){
    document.getElementById('codeLoading').style.display = 'none';
    document.getElementById('codeGate').classList.remove('hidden');
    showCodeError('Error de conexión. Inténtalo de nuevo.');
  }
}

function showCodeError(msg){
  const err = document.getElementById('codeError');
  err.textContent = msg || '❌ Código no encontrado. Revisa el mensaje.';
  err.classList.add('show');
  setTimeout(()=>err.classList.remove('show'), 3500);
}

// ── YA REGISTRADO ──
function showAlreadyRegistered(data){
  const card = document.getElementById('alreadyCard');
  card.classList.add('show');
  document.getElementById('alreadyName').textContent = data.name;
  const isConfirmed = data.alreadyConfirmed === 'Confirmado';
  document.getElementById('alreadyStatus').textContent = isConfirmed
    ? '✅ Ya tienes tu lugar reservado'
    : '❌ Indicaste que no podías asistir';
  document.getElementById('alreadyInfo').textContent = isConfirmed
    ? `Tienes ${data.existingSeats} ${data.existingSeats==1?'persona':'personas'} confirmadas${data.existingAllergy && data.existingAllergy!=='—' ? ' · ' + data.existingAllergy : ''}.`
    : 'Si has cambiado de opinión, puedes actualizar tu respuesta.';
  // Build update seats selector
  const sel = document.getElementById('updateSeatsSelector');
  sel.innerHTML = '';
  for(let i=1; i<=currentGuest.maxSeats; i++){
    const btn = document.createElement('button');
    btn.className = 'seat-btn' + (i == data.existingSeats ? ' selected' : '');
    btn.innerHTML = `<span>${i}</span><span class="seat-lbl">${i===1?'persona':'personas'}</span>`;
    btn.onclick = ()=>{ updateSeats=i; document.querySelectorAll('#updateSeatsSelector .seat-btn').forEach((b,j)=>b.classList.toggle('selected',j+1===i)); };
    sel.appendChild(btn);
  }
  updateSeats = data.existingSeats || 1;
}

function showUpdateSeats(){
  document.getElementById('updateSeatsWrap').classList.toggle('show');
}

async function submitUpdate(){
  const btn = document.getElementById('updateBtnText');
  btn.textContent = 'Guardando...';
  try {
    const params = new URLSearchParams({ action:'confirm', code: currentGuest.code, name: currentGuest.name, seats: updateSeats, allergy:'—', attending:'yes' });
    await fetch(SCRIPT_URL + '?' + params.toString());
  } catch(e){}
  document.getElementById('alreadyCard').style.display='none';
  showConfirmedState(true, `Has actualizado tu reserva a ${updateSeats} ${updateSeats==1?'persona':'personas'}. ¡Te esperamos! 🥂`);
}

async function submitCancel(){
  if(!confirm('¿Seguro que quieres eliminarte de la lista?')) return;
  try {
    const params = new URLSearchParams({ action:'cancel', code: currentGuest.code, name: currentGuest.name });
    await fetch(SCRIPT_URL + '?' + params.toString());
  } catch(e){}
  document.getElementById('alreadyCard').style.display='none';
  showConfirmedState(false, 'Lo entendemos. Os deseamos toda la felicidad y os tendremos siempre en el corazón 🌸');
}

// ── FORMULARIO NUEVO ──
function showForm(guest){
  document.getElementById('rsvpForm').classList.add('show');
  document.getElementById('welcomeName').textContent  = guest.name;
  document.getElementById('welcomeSeats').textContent = guest.maxSeats===1 ? 'Invitación individual' : `Invitación para hasta ${guest.maxSeats} personas`;
  const sel = document.getElementById('seatsSelector');
  sel.innerHTML = '';
  for(let i=1; i<=guest.maxSeats; i++){
    const btn = document.createElement('button');
    btn.className = 'seat-btn';
    btn.innerHTML = `<span>${i}</span><span class="seat-lbl">${i===1?'persona':'personas'}</span>`;
    btn.onclick = ()=>selectSeats(i);
    sel.appendChild(btn);
  }
}

function selectAttend(val){
  selectedAttend = val;
  document.getElementById('optYes').className = 'attend-opt'+(val==='yes'?' sel-yes':'');
  document.getElementById('optNo').className  = 'attend-opt'+(val==='no' ?' sel-no' :'');
  document.getElementById('seatsCard').style.display   = val==='yes'?'':'none';
  document.getElementById('allergyCard').style.display = val==='yes'?'':'none';
  if(val==='no') selectedSeats=0;
  document.getElementById('sendBtnText').textContent = val==='no'?'Enviar respuesta':'Confirmar asistencia';
  updateSendBtn();
}

function selectSeats(n){
  selectedSeats=n;
  document.querySelectorAll('#seatsSelector .seat-btn').forEach((b,i)=>b.classList.toggle('selected',i+1===n));
  updateSendBtn();
}

function updateSendBtn(){
  document.getElementById('sendBtn').disabled = !(selectedAttend==='no'||(selectedAttend==='yes'&&selectedSeats>0));
}

async function sendRSVP(){
  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  document.getElementById('sendBtnIcon').textContent='';
  document.getElementById('sendBtnText').innerHTML='<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite"></span> Enviando...';
  try {
    const params = new URLSearchParams({
      action: 'confirm', code: currentGuest.code, name: currentGuest.name,
      seats: selectedAttend==='yes' ? selectedSeats : 0,
      allergy: document.getElementById('allergyInput').value.trim() || '—',
      attending: selectedAttend
    });
    await fetch(SCRIPT_URL + '?' + params.toString());
  } catch(e){ console.log('Error:', e); }
  document.getElementById('rsvpForm').style.display='none';
  const msg = selectedAttend==='yes'
    ? 'Tu lugar en nuestra mesa está guardado con mucho cariño. ¡No podemos esperar para celebrarlo juntos! 🥂'
    : 'Lo entendemos. Os deseamos toda la felicidad y os tendremos siempre en el corazón 🌸';
  showConfirmedState(selectedAttend==='yes', msg);
}

function showConfirmedState(attending, msg){
  const conf = document.getElementById('rsvpConfirmed');
  conf.className = 'rsvp-confirmed show ' + (attending ? 'attend-yes' : 'attend-no');
  document.getElementById('confirmedIcon').textContent  = attending ? '🌸' : '💐';
  document.getElementById('confirmedTitle').textContent = attending ? '¡Nos vemos el 12 de septiembre!' : 'Gracias por avisarnos';
  document.getElementById('confirmedText').textContent  = msg;
  document.getElementById('calSection').style.display   = attending ? 'block' : 'none';
  if(attending){ buildCalendarLinks(); launchPetals(); }
  window.scrollTo({top:0,behavior:'smooth'});
}

function buildCalendarLinks(){
  const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(WEDDING.title)}&dates=${WEDDING.start}/${WEDDING.end}&details=${encodeURIComponent(WEDDING.detail)}&location=${encodeURIComponent(WEDDING.location)}&sf=true&output=xml`;
  document.getElementById('calGoogle').href = gUrl;
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ana&Jorge//Boda//ES','BEGIN:VEVENT',
    `DTSTART:${WEDDING.start}`,`DTEND:${WEDDING.end}`,`SUMMARY:${WEDDING.title}`,
    `DESCRIPTION:${WEDDING.detail}`,`LOCATION:${WEDDING.location}`,'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].join('\r\n');
  document.getElementById('calApple').href = URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));
}

function launchPetals(){
  const p=['🌸','🌺','🌷','✨','🥂','💐'];
  for(let i=0;i<26;i++) setTimeout(()=>{
    const el=document.createElement('span');
    el.className='petal';
    el.textContent=p[Math.floor(Math.random()*p.length)];
    el.style.cssText=`left:${Math.random()*100}vw;top:-30px;font-size:${14+Math.random()*14}px;animation-duration:${2+Math.random()*2}s`;
    document.body.appendChild(el);setTimeout(()=>el.remove(),4000);
  },i*100);
}

function showPage(id,dot){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-dot').forEach((d,i)=>d.classList.toggle('active',i===dot));
  window.scrollTo({top:0,behavior:'smooth'});
}

// Si viene con ?codigo= → pre-rellenar el campo cuando llegue a RSVP
if(_autoCode){
  document.getElementById('codeInput').value = _autoCode;
}

function tick(){
  const diff=new Date('2026-09-12T14:00:00+02:00')-new Date();
  if(diff<=0){['cd-days','cd-hours','cd-mins','cd-secs'].forEach((id,i)=>document.getElementById(id).textContent=['🥂','¡YA','ES','HOY!'][i]);return;}
  document.getElementById('cd-days').textContent  =String(Math.floor(diff/86400000)).padStart(2,'0');
  document.getElementById('cd-hours').textContent =String(Math.floor(diff%86400000/3600000)).padStart(2,'0');
  document.getElementById('cd-mins').textContent  =String(Math.floor(diff%3600000/60000)).padStart(2,'0');
  document.getElementById('cd-secs').textContent  =String(Math.floor(diff%60000/1000)).padStart(2,'0');
}
tick(); setInterval(tick,1000);

// MÚSICA — HTML5 Audio con fallback
const MUSIC_SOURCES = [
  'https://ia800605.us.archive.org/7/items/ChristinaPerriAThousandYears/Christina%20Perri%20-%20A%20Thousand%20Years.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
];
let audio = null;
let playing = false;
let srcIndex = 0;

function initAudio(){
  if(audio) return;
  audio = new Audio();
  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = 'none';
  audio.src = MUSIC_SOURCES[srcIndex];
  audio.onerror = () => {
    srcIndex = (srcIndex + 1) % MUSIC_SOURCES.length;
    audio.src = MUSIC_SOURCES[srcIndex];
    if(playing) audio.play().catch(()=>{});
  };
  audio.onplay  = () => { playing = true;  document.getElementById('musicBtn').textContent = '⏸'; };
  audio.onpause = () => { playing = false; document.getElementById('musicBtn').textContent = '▶'; };
}

function toggleMusic(){
  initAudio();
  if(playing){
    audio.pause();
  } else {
    audio.play().catch(e => {
      console.log('Autoplay bloqueado, esperando interacción del usuario');
    });
  }
}

// En móvil, activar con primer toque
document.addEventListener('touchstart', function f(){
  initAudio();
  audio.play().catch(()=>{});
  document.removeEventListener('touchstart', f);
}, {once: true, passive: true});

// En escritorio, activar con primer click en cualquier lugar
document.addEventListener('click', function f(){
  initAudio();
  if(!playing) audio.play().catch(()=>{});
  document.removeEventListener('click', f);
}, {once: true});

// ── COPIAR TELÉFONO AL PORTAPAPELES ──
function copyPhone(number, btn) {
  navigator.clipboard.writeText(number).then(() => {
    showCopyFeedback('📋 ' + number + ' copiado');
  }).catch(() => {
    // Fallback para móviles sin clipboard API
    const el = document.createElement('textarea');
    el.value = number;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showCopyFeedback('📋 ' + number + ' copiado');
  });
}

function showCopyFeedback(msg) {
  // Remove existing feedback
  const existing = document.querySelector('.copy-feedback');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = 'copy-feedback';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 2000);
}
