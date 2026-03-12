import { db, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from './firebase-config.js';

const $ = (id) => document.getElementById(id);
const els = {
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
  todayCount: $('todayCount'),
  todayRevenue: $('todayRevenue'),
  completedCount: $('completedCount'),
  completedRevenue: $('completedRevenue'),
  timeline: $('timeline'),
  filterDate: $('filterDate'),
  toast: $('toast'),
  resetBtn: $('resetBtn'),
  quickAddBtn: $('quickAddBtn'),
  todayBtn: $('todayBtn'),
  installBtn: $('installBtn')
};

let appointments = [];
let deferredPrompt = null;

const today = new Date().toISOString().slice(0, 10);
els.date.value = today;
els.filterDate.value = today;

els.service.addEventListener('change', () => {
  const option = els.service.options[els.service.selectedIndex];
  const price = option?.dataset?.price || '';
  if (price && !els.price.value) els.price.value = price;
});

els.resetBtn.addEventListener('click', () => els.appointmentForm.reset());
els.quickAddBtn.addEventListener('click', () => $('formSection').scrollIntoView({ behavior: 'smooth' }));
els.todayBtn.addEventListener('click', () => {
  els.filterDate.value = today;
  render();
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

  try {
    await addDoc(collection(db, 'appointments'), payload);
    els.appointmentForm.reset();
    els.date.value = today;
    showToast('Cita guardada. Operación cerrada sin drama.');
  } catch (err) {
    console.error(err);
    showToast('No se pudo guardar. Revisa Firebase antes de echarle la culpa al barbero.');
  }
});

function money(value) {
  return new Intl.NumberFormat('es-PR', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.add('hidden'), 2800);
}

function statusClass(status = '') {
  return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

async function updateStatus(id, status) {
  try {
    await updateDoc(doc(db, 'appointments', id), { status });
    showToast(`Estado actualizado a ${status}. KPI en orden.`);
  } catch (err) {
    console.error(err);
    showToast('No pude actualizar el estado.');
  }
}

function render() {
  const selectedDate = els.filterDate.value || today;
  const dayItems = appointments
    .filter(item => item.date === selectedDate)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const completed = dayItems.filter(a => a.status === 'Completada');
  const totalRevenue = dayItems
    .filter(a => a.status !== 'Cancelada' && a.status !== 'No-show')
    .reduce((acc, item) => acc + Number(item.price || 0), 0);

  const completedRevenue = completed.reduce((acc, item) => acc + Number(item.price || 0), 0);

  els.todayCount.textContent = String(dayItems.length);
  els.todayRevenue.textContent = money(totalRevenue);
  els.completedCount.textContent = String(completed.length);
  els.completedRevenue.textContent = money(completedRevenue);

  if (!dayItems.length) {
    els.timeline.innerHTML = `<div class="timeline-empty">No hay citas para esta fecha. Agenda liviana, café pesado.</div>`;
    return;
  }

  els.timeline.innerHTML = dayItems.map(item => `
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

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const appointmentsQuery = query(collection(db, 'appointments'), orderBy('date', 'asc'), orderBy('time', 'asc'));
onSnapshot(appointmentsQuery, (snapshot) => {
  appointments = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
  render();
}, (error) => {
  console.error(error);
  showToast('No pude leer Firestore. Configura reglas y credenciales.');
});

if ('serviceWorker' in navigator) {
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
