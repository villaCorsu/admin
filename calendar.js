/**
 * Villa Corsu — Logique du calendrier
 * Chargement dynamique depuis Google Sheets avec fallback local.
 */

// ── State ────────────────────────────────────────────────────
let BOOKINGS     = [];
const today      = new Date(); today.setHours(0, 0, 0, 0);
let currentYear  = today.getFullYear();
let lastSyncTime = null;

// ── Parse & enrich ───────────────────────────────────────────
function parseDate(s) {
  const [d, m, y] = s.split('/');
  return new Date(+y, +m - 1, +d);
}

function enrichBookings(raw) {
  return raw.map(b => ({
    ...b,
    arrDate: parseDate(b.arr),
    depDate: parseDate(b.dep),
    isOwner: b.name.toLowerCase().includes('propriétaire'),
  }));
}

// ── Sync UI helpers ──────────────────────────────────────────
function setSyncState(state, msg) {
  const btn   = document.getElementById('sync-btn');
  const icon  = document.getElementById('sync-icon');
  const label = document.getElementById('sync-label');
  const bar   = document.getElementById('sync-status');

  btn.disabled = state === 'loading';

  if (state === 'loading') {
    icon.style.animation = 'spin 0.8s linear infinite';
    label.textContent    = 'Sync…';
    btn.style.opacity    = '0.6';
  } else {
    icon.style.animation = '';
    label.textContent    = 'Sync';
    btn.style.opacity    = '1';
  }

  if (msg) {
    bar.style.display = 'flex';
    bar.className     = 'sync-status sync-' + state;
    bar.innerHTML     = msg;
    if (state !== 'error') {
      setTimeout(() => { bar.style.display = 'none'; }, 4000);
    }
  } else {
    bar.style.display = 'none';
  }
}

