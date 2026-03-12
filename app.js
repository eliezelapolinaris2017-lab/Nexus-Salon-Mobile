import {
  auth, db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp,
  firebaseReady, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setDoc, getDoc
} from './firebase-config.js';

const $ = (id) => document.getElementById(id);
const els = {
  authScreen:$('authScreen'), mainShell:$('mainShell'),
  loginForm:$('loginForm'), loginEmail:$('loginEmail'), loginPassword:$('loginPassword'), registerBtn:$('registerBtn'),
  pinScreen:$('pinScreen'), pinInput:$('pinInput'), pinBtn:$('pinBtn'), backToLoginBtn:$('backToLoginBtn'),
  authSyncBadge:$('authSyncBadge'), syncBadge:$('syncBadge'),
  logoutBtn:$('logoutBtn'), authBusinessName:$('authBusinessName'), headerBusinessName:$('headerBusinessName'),
  headerUserEmail:$('headerUserEmail'),
  appointmentForm:$('appointmentForm'), appointmentId:$('appointmentId'),
  clientName:$('clientName'), clientPhone:$('clientPhone'), service:$('service'), price:$('price'),
  date:$('date'), time:$('time'), barber:$('barber'), status:$('status'), notes:$('notes'),
  formTitle:$('formTitle'), saveBtn:$('saveBtn'), resetBtn:$('resetBtn'),
  filterDate:$('filterDate'), todayCount:$('todayCount'), todayRevenue:$('todayRevenue'),
  completedCount:$('completedCount'), completedRevenue:$('completedRevenue'),
  pendingCount:$('pendingCount'), confirmedCount:$('confirmedCount'), noshowCount:$('noshowCount'),
  timeline:$('timeline'), clientsList:$('clientsList'),
  servicesList:$('servicesList'), serviceForm:$('serviceForm'), serviceId:$('serviceId'),
  serviceName:$('serviceName'), servicePrice:$('servicePrice'), serviceTime:$('serviceTime'),
  resetServiceBtn:$('resetServiceBtn'),
  settingsForm:$('settingsForm'), businessName:$('businessName'), businessPin:$('businessPin'),
  quickAddBtn:$('quickAddBtn'), toast:$('toast')
};

let currentUser = null;
let appointments = [];
let services = [];
let settings = { businessName:'Nexus Salón', pin:'2026' };
let unsubAppointments = null;
const today = new Date().toISOString().slice(0,10);
els.date.value = today;
els.filterDate.value = today;

const fallbackServices = [
  { id:'srv1', name:'Corte clásico', price:20, time:'30 min' },
  { id:'srv2', name:'Fade premium', price:30, time:'40 min' },
  { id:'srv3', name:'Barba', price:18, time:'20 min' },
  { id:'srv4', name:'Corte + Barba', price:40, time:'50 min' }
];

