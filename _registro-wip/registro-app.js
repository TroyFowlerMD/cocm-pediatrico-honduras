/* ============================================================
   CoCM Camasca — Registry main app
   ============================================================ */

let STATE = {
  pacientes: [],
  visitas: [],
  meds: [],
  config: [],
  tools: {},         // {SMFQ-C: {remission, mild, ...}, ...}
  conditions: {},    // {depression: {es, en}}
  team: [],          // [{name, role}]
  enrichedPatients: [],
  user: '',
};

// ════════════════════════════════════════════════════════════════
// LANGUAGE TOGGLE (mirrors portal convention)
// ════════════════════════════════════════════════════════════════
function setLang(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang);
  localStorage.setItem('coCMCamasca.lang', lang);
  const isEN = lang === 'en';
  document.querySelectorAll('[data-es]').forEach(el => {
    const es = el.getAttribute('data-es'), en = el.getAttribute('data-en');
    if (en) el.textContent = isEN ? en : es;
  });
  // Also swap placeholders
  document.querySelectorAll('[data-es-placeholder]').forEach(el => {
    const es = el.getAttribute('data-es-placeholder'), en = el.getAttribute('data-en-placeholder');
    if (en) el.placeholder = isEN ? en : es;
  });
  const btnES = document.getElementById('btnES'), btnEN = document.getElementById('btnEN');
  if (btnES) btnES.classList.toggle('active', !isEN);
  if (btnEN) btnEN.classList.toggle('active', isEN);
  renderAll();
}

// ════════════════════════════════════════════════════════════════
// THEME TOGGLE
// ════════════════════════════════════════════════════════════════
(function initTheme() {
  const saved = localStorage.getItem('coCMCamasca.theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-theme-toggle]')) {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('coCMCamasca.theme', next);
    }
  });
})();

// ════════════════════════════════════════════════════════════════
// CONFIG MODAL
// ════════════════════════════════════════════════════════════════
function openConfigModal() {
  document.getElementById('cfgAppsScriptUrl').value = cfgGet(REG_LS.APPS_SCRIPT_URL);
  document.getElementById('cfgCsvBaseUrl').value    = cfgGet(REG_LS.CSV_BASE_URL);
  document.getElementById('configModal').style.display = 'flex';
}
function closeConfigModal() { document.getElementById('configModal').style.display = 'none'; }
function saveConfig() {
  cfgSet(REG_LS.APPS_SCRIPT_URL, document.getElementById('cfgAppsScriptUrl').value.trim());
  cfgSet(REG_LS.CSV_BASE_URL,    document.getElementById('cfgCsvBaseUrl').value.trim());
  closeConfigModal();
  reloadData();
}

// ════════════════════════════════════════════════════════════════
// USER IDENTITY
// ════════════════════════════════════════════════════════════════
function setUser(name) {
  STATE.user = name;
  localStorage.setItem(REG_LS.USER, name);
}

function addMeModal() { document.getElementById('addMeModal').style.display = 'flex'; }
function closeAddMeModal() { document.getElementById('addMeModal').style.display = 'none'; }
async function submitAddMe() {
  const name = document.getElementById('addMeName').value.trim();
  const role = document.getElementById('addMeRole').value;
  if (!name) return alert('Ingrese un nombre');
  const row = { Category:'team', Key:name, Value:role, Display_ES: role==='therapist'?'Terapeuta':role==='psychiatrist'?'Psiquiatra':'Otro', Display_EN: role==='therapist'?'Therapist':role==='psychiatrist'?'Psychiatrist':'Other', Active:'TRUE', Notes:'' };
  const res = await writeRow('Config', row);
  if (res.queued) {
    alert(document.documentElement.getAttribute('data-lang')==='en' ? 'Saved locally — will sync when Apps Script is connected.' : 'Guardado localmente — se sincronizará al conectar Apps Script.');
    STATE.config.push(row);
  }
  setUser(name);
  closeAddMeModal();
  populateUserDropdown();
  document.getElementById('userSelect').value = name;
}

