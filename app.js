import { auth, db, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setDoc, getDoc } from './firebase-config.js';

const $ = id => document.getElementById(id);
const els = {
  authScreen: $('authScreen'),
  mainShell: $('mainShell'),
  loginForm: $('loginForm'),
  loginEmail: $('loginEmail'),
  loginPassword: $('loginPassword'),
  registerBtn: $('registerBtn'),
  pinScreen: $('pinScreen'),
  pinInput: $('pinInput'),
  pinBtn: $('pinBtn'),
  backToLoginBtn: $('backToLoginBtn'),
  authSyncBadge: $('authSyncBadge'),
  syncBadge: $('syncBadge'),
  logoutBtn: $('logoutBtn'),
  authBusinessName: $('authBusinessName'),
  headerBusinessName: $('headerBusinessName'),
  headerUserEmail: $('headerUserEmail'),

  appointmentForm: $('appointmentForm'),
  appointmentId: $('appointmentId'),
  appointmentClientId: $('appointmentClientId'),
  clientLookup: $('clientLookup'),
  clientName: $('clientName'),
  clientPhone: $('clientPhone'),
  service: $('service'),
  price: $('price'),
  date: $('date'),
  time: $('time'),
  barber: $('barber'),
  status: $('status'),
  notes: $('notes'),
  formTitle: $('formTitle'),
  saveBtn: $('saveBtn'),
  resetBtn: $('resetBtn'),

  filterDate: $('filterDate'),
  todayCount: $('todayCount'),
  todayRevenue: $('todayRevenue'),
  completedCount: $('completedCount'),
  completedRevenue: $('completedRevenue'),
  pendingCount: $('pendingCount'),
  confirmedCount: $('confirmedCount'),
  noshowCount: $('noshowCount'),
  timeline: $('timeline'),

  clientsList: $('clientsList'),
  clientForm: $('clientForm'),
  clientRecordId: $('clientRecordId'),
  clientFormName: $('clientFormName'),
  clientFormPhone: $('clientFormPhone'),
  clientFormEmail: $('clientFormEmail'),
  clientFormNotes: $('clientFormNotes'),
  resetClientBtn: $('resetClientBtn'),

  servicesList: $('servicesList'),
  serviceForm: $('serviceForm'),
  serviceId: $('serviceId'),
  serviceName: $('serviceName'),
  servicePrice: $('servicePrice'),
  serviceTime: $('serviceTime'),
  resetServiceBtn: $('resetServiceBtn'),

  settingsForm: $('settingsForm'),
  businessName: $('businessName'),
  businessPin: $('businessPin'),
  quickAddBtn: $('quickAddBtn'),
  toast: $('toast'),

  clientModal: $('clientModal'),
  closeClientModal: $('closeClientModal'),
  clientProfileBody: $('clientProfileBody')
};

let currentUser = null;
let appointments = [];
let clients = [];
let services = [];
let settings = { businessName: 'Nexus Salón', pin: '2026' };
let unsubAppointments = null;
let unsubClients = null;

const today = new Date().toISOString().slice(0, 10);
els.date.value = today;
els.filterDate.value = today;

const fallbackServices = [
  { id: 'srv1', name: 'Corte clásico', price: 20, time: '30 min' },
  { id: 'srv2', name: 'Fade premium', price: 30, time: '40 min' },
  { id: 'srv3', name: 'Barba', price: 18, time: '20 min' },
  { id: 'srv4', name: 'Corte + Barba', price: 40, time: '50 min' }
];

const toast = msg => {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => els.toast.classList.add('hidden'), 2600);
};

const money = v => new Intl.NumberFormat('es-PR', { style: 'currency', currency: 'USD' }).format(Number(v || 0));
const esc = (s = '') => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const statusClass = s => `status-${(s || '').toLowerCase().replace(/\s+/g, '-')}`;
const statusCardClass = s => {
  const n = String(s || '').toLowerCase().trim();
  if (n === 'pendiente') return 'timeline-pendiente';
  if (n === 'confirmada') return 'timeline-confirmada';
  if (n === 'completada') return 'timeline-completada';
  if (n === 'cancelada') return 'timeline-cancelada';
  if (n === 'no-show' || n === 'noshow') return 'timeline-no-show';
  return 'timeline-pendiente';
};
const sortAppointments = items => [...items].sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
const normalize = value => String(value || '').trim().toLowerCase();
const normalizePhone = value => String(value || '').replace(/\D+/g, '');
const makeId = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function activateView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector(`#view-${view}`)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
}