// ── Sync from Google Sheets ──────────────────────────────────
async function syncFromSheet() {
  setSyncState('loading', null);
  try {
    const raw = await loadSheetData();
    BOOKINGS  = enrichBookings(raw);
    lastSyncTime = new Date();
    const t  = lastSyncTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setSyncState('success',
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
       ${raw.length} réservations chargées depuis Google Sheets — ${t}`
    );
    render();
  } catch (err) {
    console.warn("[VillaCorsu] Sync error:", err.message);
    if (!BOOKINGS.length) BOOKINGS = enrichBookings(FALLBACK_DATA);
    setSyncState('error',
      `⚠️ ${err.message} — <a href="#" onclick="syncFromSheet();return false;" style="color:inherit;font-weight:600">Réessayer</a>`
    );
    render();
  }
}

// ── Helpers ──────────────────────────────────────────────────
const MOIS       = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_SHORT = ['L','M','M','J','V','S','D'];

function fmtDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getBookingForDay(date) {
  const t = date.getTime();
  for (const b of BOOKINGS) {
    if (t >= b.arrDate.getTime() && t < b.depDate.getTime()) return b;
  }
  return null;
}

// Retourne les infos du jour : type checkin/checkout/both/middle + réservation associée
function getDayInfo(date) {
  const t = date.getTime();
  let checkinBooking  = null;
  let checkoutBooking = null;
  let middleBooking   = null;

  for (const b of BOOKINGS) {
    if (t === b.arrDate.getTime())                               checkinBooking  = b;
    if (t === b.depDate.getTime())                               checkoutBooking = b;
    if (t > b.arrDate.getTime() && t < b.depDate.getTime())     middleBooking   = b;
  }

  if (checkinBooking && checkoutBooking) return { type: "both",     booking: checkinBooking, prevBooking: checkoutBooking };
  if (checkinBooking)                    return { type: "checkin",  booking: checkinBooking };
  if (checkoutBooking)                   return { type: "checkout", booking: checkoutBooking };
  if (middleBooking)                     return { type: "middle",   booking: middleBooking };
  return null;
}

function computeStats(year) {
  let revenue = 0, bookedDays = 0, ownerDays = 0, nbSejours = 0;
  const yStart = new Date(year, 0, 1);
  const yEnd   = new Date(year, 11, 31, 23, 59, 59);
  for (const b of BOOKINGS) {
    const start = b.arrDate < yStart ? yStart : b.arrDate;
    const end   = b.depDate > yEnd   ? yEnd   : b.depDate;
    const days  = Math.max(0, Math.round((end - start) / 86400000));
    if (days > 0 && b.arrDate.getFullYear() <= year && b.depDate.getFullYear() >= year) {
      if (b.isOwner) { ownerDays += days; }
      else           { bookedDays += days; revenue += b.prix; nbSejours++; }
    }
  }
  return { revenue, bookedDays, ownerDays, nbSejours };
}

// ── Render stats ─────────────────────────────────────────────
function renderStats(year) {
  const s    = computeStats(year);
  const taux = Math.round(s.bookedDays / 365 * 100);
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card"><div class="stat-label">💰 Revenus ${year}</div><div class="stat-value">${s.revenue.toLocaleString('fr-FR')} €</div></div>
    <div class="stat-card"><div class="stat-label">🏠 Séjours</div><div class="stat-value">${s.nbSejours}</div></div>
    <div class="stat-card"><div class="stat-label">🌙 Jours loués</div><div class="stat-value">${s.bookedDays} j</div></div>
    <div class="stat-card"><div class="stat-label">📊 Taux occupation</div><div class="stat-value">${taux} %</div></div>
    <div class="stat-card"><div class="stat-label">🌿 Propriétaire</div><div class="stat-value">${s.ownerDays} j</div></div>
  `;
}

// ── Render calendar ──────────────────────────────────────────
function renderCalendar(year) {
  const grid = document.getElementById('months-grid');
  grid.innerHTML = '';
  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(year, m, 1);
    const lastDay  = new Date(year, m + 1, 0);
    let startDow   = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const card  = document.createElement('div');
    card.className = 'month-card';

    let html = `<div class="month-title">${MOIS[m]} ${year}</div>`;
    html += '<div class="days-header">' + JOURS_SHORT.map(j => `<div class="day-name">${j}</div>`).join('') + '</div>';
    html += '<div class="days-grid">';
    for (let i = 0; i < startDow; i++) html += '<div></div>';

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date    = new Date(year, m, d);
      const info    = getDayInfo(date);
      const isToday = date.getTime() === today.getTime();

      let cls   = 'day-cell';
      let style = '';
      let bid   = '';
      let inner = `<span class="day-num">${d}</span>`;

      if (!info) {
        // Jour libre
        cls += ' day-free';
      } else if (info.type === 'checkin') {
        const color = info.booking.isOwner ? 'var(--owner)' : 'var(--tenant)';
        cls  += ' day-checkin has-booking';
        style = `background: linear-gradient(to right, transparent 0%, transparent 40%, ${color} 40%, ${color} 100%);`;
        bid   = `data-bid="${BOOKINGS.indexOf(info.booking)}"`;
        inner = `<span class="day-num" style="color:#fff">${d}</span><span class="ci-badge" title="Arrivée">▶</span>`;
      } else if (info.type === 'checkout') {
        const color = info.booking.isOwner ? 'var(--owner)' : 'var(--tenant)';
        cls  += ' day-checkout has-booking';
        style = `background: linear-gradient(to right, ${color} 0%, ${color} 60%, transparent 60%, transparent 100%);`;
        bid   = `data-bid="${BOOKINGS.indexOf(info.booking)}"`;
        inner = `<span class="co-badge" title="Départ">◀</span><span class="day-num" style="color:#fff">${d}</span>`;
      } else if (info.type === 'both') {
        // Départ matin, arrivée après-midi → split en deux couleurs
        const c1 = info.prevBooking.isOwner ? 'var(--owner)' : 'var(--tenant)';
        const c2 = info.booking.isOwner     ? 'var(--owner)' : 'var(--tenant)';
        cls  += ' day-both has-booking';
        style = `background: linear-gradient(to right, ${c1} 50%, ${c2} 50%);`;
        bid   = `data-bid="${BOOKINGS.indexOf(info.booking)}"`;
        inner = `<span class="co-badge" title="Départ">◀</span><span class="day-num" style="color:#fff">${d}</span><span class="ci-badge" title="Arrivée">▶</span>`;
      } else {
        // Milieu de séjour
        const color = info.booking.isOwner ? 'var(--owner)' : 'var(--tenant)';
        cls  += ' day-middle has-booking';
        style = `background:${color};`;
        bid   = `data-bid="${BOOKINGS.indexOf(info.booking)}"`;
        inner = `<span class="day-num" style="color:#fff">${d}</span>`;
      }

      if (isToday) cls += ' day-today';
      html += `<div class="${cls}" style="${style}" ${bid}>${inner}</div>`;
    }
    html += '</div>';
    card.innerHTML = html;

    card.querySelectorAll('.has-booking').forEach(el => {
      el.addEventListener('mouseenter', e => showTooltip(e, el));
      el.addEventListener('mouseleave', hideTooltip);
      el.addEventListener('mousemove',  moveTooltip);
    });
    grid.appendChild(card);
  }
}