// ════════════════════════════════════════════════════════════════
// NEW PATIENT
// ════════════════════════════════════════════════════════════════
function newPatientModal() {
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  const conds = Object.entries(STATE.conditions);
  const toolKeys = Object.keys(STATE.tools);

  document.getElementById('newPatientForm').innerHTML = `
    <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
      ${npField('npName', 'Nombre completo', 'Full name', 'text', true)}
      ${npField('npInitials', 'Iniciales', 'Initials', 'text')}
      ${npField('npDOB', 'Fecha de nacimiento', 'Date of birth', 'date')}
      ${npSelect('npSex', 'Sexo', 'Sex', [['F','F'],['M','M'],['O', lang==='en'?'Other':'Otro']])}
      ${npSelect('npTherapist', 'Terapeuta', 'Therapist', STATE.team.filter(t=>t.role==='therapist').map(t=>[t.name,t.name]))}
      ${npField('npEnrolled', 'Fecha de ingreso', 'Enrollment date', 'date', false, new Date().toISOString().slice(0,10))}
    </div>
    <div style="margin-top: var(--space-3);">
      <label style="display:block;font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;margin-bottom:4px;">${lang==='en'?'Conditions':'Condiciones'}</label>
      <div id="npConds" style="display:flex;flex-wrap:wrap;gap:6px;">
        ${conds.map(([k,v]) => `<label style="display:inline-flex;gap:4px;align-items:center;padding:4px 10px;background:var(--color-surface-offset);border-radius:var(--radius-full);font-size:var(--text-xs);"><input type="checkbox" value="${k}"/>${lang==='en'?v.en:v.es}</label>`).join('')}
      </div>
    </div>
    <div style="margin-top: var(--space-3);">
      <label style="display:block;font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;margin-bottom:4px;">${lang==='en'?'Monitoring tools':'Herramientas de monitoreo'}</label>
      <div id="npTools" style="display:flex;flex-wrap:wrap;gap:6px;">
        ${toolKeys.map(k => `<label style="display:inline-flex;gap:4px;align-items:center;padding:4px 10px;background:var(--color-surface-offset);border-radius:var(--radius-full);font-size:var(--text-xs);"><input type="checkbox" value="${k}"/>${k}</label>`).join('')}
      </div>
    </div>
    <div style="margin-top: var(--space-3);">
      <label style="display:block;font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;margin-bottom:4px;">${lang==='en'?'Notes':'Notas'}</label>
      <textarea id="npNotes" rows="3" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"></textarea>
    </div>
  `;
  document.getElementById('newPatientModal').style.display = 'flex';
}
function closeNewPatientModal() { document.getElementById('newPatientModal').style.display = 'none'; }

function npField(id, es, en, type, req=false, val='') {
  return `<div>
    <label style="display:block;font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;margin-bottom:4px;" data-es="${es}" data-en="${en}">${es}</label>
    <input type="${type}" id="${id}" value="${val}" ${req?'required':''} style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
  </div>`;
}
function npSelect(id, es, en, options) {
  return `<div>
    <label style="display:block;font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;margin-bottom:4px;" data-es="${es}" data-en="${en}">${es}</label>
    <select id="${id}" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
      <option value="">—</option>
      ${options.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
    </select>
  </div>`;
}

async function submitNewPatient() {
  const name = document.getElementById('npName').value.trim();
  if (!name) return alert('Nombre requerido');
  const conds = [...document.querySelectorAll('#npConds input:checked')].map(c => c.value).join(',');
  const tools = [...document.querySelectorAll('#npTools input:checked')].map(c => c.value).join(',');
  // Next ID
  const maxId = STATE.pacientes.reduce((m,p) => {
    const n = parseInt(String(p.Patient_ID||'').replace(/\D/g,'') || '0', 10);
    return n > m ? n : m;
  }, 0);
  const nextId = `CCM-${String(maxId+1).padStart(4,'0')}`;
  const now = new Date().toISOString();
  const row = {
    Patient_ID: nextId,
    Patient_Name: name,
    Initials: document.getElementById('npInitials').value.trim(),
    DOB: document.getElementById('npDOB').value,
    Age: '',
    Sex: document.getElementById('npSex').value,
    Therapist: document.getElementById('npTherapist').value,
    Conditions: conds,
    Tools: tools,
    Enrollment_Date: document.getElementById('npEnrolled').value,
    Status: 'Activo',
    Priority: '',
    Safety_Flag: 'FALSE',
    Safety_Flag_Ack_By: '',
    Safety_Flag_Ack_At: '',
    Notes: document.getElementById('npNotes').value.trim(),
    Created_By: STATE.user || 'unknown',
    Created_At: now,
    Updated_By: '',
    Updated_At: '',
    Schema_Version: '1.0',
  };
  const res = await writeRow('Pacientes', row);
  if (res.queued) {
    alert(document.documentElement.getAttribute('data-lang')==='en' ? 'Queued — will sync when Apps Script is connected.' : 'En cola — se sincronizará al conectar Apps Script.');
  }
  STATE.pacientes.push(row);
  STATE.enrichedPatients = computePatientTiers(STATE.pacientes, STATE.visitas, STATE.tools);
  closeNewPatientModal();
  renderAll();
}