function setSyncState(mode, text) {
  const cls = mode === 'ok' ? 'sync-ok' : mode === 'error' ? 'sync-error' : 'sync-loading';
  [els.syncBadge, els.authSyncBadge].forEach(el => {
    el.className = `sync-badge ${cls}`;
    el.textContent = text;
  });
}

function applyBranding() {
  els.authBusinessName.textContent = settings.businessName;
  els.headerBusinessName.textContent = settings.businessName;
  els.businessName.value = settings.businessName;
  els.businessPin.value = settings.pin;
}

function renderServiceOptions() {
  els.service.innerHTML = ['<option value="" selected>Elegir servicio</option>']
    .concat(services.map(s => `<option value="${esc(s.name)}" data-price="${Number(s.price || 0)}">${esc(s.name)}</option>`))
    .join('');
}

function renderServices() {
  els.servicesList.innerHTML = services.map(s => `
    <article class="list-card">
      <div class="list-title">${esc(s.name)}</div>
      <div class="list-meta">${money(s.price)} · ${esc(s.time)}</div>
      <div class="list-actions">
        <button class="btn btn-secondary service-edit" data-id="${s.id}">Editar</button>
        <button class="btn btn-danger service-delete" data-id="${s.id}">Borrar</button>
      </div>
    </article>
  `).join('') || '<div class="list-meta">Sin servicios.</div>';

  document.querySelectorAll('.service-edit').forEach(b => b.addEventListener('click', () => editService(b.dataset.id)));
  document.querySelectorAll('.service-delete').forEach(b => b.addEventListener('click', () => deleteService(b.dataset.id)));
}

function clientMatchesAppointment(client, appt) {
  if (!client || !appt) return false;
  if (client.id && appt.clientId && client.id === appt.clientId) return true;
  const samePhone = client.phone && appt.clientPhone && normalizePhone(client.phone) === normalizePhone(appt.clientPhone);
  const sameName = normalize(client.name) && normalize(client.name) === normalize(appt.clientName);
  return samePhone || sameName;
}

function getLegacyClients() {
  const map = new Map();
  appointments.forEach(appt => {
    if (appt.clientId) return;
    const key = `${normalize(appt.clientName)}__${normalizePhone(appt.clientPhone)}`;
    if (!normalize(appt.clientName) && !normalizePhone(appt.clientPhone)) return;
    if (map.has(key)) return;
    map.set(key, {
      id: `legacy:${key}`,
      name: appt.clientName || 'Cliente',
      phone: appt.clientPhone || '',
      email: '',
      notes: '',
      legacy: true
    });
  });
  return [...map.values()];
}

function getAllClients() {
  const real = [...clients];
  const existingKeys = new Set(real.map(c => `${normalize(c.name)}__${normalizePhone(c.phone)}`));
  getLegacyClients().forEach(legacy => {
    const key = `${normalize(legacy.name)}__${normalizePhone(legacy.phone)}`;
    if (!existingKeys.has(key)) real.push(legacy);
  });
  return real;
}