function toast(msg){ els.toast.textContent = msg; els.toast.classList.remove('hidden'); clearTimeout(toast.t); toast.t=setTimeout(()=>els.toast.classList.add('hidden'),2600); }
function money(v){ return new Intl.NumberFormat('es-PR',{style:'currency',currency:'USD'}).format(v||0); }
function escapeHtml(str=''){ return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function statusClass(status=''){ return `status-${status.toLowerCase().replace(/\s+/g,'-')}`; }
function sortAppointments(items){ return [...items].sort((a,b)=>`${a.date||''} ${a.time||''}`.localeCompare(`${b.date||''} ${b.time||''}`)); }
function activateView(view){ document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.querySelector(`#view-${view}`)?.classList.add('active'); document.querySelectorAll('.nav-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.view===view)); }
function setSyncState(mode, text){
  const cls = mode === 'ok' ? 'sync-ok' : mode === 'error' ? 'sync-error' : 'sync-loading';
  [els.syncBadge, els.authSyncBadge].forEach(el=>{ el.className = `sync-badge ${cls}`; el.textContent = text; });
}
function applyBranding(){
  els.authBusinessName.textContent = settings.businessName;
  els.headerBusinessName.textContent = settings.businessName;
  els.businessName.value = settings.businessName;
  els.businessPin.value = settings.pin;
}
function renderServiceOptions(){
  els.service.innerHTML = ['<option value="">Selecciona</option>'].concat(
    services.map(s=>`<option value="${escapeHtml(s.name)}" data-price="${s.price}">${escapeHtml(s.name)}</option>`)
  ).join('');
}
function renderServices(){
  els.servicesList.innerHTML = services.map(service=>`
    <article class="list-card">
      <div class="list-title">${escapeHtml(service.name)}</div>
      <div class="list-meta">${money(service.price)} · ${escapeHtml(service.time)}</div>
      <div class="list-actions">
        <button class="btn btn-secondary service-edit" data-id="${service.id}">Editar</button>
        <button class="btn btn-danger service-delete" data-id="${service.id}">Borrar</button>
      </div>
    </article>`).join('') || '<div class="list-meta">Sin servicios.</div>';
  document.querySelectorAll('.service-edit').forEach(btn=>btn.addEventListener('click',()=>editService(btn.dataset.id)));
  document.querySelectorAll('.service-delete').forEach(btn=>btn.addEventListener('click',()=>deleteService(btn.dataset.id)));
}
function renderClients(items){
  const map = new Map();
  items.forEach(item=>{
    const key = `${item.clientName}__${item.clientPhone}`;
    if(!map.has(key)) map.set(key, { name:item.clientName, phone:item.clientPhone, visits:0, spent:0 });
    const row = map.get(key); row.visits += 1;
    if(!['Cancelada','No-show'].includes(item.status)) row.spent += Number(item.price||0);
  });
  const clients = [...map.values()].sort((a,b)=>b.spent-a.spent);
  els.clientsList.innerHTML = clients.map(c=>`<article class="list-card"><div class="list-title">${escapeHtml(c.name||'Cliente')}</div><div class="list-meta">${escapeHtml(c.phone||'Sin teléfono')}</div><div class="list-meta">${c.visits} visitas · ${money(c.spent)}</div></article>`).join('') || '<div class="list-meta">Sin clientes.</div>';
}
function renderTimeline(items){
  if(!items.length){ els.timeline.innerHTML = '<div class="list-meta">Sin citas para esta fecha.</div>'; return; }
  els.timeline.innerHTML = items.map(item=>`
    <article class="timeline-item">
      <div class="timeline-top">
        <div>
          <div class="timeline-title">${escapeHtml(item.time||'--:--')} · ${escapeHtml(item.service||'Servicio')}</div>
          <div class="timeline-meta">${escapeHtml(item.clientName||'Cliente')} · ${escapeHtml(item.barber||'Sin asignar')}</div>
        </div>
        <span class="status-chip ${statusClass(item.status)}">${escapeHtml(item.status||'Pendiente')}</span>
      </div>
      <div class="timeline-meta">${escapeHtml(item.clientPhone||'Sin teléfono')} · ${money(item.price||0)}${item.notes?`<br>${escapeHtml(item.notes)}`:''}</div>
      <div class="timeline-actions">
        <button class="btn btn-secondary appt-edit" data-id="${item.id}">Editar</button>
        <button class="btn btn-danger appt-delete" data-id="${item.id}">Borrar</button>
        <button class="btn btn-secondary appt-status" data-id="${item.id}" data-status="Completada">Completar</button>
      </div>
    </article>`).join('');
  document.querySelectorAll('.appt-edit').forEach(btn=>btn.addEventListener('click',()=>editAppointment(btn.dataset.id)));
  document.querySelectorAll('.appt-delete').forEach(btn=>btn.addEventListener('click',()=>deleteAppointment(btn.dataset.id)));
  document.querySelectorAll('.appt-status').forEach(btn=>btn.addEventListener('click',()=>updateAppointmentStatus(btn.dataset.id, btn.dataset.status)));
}
function renderDashboard(){
  const selectedDate = els.filterDate.value || today;
  const ordered = sortAppointments(appointments);
  const dayItems = ordered.filter(a=>a.date===selectedDate);
  const completed = dayItems.filter(a=>a.status==='Completada');
  const pending = dayItems.filter(a=>a.status==='Pendiente');
  const confirmed = dayItems.filter(a=>a.status==='Confirmada');
  const noShow = dayItems.filter(a=>a.status==='No-show');
  const totalRevenue = dayItems.filter(a=>!['Cancelada','No-show'].includes(a.status)).reduce((sum,a)=>sum+Number(a.price||0),0);
  const completedRevenue = completed.reduce((sum,a)=>sum+Number(a.price||0),0);
  els.todayCount.textContent = String(dayItems.length);
  els.todayRevenue.textContent = money(totalRevenue);
  els.completedCount.textContent = String(completed.length);
  els.completedRevenue.textContent = money(completedRevenue);
  els.pendingCount.textContent = String(pending.length);
  els.confirmedCount.textContent = String(confirmed.length);
  els.noshowCount.textContent = String(noShow.length);
  renderTimeline(dayItems);
  renderClients(ordered);
  renderServices();
}
function resetAppointmentForm(){ els.appointmentForm.reset(); els.appointmentId.value=''; els.formTitle.textContent='Nueva cita'; els.saveBtn.textContent='Guardar cita'; els.date.value=today; }
function resetServiceForm(){ els.serviceForm.reset(); els.serviceId.value=''; }
function editAppointment(id){
  const item = appointments.find(a=>a.id===id); if(!item) return;
  els.appointmentId.value=item.id; els.clientName.value=item.clientName||''; els.clientPhone.value=item.clientPhone||'';
  els.service.value=item.service||''; els.price.value=item.price||''; els.date.value=item.date||today; els.time.value=item.time||'';
  els.barber.value=item.barber||''; els.status.value=item.status||'Pendiente'; els.notes.value=item.notes||'';
  els.formTitle.textContent='Editar cita'; els.saveBtn.textContent='Actualizar cita'; activateView('agenda');
}
function editService(id){
  const item = services.find(s=>s.id===id); if(!item) return;
  els.serviceId.value=item.id; els.serviceName.value=item.name; els.servicePrice.value=item.price; els.serviceTime.value=item.time;
  activateView('servicios');
}
async function updateAppointmentStatus(id,status){
  try{ await updateDoc(doc(db, `users/${currentUser.uid}/appointments`, id), { status }); toast(`Estado actualizado a ${status}`); }
  catch(err){ toast(`Error Firebase: ${err.message}`); setSyncState('error','Error sync'); }
}
async function deleteAppointment(id){
  try{ await deleteDoc(doc(db, `users/${currentUser.uid}/appointments`, id)); toast('Cita borrada'); }
  catch(err){ toast(`Error Firebase: ${err.message}`); }
}
async function deleteService(id){
  services = services.filter(s=>s.id!==id);
  await saveUserSettings();
  renderServiceOptions(); renderServices(); toast('Servicio borrado');
}
async function saveUserSettings(){
  await setDoc(doc(db, 'users', currentUser.uid), { businessName: settings.businessName, pin: settings.pin, services }, { merge:true });
}
async function loadUserSettings(){
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  if(snap.exists()){
    const data = snap.data();
    settings.businessName = data.businessName || settings.businessName;
    settings.pin = data.pin || settings.pin;
    services = Array.isArray(data.services) && data.services.length ? data.services : [...fallbackServices];
  } else {
    services = [...fallbackServices];
    await saveUserSettings();
  }
  applyBranding(); renderServiceOptions(); renderServices();
}
function showPinStep(){ els.loginForm.classList.add('hidden'); els.pinScreen.classList.remove('hidden'); }
function showLoginStep(){ els.pinScreen.classList.add('hidden'); els.loginForm.classList.remove('hidden'); }

els.registerBtn.addEventListener('click', async ()=>{
  try{ setSyncState('loading','Creando acceso'); await createUserWithEmailAndPassword(auth, els.loginEmail.value.trim(), els.loginPassword.value); toast('Usuario creado'); }
  catch(err){ toast(`Auth error: ${err.message}`); setSyncState('error','Error auth'); }
});
els.loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{ setSyncState('loading','Entrando'); await signInWithEmailAndPassword(auth, els.loginEmail.value.trim(), els.loginPassword.value); }
  catch(err){ toast(`Auth error: ${err.message}`); setSyncState('error','Error auth'); }
});
els.pinBtn.addEventListener('click', ()=>{ if(els.pinInput.value.trim() !== settings.pin){ toast('PIN incorrecto'); return; } els.authScreen.classList.add('hidden'); els.mainShell.classList.remove('hidden'); activateView('home'); });
els.backToLoginBtn.addEventListener('click', async ()=>{ try{ await signOut(auth); } catch {} });
els.logoutBtn.addEventListener('click', async ()=>{ try{ await signOut(auth); } catch {} });
els.service.addEventListener('change', ()=>{ const option = els.service.options[els.service.selectedIndex]; if(option?.dataset?.price && !els.appointmentId.value) els.price.value = option.dataset.price; });
els.filterDate.addEventListener('change', renderDashboard);
els.quickAddBtn.addEventListener('click', ()=>activateView('agenda'));
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click', ()=>activateView(btn.dataset.view)));
els.resetBtn.addEventListener('click', resetAppointmentForm);
els.resetServiceBtn.addEventListener('click', resetServiceForm);

els.settingsForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  settings.businessName = els.businessName.value.trim() || 'Nexus Salón';
  settings.pin = els.businessPin.value.trim() || '2026';
  try{ await saveUserSettings(); applyBranding(); toast('Configuración guardada'); setSyncState('ok','Sync activo'); }
  catch(err){ toast(`Error Firebase: ${err.message}`); setSyncState('error','Error sync'); }
});
els.serviceForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = { id: els.serviceId.value || `srv_${Date.now()}`, name: els.serviceName.value.trim(), price: Number(els.servicePrice.value||0), time: els.serviceTime.value.trim() };
  if(!payload.name || !payload.time){ toast('Completa el servicio'); return; }
  const idx = services.findIndex(s=>s.id===payload.id);
  if(idx >= 0) services[idx] = payload; else services.unshift(payload);
  try{ await saveUserSettings(); renderServiceOptions(); renderServices(); resetServiceForm(); toast('Servicio guardado'); setSyncState('ok','Sync activo'); }
  catch(err){ toast(`Error Firebase: ${err.message}`); setSyncState('error','Error sync'); }
});
els.appointmentForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = { clientName: els.clientName.value.trim(), clientPhone: els.clientPhone.value.trim(), service: els.service.value, price: Number(els.price.value||0), date: els.date.value, time: els.time.value, barber: els.barber.value.trim(), status: els.status.value, notes: els.notes.value.trim() };
  if(!payload.clientName || !payload.service || !payload.date || !payload.time){ toast('Faltan campos'); return; }
  try{
    if(els.appointmentId.value){ await updateDoc(doc(db, `users/${currentUser.uid}/appointments`, els.appointmentId.value), payload); toast('Cita actualizada'); }
    else { await addDoc(collection(db, `users/${currentUser.uid}/appointments`), { ...payload, createdAt: serverTimestamp() }); toast('Cita guardada'); }
    resetAppointmentForm(); activateView('home'); setSyncState('ok','Sync activo');
  }catch(err){ toast(`Error Firebase: ${err.message}`); setSyncState('error','Error sync'); }
});

onAuthStateChanged(auth, async (user)=>{
  if(!user){
    currentUser = null;
    if(unsubAppointments) { unsubAppointments(); unsubAppointments = null; }
    appointments = []; services = []; settings = { businessName:'Nexus Salón', pin:'2026' };
    showLoginStep(); els.authScreen.classList.remove('hidden'); els.mainShell.classList.add('hidden'); els.headerUserEmail.textContent = ''; setSyncState('loading','Sin sesión'); return;
  }
  currentUser = user;
  els.headerUserEmail.textContent = user.email || '';
  setSyncState('loading','Sincronizando');
  try{
    await loadUserSettings();
    showPinStep();
    unsubAppointments = onSnapshot(collection(db, `users/${user.uid}/appointments`), (snapshot)=>{
      appointments = snapshot.docs.map(d=>({ id:d.id, ...d.data() }));
      renderDashboard(); setSyncState('ok','Sync activo');
    }, (error)=>{ toast(`Firebase error: ${error.message}`); setSyncState('error','Error sync'); });
  }catch(err){ toast(`Firebase error: ${err.message}`); setSyncState('error','Error sync'); }
});
