import {
  db, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, firebaseReady
} from './firebase-config.js';

const $ = (id) => document.getElementById(id);

const els = {
  pinScreen: $('pinScreen'),
  mainShell: $('mainShell'),
  pinInput: $('pinInput'),
  pinBtn: $('pinBtn'),
  logoutBtn: $('logoutBtn'),
  appointmentForm: $('appointmentForm'),
  clientName: $('clientName'),
  clientPhone: $('clientPhone'),
  service: $('service'),
  price: $('price'),
  date: $('date'),
  time: $('time'),
  barber: $('barber'),
  status: $('status'),
  notes: $('notes'),
  filterDate: $('filterDate'),
  todayCount: $('todayCount'),
  todayRevenue: $('todayRevenue'),
  completedCount: $('completedCount'),
  completedRevenue: $('completedRevenue'),
  timeline: $('timeline'),
  clientsList: $('clientsList'),
  servicesList: $('servicesList'),
  toast: $('toast'),
  quickAddBtn: $('quickAddBtn'),
  gotoAgendaBtn: $('gotoAgendaBtn'),
  resetBtn: $('resetBtn'),
  installBtn: $('installBtn'),
  firebaseStatus: $('firebaseStatus')
};

const DEMO_PIN = '2026';
let appointments = [];
let deferredPrompt = null;

const today = new Date().toISOString().slice(0, 10);
els.date.value = today;
els.filterDate.value = today;

const seedAppointments = [
  { id:'s1', clientName:'Miguel Torres', clientPhone:'787-555-1111', service:'Corte + Barba', price:40, date:today, time:'09:00', barber:'Alex', status:'Confirmada', notes:'Cliente VIP' },
  { id:'s2', clientName:'Chris Rivera', clientPhone:'787-555-1112', service:'Fade premium', price:30, date:today, time:'10:30', barber:'Tony', status:'Pendiente', notes:'' },
  { id:'s3', clientName:'Javier Cruz', clientPhone:'787-555-1113', service:'Corte premium', price:50, date:today, time:'12:00', barber:'Eliezel', status:'Completada', notes:'Pago cash' }
];

const baseServices = [
  { name:'Corte clásico', price:20, time:'30 min' },
  { name:'Fade premium', price:30, time:'40 min' },
  { name:'Barba', price:18, time:'20 min' },
  { name:'Corte + Barba', price:40, time:'50 min' },
  { name:'Lavado + estilo', price:22, time:'20 min' },
  { name:'Corte premium', price:50, time:'60 min' }
];

function money(value){
  return new Intl.NumberFormat('es-PR', { style:'currency', currency:'USD' }).format(value || 0);
}

function escapeHtml(str=''){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'", '&#039;');
}

function toast(message){
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => els.toast.classList.add('hidden'), 2800);
}

function setFirebaseStatus(mode, title, text){
  els.firebaseStatus.className = 'status-live';
  if (mode === 'connected') els.firebaseStatus.classList.add('connected');
  if (mode === 'error') els.firebaseStatus.classList.add('error');
  els.firebaseStatus.innerHTML = `
    <div class="status-dot"></div>
    <div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function activateView(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector(`#view-${view}`)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => activateView(btn.dataset.view));
});

els.quickAddBtn.addEventListener('click', () => activateView('agenda'));
els.gotoAgendaBtn.addEventListener('click', () => activateView('agenda'));

els.pinBtn.addEventListener('click', enterApp);
els.pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') enterApp(); });
els.logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('nexusSalonPin');
  els.mainShell.classList.add('hidden');
  els.pinScreen.classList.remove('hidden');
});

function enterApp(){
  if (els.pinInput.value.trim() !== DEMO_PIN){
    toast('PIN incorrecto. Aquí no entra nadie por arte místico.');
    return;
  }
  sessionStorage.setItem('nexusSalonPin', 'ok');
  els.pinScreen.classList.add('hidden');
  els.mainShell.classList.remove('hidden');
  activateView('home');
}

if (sessionStorage.getItem('nexusSalonPin') === 'ok'){
  els.pinScreen.classList.add('hidden');
  els.mainShell.classList.remove('hidden');
}

els.service.addEventListener('change', () => {
  const option = els.service.options[els.service.selectedIndex];
  if (option?.dataset?.price && !els.price.value) els.price.value = option.dataset.price;
});

els.resetBtn.addEventListener('click', () => {
  els.appointmentForm.reset();
  els.date.value = today;
});

els.filterDate.addEventListener('change', render);

els.appointmentForm.addEventListener('submit', async (e) => {
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
    notes: els.notes.value.trim(),
    createdAt: serverTimestamp()
  };

  if (!payload.clientName || !payload.service || !payload.date || !payload.time){
    toast('Faltan campos clave. El negocio no corre con suposiciones.');
    return;
  }

  try{
    await addDoc(collection(db, 'appointments'), payload);
    toast('Cita guardada en Firestore.');
  }catch(err){
    console.error(err);
    toast('No pude guardar en Firestore. Revisa reglas o configuración.');
  }

  els.appointmentForm.reset();
  els.date.value = today;
  activateView('home');
});

function statusClass(status=''){
  return `status-${status.toLowerCase().replace(/\s+/g,'-')}`;
}