function getClientMetrics(client) {
  const clientAppointments = sortAppointments(appointments.filter(appt => clientMatchesAppointment(client, appt)));
  const completed = clientAppointments.filter(a => a.status === 'Completada');
  const noShows = clientAppointments.filter(a => a.status === 'No-show');
  const future = clientAppointments.filter(a => ['Pendiente', 'Confirmada'].includes(a.status) && (a.date || '') >= today);
  const spent = completed.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const lastVisit = [...completed].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date || '—';
  const nextVisit = future[0] ? `${future[0].date} · ${future[0].time || '--:--'}` : '—';
  const lastNoShow = [...noShows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date || '—';
  const avgTicket = completed.length ? spent / completed.length : 0;

  let badge = 'Nuevo';
  if (noShows.length >= 2) badge = 'Riesgo';
  else if (spent >= 250) badge = 'VIP';
  else if (completed.length >= 4) badge = 'Frecuente';
  else if (lastVisit !== '—') badge = 'Activo';

  return {
    appointments: clientAppointments,
    visits: completed.length,
    spent,
    noShows: noShows.length,
    lastVisit,
    nextVisit,
    lastNoShow,
    avgTicket,
    badge
  };
}

function fillClientSelector() {
  const options = getAllClients()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(client => `<option value="${esc(client.id)}">${esc(client.name)}${client.phone ? ` · ${esc(client.phone)}` : ''}</option>`)
    .join('');
  els.clientLookup.innerHTML = `<option value="" selected>Buscar cliente guardado</option>${options}`;
}

function renderClients() {
  const allClients = getAllClients().map(client => ({ ...client, metrics: getClientMetrics(client) }))
    .sort((a, b) => b.metrics.spent - a.metrics.spent || (a.name || '').localeCompare(b.name || ''));

  els.clientsList.innerHTML = allClients.map(client => `
    <article class="list-card client-card" data-id="${esc(client.id)}">
      <div class="list-top">
        <div>
          <div class="list-title">${esc(client.name || 'Cliente')}</div>
          <div class="list-meta">${esc(client.phone || 'Sin teléfono')}${client.email ? ` · ${esc(client.email)}` : ''}</div>
        </div>
        <span class="status-chip ${client.metrics.badge === 'Riesgo' ? 'status-no-show' : client.metrics.badge === 'VIP' ? 'status-completada' : 'status-confirmada'}">${esc(client.metrics.badge)}</span>
      </div>
      <div class="client-kpis-grid">
        <div><small>Gastado</small><strong>${money(client.metrics.spent)}</strong></div>
        <div><small>Visitas</small><strong>${client.metrics.visits}</strong></div>
        <div><small>No show</small><strong>${client.metrics.noShows}</strong></div>
        <div><small>Próxima</small><strong>${esc(client.metrics.nextVisit)}</strong></div>
      </div>
      <div class="list-actions">
        <button class="btn btn-secondary client-open" data-id="${esc(client.id)}">Ver perfil</button>
        <button class="btn btn-secondary client-edit" data-id="${esc(client.id)}">Editar</button>
      </div>
    </article>
  `).join('') || '<div class="list-meta">Sin clientes guardados.</div>';

  document.querySelectorAll('.client-open').forEach(btn => btn.addEventListener('click', () => openClientProfile(btn.dataset.id)));
  document.querySelectorAll('.client-edit').forEach(btn => btn.addEventListener('click', () => editClient(btn.dataset.id)));
  document.querySelectorAll('.client-card').forEach(card => card.addEventListener('dblclick', () => openClientProfile(card.dataset.id)));
}

function renderTimeline(items) {
  if (!items.length) {
    els.timeline.innerHTML = '<div class="list-meta">Sin citas para esta fecha.</div>';
    return;
  }

  els.timeline.innerHTML = items.map(i => `
    <article class="timeline-item ${statusCardClass(i.status)}">
      <div class="timeline-top">
        <div>
          <div class="timeline-title">${esc(i.time || '--:--')} · ${esc(i.service || 'Servicio')}</div>
          <div class="timeline-meta">${esc(i.clientName || 'Cliente')} · ${esc(i.barber || 'Sin asignar')}</div>
        </div>
        <span class="status-chip ${statusClass(i.status)}">${esc(i.status || 'Pendiente')}</span>
      </div>
      <div class="timeline-meta">${esc(i.clientPhone || 'Sin teléfono')} · ${money(i.price || 0)}${i.notes ? `<br>${esc(i.notes)}` : ''}</div>
      <div class="timeline-actions">
        <button class="btn btn-secondary appt-edit" data-id="${i.id}">Editar</button>
        <button class="btn btn-secondary appt-open-client" data-client-id="${esc(i.clientId || '')}" data-name="${esc(i.clientName || '')}" data-phone="${esc(i.clientPhone || '')}">Cliente</button>
        <button class="btn btn-danger appt-delete" data-id="${i.id}">Borrar</button>
        <button class="btn btn-secondary appt-status" data-id="${i.id}" data-status="Completada">Completar</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('.appt-edit').forEach(b => b.addEventListener('click', () => editAppointment(b.dataset.id)));
  document.querySelectorAll('.appt-delete').forEach(b => b.addEventListener('click', () => deleteAppointment(b.dataset.id)));
  document.querySelectorAll('.appt-status').forEach(b => b.addEventListener('click', () => updateAppointmentStatus(b.dataset.id, b.dataset.status)));
  document.querySelectorAll('.appt-open-client').forEach(b => b.addEventListener('click', () => {
    const candidate = findClientByAppointmentHint({ clientId: b.dataset.clientId, clientName: b.dataset.name, clientPhone: b.dataset.phone });
    if (candidate) openClientProfile(candidate.id);
  }));
}

function renderDashboard() {
  const selected = els.filterDate.value || today;
  const ordered = sortAppointments(appointments);
  const dayItems = ordered.filter(a => a.date === selected);
  const completed = dayItems.filter(a => a.status === 'Completada');
  const pending = dayItems.filter(a => a.status === 'Pendiente');
  const confirmed = dayItems.filter(a => a.status === 'Confirmada');
  const noShow = dayItems.filter(a => a.status === 'No-show');
  const totalRevenue = dayItems.filter(a => !['Cancelada', 'No-show'].includes(a.status)).reduce((s, a) => s + Number(a.price || 0), 0);
  const completedRevenue = completed.reduce((s, a) => s + Number(a.price || 0), 0);

  els.todayCount.textContent = String(dayItems.length);
  els.todayRevenue.textContent = money(totalRevenue);
  els.completedCount.textContent = String(completed.length);
  els.completedRevenue.textContent = money(completedRevenue);
  els.pendingCount.textContent = String(pending.length);
  els.confirmedCount.textContent = String(confirmed.length);
  els.noshowCount.textContent = String(noShow.length);

  renderTimeline(dayItems);
  renderClients();
  renderServices();
  fillClientSelector();
}

function resetAppointmentForm() {
  els.appointmentForm.reset();
  els.appointmentId.value = '';
  els.appointmentClientId.value = '';
  els.clientLookup.value = '';
  els.formTitle.textContent = 'Nueva cita';
  els.saveBtn.textContent = 'Guardar cita';
  els.date.value = today;
}

function resetServiceForm() {
  els.serviceForm.reset();
  els.serviceId.value = '';
}

function resetClientForm() {
  els.clientForm.reset();
  els.clientRecordId.value = '';
}

function editAppointment(id) {
  const appt = appointments.find(a => a.id === id);
  if (!appt) return;
  els.appointmentId.value = appt.id;
  els.appointmentClientId.value = appt.clientId || '';
  els.clientLookup.value = appt.clientId || '';
  els.clientName.value = appt.clientName || '';
  els.clientPhone.value = appt.clientPhone || '';
  els.service.value = appt.service || '';
  els.price.value = appt.price || '';
  els.date.value = appt.date || today;
  els.time.value = appt.time || '';
  els.barber.value = appt.barber || '';
  els.status.value = appt.status || 'Pendiente';
  els.notes.value = appt.notes || '';
  els.formTitle.textContent = 'Editar cita';
  els.saveBtn.textContent = 'Actualizar cita';
  activateView('agenda');
}

function editService(id) {
  const item = services.find(s => s.id === id);
  if (!item) return;
  els.serviceId.value = item.id;
  els.serviceName.value = item.name;
  els.servicePrice.value = item.price;
  els.serviceTime.value = item.time;
  activateView('servicios');
}

function editClient(id) {
  const client = getAllClients().find(c => c.id === id);
  if (!client) return;
  els.clientRecordId.value = client.legacy ? '' : client.id;
  els.clientFormName.value = client.name || '';
  els.clientFormPhone.value = client.phone || '';
  els.clientFormEmail.value = client.email || '';
  els.clientFormNotes.value = client.notes || '';
  activateView('clientes');
}

function findClientByAppointmentHint(appt) {
  if (!appt) return null;
  return getAllClients().find(client => clientMatchesAppointment(client, appt)) || null;
}

function openClientProfile(id) {
  const client = getAllClients().find(c => c.id === id);
  if (!client) return;
  const metrics = getClientMetrics(client);
  const history = metrics.appointments.map(appt => `
    <article class="profile-history-item">
      <div>
        <strong>${esc(appt.date || '—')} · ${esc(appt.time || '--:--')}</strong>
        <div class="list-meta">${esc(appt.service || 'Servicio')} · ${money(appt.price || 0)}</div>
      </div>
      <span class="status-chip ${statusClass(appt.status)}">${esc(appt.status || 'Pendiente')}</span>
    </article>
  `).join('') || '<div class="list-meta">Sin historial todavía.</div>';

  els.clientProfileBody.innerHTML = `
    <div class="profile-head">
      <div>
        <h3>${esc(client.name || 'Cliente')}</h3>
        <p>${esc(client.phone || 'Sin teléfono')}${client.email ? ` · ${esc(client.email)}` : ''}</p>
      </div>
      <span class="status-chip ${metrics.badge === 'Riesgo' ? 'status-no-show' : metrics.badge === 'VIP' ? 'status-completada' : 'status-confirmada'}">${esc(metrics.badge)}</span>
    </div>

    <div class="profile-grid">
      <article class="metric-box mini"><span>Gastado</span><strong>${money(metrics.spent)}</strong></article>
      <article class="metric-box mini"><span>Visitas</span><strong>${metrics.visits}</strong></article>
      <article class="metric-box mini"><span>No show</span><strong>${metrics.noShows}</strong></article>
      <article class="metric-box mini"><span>Ticket promedio</span><strong>${money(metrics.avgTicket)}</strong></article>
    </div>

    <div class="profile-info-grid">
      <div class="surface profile-note"><small>Última visita</small><strong>${esc(metrics.lastVisit)}</strong></div>
      <div class="surface profile-note"><small>Próxima cita</small><strong>${esc(metrics.nextVisit)}</strong></div>
      <div class="surface profile-note"><small>Último no show</small><strong>${esc(metrics.lastNoShow)}</strong></div>
      <div class="surface profile-note"><small>Notas</small><strong>${esc(client.notes || 'Sin notas')}</strong></div>
    </div>

    <div class="section-head profile-section-head"><h3>Historial del cliente</h3></div>
    <div class="profile-history">${history}</div>
  `;

  els.clientModal.classList.remove('hidden');
}

function closeClientProfile() {
  els.clientModal.classList.add('hidden');
}

async function updateAppointmentStatus(id, status) {
  try {
    await updateDoc(doc(db, `users/${currentUser.uid}/appointments`, id), { status });
    toast(`Estado actualizado a ${status}`);
  } catch (err) {
    toast(`Error Firebase: ${err.message}`);
    setSyncState('error', 'Error sync');
  }
}

async function deleteAppointment(id) {
  try {
    await deleteDoc(doc(db, `users/${currentUser.uid}/appointments`, id));
    toast('Cita borrada');
  } catch (err) {
    toast(`Error Firebase: ${err.message}`);
  }
}

async function deleteService(id) {
  services = services.filter(s => s.id !== id);
  await saveUserSettings();
  renderServiceOptions();
  renderServices();
  toast('Servicio borrado');
}

async function saveUserSettings() {
  await setDoc(doc(db, 'users', currentUser.uid), { businessName: settings.businessName, pin: settings.pin, services }, { merge: true });
}

async function loadUserSettings() {
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  if (snap.exists()) {
    const data = snap.data();
    settings.businessName = data.businessName || settings.businessName;
    settings.pin = data.pin || settings.pin;
    services = Array.isArray(data.services) && data.services.length ? data.services : [...fallbackServices];
  } else {
    services = [...fallbackServices];
    await saveUserSettings();
  }
  applyBranding();
  renderServiceOptions();
  renderServices();
}

async function upsertClient(input) {
  const name = input.name?.trim() || '';
  const phone = input.phone?.trim() || '';
  const email = input.email?.trim() || '';
  const notes = input.notes?.trim() || '';

  if (!name) throw new Error('El cliente necesita nombre');

  if (input.id && !String(input.id).startsWith('legacy:')) {
    const payload = { name, phone, email, notes, updatedAt: serverTimestamp() };
    await setDoc(doc(db, `users/${currentUser.uid}/clients`, input.id), payload, { merge: true });
    return { id: input.id, ...payload };
  }

  const existing = clients.find(client => {
    const samePhone = phone && client.phone && normalizePhone(phone) === normalizePhone(client.phone);
    const sameName = normalize(client.name) === normalize(name);
    return samePhone || sameName;
  });

  if (existing) {
    const payload = {
      name,
      phone: phone || existing.phone || '',
      email: email || existing.email || '',
      notes: notes || existing.notes || '',
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, `users/${currentUser.uid}/clients`, existing.id), payload, { merge: true });
    return { id: existing.id, ...payload };
  }

  const id = makeId('cli');
  const payload = { name, phone, email, notes, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(doc(db, `users/${currentUser.uid}/clients`, id), payload, { merge: true });
  return { id, ...payload };
}

const showPinStep = () => {
  els.loginForm.classList.add('hidden');
  els.pinScreen.classList.remove('hidden');
};

const showLoginStep = () => {
  els.pinScreen.classList.add('hidden');
  els.loginForm.classList.remove('hidden');
};

els.registerBtn.addEventListener('click', async () => {
  try {
    setSyncState('loading', 'Creando acceso');
    await createUserWithEmailAndPassword(auth, els.loginEmail.value.trim(), els.loginPassword.value);
    toast('Usuario creado');
  } catch (err) {
    toast(`Auth error: ${err.message}`);
    setSyncState('error', 'Error auth');
  }
});

els.loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    setSyncState('loading', 'Entrando');
    await signInWithEmailAndPassword(auth, els.loginEmail.value.trim(), els.loginPassword.value);
  } catch (err) {
    toast(`Auth error: ${err.message}`);
    setSyncState('error', 'Error auth');
  }
});

els.pinBtn.addEventListener('click', () => {
  if (els.pinInput.value.trim() !== settings.pin) {
    toast('PIN incorrecto');
    return;
  }
  els.authScreen.classList.add('hidden');
  els.mainShell.classList.remove('hidden');
  activateView('home');
});

els.backToLoginBtn.addEventListener('click', async () => {
  try { await signOut(auth); } catch {}
});

els.logoutBtn.addEventListener('click', async () => {
  try { await signOut(auth); } catch {}
});

els.service.addEventListener('change', () => {
  const option = els.service.options[els.service.selectedIndex];
  if (option?.dataset?.price && !els.appointmentId.value) els.price.value = option.dataset.price;
});

els.clientLookup.addEventListener('change', () => {
  const client = getAllClients().find(c => c.id === els.clientLookup.value);
  if (!client) {
    els.appointmentClientId.value = '';
    return;
  }
  els.appointmentClientId.value = client.id.startsWith('legacy:') ? '' : client.id;
  els.clientName.value = client.name || '';
  els.clientPhone.value = client.phone || '';
});

els.filterDate.addEventListener('change', renderDashboard);
els.quickAddBtn.addEventListener('click', () => activateView('agenda'));
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => activateView(btn.dataset.view)));
els.resetBtn.addEventListener('click', resetAppointmentForm);
els.resetServiceBtn.addEventListener('click', resetServiceForm);
els.resetClientBtn.addEventListener('click', resetClientForm);
els.closeClientModal.addEventListener('click', closeClientProfile);
els.clientModal.addEventListener('click', e => { if (e.target === els.clientModal) closeClientProfile(); });

els.settingsForm.addEventListener('submit', async e => {
  e.preventDefault();
  settings.businessName = els.businessName.value.trim() || 'Nexus Salón';
  settings.pin = els.businessPin.value.trim() || '2026';
  try {
    await saveUserSettings();
    applyBranding();
    toast('Configuración guardada');
    setSyncState('ok', 'Sync activo');
  } catch (err) {
    toast(`Error Firebase: ${err.message}`);
    setSyncState('error', 'Error sync');
  }
});

els.serviceForm.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    id: els.serviceId.value || `srv_${Date.now()}`,
    name: els.serviceName.value.trim(),
    price: Number(els.servicePrice.value || 0),
    time: els.serviceTime.value.trim()
  };
  if (!payload.name || !payload.time) {
    toast('Completa el servicio');
    return;
  }
  const idx = services.findIndex(s => s.id === payload.id);
  if (idx >= 0) services[idx] = payload;
  else services.unshift(payload);

  try {
    await saveUserSettings();
    renderServiceOptions();
    renderServices();
    resetServiceForm();
    toast('Servicio guardado');
    setSyncState('ok', 'Sync activo');
  } catch (err) {
    toast(`Error Firebase: ${err.message}`);
    setSyncState('error', 'Error sync');
  }
});

els.clientForm.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await upsertClient({
      id: els.clientRecordId.value || '',
      name: els.clientFormName.value,
      phone: els.clientFormPhone.value,
      email: els.clientFormEmail.value,
      notes: els.clientFormNotes.value
    });
    resetClientForm();
    toast('Cliente guardado');
    setSyncState('ok', 'Sync activo');
  } catch (err) {
    toast(`Error cliente: ${err.message}`);
  }
});

els.appointmentForm.addEventListener('submit', async e => {
  e.preventDefault();

  try {
    const client = await upsertClient({
      id: els.appointmentClientId.value || '',
      name: els.clientName.value,
      phone: els.clientPhone.value,
      email: '',
      notes: ''
    });

    const payload = {
      clientId: client.id,
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

    if (!payload.clientName || !payload.service || !payload.date || !payload.time) {
      toast('Faltan campos');
      return;
    }

    if (els.appointmentId.value) {
      await updateDoc(doc(db, `users/${currentUser.uid}/appointments`, els.appointmentId.value), payload);
      toast('Cita actualizada');
    } else {
      await addDoc(collection(db, `users/${currentUser.uid}/appointments`), { ...payload, createdAt: serverTimestamp() });
      toast('Cita guardada');
    }

    resetAppointmentForm();
    activateView('home');
    setSyncState('ok', 'Sync activo');
  } catch (err) {
    toast(`Error Firebase: ${err.message}`);
    setSyncState('error', 'Error sync');
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    currentUser = null;
    if (unsubAppointments) { unsubAppointments(); unsubAppointments = null; }
    if (unsubClients) { unsubClients(); unsubClients = null; }
    appointments = [];
    clients = [];
    services = [];
    settings = { businessName: 'Nexus Salón', pin: '2026' };
    showLoginStep();
    els.authScreen.classList.remove('hidden');
    els.mainShell.classList.add('hidden');
    els.headerUserEmail.textContent = '';
    setSyncState('loading', 'Sin sesión');
    return;
  }

  currentUser = user;
  els.headerUserEmail.textContent = user.email || '';
  setSyncState('loading', 'Sincronizando');

  try {
    await loadUserSettings();
    showPinStep();

    unsubClients = onSnapshot(collection(db, `users/${user.uid}/clients`), snapshot => {
      clients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderDashboard();
      setSyncState('ok', 'Sync activo');
    }, error => {
      toast(`Firebase error: ${error.message}`);
      setSyncState('error', 'Error sync');
    });

    unsubAppointments = onSnapshot(collection(db, `users/${user.uid}/appointments`), snapshot => {
      appointments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderDashboard();
      setSyncState('ok', 'Sync activo');
    }, error => {
      toast(`Firebase error: ${error.message}`);
      setSyncState('error', 'Error sync');
    });
  } catch (err) {
    toast(`Firebase error: ${err.message}`);
    setSyncState('error', 'Error sync');
  }
});