// ════════════════════════════════════════════════════════════════
// DATA LOAD + DROPDOWN POPULATION
// ════════════════════════════════════════════════════════════════
async function loadAndRender() {
  const status = document.getElementById('connStatus');
  const mode = getDataMode();
  status.textContent = mode==='demo' ? 'Modo demo (sin datos reales)' : mode==='csv' ? 'CSV publicado' : 'Apps Script';
  status.className   = mode==='demo' ? 'warn' : 'ok';

  try {
    const data = await fetchAll();
    STATE.pacientes = data.pacientes;
    STATE.visitas   = data.visitas;
    STATE.meds      = data.meds;
    STATE.config    = data.config;
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    status.className = 'err';
    console.error(err);
    return;
  }
  // Parse config
  STATE.tools = parseToolCutoffs(STATE.config);
  STATE.conditions = Object.fromEntries(
    STATE.config.filter(r => r.Category==='condition' && r.Active==='TRUE')
                .map(r => [r.Key, { es: r.Display_ES, en: r.Display_EN }])
  );
  STATE.team = STATE.config.filter(r => r.Category==='team' && r.Active==='TRUE')
                           .map(r => ({ name: r.Key, role: r.Value }));
  STATE.enrichedPatients = computePatientTiers(STATE.pacientes, STATE.visitas, STATE.tools);

  populateUserDropdown();
  populateTherapistFilter();
  populateConditionFilter();
  renderAll();
}

async function reloadData() { await loadAndRender(); }

function populateUserDropdown() {
  const sel = document.getElementById('userSelect');
  sel.innerHTML = '<option value="">—</option>' +
    STATE.team.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
  const saved = localStorage.getItem(REG_LS.USER);
  if (saved && STATE.team.find(t => t.name===saved)) {
    sel.value = saved;
    STATE.user = saved;
  }
}

function populateTherapistFilter() {
  const sel = document.getElementById('filterTherapist');
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  sel.innerHTML = `<option value="">${lang==='en'?'All therapists':'Todos los terapeutas'}</option>` +
    STATE.team.filter(t => t.role==='therapist').map(t => `<option value="${t.name}">${t.name}</option>`).join('');
}

