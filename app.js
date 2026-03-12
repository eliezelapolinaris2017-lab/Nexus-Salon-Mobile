window.addEventListener('error', function(){ var s=document.getElementById('splashScreen'); var a=document.getElementById('app'); if(s) s.classList.add('hidden'); if(a) a.classList.remove('hidden'); });
import {
  db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, firebaseReady
} from './firebase-config.js';

const $ = (id) => document.getElementById(id);

const els = {
  splashScreen:$('splashScreen'),
  app:$('app'),
  pinScreen:$('pinScreen'),
  mainShell:$('mainShell'),
  pinInput:$('pinInput'),
  pinBtn:$('pinBtn'),
  appointmentForm:$('appointmentForm'),
  appointmentId:$('appointmentId'),
  clientName:$('clientName'),
  clientPhone:$('clientPhone'),
  service:$('service'),
  price:$('price'),
  date:$('date'),
  time:$('time'),
  barber:$('barber'),
  status:$('status'),
  notes:$('notes'),
  formTitle:$('formTitle'),
  saveBtn:$('saveBtn'),
  resetBtn:$('resetBtn'),
  filterDate:$('filterDate'),
  todayCount:$('todayCount'),
  todayRevenue:$('todayRevenue'),
  completedCount:$('completedCount'),
  completedRevenue:$('completedRevenue'),
  pendingCount:$('pendingCount'),
  confirmedCount:$('confirmedCount'),
  noshowCount:$('noshowCount'),
  timeline:$('timeline'),
  clientsList:$('clientsList'),
  servicesList:$('servicesList'),
  serviceForm:$('serviceForm'),
  serviceId:$('serviceId'),
  serviceName:$('serviceName'),
  servicePrice:$('servicePrice'),
  serviceTime:$('serviceTime'),
  resetServiceBtn:$('resetServiceBtn'),
  settingsForm:$('settingsForm'),
  businessName:$('businessName'),
  businessPin:$('businessPin'),
  splashBusinessName:$('splashBusinessName'),
  loginBusinessName:$('loginBusinessName'),
  headerBusinessName:$('headerBusinessName'),
  quickAddBtn:$('quickAddBtn'),
  toast:$('toast')
};

const defaultSettings = { businessName:'Nexus Salón', pin:'2026' };
const defaultServices = [
  { id:'srv1', name:'Corte clásico', price:20, time:'30 min' },
  { id:'srv2', name:'Fade premium', price:30, time:'40 min' },
  { id:'srv3', name:'Barba', price:18, time:'20 min' },
  { id:'srv4', name:'Corte + Barba', price:40, time:'50 min' },
  { id:'srv5', name:'Lavado + estilo', price:22, time:'20 min' }
];
const today = new Date().toISOString().slice(0,10);

let appointments = [];
let services = [];
let settings = loadSettings();

els.date.value = today;
els.filterDate.value = today;

