/* ============================================================
   CoCM Camasca — Registry main app (streamlined)
   ============================================================ */

let STATE = {
  pacientes: [],
  visitas: [],
  meds: [],
  config: [],
  tools: {},         // {SMFQ-C: {remission, mild, ...}, ...}
  conditions: {},    // {depression: {es, en}}
  team: [],          // [{name, role}]
  authorizedUsers: [], // v1.1: from AuthorizedUsers tab
  enrichedPatients: [],
  user: '',
  dataset: 'real',   // 'real' | 'test'
};

// ════════════════════════════════════════════════════════════════
// LANGUAGE TOGGLE
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
  document.querySelectorAll('[data-es-placeholder]').forEach(el => {
    const es = el.getAttribute('data-es-placeholder'), en = el.getAttribute('data-en-placeholder');
    if (en) el.placeholder = isEN ? en : es;
  });
  // Tooltip (title attribute) localization — used by status-filter options etc.
  document.querySelectorAll('[data-tip-es]').forEach(el => {
    const es = el.getAttribute('data-tip-es'), en = el.getAttribute('data-tip-en');
    if (en) el.setAttribute('title', isEN ? en : es);
  });
  const btnES = document.getElementById('btnES'), btnEN = document.getElementById('btnEN');
  if (btnES) btnES.classList.toggle('active', !isEN);
  if (btnEN) btnEN.classList.toggle('active', isEN);
  // Update how-to card body (uses rich HTML, can't use data-es/data-en attrs)
  renderHowto();
  // Refresh the connection status label (it's excluded from data-es/data-en sweep to avoid flashing "Configuring…")
  const connStatus = document.getElementById('connStatus');
  if (connStatus && typeof getDataMode === 'function' && typeof translateMode === 'function') {
    try { connStatus.textContent = translateMode(getDataMode()); } catch (_) {}
  }
  // Re-populate dropdowns that contain dynamic (t()-translated) options,
  // preserving the user's current selection.
  try {
    const therapistSel = document.getElementById('filterTherapist');
    const conditionSel = document.getElementById('filterCondition');
    const prevTherapist = therapistSel ? therapistSel.value : '';
    const prevCondition = conditionSel ? conditionSel.value : '';
    if (STATE.team && STATE.team.length) populateTherapistFilter();
    if (STATE.conditions && Object.keys(STATE.conditions).length) populateConditionFilter();
    if (therapistSel) therapistSel.value = prevTherapist;
    if (conditionSel) conditionSel.value = prevCondition;
  } catch (_) {}
  // Re-render to re-apply any dynamic t() strings
  if (STATE.enrichedPatients.length || STATE.pacientes.length) renderAll();
}

// How-to card body (rich HTML, language-aware)
function renderHowto() {
  const el = document.getElementById('howtoBody');
  if (el) el.innerHTML = t('howto_registry_body');
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
  renderFeatureToggles();
  document.getElementById('configModal').style.display = 'flex';
}
function closeConfigModal() { document.getElementById('configModal').style.display = 'none'; }
function saveConfig() {
  cfgSet(REG_LS.APPS_SCRIPT_URL, document.getElementById('cfgAppsScriptUrl').value.trim());
  cfgSet(REG_LS.CSV_BASE_URL,    document.getElementById('cfgCsvBaseUrl').value.trim());
  // Persist feature toggles
  // Simplified-mode master was removed (April 2026) — force off so any legacy
  // localStorage value stops suppressing columns.
  featSet('simplified_mode', false);
  document.querySelectorAll('#featGrid input[data-feat]').forEach(inp => {
    featSet(inp.dataset.feat, inp.checked);
  });
  closeConfigModal();
  reloadData();
}