function populateConditionFilter() {
  const sel = document.getElementById('filterCondition');
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  sel.innerHTML = `<option value="">${lang==='en'?'All conditions':'Todas las condiciones'}</option>` +
    Object.entries(STATE.conditions).map(([k,v]) => `<option value="${k}">${lang==='en'?v.en:v.es}</option>`).join('');
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
function renderAll() {
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  const list = filterPatients(STATE.enrichedPatients);

  renderSafetyBanner(list);
  renderStats(list, lang);
  renderPatientSections(list, lang);
}

function filterPatients(all) {
  const therapist = document.getElementById('filterTherapist').value;
  const condition = document.getElementById('filterCondition').value;
  const statusSel = document.getElementById('filterStatus').value;
  const q = document.getElementById('searchBox').value.trim().toLowerCase();

  return all.filter(p => {
    if (therapist && p.Therapist !== therapist) return false;
    if (condition && !(p.Conditions||'').split(',').map(s=>s.trim()).includes(condition)) return false;
    if (statusSel === 'active') {
      if (p.Status && p.Status !== 'Activo') return false;
    } else if (statusSel !== 'all' && statusSel) {
      if (p.Status !== statusSel) return false;
    }
    if (q) {
      const hay = `${p.Patient_Name} ${p.Initials} ${p.Patient_ID}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderSafetyBanner(list) {
  const n = list.filter(p => p._safetyActive).length;
  const b = document.getElementById('safetyBanner');
  document.getElementById('safetyCount').textContent = String(n);
  b.classList.toggle('show', n > 0);
}

function renderStats(list, lang) {
  const byTier = {};
  TIER_ORDER.forEach(t => byTier[t] = 0);
  list.forEach(p => byTier[p._tier]++);
  const safety = list.filter(p => p._safetyActive).length;
  const notImp = list.filter(p => p._visits.some(v => v.Not_Improving_Flag==='TRUE')).length;
  const stale  = list.filter(p => p._daysSinceLastVisit > 56).length; // >8wks

  const card = (lbl_es, lbl_en, val, sub='') =>
    `<div class="stat-card">
      <div class="stat-label" data-es="${lbl_es}" data-en="${lbl_en}">${lang==='en'?lbl_en:lbl_es}</div>
      <div class="stat-value">${val}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
    </div>`;

  document.getElementById('statGrid').innerHTML = [
    card('Pacientes', 'Patients', list.length),
    card('Bandera de seguridad', 'Safety flags', safety, safety > 0 ? '⚠️' : ''),
    card('Severa / Moderada', 'Severe / Moderate', byTier['Severa'] + byTier['Moderada']),
    card('No mejorando', 'Not improving', notImp),
    card('Sin visita >8 sem', 'No visit >8 wks', stale),
  ].join('');
}

function renderPatientSections(list, lang) {
  const container = document.getElementById('patientSections');
  const empty = document.getElementById('emptyState');
  if (!list.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  // Safety group first
  const safety = list.filter(p => p._safetyActive);
  const groups = {};
  TIER_ORDER.forEach(t => groups[t] = []);
  list.filter(p => !p._safetyActive).forEach(p => groups[p._tier].push(p));
  // Within tier: longest-since-last-visit first
  for (const t of TIER_ORDER) {
    groups[t].sort((a,b) => b._daysSinceLastVisit - a._daysSinceLastVisit);
  }

  let html = '';
  if (safety.length) {
    html += renderTierBlock(
      lang==='en' ? 'SAFETY — PINNED' : 'SEGURIDAD — FIJADOS',
      'tier-severe', safety, lang, { pinned: true }
    );
  }
  for (const tier of TIER_ORDER) {
    if (!groups[tier].length) continue;
    const label = lang==='en' ? TIER_EN[tier].toUpperCase() : tier.toUpperCase();
    html += renderTierBlock(label, TIER_CLASS[tier], groups[tier], lang);
  }
  container.innerHTML = html;
}

function renderTierBlock(label, tierClass, patients, lang, opts={}) {
  return `
    <div class="tier-block">
      <div class="tier-pill ${tierClass}">${label} · ${patients.length}</div>
      <div class="pat-table-wrap">
        <table class="pat-table">
          <thead>
            <tr>
              <th data-es="Paciente" data-en="Patient">${lang==='en'?'Patient':'Paciente'}</th>
              <th data-es="Condiciones" data-en="Conditions">${lang==='en'?'Conditions':'Condiciones'}</th>
              <th data-es="Última medición" data-en="Latest score">${lang==='en'?'Latest score':'Última medición'}</th>
              <th data-es="Δ vs. baseline" data-en="Δ vs. baseline">Δ vs. baseline</th>
              <th data-es="Tendencia" data-en="Trend">${lang==='en'?'Trend':'Tendencia'}</th>
              <th data-es="Terapeuta" data-en="Therapist">${lang==='en'?'Therapist':'Terapeuta'}</th>
              <th data-es="Última visita" data-en="Last visit">${lang==='en'?'Last visit':'Última visita'}</th>
              <th data-es="Banderas" data-en="Flags">${lang==='en'?'Flags':'Banderas'}</th>
            </tr>
          </thead>
          <tbody>
            ${patients.map(p => renderPatientRow(p, lang, opts)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPatientRow(p, lang, opts={}) {
  const latest = p._tierTool ? p._latestByTool[p._tierTool] : null;
  const visitsOfTool = p._tierTool ? p._visits.filter(v => v.Tool===p._tierTool).slice().reverse() : [];
  const baseline = latest ? Number(latest.Baseline_Score || visitsOfTool[0]?.Score || latest.Score) : null;
  const delta = latest && baseline != null ? (Number(latest.Score) - baseline) : null;
  const deltaClass = delta == null ? 'score-delta-flat' : delta < 0 ? 'score-delta-down' : delta > 0 ? 'score-delta-up' : 'score-delta-flat';
  const deltaStr = delta == null ? '—' : (delta > 0 ? `+${delta}` : `${delta}`);

  const condChips = (p.Conditions||'').split(',').map(s=>s.trim()).filter(Boolean).map(c => {
    const d = STATE.conditions[c];
    const lbl = d ? (lang==='en'?d.en:d.es) : c;
    return `<span class="cond-chip">${lbl}</span>`;
  }).join('');

  const notImp = p._visits.some(v => v.Not_Improving_Flag==='TRUE');
  const flags = [];
  if (p._safetyActive || opts.pinned) flags.push(`<span class="pat-row-safety">${lang==='en'?'SAFETY':'SEGURIDAD'}</span>`);
  if (notImp) flags.push(`<span class="flag-notimp" data-es="No mejora" data-en="Not improving">${lang==='en'?'Not improving':'No mejora'}</span>`);
  if (p._daysSinceLastVisit > 56 && p._daysSinceLastVisit < 9999) flags.push(`<span class="flag-notimp">${lang==='en'?'Stale':'Atrasado'}</span>`);

  const rowClass = (p._safetyActive || opts.pinned) ? 'pinned' : '';

  return `
    <tr class="${rowClass}" onclick="goPatient('${p.Patient_ID}')">
      <td data-label="${lang==='en'?'Patient':'Paciente'}">
        <div class="pat-name">${escapeHtml(p.Patient_Name)}</div>
        <div class="pat-meta">${p.Patient_ID} · ${p.Age||'?'}${lang==='en'?'y':'a'} · ${p.Sex||'—'}</div>
      </td>
      <td data-label="${lang==='en'?'Conditions':'Condiciones'}">
        <div class="cond-chips">${condChips || '—'}</div>
      </td>
      <td data-label="${lang==='en'?'Latest score':'Última medición'}">
        ${latest ? `<span class="tool-chip">${p._tierTool}</span><span class="score-cell">${latest.Score}</span>` : '—'}
      </td>
      <td data-label="Δ" class="${deltaClass}">${deltaStr}</td>
      <td data-label="${lang==='en'?'Trend':'Tendencia'}">${sparkline(visitsOfTool.map(v => Number(v.Score)))}</td>
      <td data-label="${lang==='en'?'Therapist':'Terapeuta'}">${escapeHtml(p.Therapist||'—')}</td>
      <td data-label="${lang==='en'?'Last visit':'Última visita'}">
        ${p._lastVisitDate || '—'}
        <div class="pat-meta">${p._daysSinceLastVisit < 9999 ? p._daysSinceLastVisit+'d' : ''}</div>
      </td>
      <td data-label="${lang==='en'?'Flags':'Banderas'}">${flags.join(' ') || '—'}</td>
    </tr>
  `;
}

function sparkline(values) {
  if (!values || values.length < 2) return '<svg class="trend-spark"></svg>';
  const clean = values.filter(v => !isNaN(v));
  if (clean.length < 2) return '<svg class="trend-spark"></svg>';
  const w = 80, h = 24, pad = 2;
  const max = Math.max(...clean), min = Math.min(...clean);
  const range = max - min || 1;
  const step = (w - pad*2) / (clean.length - 1);
  const pts = clean.map((v,i) => `${pad + i*step},${h - pad - ((v - min)/range) * (h - pad*2)}`);
  const last = clean[clean.length-1], first = clean[0];
  const color = last < first ? 'var(--color-success)' : last > first ? 'var(--color-error)' : 'var(--color-text-muted)';
  return `<svg class="trend-spark" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts.join(' ')}"/></svg>`;
}

function escapeHtml(s) {
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function goPatient(id) {
  location.href = `registro-paciente.html?id=${encodeURIComponent(id)}`;
}

// ════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Restore language preference
  const savedLang = localStorage.getItem('coCMCamasca.lang') || 'es';
  setLang(savedLang);
  loadAndRender();
});