function loadSettings(){
  const saved = localStorage.getItem('nexusSalonSettings');
  return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
}
function saveSettingsLocal(){
  localStorage.setItem('nexusSalonSettings', JSON.stringify(settings));
}
function loadServicesLocal(){
  const saved = localStorage.getItem('nexusSalonServices');
  return saved ? JSON.parse(saved) : [...defaultServices];
}
function saveServicesLocal(){
  localStorage.setItem('nexusSalonServices', JSON.stringify(services));
}
function money(value){
  return new Intl.NumberFormat('es-PR',{style:'currency',currency:'USD'}).format(value || 0);
}
function escapeHtml(str=''){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
function toast(message){
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(()=>els.toast.classList.add('hidden'), 2600);
}
function statusClass(status=''){
  return `status-${status.toLowerCase().replace(/\s+/g,'-')}`;
}
function applyBranding(){
  els.splashBusinessName.textContent = settings.businessName;
  els.loginBusinessName.textContent = settings.businessName;
  els.headerBusinessName.textContent = settings.businessName;
  els.businessName.value = settings.businessName;
  els.businessPin.value = settings.pin;
}
function activateView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelector(`#view-${view}`)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.view===view));
}
function sortAppointments(items){
  return [...items].sort((a,b)=>`${a.date||''} ${a.time||''}`.localeCompare(`${b.date||''} ${b.time||''}`));
}
function renderServiceOptions(){
  const options = ['<option value="">Selecciona</option>'].concat(
    services.map(s=>`<option value="${escapeHtml(s.name)}" data-price="${s.price}">${escapeHtml(s.name)}</option>`)
  );
  els.service.innerHTML = options.join('');
}
function renderServices(){
  els.servicesList.innerHTML = services.map(service=>`
    <article class="list-card">
      <div class="list-top">
        <div>
          <div class="list-title">${escapeHtml(service.name)}</div>
          <div class="list-meta">${money(service.price)} · ${escapeHtml(service.time)}</div>
        </div>
      </div>
      <div class="list-actions">
        <button class="action-btn service-edit" data-id="${service.id}">Editar</button>
        <button class="danger-btn service-delete" data-id="${service.id}">Borrar</button>
      </div>
    </article>
  `).join('') || '<div class="list-meta">Sin servicios.</div>';

  document.querySelectorAll('.service-edit').forEach(btn=>{
    btn.addEventListener('click', ()=>editService(btn.dataset.id));
  });
  document.querySelectorAll('.service-delete').forEach(btn=>{
    btn.addEventListener('click', ()=>deleteServiceLocal(btn.dataset.id));
  });
}
function renderClients(items){
  const map = new Map();
  items.forEach(item=>{
    const key = `${item.clientName}__${item.clientPhone}`;
    if(!map.has(key)) map.set(key, { name:item.clientName, phone:item.clientPhone, visits:0, spent:0 });
    const row = map.get(key);
    row.visits += 1;
    if(!['Cancelada','No-show'].includes(item.status)) row.spent += Number(item.price || 0);
  });

  const clients = [...map.values()].sort((a,b)=>b.spent-a.spent);
  els.clientsList.innerHTML = clients.map(client=>`
    <article class="list-card">
      <div class="list-title">${escapeHtml(client.name || 'Cliente')}</div>
      <div class="list-meta">${escapeHtml(client.phone || 'Sin teléfono')}</div>
      <div class="list-meta">${client.visits} visitas · ${money(client.spent)}</div>
    </article>
  `).join('') || '<div class="list-meta">Sin clientes.</div>';
}
function renderTimeline(items){
  if(!items.length){
    els.timeline.innerHTML = '<div class="list-meta">Sin citas para esta fecha.</div>';
    return;
  }

  els.timeline.innerHTML = items.map(item=>`
    <article class="timeline-item">
      <div class="timeline-top">
        <div>
          <div class="timeline-title">${escapeHtml(item.time || '--:--')} · ${escapeHtml(item.service || 'Servicio')}</div>
          <div class="timeline-meta">${escapeHtml(item.clientName || 'Cliente')} · ${escapeHtml(item.barber || 'Sin asignar')}</div>
        </div>
        <span class="status-chip ${statusClass(item.status)}">${escapeHtml(item.status || 'Pendiente')}</span>
      </div>
      <div class="timeline-meta">${escapeHtml(item.clientPhone || 'Sin teléfono')} · ${money(item.price || 0)}${item.notes ? `<br>${escapeHtml(item.notes)}` : ''}</div>
      <div class="timeline-actions">
        <button class="action-btn appt-edit" data-id="${item.id}">Editar</button>
        <button class="danger-btn appt-delete" data-id="${item.id}">Borrar</button>
        <button class="action-btn appt-status" data-id="${item.id}" data-status="Completada">Completar</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.appt-edit').forEach(btn=>btn.addEventListener('click', ()=>editAppointment(btn.dataset.id)));
  document.querySelectorAll('.appt-delete').forEach(btn=>btn.addEventListener('click', ()=>deleteAppointment(btn.dataset.id)));
  document.querySelectorAll('.appt-status').forEach(btn=>btn.addEventListener('click', ()=>updateAppointmentStatus(btn.dataset.id, btn.dataset.status)));
}
function renderDashboard(){
  const selectedDate = els.filterDate.value || today;
  const ordered = sortAppointments(appointments);
  const dayItems = ordered.filter(a=>a.date===selectedDate);

  const completed = dayItems.filter(a=>a.status==='Completada');
  const pending = dayItems.filter(a=>a.status==='Pendiente');
  const confirmed = dayItems.filter(a=>a.status==='Confirmada');
  const noShow = dayItems.filter(a=>a.status==='No-show');
  const totalRevenue = dayItems.filter(a=>!['Cancelada','No-show'].includes(a.status)).reduce((sum,a)=>sum+Number(a.price || 0),0);
  const completedRevenue = completed.reduce((sum,a)=>sum+Number(a.price || 0),0);

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
function resetAppointmentForm(){
  els.appointmentForm.reset();
  els.appointmentId.value = '';
  els.formTitle.textContent = 'Nueva cita';
  els.saveBtn.textContent = 'Guardar cita';
  els.date.value = today;
}
function resetServiceForm(){
  els.serviceForm.reset();
  els.serviceId.value = '';
}
function editAppointment(id){
  const item = appointments.find(a=>a.id===id);
  if(!item) return;
  els.appointmentId.value = item.id;
  els.clientName.value = item.clientName || '';
  els.clientPhone.value = item.clientPhone || '';
  els.service.value = item.service || '';
  els.price.value = item.price || '';
  els.date.value = item.date || today;
  els.time.value = item.time || '';
  els.barber.value = item.barber || '';
  els.status.value = item.status || 'Pendiente';
  els.notes.value = item.notes || '';
  els.formTitle.textContent = 'Editar cita';
  els.saveBtn.textContent = 'Actualizar cita';
  activateView('agenda');
}
function editService(id){
  const item = services.find(s=>s.id===id);
  if(!item) return;
  els.serviceId.value = item.id;
  els.serviceName.value = item.name;
  els.servicePrice.value = item.price;
  els.serviceTime.value = item.time;
  activateView('servicios');
}
async function updateAppointmentStatus(id, status){
  try{
    await updateDoc(doc(db,'appointments',id), { status });
    toast(`Estado actualizado a ${status}`);
  }catch(err){
    toast(`Error Firebase: ${err.message}`);
  }
}
async function deleteAppointment(id){
  try{
    await deleteDoc(doc(db,'appointments',id));
    toast('Cita borrada');
  }catch(err){
    toast(`Error Firebase: ${err.message}`);
  }
}
function deleteServiceLocal(id){
  services = services.filter(s=>s.id!==id);
  saveServicesLocal();
  renderServiceOptions();
  renderServices();
  toast('Servicio borrado');
}
applyBranding();
services = loadServicesLocal();
renderServiceOptions();
renderServices();

els.service.addEventListener('change', ()=>{
  const option = els.service.options[els.service.selectedIndex];
  if(option?.dataset?.price && !els.appointmentId.value) els.price.value = option.dataset.price;
});
els.filterDate.addEventListener('change', renderDashboard);
els.quickAddBtn.addEventListener('click', ()=>activateView('agenda'));
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click', ()=>activateView(btn.dataset.view)));
els.pinBtn.addEventListener('click', ()=>{
  if(els.pinInput.value.trim()!==settings.pin){
    toast('PIN incorrecto');
    return;
  }
  sessionStorage.setItem('nexusSalonPin','ok');
  els.pinScreen.classList.add('hidden');
  els.mainShell.classList.remove('hidden');
});
if(sessionStorage.getItem('nexusSalonPin')==='ok'){
  els.pinScreen.classList.add('hidden');
  els.mainShell.classList.remove('hidden');
}
els.resetBtn.addEventListener('click', resetAppointmentForm);
els.resetServiceBtn.addEventListener('click', resetServiceForm);

els.settingsForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  settings.businessName = els.businessName.value.trim() || defaultSettings.businessName;
  settings.pin = els.businessPin.value.trim() || defaultSettings.pin;
  saveSettingsLocal();
  applyBranding();
  toast('Configuración guardada');
});

els.serviceForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const payload = {
    id: els.serviceId.value || `srv_${Date.now()}`,
    name: els.serviceName.value.trim(),
    price: Number(els.servicePrice.value || 0),
    time: els.serviceTime.value.trim()
  };
  if(!payload.name || !payload.time){
    toast('Completa el servicio');
    return;
  }
  const idx = services.findIndex(s=>s.id===payload.id);
  if(idx >= 0) services[idx] = payload;
  else services.unshift(payload);
  saveServicesLocal();
  renderServiceOptions();
  renderServices();
  resetServiceForm();
  toast('Servicio guardado');
});

els.appointmentForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = {
    clientName: els.clientName.value.trim(),
    clientPhone: els.clientPhone.value.trim(),
    service: els.service.value,
    price: Number(els.price.value || 0),
    date: els.date.value,
    time: els.time.value,
    barber: els.barber.value.trim(),
    status: els.status.value,
    notes: els.notes.value.trim()
  };
  if(!payload.clientName || !payload.service || !payload.date || !payload.time){
    toast('Faltan campos');
    return;
  }

  try{
    if(els.appointmentId.value){
      await updateDoc(doc(db,'appointments',els.appointmentId.value), payload);
      toast('Cita actualizada');
    } else {
      await addDoc(collection(db,'appointments'), { ...payload, createdAt: serverTimestamp() });
      toast('Cita guardada');
    }
    resetAppointmentForm();
    activateView('home');
  }catch(err){
    toast(`Error Firebase: ${err.message}`);
  }
});

if(firebaseReady && db){
  onSnapshot(collection(db,'appointments'), (snapshot)=>{
    appointments = snapshot.docs.map(d=>({ id:d.id, ...d.data() }));
    renderDashboard();
  }, (error)=>{
    toast(`Firebase error: ${error.message}`);
  });
}

setTimeout(()=>{
  els.splashScreen.classList.add('hidden');
  els.app.classList.remove('hidden');
}, 1100);

try {
  const splash = document.getElementById('splashScreen');
  const appRoot = document.getElementById('app');
  if (splash && appRoot) {
    setTimeout(() => {
      splash.classList.add('hidden');
      appRoot.classList.remove('hidden');
    }, 1200);
  }
} catch (e) {}