// ── Render feature-flag toggles inside Config modal ──
function renderFeatureToggles() {
  const grid = document.getElementById('featGrid');
  if (!grid) return;

  const items = [
    { key: 'show_psych_consult',    i18n: 'feat_psych_consult' },
    { key: 'show_bhcm_contact',     i18n: 'feat_bhcm_contact'  },
    { key: 'show_review_flag',      i18n: 'feat_review_flag'   },
    { key: 'show_due_for_review',   i18n: 'feat_due_review'    },
    { key: 'show_enrollment_date',  i18n: 'feat_enrollment'    },
    { key: 'show_baseline_on_main', i18n: 'feat_baseline'      },
    { key: 'show_trend_sparkline',  i18n: 'feat_trend'         },
    { key: 'show_delta_column',     i18n: 'feat_delta'         },
    { key: 'show_conditions_column',i18n: 'feat_conditions'    },
  ];
  grid.innerHTML = items.map(it => {
    const checked = featGet(it.key) ? 'checked' : '';
    return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
      <input type="checkbox" data-feat="${it.key}" ${checked} />
      <span>${t(it.i18n)}</span>
    </label>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════════
// DATASET TOGGLE (real vs test)
// ════════════════════════════════════════════════════════════════
function initDataset() {
  // Precedence: URL param > localStorage > 'real'
  const params = new URLSearchParams(location.search);
  const urlVal = params.get('dataset');
  if (urlVal === 'test' || urlVal === 'real') {
    STATE.dataset = urlVal;
    localStorage.setItem('coCMCamasca.dataset', urlVal);
  } else {
    STATE.dataset = localStorage.getItem('coCMCamasca.dataset') || 'real';
  }
  window.REG_DATASET = STATE.dataset; // exposed to registro-data.js
}
function setDataset(val) {
  STATE.dataset = val;
  window.REG_DATASET = val;
  localStorage.setItem('coCMCamasca.dataset', val);
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
  if (!name) { showToast(t('err_required_name'), { variant: 'warn' }); return; }
  const row = {
    Category: 'team',
    Key: name,
    Value: role,
    Display_ES: role==='therapist'?'Terapeuta':role==='psychiatrist'?'Psiquiatra':'Otro',
    Display_EN: role==='therapist'?'Therapist':role==='psychiatrist'?'Psychiatrist':'Other',
    Active: 'TRUE',
    Notes: ''
  };
  try {
    const res = await writeRow('Config', row);
    if (res.queued) showToast(t('saved_local_pending'), { variant: 'warn' });
    else showToast(t('saved'), { variant: 'success' });
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error' });
  }
  STATE.config.push(row);
  STATE.team.push({ name, role });
  setUser(name);
  closeAddMeModal();
  populateUserDropdown();
  populateTherapistFilter();
  document.getElementById('userSelect').value = name;
}

// ════════════════════════════════════════════════════════════════
// NEW PATIENT — Quick-Add flow
// ════════════════════════════════════════════════════════════════
function newPatientModal() {
  renderNewPatientForm(false);
  document.getElementById('newPatientModal').style.display = 'flex';
  // Focus the name field
  setTimeout(() => document.getElementById('npName')?.focus(), 50);
}
function closeNewPatientModal() {
  document.getElementById('newPatientModal').style.display = 'none';
}

function renderNewPatientForm(showAll) {
  const lang = getLang();
  const conds = Object.entries(STATE.conditions);
  const toolKeys = Object.keys(STATE.tools);
  const therapists = STATE.team.filter(t => t.role === 'therapist');

  // MINIMAL fields always visible
  const minimal = `
    <div class="np-minimal">
      ${npField('npName', 'label_full_name', 'text', true, '', 'placeholder-name')}
      <div class="np-row-2">
        ${npField('npDOB', 'label_dob', 'date', false, '')}
        ${npSelect('npSex', 'label_sex', [
          ['F', t('sex_f')],
          ['M', t('sex_m')],
          ['O', t('sex_o')],
        ])}
      </div>
      <div class="np-row-2">
        ${npSelect('npPrimaryCond', 'label_primary_cond',
          conds.map(([k,v]) => [k, lang==='en' ? v.en : v.es])
        )}
        ${npSelect('npTherapist', 'label_therapist',
          therapists.map(t => [t.name, t.name])
        )}
      </div>
      <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:8px;">${t('modal_newpat_min_hint')}</p>
    </div>
    <button type="button" class="np-toggle-details" id="npToggleDetails" onclick="togglePatientDetails()" style="margin-top:var(--space-3);background:transparent;border:1px dashed var(--color-border);color:var(--color-primary);padding:8px 14px;border-radius:var(--radius-md);font-size:var(--text-xs);cursor:pointer;width:100%;font-weight:600;">
      ${showAll ? '▴ ' + t('label_add_details').replace(/^Agregar /,'Ocultar ').replace(/^Add /,'Hide ') : '▾ ' + t('label_add_details')}
    </button>
  `;

  // FULL fields (collapsed by default)
  const full = showAll ? `
    <div class="np-full" style="margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-divider);">
      ${npField('npEnrolled', 'label_enrollment', 'date', false, new Date().toISOString().slice(0,10))}
      <div style="margin-top: var(--space-3);">
        <label class="np-label">${t('label_conditions')}</label>
        <div id="npConds" style="display:flex;flex-wrap:wrap;gap:6px;">
          ${conds.map(([k,v]) => `<label style="display:inline-flex;gap:4px;align-items:center;padding:4px 10px;background:var(--color-surface-offset);border-radius:var(--radius-full);font-size:var(--text-xs);cursor:pointer;"><input type="checkbox" value="${k}"/>${lang==='en'?v.en:v.es}</label>`).join('')}
        </div>
      </div>
      <div style="margin-top: var(--space-3);">
        <label class="np-label">${t('label_tools')}</label>
        <div id="npTools" style="display:flex;flex-wrap:wrap;gap:6px;">
          ${toolKeys.map(k => `<label style="display:inline-flex;gap:4px;align-items:center;padding:4px 10px;background:var(--color-surface-offset);border-radius:var(--radius-full);font-size:var(--text-xs);cursor:pointer;"><input type="checkbox" value="${k}"/>${k}</label>`).join('')}
        </div>
      </div>
      <div style="margin-top: var(--space-3);">
        <label class="np-label">${t('label_notes')}</label>
        <textarea id="npNotes" rows="3" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"></textarea>
      </div>
    </div>
  ` : '';

  document.getElementById('newPatientForm').innerHTML = minimal + full;
}

function togglePatientDetails() {
  const current = document.querySelector('.np-full') != null;
  // Preserve entered values before re-render
  const saved = {
    npName: document.getElementById('npName')?.value || '',
    npDOB: document.getElementById('npDOB')?.value || '',
    npSex: document.getElementById('npSex')?.value || '',
    npPrimaryCond: document.getElementById('npPrimaryCond')?.value || '',
    npTherapist: document.getElementById('npTherapist')?.value || '',
    npEnrolled: document.getElementById('npEnrolled')?.value || '',
    npNotes: document.getElementById('npNotes')?.value || '',
    npConds: [...document.querySelectorAll('#npConds input:checked')].map(c => c.value),
    npTools: [...document.querySelectorAll('#npTools input:checked')].map(c => c.value),
  };
  renderNewPatientForm(!current);
  // Restore
  for (const id of ['npName','npDOB','npSex','npPrimaryCond','npTherapist','npEnrolled','npNotes']) {
    const el = document.getElementById(id);
    if (el && saved[id]) el.value = saved[id];
  }
  for (const v of saved.npConds) {
    const cb = document.querySelector(`#npConds input[value="${v}"]`);
    if (cb) cb.checked = true;
  }
  for (const v of saved.npTools) {
    const cb = document.querySelector(`#npTools input[value="${v}"]`);
    if (cb) cb.checked = true;
  }
}

// Age in years from an ISO YYYY-MM-DD DOB string.
function computeAgeFromDOB(dobISO) {
  if (!dobISO) return '';
  const dob = new Date(dobISO);
  if (isNaN(dob.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const mo = now.getMonth() - dob.getMonth();
  if (mo < 0 || (mo === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : '';
}

function npField(id, labelKey, type, req=false, val='', phKey='') {
  return `<div>
    <label class="np-label">${t(labelKey)}${req ? ' <span style="color:var(--color-error);">*</span>' : ''}</label>
    <input type="${type}" id="${id}" value="${val}" ${req?'required':''} style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
  </div>`;
}
function npSelect(id, labelKey, options) {
  return `<div>
    <label class="np-label">${t(labelKey)}</label>
    <select id="${id}" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
      <option value="">—</option>
      ${options.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
    </select>
  </div>`;
}

// Simple fuzzy name-similarity check for duplicate detection
function normalizeName(s) {
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g,'').trim();
}
function findPossibleDuplicates(name, age) {
  const n = normalizeName(name);
  if (!n) return [];
  const parts = n.split(/\s+/).filter(Boolean);
  return STATE.pacientes.filter(p => {
    const pn = normalizeName(p.Patient_Name);
    if (!pn) return false;
    // Exact match
    if (pn === n) return true;
    // All entered parts appear in existing name (or vice versa for short queries)
    const pParts = pn.split(/\s+/).filter(Boolean);
    const common = parts.filter(x => pParts.includes(x)).length;
    if (parts.length >= 2 && common >= 2) return true;
    return false;
  });
}

async function submitNewPatient(skipDupCheck=false) {
  const name = document.getElementById('npName').value.trim();
  if (!name) {
    showToast(t('err_name_required'), { variant: 'warn' });
    document.getElementById('npName')?.focus();
    return;
  }
  // DOB-based age calculation (DOB replaces Age on the form)
  const dobStr = document.getElementById('npDOB')?.value || '';
  const ageStr = dobStr ? String(computeAgeFromDOB(dobStr)) : '';

  // Duplicate check
  if (!skipDupCheck) {
    const dups = findPossibleDuplicates(name, ageStr);
    if (dups.length) {
      showDuplicateWarning(dups);
      return;
    }
  }

  // Collect fields (detail section may or may not be rendered)
  const primaryCond = document.getElementById('npPrimaryCond')?.value || '';
  let conds = [...document.querySelectorAll('#npConds input:checked')].map(c => c.value);
  if (primaryCond && !conds.includes(primaryCond)) conds.unshift(primaryCond);
  const condsStr = conds.join(',');

  const tools = [...document.querySelectorAll('#npTools input:checked')].map(c => c.value).join(',');

  // Next ID
  const maxId = STATE.pacientes.reduce((m,p) => {
    const n = parseInt(String(p.Patient_ID||'').replace(/\D/g,'') || '0', 10);
    return n > m ? n : m;
  }, 0);
  const nextId = `CCM-${String(maxId+1).padStart(4,'0')}`;
  const now = new Date().toISOString();
  // Auto-compute initials from patient name
  const _nameParts = name.trim().split(/\s+/).filter(Boolean);
  const _initials = _nameParts.length >= 2
    ? (_nameParts[0][0] + _nameParts[_nameParts.length-1][0]).toUpperCase()
    : (_nameParts[0]?.[0] || '').toUpperCase();
  const row = {
    Patient_ID: nextId,
    Patient_Name: name,
    Initials: _initials,
    DOB: dobStr,
    Age: ageStr,
    Sex: document.getElementById('npSex')?.value || '',
    Therapist: document.getElementById('npTherapist')?.value || '',
    Conditions: condsStr,
    Primary_Condition: primaryCond,
    Primary_Condition_Verified: primaryCond ? 'TRUE' : '',
    Tools: tools,
    Enrollment_Date: document.getElementById('npEnrolled')?.value || new Date().toISOString().slice(0,10),
    Status: 'Activo',
    Priority: '',
    Safety_Flag: 'FALSE',
    Safety_Flag_Ack_By: '',
    Safety_Flag_Ack_At: '',
    Notes: document.getElementById('npNotes')?.value.trim() || '',
    Created_By: STATE.user || 'unknown',
    Created_At: now,
    Updated_By: '',
    Updated_At: '',
    Schema_Version: '1.0',
  };
  let saveOk = false;
  try {
    const res = await writeRow('Pacientes', row);
    if (res.queued) {
      showToast(t('queued_pending'), { variant: 'warn' });
    } else {
      showToast(t('saved_patient', { name }), { variant: 'success' });
    }
    saveOk = true;
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => submitNewPatient(true) });
  }
  STATE.pacientes.push(row);
  STATE.enrichedPatients = computePatientTiers(STATE.pacientes, STATE.visitas, STATE.tools);
  closeNewPatientModal();
  renderAll();
  // PSC-17 prompt: offer to open the qualifying screening for this new patient
  if (saveOk) {
    setTimeout(() => {
      const en = getLang() === 'en';
      const firstName = String(name || '').trim().split(/\s+/)[0] || (en ? 'this patient' : 'este paciente');
      const msg = en
        ? `Open PSC-17 (qualifying screening) for ${firstName} now?\n\nThis is the one-time screening that determines CoCM eligibility and primary condition.`
        : `¿Abrir PSC-17 (cribado de ingreso) para ${firstName} ahora?\n\nEs el cribado inicial que determina la elegibilidad para CoCM y la condición principal.`;
      if (window.confirm(msg)) {
        window.open('https://troyfowlermd.github.io/cocm-pediatrico-honduras/psc17.html', '_blank', 'noopener');
      }
    }, 400);
  }
}

function showDuplicateWarning(dups) {
  const host = document.getElementById('newPatientForm');
  const warning = document.createElement('div');
  warning.id = 'dupWarning';
  warning.style.cssText = 'margin-bottom:var(--space-3);background:var(--color-warning-highlight);border:1px solid var(--color-warning);border-radius:var(--radius-md);padding:var(--space-3);';
  warning.innerHTML = `
    <div style="font-weight:700;color:var(--color-warning);margin-bottom:6px;">⚠ ${t('dup_warn_title')}</div>
    <div style="font-size:var(--text-sm);color:var(--color-text);margin-bottom:8px;">${t('dup_warn_body')}</div>
    <ul style="font-size:var(--text-sm);margin:0 0 12px 20px;color:var(--color-text);">
      ${dups.map(d => `<li><strong>${escapeHtml(d.Patient_Name)}</strong> · ${d.Patient_ID} · ${d.Age||'?'}${t('years_suffix')} · ${d.Sex||'?'} · ${escapeHtml(d.Therapist||'—')}</li>`).join('')}
    </ul>
    <div style="display:flex;gap:8px;">
      <button onclick="closeNewPatientModal()" class="ghost" style="padding:6px 12px;border-radius:var(--radius-md);border:1px solid var(--color-border);background:transparent;color:var(--color-text);cursor:pointer;">${t('dup_cancel')}</button>
      <button onclick="document.getElementById('dupWarning').remove(); submitNewPatient(true);" class="primary" style="padding:6px 12px;border-radius:var(--radius-md);background:var(--color-warning);color:white;border:none;font-weight:600;cursor:pointer;">${t('dup_continue')}</button>
    </div>
  `;
  const existing = document.getElementById('dupWarning');
  if (existing) existing.remove();
  host.insertBefore(warning, host.firstChild);
  host.scrollTop = 0;
}

// ════════════════════════════════════════════════════════════════
// DATA LOAD + DROPDOWN POPULATION
// ════════════════════════════════════════════════════════════════
async function loadAndRender() {
  const status = document.getElementById('connStatus');
  const mode = getDataMode();
  status.textContent = translateMode(mode);
  status.className   = mode==='demo' ? 'warn' : 'ok';

  try {
    const data = await fetchAll();
    STATE.pacientes = data.pacientes;
    STATE.visitas   = data.visitas;
    STATE.meds      = data.meds;
    STATE.config    = data.config;
    STATE.authorizedUsers = data.authorizedUsers || [];
  } catch (err) {
    status.textContent = t('generic_error', { msg: err.message });
    status.className = 'err';
    console.error(err);
    showToast(t('conn_lost'), { variant: 'error', retry: () => loadAndRender() });
    return;
  }
  STATE.tools = parseToolCutoffs(STATE.config);
  STATE.conditions = Object.fromEntries(
    STATE.config.filter(r => r.Category==='condition' && isActiveRow(r))
                .map(r => [r.Key, { es: r.Display_ES, en: r.Display_EN }])
  );
  STATE.team = STATE.config.filter(r => r.Category==='team' && isActiveRow(r))
                           .map(r => ({ name: r.Key, role: r.Value }));
  STATE.enrichedPatients = computePatientTiers(STATE.pacientes, STATE.visitas, STATE.tools);

  populateUserDropdown();
  populateTherapistFilter();
  populateConditionFilter();
  updateDatasetToggleUI();
  renderAll();
}

async function reloadData() { await loadAndRender(); }

function populateUserDropdown() {
  const sel = document.getElementById('userSelect');
  if (!sel) return; // element missing (likely wiped by auth block) — skip rather than crash
  sel.innerHTML = '<option value="">—</option>' +
    STATE.team.map(tm => `<option value="${tm.name}">${tm.name}</option>`).join('');
  const saved = localStorage.getItem(REG_LS.USER);
  if (saved && STATE.team.find(tm => tm.name===saved)) {
    sel.value = saved;
    STATE.user = saved;
  }
}

function populateTherapistFilter() {
  const sel = document.getElementById('filterTherapist');
  if (!sel) return;
  sel.innerHTML = `<option value="">${t('filter_all_therapists')}</option>` +
    STATE.team.filter(tm => tm.role==='therapist').map(tm => `<option value="${tm.name}">${tm.name}</option>`).join('');
}

function populateConditionFilter() {
  const sel = document.getElementById('filterCondition');
  if (!sel) return;
  const lang = getLang();
  sel.innerHTML = `<option value="">${t('filter_all_conditions')}</option>` +
    Object.entries(STATE.conditions).map(([k,v]) => `<option value="${k}">${lang==='en'?v.en:v.es}</option>`).join('');
}

function updateDatasetToggleUI() {
  const el = document.getElementById('datasetToggle');
  if (!el) return;
  el.value = STATE.dataset;
  const banner = document.getElementById('datasetBanner');
  if (banner) banner.style.display = STATE.dataset === 'test' ? 'flex' : 'none';
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
function renderAll() {
  const lang = getLang();
  const list = filterAndSortPatients(STATE.enrichedPatients);

  renderSafetyBanner(list);
  renderStats(list, lang);
  renderPatientSections(list, lang);
  renderStatusChips(lang);
}

function filterAndSortPatients(all) {
  const therapist = document.getElementById('filterTherapist').value;
  const condition = document.getElementById('filterCondition').value;
  const statusSel = document.getElementById('filterStatus').value;
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const sortBy = document.getElementById('sortBy')?.value || 'primary_group';

  let list = all.filter(p => {
    if (therapist && p.Therapist !== therapist) return false;
    if (condition && !(p.Conditions||'').split(',').map(s=>s.trim()).includes(condition)) return false;
    if (statusSel === 'active') {
      if (p.Status && p.Status !== 'Activo') return false;
    } else if (statusSel === 'due_followup') {
      // Active patients: overdue at >= 8 wks. Stable patients: >= 16 wks.
      const isStable = String(p.Status||'').toLowerCase() === 'estable' || String(p.Status||'') === 'Stable';
      const threshold = isStable ? 112 : 56;
      if (p._daysSinceLastVisit < threshold) return false;
      const s = p.Status;
      if (s && s !== 'Activo' && s !== 'Estable' && s !== 'Stable') return false;
    } else if (statusSel === 'safety') {
      if (!p._safetyActive) return false;
    } else if (statusSel === 'brigade') {
      if (!isTruthyFlag(p.Brigade_Flag)) return false;
    } else if (statusSel !== 'all' && statusSel) {
      if (p.Status !== statusSel) return false;
    }
    if (q) {
      const hay = `${p.Patient_Name} ${p.Initials} ${p.Patient_ID}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Sort
  // For primary_group, actual grouping is done in renderPatientSections;
  // here we only sort within-group by primary score DESC (nulls last →
  // most-overdue first as tiebreaker).
  if (sortBy === 'primary_group') {
    list.sort((a, b) => {
      const groupOrder = PRIMARY_GROUPS.indexOf(a._primaryGroup) - PRIMARY_GROUPS.indexOf(b._primaryGroup);
      if (groupOrder !== 0) return groupOrder;
      // Within group: primary_score DESC, nulls last
      const as = (a._primaryScore == null) ? -Infinity : a._primaryScore;
      const bs = (b._primaryScore == null) ? -Infinity : b._primaryScore;
      if (bs !== as) return bs - as;
      // Both null → most overdue first
      return b._daysSinceLastVisit - a._daysSinceLastVisit;
    });
  } else {
    list.sort((a, b) => {
      if (sortBy === 'severity') return tierRank(a._tier) - tierRank(b._tier) || b._daysSinceLastVisit - a._daysSinceLastVisit;
      if (sortBy === 'name') return String(a.Patient_Name||'').localeCompare(String(b.Patient_Name||''));
      if (sortBy === 'recent') return a._daysSinceLastVisit - b._daysSinceLastVisit;
      // default: most overdue first (longest since last visit)
      return b._daysSinceLastVisit - a._daysSinceLastVisit;
    });
  }
  list._sortBy = sortBy;
  return list;
}

function renderSafetyBanner(list) {
  const n = list.filter(p => p._safetyActive).length;
  const b = document.getElementById('safetyBanner');
  document.getElementById('safetyCount').textContent = String(n);
  b.classList.toggle('show', n > 0);
}

function renderStats(list, lang) {
  const byTier = {};
  TIER_ORDER.forEach(x => byTier[x] = 0);
  list.forEach(p => byTier[p._tier]++);
  const safety = list.filter(p => p._safetyActive).length;
  const notImp = list.filter(p => isNotImproving(p)).length;
  // Lapsed: Active >8wk (56d), Stable >16wk (112d). Skip Inactivo/Transferido.
  const lapsedThresh = p => (String(p.Status||'').toLowerCase()==='estable' || p.Status==='Stable') ? 112 : 56;
  const stale  = list.filter(p => {
    const s = String(p.Status||'');
    if (s && s !== 'Activo' && s !== 'Estable' && s !== 'Stable') return false;
    return p._daysSinceLastVisit > lapsedThresh(p) && p._daysSinceLastVisit < 9999;
  }).length;
  const due    = list.filter(p => {
    const s = String(p.Status||'');
    if (s && s !== 'Activo' && s !== 'Estable' && s !== 'Stable') return false;
    return p._daysSinceLastVisit >= lapsedThresh(p) && p._daysSinceLastVisit < 9999;
  }).length;

  const card = (label, val, sub='', accent='') =>
    `<div class="stat-card ${accent}">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${val}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
    </div>`;

  document.getElementById('statGrid').innerHTML = [
    card(t('stat_patients'),     list.length),
    card(t('stat_safety'),       safety, safety > 0 ? '⚠' : '', safety > 0 ? 'stat-accent-error' : ''),
    card(t('stat_sev_mod'),      byTier['Severa'] + byTier['Moderada']),
    card(t('stat_not_improving'), notImp),
    card(t('stat_due_followup'), due, '≥8wk'),
    card(t('stat_stale'),        stale),
  ].join('');
}

function renderStatusChips(lang) {
  // Clickable chips for quick filtering below the toolbar
  const host = document.getElementById('statusChips');
  if (!host) return;
  const current = document.getElementById('filterStatus').value || 'active';
  const chips = [
    ['active',        t('filter_active')],
    ['all',           t('filter_all')],
    ['safety',        '⚠ ' + (lang==='en' ? 'Safety flag' : 'Seguridad')],
    ['brigade',       '🚩 ' + (lang==='en' ? 'Brigade' : 'Brigada')],
    ['due_followup',  t('stat_due_followup')],
    ['Estable',       (lang==='en'?'Stable':'Estable')],
    ['Inactivo',      (lang==='en'?'Inactive':'Inactivo')],
    ['Transferido',   (lang==='en'?'Transferred':'Transferido')],
    ['Otro',          (lang==='en'?'Other':'Otro')],
  ];
  host.innerHTML = chips.map(([val, label]) => {
    const active = current === val;
    return `<button class="status-chip${active?' active':''}" onclick="selectStatusChip('${val}')">${label}</button>`;
  }).join('');
}

function selectStatusChip(val) {
  document.getElementById('filterStatus').value = val;
  renderAll();
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
  // Defer scrollbar wiring until the DOM is in place.
  setTimeout(wireTopScrollbars, 0);

  // Safety group first — always pinned above other groupings.
  const safety = list.filter(p => p._safetyActive);
  const nonSafety = list.filter(p => !p._safetyActive);

  const sortBy = list._sortBy || 'primary_group';

  let html = '';
  if (safety.length) {
    const pinLabel = t('safety_pinned');
    html += renderTierBlock(pinLabel, 'tier-severe', safety, lang, { pinned: true });
  }

  if (sortBy === 'primary_group') {
    // Group by _primaryGroup in PRIMARY_GROUPS order.
    const byGroup = {};
    PRIMARY_GROUPS.forEach(g => byGroup[g] = []);
    nonSafety.forEach(p => {
      const g = PRIMARY_GROUPS.includes(p._primaryGroup) ? p._primaryGroup : 'mixed_other';
      byGroup[g].push(p);
    });
    for (const g of PRIMARY_GROUPS) {
      if (!byGroup[g].length) continue;
      const labels = PRIMARY_GROUP_LABELS[g] || { es: g, en: g };
      const label = (lang === 'en' ? labels.en : labels.es).toUpperCase();
      html += renderTierBlock(label, `primary-group primary-group-${g}`, byGroup[g], lang);
    }
  } else {
    // Legacy severity-tier grouping
    const groups = {};
    TIER_ORDER.forEach(tier => groups[tier] = []);
    nonSafety.forEach(p => groups[p._tier].push(p));
    for (const tier of TIER_ORDER) {
      if (!groups[tier].length) continue;
      const label = translateTier(tier).toUpperCase();
      html += renderTierBlock(label, TIER_CLASS[tier], groups[tier], lang);
    }
  }
  container.innerHTML = html;
}

// ── Feature-flag helpers for table column visibility ────────────
function visibleColumns() {
  return {
    therapist:    true,
    patient:      true,
    enrolled:     featGet('show_enrollment_date'),
    conditions:   featGet('show_conditions_column'),
    latest_score: true,
    baseline:     featGet('show_baseline_on_main'),
    delta:        featGet('show_delta_column'),
    trend:        featGet('show_trend_sparkline'),
    last_visit:   true,
    last_contact: featGet('show_bhcm_contact'),
    last_psych:   featGet('show_psych_consult'),
    flags:        true,
  };
}

// Days between an ISO date and today. Returns null for invalid/empty input.
function daysSinceISO(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / 86400000);
}

// Format a date + "Nd ago" subline; safe for null/empty.
function fmtDateWithAgo(iso) {
  if (!iso) return '<span class="cell-empty">—</span>';
  const days = daysSinceISO(iso);
  const ago = (days != null && days >= 0) ? `<div class="pat-meta">${t('days_short', { n: days })}</div>` : '';
  return `${escapeHtml(iso)}${ago}`;
}

function renderTierBlock(label, tierClass, patients, lang, opts={}) {
  const cols = visibleColumns();
  const ths = [];
  if (cols.therapist)    ths.push(`<th>${t('th_therapist')}</th>`);
  if (cols.patient)      ths.push(`<th>${t('th_paciente')}</th>`);
  if (cols.enrolled)     ths.push(`<th>${t('th_enrolled')}</th>`);
  if (cols.conditions)   ths.push(`<th>${t('th_conditions')}</th>`);
  if (cols.latest_score) ths.push(`<th>${t('th_latest_score')}</th>`);
  if (cols.baseline)     ths.push(`<th>${t('th_baseline_on_main')}</th>`);
  if (cols.delta)        ths.push(`<th>${t('th_delta')}</th>`);
  if (cols.trend)        ths.push(`<th>${t('th_trend')}</th>`);
  if (cols.last_visit)   ths.push(`<th>${t('th_last_visit')}</th>`);
  if (cols.last_contact) ths.push(`<th>${t('th_last_contact')}</th>`);
  if (cols.last_psych)   ths.push(`<th>${t('th_last_psych')}</th>`);
  if (cols.flags)        ths.push(`<th>${t('th_flags')}</th>`);
  return `
    <div class="tier-block">
      <div class="tier-pill ${tierClass}">${label} · ${patients.length}</div>
      <div class="pat-table-scroll-top" aria-hidden="true"><div class="pat-table-scroll-top-inner"></div></div>
      <div class="pat-table-wrap">
        <table class="pat-table">
          <thead><tr>${ths.join('')}</tr></thead>
          <tbody>
            ${patients.map(p => renderPatientRow(p, lang, opts)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// After render, size + wire the top scrollbar proxies to their tables.
function wireTopScrollbars() {
  document.querySelectorAll('.tier-block').forEach(block => {
    const top   = block.querySelector('.pat-table-scroll-top');
    const inner = block.querySelector('.pat-table-scroll-top-inner');
    const wrap  = block.querySelector('.pat-table-wrap');
    const table = wrap && wrap.querySelector('table.pat-table');
    if (!top || !inner || !wrap || !table) return;
    const setWidth = () => {
      inner.style.width = table.scrollWidth + 'px';
      // Only show if actually overflowing.
      top.style.display = (table.scrollWidth > wrap.clientWidth) ? 'block' : 'none';
    };
    setWidth();
    // Sync scrolls (guard against feedback loop).
    let lock = false;
    top.addEventListener('scroll', () => {
      if (lock) return; lock = true; wrap.scrollLeft = top.scrollLeft; lock = false;
    });
    wrap.addEventListener('scroll', () => {
      if (lock) return; lock = true; top.scrollLeft = wrap.scrollLeft; lock = false;
    });
    // Re-measure on resize.
    if (!block._topScrollObs) {
      const ro = new ResizeObserver(setWidth);
      ro.observe(table);
      ro.observe(wrap);
      block._topScrollObs = ro;
    }
  });
}

// Format the latest-score cell per tool.
//   PHQ-A, GAD-7, SMFQ-C, SMFQ-P, SCARED-N, SCARED-Parent, ASRS → numeric
//   Vanderbilt-Parent, Vanderbilt-Teacher → "Inatt X/9"
//   SNAP-IV → "X.X (Inatt)"
// Colored by severity tier (uses STATE.tools cutoffs + scoreToTier).
function formatScoreCell(latest, tool) {
  if (!latest) return '<span class="cell-empty">—</span>';
  const rawScore = latest.Score;
  // Parse Subscale_Scores (JSON or 'key=val,key=val' freeform)
  let subs = null;
  const subsRaw = latest.Subscale_Scores;
  if (subsRaw) {
    try { subs = JSON.parse(subsRaw); }
    catch(e) {
      subs = {};
      String(subsRaw).split(/[,;\|]/).forEach(pair => {
        const [k,v] = String(pair).split(/[:=]/).map(s => (s||'').trim());
        if (k) subs[k.toLowerCase()] = v;
      });
    }
  }
  const getSub = (keys) => {
    if (!subs) return null;
    for (const k of keys) {
      if (subs[k] != null && subs[k] !== '') return subs[k];
      const lk = k.toLowerCase();
      if (subs[lk] != null && subs[lk] !== '') return subs[lk];
    }
    return null;
  };

  // Tier color based on raw Score + tool cutoffs
  const cutoffs = (STATE && STATE.tools) ? STATE.tools[tool] : null;
  const tier = scoreToTier(rawScore, cutoffs);
  const tierCls = TIER_CLASS[tier] || 'tier-nodata';

  let display = '';
  if (tool === 'Vanderbilt-Parent' || tool === 'Vanderbilt-Teacher') {
    const inatt = getSub(['inattentive','inatt','Inatt','Inattentive','inatencion']);
    display = (inatt != null && inatt !== '') ? `Inatt ${inatt}/9` : (rawScore !== '' && rawScore != null ? `${rawScore}` : '—');
  } else if (tool === 'SNAP-IV') {
    const inatt = getSub(['inattentive','inatt','Inatt','Inattentive','inatencion']);
    if (inatt != null && inatt !== '') {
      const n = Number(inatt);
      display = isNaN(n) ? `${inatt} (Inatt)` : `${n.toFixed(1)} (Inatt)`;
    } else {
      display = (rawScore !== '' && rawScore != null) ? String(rawScore) : '—';
    }
  } else {
    // Numeric raw
    display = (rawScore !== '' && rawScore != null) ? String(rawScore) : '—';
  }

  return `<span class="tool-chip">${escapeHtml(tool)}</span><span class="score-cell score-tier-chip ${tierCls}">${escapeHtml(display)}</span>`;
}

function renderPatientRow(p, lang, opts={}) {
  const cols = visibleColumns();
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

  // ── Flags (safety, not improving, lapsed, manual review, psych-overdue, suggest-stable, confirm-stable) ──
  const notImp = isNotImproving(p);
  const reviewFlagged = String(p.Review_Flag||'').toUpperCase() === 'TRUE';
  const psychOverdue = featGet('show_due_for_review') && isPsychReviewOverdue(p);
  const isStable = String(p.Status||'').toLowerCase() === 'estable' || p.Status === 'Stable';
  const lapsedThresh = isStable ? 112 : 56;
  const psychTooltip = isStable ? t('flag_due_psych_stable') : t('flag_due_psych');
  const lapsedTooltip = isStable ? t('flag_lapsed_tooltip_stable') : t('flag_lapsed_tooltip_active');
  const suggestStable = !isStable && shouldSuggestStable(p);
  const confirmStable = isStable && isPsychReviewOverdue(p); // 16wk lapsed while Stable
  // Psychometric-score gaps
  const hasAnyScore = (p._visits||[]).some(v => v && v.Score !== '' && v.Score != null && !isNaN(Number(v.Score)));
  const needsBaseline = !hasAnyScore;
  const lastScoreDays = (p._visits||[])
    .filter(v => v.Score !== '' && v.Score != null && !isNaN(Number(v.Score)))
    .map(v => daysBetween(v.Visit_Date, new Date().toISOString().slice(0,10)))
    .filter(n => n != null)
    .sort((a,b) => a-b)[0];
  const statusActive = (!p.Status) || ['activo','estable','stable','active'].includes(String(p.Status).toLowerCase());
  const needsUpdate = hasAnyScore && statusActive && (lastScoreDays != null) && lastScoreDays > 28;
  const flags = [];
  if (p._safetyActive || opts.pinned) flags.push(`<span class="pat-row-safety">${t('flag_safety')}</span>`);
  if (reviewFlagged && featGet('show_review_flag')) flags.push(`<span class="flag-review" title="${t('flag_review')}">${t('flag_review_short')}</span>`);
  if (psychOverdue) flags.push(`<span class="flag-psych" title="${psychTooltip}">${t('flag_due_psych_short')}</span>`);
  if (confirmStable) flags.push(`<span class="flag-confirm-stable" title="${t('flag_confirm_stable_tooltip')}">${t('flag_confirm_stable')}</span>`);
  if (suggestStable) flags.push(`<span class="flag-suggest-stable" title="${t('flag_suggest_stable_tooltip')}">${t('flag_suggest_stable')}</span>`);
  if (needsBaseline) flags.push(`<span class="flag-needs-baseline" title="${t('flag_needs_baseline_tooltip')}">${t('flag_needs_baseline')}</span>`);
  if (needsUpdate)   flags.push(`<span class="flag-needs-update" title="${t('flag_needs_update_tooltip')}">${t('flag_needs_update')}</span>`);
  if (notImp) flags.push(`<span class="flag-notimp">${t('flag_not_improv')}</span>`);
  if (p._daysSinceLastVisit > lapsedThresh && p._daysSinceLastVisit < 9999) {
    const active = String(p.Status||'');
    if (!active || active === 'Activo' || active === 'Estable' || active === 'Stable') {
      flags.push(`<span class="flag-lapsed" title="${lapsedTooltip}">${t('flag_lapsed')}</span>`);
    }
  }

  const rowClass = (p._safetyActive || opts.pinned) ? 'pinned' : '';
  const yrs = t('years_suffix');
  const daysLabel = (p._daysSinceLastVisit != null && p._daysSinceLastVisit < 9999)
    ? (p._daysSinceLastVisit < 0
        ? t('days_future', { n: Math.abs(p._daysSinceLastVisit) })
        : t('days_short', { n: p._daysSinceLastVisit }))
    : '';

  const baselineCell = p.Baseline_Score
    ? `<span class="score-cell">${escapeHtml(String(p.Baseline_Score))}</span>${p.Baseline_Tool ? `<span class="pat-meta">${escapeHtml(p.Baseline_Tool)}</span>` : ''}`
    : '<span class="cell-empty">—</span>';

  const tds = [];
  if (cols.therapist) tds.push(`<td data-label="${t('th_therapist')}">${escapeHtml(p.Therapist||'—')}</td>`);
  if (cols.patient) {
    const verifyBadge = (p._primaryNeedsVerify && p._primaryGroup !== 'mixed_other')
      ? ` <span class="verify-primary-badge" title="${lang==='en'?'Auto-inferred primary condition — please verify':'Condición primaria auto-inferida — verificar'}">⚠ ${lang==='en'?'verify primary':'verificar primaria'}</span>`
      : '';
    tds.push(`
      <td data-label="${t('th_paciente')}">
        <div class="pat-name">${escapeHtml(p.Patient_Name)}${verifyBadge}</div>
        <div class="pat-meta">${p.Patient_ID} · ${p.Age||'?'}${yrs} · ${p.Sex||'—'}</div>
      </td>`);
  }
  if (cols.enrolled) tds.push(`<td data-label="${t('th_enrolled')}">${p.Enrollment_Date ? escapeHtml(p.Enrollment_Date) : '<span class="cell-empty">—</span>'}</td>`);
  if (cols.conditions) tds.push(`<td data-label="${t('th_conditions')}"><div class="cond-chips">${condChips || '<span class="cell-empty">—</span>'}</div></td>`);
  if (cols.latest_score) tds.push(`<td data-label="${t('th_latest_score')}">${latest ? formatScoreCell(latest, p._tierTool) : '<span class="cell-empty">—</span>'}</td>`);
  if (cols.baseline) tds.push(`<td data-label="${t('th_baseline_on_main')}">${baselineCell}</td>`);
  if (cols.delta) tds.push(`<td data-label="Δ" class="${deltaClass}">${deltaStr}</td>`);
  if (cols.trend) tds.push(`<td data-label="${t('th_trend')}">${sparkline(visitsOfTool.map(v => Number(v.Score)))}</td>`);
  if (cols.last_visit) tds.push(`<td data-label="${t('th_last_visit')}">${p._lastVisitDate ? escapeHtml(p._lastVisitDate) : '<span class="cell-empty">—</span>'}<div class="pat-meta">${daysLabel}</div></td>`);
  if (cols.last_contact) tds.push(`<td data-label="${t('th_last_contact')}">${fmtDateWithAgo(p.Last_BHCM_Contact_Date)}</td>`);
  if (cols.last_psych) tds.push(`<td data-label="${t('th_last_psych')}">${fmtDateWithAgo(p.Last_Psych_Consult_Date)}</td>`);
  if (cols.flags) tds.push(`<td data-label="${t('th_flags')}">${flags.join(' ') || '<span class="cell-empty">—</span>'}</td>`);

  return `<tr class="${rowClass}" onclick="goPatient('${p.Patient_ID}')">${tds.join('')}</tr>`;
}

// Derived flag: psych consult overdue.
// Thresholds:
//   Active patients   → > 8 weeks (56 days) since last psych consult
//   Stable patients   → > 16 weeks (112 days) since last psych consult
// Inactive / Transferido / Prioridad Baja patients don't trigger this.
function isPsychReviewOverdue(p) {
  const statusRaw = String(p.Status||'');
  const status = statusRaw.toLowerCase();
  const isActive = /^(activo|active)$/.test(status);
  const isStable = /^(estable|stable)$/.test(status);
  if (!isActive && !isStable) return false;
  const threshold = isStable ? 112 : 56;
  const graceNeverConsulted = isStable ? 112 : 56;
  // If never had a consult AND has been enrolled beyond the grace window, count as overdue
  const enrolledDays = daysSinceISO(p.Enrollment_Date);
  if (!p.Last_Psych_Consult_Date) {
    return enrolledDays != null && enrolledDays > graceNeverConsulted;
  }
  const days = daysSinceISO(p.Last_Psych_Consult_Date);
  return days != null && days > threshold;
}

// Suggest promoting to Stable when:
//   - patient is not already Stable (caller checks)
//   - has ≥3 visits on their primary tier tool
//   - last 3 visits are all in "minimal" range for that tool
//   - last 3 visits are spaced ≥8 weeks (56 days) apart from each other
// Returns true if all conditions are met.
function shouldSuggestStable(p) {
  const statusRaw = String(p.Status||'');
  if (!/^(activo|active)$/i.test(statusRaw) && statusRaw !== '') return false;
  if (!p._tierTool) return false;
  // Pull all visits for this patient on their tier tool, chronological order (oldest → newest)
  const visits = (p._visits || [])
    .filter(v => v.Tool === p._tierTool)
    .slice()
    .sort((a,b) => String(a.Visit_Date).localeCompare(String(b.Visit_Date)));
  if (visits.length < 3) return false;
  const last3 = visits.slice(-3);
  // All three must be in minimal range
  if (!last3.every(v => isMinimalScore(v.Tool, v.Score))) return false;
  // Each consecutive pair must be ≥56 days apart
  for (let i = 1; i < last3.length; i++) {
    const gap = Math.abs(daysBetween(last3[i-1].Visit_Date, last3[i].Visit_Date));
    if (gap < 56) return false;
  }
  return true;
}

// Derived "not improving" calculation: replaces the old manual flag.
// Heuristic: patient has ≥3 visits on their tier tool spanning ≥8 weeks,
// and the latest score is not ≥50% below the baseline score.
function isNotImproving(p) {
  if (!p._tierTool) return false;
  const visits = (p._visits || [])
    .filter(v => v.Tool === p._tierTool && v.Score !== '' && v.Score != null && !isNaN(Number(v.Score)))
    .slice()
    .sort((a,b) => String(a.Visit_Date).localeCompare(String(b.Visit_Date)));
  if (visits.length < 3) return false;
  const first = visits[0], last = visits[visits.length-1];
  const span = Math.abs(daysBetween(first.Visit_Date, last.Visit_Date));
  if (span < 56) return false;            // need ≥8 weeks of data
  const baseline = Number(first.Baseline_Score || first.Score);
  const latest   = Number(last.Score);
  if (!(baseline > 0)) return false;
  const pctReduction = (baseline - latest) / baseline;
  return pctReduction < 0.5;              // <50% reduction from baseline
}

// Minimal-range thresholds per tool (strict less-than).
function isMinimalScore(tool, rawScore) {
  const s = Number(rawScore);
  if (isNaN(s)) return false;
  const t = String(tool||'');
  if (/^PHQ/i.test(t))                 return s < 5;   // PHQ-A / PHQ-9
  if (/^GAD/i.test(t))                 return s < 5;   // GAD-7
  if (/^SCARED/i.test(t))              return s < 8;   // SCARED / SCARED-N / SCARED-Parent
  if (/^SMFQ/i.test(t))                return s < 8;   // SMFQ-C / SMFQ-P
  if (/^Vanderbilt/i.test(t))          return s < 15;  // score-based heuristic
  return false;
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
  location.href = `registro-paciente.html?id=${encodeURIComponent(id)}${STATE.dataset==='test'?'&dataset=test':''}`;
}

// ════════════════════════════════════════════════════════════════
// AUTH GATE — Google Sign-In via Apps Script
// ════════════════════════════════════════════════════════════════
function renderAuthBlock(title, body, ctaLabel, ctaHref) {
  // Clear the main UI content and show a full-screen block message.
  // IMPORTANT: must scope to .page-content, NOT document.body, so the header
  // toolbar (including #userSelect, which populateUserDropdown expects) survives.
  const host = document.querySelector('.page-content')
             || document.querySelector('.main-content')
             || document.querySelector('.reg-page')
             || document.body;
  host.innerHTML = `
    <div style="max-width: 520px; margin: 10vh auto; padding: 32px 28px; background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.06); text-align: left; font-family: var(--font-body, system-ui);">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom: 12px;">
        <div style="width:36px; height:36px; border-radius:50%; background:#fef3c7; display:flex; align-items:center; justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
        </div>
        <h2 style="margin:0; font-size: 20px;">${title}</h2>
      </div>
      <div style="color:#374151; line-height: 1.55; font-size: 15px;">${body}</div>
      ${ctaLabel && ctaHref ? `<div style="margin-top: 20px;"><a href="${ctaHref}" style="display:inline-block; background: var(--color-primary, #0369a1); color:#fff; padding: 10px 18px; border-radius: 8px; text-decoration:none; font-weight:600;">${ctaLabel}</a></div>` : ''}
    </div>`;
}

async function authGate() {
  // Only gate when we intend to talk to the live relay.
  if (typeof pingAuth !== 'function') return { status: 'ok', user: { email: 'demo', name: 'demo', role: 'admin' } };
  const result = await pingAuth();
  if (result.status === 'ok') return result;
  if (result.status === 'no_relay') {
    // Demo/offline mode — no auth required.
    return { status: 'ok', user: { email: '', name: '', role: '' } };
  }
  if (result.status === 'signin_required') {
    const isEN = (document.documentElement.getAttribute('data-lang') === 'en');
    renderAuthBlock(
      isEN ? 'Google sign-in required' : 'Requiere inicio de sesión con Google',
      isEN
        ? `<p>This registry is restricted to authorized clinic staff. Click below to sign in with your Google account.</p><p style="color:#6b7280; font-size:13px;">Use the same Gmail Dr. Fowler gave access to. After signing in, come back to this tab and reload.</p>`
        : `<p>Este registro está restringido al personal autorizado de la clínica. Haga clic abajo para iniciar sesión con su cuenta de Google.</p><p style="color:#6b7280; font-size:13px;">Use el mismo Gmail al que el Dr. Fowler le dio acceso. Después de iniciar sesión, vuelva a esta pestaña y recargue.</p>`,
      isEN ? 'Sign in with Google' : 'Iniciar sesión con Google',
      result.signInUrl
    );
    return { status: 'blocked' };
  }
  if (result.status === 'unauthorized') {
    const isEN = (document.documentElement.getAttribute('data-lang') === 'en');
    const email = result.email || (isEN ? 'your account' : 'su cuenta');
    renderAuthBlock(
      isEN ? 'Access denied' : 'Acceso denegado',
      isEN
        ? `<p>The account <strong>${email}</strong> is not authorized to use the CoCM Camasca registry.</p><p>If you believe this is an error, contact <a href="mailto:troyfowlermd@gmail.com">troyfowlermd@gmail.com</a> to be added.</p><p style="color:#6b7280; font-size:13px; margin-top:16px;">Signed in with the wrong account? Switch Google accounts and reload this page.</p>`
        : `<p>La cuenta <strong>${email}</strong> no está autorizada para usar el registro CoCM Camasca.</p><p>Si cree que es un error, contacte a <a href="mailto:troyfowlermd@gmail.com">troyfowlermd@gmail.com</a> para ser agregado.</p><p style="color:#6b7280; font-size:13px; margin-top:16px;">¿Inició sesión con la cuenta incorrecta? Cambie de cuenta de Google y recargue esta página.</p>`,
      null, null
    );
    return { status: 'blocked' };
  }
  // error
  const isEN = (document.documentElement.getAttribute('data-lang') === 'en');
  renderAuthBlock(
    isEN ? 'Connection error' : 'Error de conexión',
    `<p>${isEN ? 'Could not reach the registry server.' : 'No se pudo contactar el servidor del registro.'}</p><pre style="background:#f9fafb; padding:10px; border-radius:6px; font-size:12px; overflow:auto;">${String(result.message || '').replace(/</g,'&lt;')}</pre><p style="color:#6b7280; font-size:13px;">${isEN ? 'Try reloading. If this persists, contact Troy.' : 'Intente recargar. Si persiste, contacte a Troy.'}</p>`,
    isEN ? 'Reload' : 'Recargar',
    location.href
  );
  return { status: 'blocked' };
}

// ════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  const savedLang = localStorage.getItem('coCMCamasca.lang') || 'es';
  setLang(savedLang);
  // Simplified mode was retired (April 2026). Clear any stale localStorage
  // value so it never suppresses columns.
  try { featSet('simplified_mode', false); } catch(_) {}
  initDataset();
  const gate = await authGate();
  if (gate.status !== 'ok') return; // auth block UI already rendered
  // Stamp the authenticated identity into STATE and the header chip.
  if (gate.user && gate.user.email) {
    STATE.user = gate.user.email;
    try { localStorage.setItem(REG_LS.USER, gate.user.email); } catch(_) {}
    const label = document.getElementById('userLabel');
    if (label) label.textContent = gate.user.name || gate.user.email;
    const chip = document.getElementById('userChip');
    if (chip) chip.title = `${gate.user.email} · ${gate.user.role || ''}`;
  }
  loadAndRender();
});