async function updateStatus(id, status){
  const index = appointments.findIndex(a => a.id === id);
  if (index >= 0) appointments[index].status = status;

  try{
    await updateDoc(doc(db, 'appointments', id), { status });
    toast(`Estado actualizado a ${status}.`);
  }catch(err){
    console.error(err);
    toast('No pude actualizar el estado.');
  }
  render();
}

function renderTimeline(items){
  if (!items.length){
    els.timeline.innerHTML = `<div class="timeline-meta">No hay citas en esta fecha. Agenda liviana, café pesado.</div>`;
    return;
  }

  els.timeline.innerHTML = items.map(item => `
    <article class="timeline-item">
      <div class="timeline-top">
        <div>
          <div class="timeline-title">${escapeHtml(item.time || '--:--')} · ${escapeHtml(item.service || 'Servicio')}</div>
          <div class="timeline-meta">${escapeHtml(item.clientName || 'Cliente')} · ${escapeHtml(item.barber || 'Sin asignar')}</div>
        </div>
        <span class="status-chip ${statusClass(item.status)}">${escapeHtml(item.status || 'Pendiente')}</span>
      </div>
      <div class="timeline-meta">
        ${escapeHtml(item.clientPhone || 'Sin teléfono')} · ${money(item.price || 0)}
        ${item.notes ? `<br>${escapeHtml(item.notes)}` : ''}
      </div>
      <div class="timeline-actions">
        <button class="secondary-btn status-btn" data-id="${item.id}" data-status="Completada">Completar</button>
        <button class="secondary-btn status-btn" data-id="${item.id}" data-status="Confirmada">Confirmar</button>
        <button class="secondary-btn status-btn" data-id="${item.id}" data-status="Cancelada">Cancelar</button>
        <button class="secondary-btn status-btn" data-id="${item.id}" data-status="No-show">No-show</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => updateStatus(btn.dataset.id, btn.dataset.status));
  });
}

function renderClients(items){
  const map = new Map();
  items.forEach(item => {
    const key = `${item.clientName}__${item.clientPhone}`;
    if (!map.has(key)) map.set(key, { name:item.clientName, phone:item.clientPhone, visits:0, spent:0 });
    const row = map.get(key);
    row.visits += 1;
    if (!['Cancelada','No-show'].includes(item.status)) row.spent += Number(item.price || 0);
  });

  const clients = [...map.values()].sort((a,b) => b.spent - a.spent);
  els.clientsList.innerHTML = clients.map(client => `
    <article class="list-card">
      <strong>${escapeHtml(client.name || 'Cliente')}</strong>
      <div class="timeline-meta">${escapeHtml(client.phone || 'Sin teléfono')}</div>
      <div class="timeline-meta">${client.visits} visitas · ${money(client.spent)}</div>
    </article>
  `).join('') || `<div class="timeline-meta">Aún no hay clientes cargados.</div>`;
}

function renderServices(){
  els.servicesList.innerHTML = baseServices.map(service => `
    <article class="list-card">
      <strong>${escapeHtml(service.name)}</strong>
      <div class="timeline-meta">${money(service.price)} · ${escapeHtml(service.time)}</div>
    </article>
  `).join('');
}

function render(){
  const selectedDate = els.filterDate.value || today;
  const dayItems = [...appointments]
    .filter(a => a.date === selectedDate)
    .sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const completed = dayItems.filter(a => a.status === 'Completada');
  const totalRevenue = dayItems.filter(a => !['Cancelada','No-show'].includes(a.status)).reduce((sum, a) => sum + Number(a.price || 0), 0);
  const completedRevenue = completed.reduce((sum, a) => sum + Number(a.price || 0), 0);

  els.todayCount.textContent = String(dayItems.length);
  els.todayRevenue.textContent = money(totalRevenue);
  els.completedCount.textContent = String(completed.length);
  els.completedRevenue.textContent = money(completedRevenue);

  renderTimeline(dayItems);
  renderClients(appointments);
  renderServices();
}

appointments = [...seedAppointments];
render();

setFirebaseStatus('loading', 'Conectando a Firebase', 'Inicializando el proyecto nexus-barber-shop.');

if (firebaseReady && db){
  const q = query(collection(db, 'appointments'), orderBy('date', 'asc'), orderBy('time', 'asc'));
  onSnapshot(q, (snapshot) => {
    const cloudItems = snapshot.docs.map(d => ({ id:d.id, ...d.data() }));
    appointments = cloudItems.length ? cloudItems : [...seedAppointments];
    render();
    setFirebaseStatus('connected', 'Firebase conectado', 'Firestore está respondiendo. Ya esto juega en grandes ligas.');
  }, (error) => {
    console.error(error);
    appointments = [...seedAppointments];
    render();
    setFirebaseStatus('error', 'Error de Firestore', 'Revisa las reglas de Firestore o el índice compuesto de date + time.');
    toast('Firebase respondió con error. La UI sigue viva.');
  });
} else {
  setFirebaseStatus('error', 'Firebase no inicializado', 'La configuración no cargó correctamente.');
}

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBtn.classList.remove('hidden');
});

els.installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.classList.add('hidden');
});