// ── Render list ──────────────────────────────────────────────
function renderList(year) {
  const filtered = BOOKINGS
    .filter(b => b.arrDate.getFullYear() === year || b.depDate.getFullYear() === year)
    .sort((a, b) => a.arrDate - b.arrDate);

  if (filtered.length === 0) {
    document.getElementById('list-content').innerHTML = `<div class="empty-msg">Aucune réservation pour ${year}</div>`;
    return;
  }
  let html = '';
  filtered.forEach(b => {
    const color  = b.isOwner ? 'var(--owner)' : 'var(--tenant)';
    const nights = Math.round((b.depDate - b.arrDate) / 86400000);
    html += `
      <div class="booking-row">
        <div class="booking-color-bar" style="background:${color}"></div>
        <div class="booking-info">
          <div class="booking-name">${b.name} <span class="booking-nat">${b.nat}</span></div>
          <div class="booking-dates">${fmtDate(b.arrDate)} → ${fmtDate(b.depDate)} · ${nights} nuit${nights > 1 ? 's' : ''} · ${b.vis} pers.</div>
        </div>
        <div class="booking-meta">
          <div class="booking-price">${b.prix > 0 ? b.prix.toLocaleString('fr-FR') + ' €' : '—'}</div>
        </div>
      </div>`;
  });
  document.getElementById('list-content').innerHTML = html;
}

// ── Tooltip ──────────────────────────────────────────────────
const tip = document.getElementById('tooltip');

function showTooltip(e, el) {
  const idx = el.dataset.bid;
  if (idx === undefined) return;
  const b      = BOOKINGS[+idx];
  const nights = Math.round((b.depDate - b.arrDate) / 86400000);
  const badge  = b.isOwner ? 'owner' : 'tenant';
  const label  = b.isOwner ? 'Propriétaire' : 'Locataire';
  tip.innerHTML = `
    <div class="tooltip-name">${b.name}</div>
    <div class="tooltip-row"><span>Arrivée</span><span class="tooltip-val">${fmtDate(b.arrDate)}</span></div>
    <div class="tooltip-row"><span>Départ</span><span class="tooltip-val">${fmtDate(b.depDate)}</span></div>
    <div class="tooltip-row"><span>Durée</span><span class="tooltip-val">${nights} nuit${nights > 1 ? 's' : ''}</span></div>
    <div class="tooltip-row"><span>Personnes</span><span class="tooltip-val">${b.vis}</span></div>
    <div class="tooltip-row"><span>Nationalité</span><span class="tooltip-val">${b.nat}</span></div>
    ${b.prix > 0 ? `<div class="tooltip-row"><span>Prix</span><span class="tooltip-val">${b.prix.toLocaleString('fr-FR')} €</span></div>` : ''}
    <span class="tooltip-badge ${badge}">${label}</span>
  `;
  tip.style.display = 'block';
  positionTooltip(e);
}

function moveTooltip(e)  { positionTooltip(e); }
function hideTooltip()   { tip.style.display = 'none'; }
function positionTooltip(e) {
  let x = e.clientX + 16, y = e.clientY + 16;
  if (x + 240 > window.innerWidth)  x = e.clientX - 248;
  if (y + 180 > window.innerHeight) y = e.clientY - 188;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}
document.addEventListener('mousemove', e => { if (tip.style.display === 'block') positionTooltip(e); });

// ── Navigation ───────────────────────────────────────────────
function changeYear(delta) {
  currentYear += delta;
  document.getElementById('year-label').textContent = currentYear;
  render();
}

function setView(v) {
  document.getElementById('btn-cal').classList.toggle('active',  v === 'cal');
  document.getElementById('btn-list').classList.toggle('active', v === 'list');
  document.getElementById('cal-view').classList.toggle('hide',   v === 'list');
  document.getElementById('list-view').classList.toggle('show',  v === 'list');
}

function render() {
  renderStats(currentYear);
  renderCalendar(currentYear);
  renderList(currentYear);
}

// ── Init ─────────────────────────────────────────────────────
(async function init() {
  // Détermine l'année de départ en regardant les données de secours
  const years = [...new Set(FALLBACK_DATA.flatMap(b => [
    +b.arr.split('/')[2], +b.dep.split('/')[2]
  ]))].sort();
  if (!years.includes(currentYear) && years.length) {
    currentYear = years[years.length - 1];
  }
  document.getElementById('year-label').textContent = currentYear;

  // Charge d'abord les données locales pour affichage immédiat
  BOOKINGS = enrichBookings(FALLBACK_DATA);
  render();

  // Puis tente la synchro Google Sheets en arrière-plan
  setSyncState('loading', null);
  try {
    const raw = await loadSheetData();
    BOOKINGS  = enrichBookings(raw);
    lastSyncTime = new Date();
    const t  = lastSyncTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setSyncState('success',
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
       ${raw.length} réservations chargées depuis Google Sheets — ${t}`
    );
    render();
  } catch (err) {
    console.warn('Init sync failed, keeping fallback:', err);
    setSyncState('error',
      `⚠️ ${err.message} — <a href="#" onclick="syncFromSheet();return false;" style="color:inherit;font-weight:600">Réessayer</a>`
    );
  }
})();
