// @version 8e9ef57
/* ============================================================
   CoCM Camasca — Patient detail page (streamlined)
   ============================================================ */

let PSTATE = {
  patient: null,
  visits: [],
  meds: [],
  tools: {},
  conditions: {},
  team: [],
  authorizedUsers: [],
  user: '',
  dataset: 'real',
};

// ── Language toggle ─────────────────────────────────────────────
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
  const btnES = document.getElementById('btnES'), btnEN = document.getElementById('btnEN');
  if (btnES) btnES.classList.toggle('active', !isEN);
  if (btnEN) btnEN.classList.toggle('active', isEN);
  // Update how-to body (rich HTML)
  const hb = document.getElementById('howtoBody');
  if (hb) hb.innerHTML = t('howto_patient_body');
  if (PSTATE.patient) render();
}

// ── Theme toggle ────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('coCMCamasca.theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', saved || system);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-theme-toggle]')) {
      const cur = document.documentElement.getAttribute('data-theme') || system;
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('coCMCamasca.theme', next);
    }
  });
})();

function urlParam(name) {
  return new URLSearchParams(location.search).get(name);
}

// ── Dataset init ───────────────────────────────────────────────
function initDataset() {
  const urlVal = urlParam('dataset');
  if (urlVal === 'test' || urlVal === 'real') {
    PSTATE.dataset = urlVal;
    localStorage.setItem('coCMCamasca.dataset', urlVal);
  } else {
    PSTATE.dataset = localStorage.getItem('coCMCamasca.dataset') || 'real';
  }
  window.REG_DATASET = PSTATE.dataset;
}

// ════════════════════════════════════════════════════════════════
// LOAD
// ════════════════════════════════════════════════════════════════
async function load() {
  const id = urlParam('id');
  if (!id) {
    document.getElementById('patBody').innerHTML = `<div class="empty-state"><p>${t('pat_missing_id')}</p></div>`;
    return;
  }
  if (!PSTATE.user) PSTATE.user = localStorage.getItem(REG_LS.USER) || '';

  // v2.5.3 — Paint from shared registry cache if we have it.
  // The registry already caches all tabs; reuse that for instant patient-page first paint.
  let painted = false;
  if (typeof readCache === 'function') {
    const cached = readCache();
    if (cached && Array.isArray(cached.pacientes)) {
      const p = cached.pacientes.find(x => x.Patient_ID === id);
      if (p) {
        PSTATE.patient = p;
        // Backfill Primary_Condition from Conditions if the sheet column is missing
        if (!PSTATE.patient.Primary_Condition) {
          const firstCond = String(PSTATE.patient.Conditions || '').split(',').map(s => s.trim()).filter(Boolean)[0] || '';
          if (firstCond && typeof normalizeConditionKey === 'function') {
            PSTATE.patient.Primary_Condition = normalizeConditionKey(firstCond);
          }
        }
        PSTATE.visits = (cached.visitas || []).filter(v => v.Patient_ID === id)
                                 .sort((a,b) => String(b.Visit_Date).localeCompare(String(a.Visit_Date)));
        PSTATE.meds = (cached.meds || []).filter(m => m.Patient_ID === id)
                                 .sort((a,b) => String(b.Date).localeCompare(String(a.Date)));
        PSTATE.tools = parseToolCutoffs(cached.config || []);
        PSTATE.conditions = Object.fromEntries(
          (cached.config || []).filter(r => r.Category==='condition' && isActiveRow(r))
                   .map(r => [r.Key, {es:r.Display_ES, en:r.Display_EN}])
        );
        PSTATE.team = (cached.config || []).filter(r => r.Category==='team' && isActiveRow(r))
                                .map(r => ({name:r.Key, role:r.Value}));
        PSTATE.authorizedUsers = cached.authorizedUsers || [];
        render();
        painted = true;
      }
    }
  }

  try {
    const [pacientes, visitas, meds, config, authUsers] = await Promise.all([
      fetchTab('Pacientes'), fetchTab('Visitas'), fetchTab('Medicamentos'), fetchTab('Config'),
      fetchTab('AuthorizedUsers').catch(() => []),
    ]);
    PSTATE.patient = pacientes.find(p => p.Patient_ID === id);
    // Backfill Primary_Condition from Conditions if the sheet column is missing
    if (PSTATE.patient && !PSTATE.patient.Primary_Condition) {
      const firstCond = String(PSTATE.patient.Conditions || '').split(',').map(s => s.trim()).filter(Boolean)[0] || '';
      if (firstCond && typeof normalizeConditionKey === 'function') {
        PSTATE.patient.Primary_Condition = normalizeConditionKey(firstCond);
      }
    }
    PSTATE.visits = visitas.filter(v => v.Patient_ID === id)
                           .sort((a,b) => String(b.Visit_Date).localeCompare(String(a.Visit_Date)));
    PSTATE.meds = meds.filter(m => m.Patient_ID === id)
                      .sort((a,b) => String(b.Date).localeCompare(String(a.Date)));
    PSTATE.tools = parseToolCutoffs(config);
    PSTATE.conditions = Object.fromEntries(
      config.filter(r => r.Category==='condition' && isActiveRow(r)).map(r => [r.Key, {es:r.Display_ES, en:r.Display_EN}])
    );
    PSTATE.team = config.filter(r => r.Category==='team' && isActiveRow(r)).map(r => ({name:r.Key, role:r.Value}));
    PSTATE.authorizedUsers = authUsers;
    // Refresh shared cache with latest.
    if (typeof writeCache === 'function') {
      writeCache({ pacientes, visitas, meds, config, authorizedUsers: authUsers });
    }
  } catch (err) {
    if (painted) {
      console.warn('[patient load] refresh failed, keeping cached view', err);
      showToast(t('conn_lost'), { variant: 'warn', retry: () => load() });
      return;
    }
    document.getElementById('patBody').innerHTML = `<div class="empty-state"><p>${t('generic_error', { msg: err.message })}</p></div>`;
    showToast(t('conn_lost'), { variant: 'error', retry: () => load() });
    return;
  }
  render();
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
function render() {
  if (!PSTATE.patient) {
    document.getElementById('patBody').innerHTML = `<div class="empty-state"><p>${t('pat_not_found')}</p></div>`;
    return;
  }
  const lang = getLang();
  const p = PSTATE.patient;

  // Topbar identity
  document.getElementById('patTopbarName').textContent = p.Patient_Name;
  document.getElementById('patTopbarId').textContent =
    `${p.Patient_ID||'—'} · ${p.Age||'?'}${t('years_suffix')} · ${translateSex(p.Sex)||'—'} · ${p.Therapist||p.Therapist_Primary||''}`;

  const condChips = (p.Conditions||'').split(',').map(s=>s.trim()).filter(Boolean).map(c => {
    const d = PSTATE.conditions[c];
    return `<span class="cond-chip">${d ? (lang==='en'?d.en:d.es) : c}</span>`;
  }).join(' ');

  const toolKeys = (p.Tools||'').split(',').map(s=>s.trim()).filter(Boolean);
  const safetyActive = p.Safety_Flag==='TRUE' && !p.Safety_Flag_Ack_At;

  // Last-visit nudge
  const lastVisit = PSTATE.visits[0];
  const daysSince = lastVisit ? daysBetween(lastVisit.Visit_Date, todayISO()) : 9999;
  const visitNudge = lastVisit
    ? t('pat_recent', { days: daysSince })
    : t('pat_never');

  document.getElementById('patBody').innerHTML = `
    <!-- HEADER -->
    <div class="pat-header-card">
      <div class="pat-header-top">
        <span class="pat-header-name">${escapeHtml(p.Patient_Name)}</span>
        <span class="pat-header-id">${p.Patient_ID||''}</span>
        <span style="margin-left:auto;font-size:var(--text-xs);color:${daysSince>56?'var(--color-error)':daysSince>28?'var(--color-warning)':'var(--color-text-muted)'};font-weight:600;">${visitNudge}</span>
      </div>
      <div class="pat-header-meta">
        <span><strong>${t('label_age')}:</strong> ${p.Age||'—'}</span>
        <span><strong>${t('label_sex')}:</strong> ${translateSex(p.Sex)||'—'}</span>
        <span><strong>${t('pat_dob')}:</strong> ${p.DOB||'—'}</span>
        <span><strong>${t('label_therapist')}:</strong> ${escapeHtml(p.Therapist||'—')}</span>
        <span><strong>${t('pat_enrolled')}:</strong> ${p.Enrollment_Date||'—'}</span>
        <span><strong>${t('th_status')}:</strong> ${translateStatus(p.Status)||'—'}</span>
        ${p.Caregiver_Phone ? `<span><strong>${getLang()==='en'?'Caregiver phone':'Tel. cuidador'}:</strong> <a href="tel:${escapeHtml(p.Caregiver_Phone)}" style="color:var(--color-primary);text-decoration:none;">${escapeHtml(p.Caregiver_Phone)}</a></span>` : ''}
      </div>
      <div style="margin-top: var(--space-3);">
        <strong class="cond-label" style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;">${t('label_conditions')}:</strong>
        ${condChips || '—'}
      </div>
      ${p.Notes ? `<div class="pat-notes-line" style="margin-top: var(--space-3); color: var(--color-text-muted);"><strong>${t('label_notes')}:</strong> ${renderMarkdownInline(p.Notes)}</div>` : ''}
      ${safetyActive ? `
        <div class="pat-safety-banner">
          <span>⚠ <strong>${t('safety_active')}</strong></span>
          <button onclick="acknowledgeSafety()">${t('action_ack')}</button>
        </div>
      ` : ''}
      ${isTruthyFlag(p.Brigade_Flag) ? `
        <div class="pat-brigade-banner">
          <span>🚩 <strong>${t('brigade_banner_title')}</strong>${p.Brigade_Reason ? ` — ${renderMarkdownInline(p.Brigade_Reason)}` : ''}</span>
        </div>
      ` : ''}
      <div class="quick-actions">
        <button class="primary" onclick="openVisitModal()" title="${getLang()==='en' ? 'Log a visit with a psychometric score' : 'Registrar visita con puntaje'}">${t('action_add_visit')}</button>
        <button class="primary" onclick="openVisitOnlyModal()" title="${getLang()==='en' ? 'Log a visit without a score' : 'Registrar visita sin puntaje'}">🗒 ${getLang()==='en'?'Log visit (no score)':'Registrar visita (sin puntaje)'}</button>
        <button class="primary" onclick="openScoreModal()" title="${getLang()==='en' ? 'Log a score without a visit' : 'Registrar puntaje sin visita'}">📊 ${getLang()==='en'?'Log score only':'Solo puntaje'}</button>
        <button class="ghost" onclick="openMedModal()">${t('action_add_med2')}</button>
        ${!safetyActive ? `<button class="danger" onclick="raiseSafety()">${t('action_raise_safety')}</button>` : ''}
        <button class="${isTruthyFlag(p.Brigade_Flag) ? 'brigade-active' : 'ghost'}" onclick="openBrigadeModal()" title="${getLang()==='en' ? 'Flag for next brigade visit' : 'Marcar para próxima brigada'}">${isTruthyFlag(p.Brigade_Flag) ? '🚩' : '🏳'} ${getLang()==='en' ? 'Brigade' : 'Brigada'}</button>
        <button class="ghost" onclick="toggleStatus()">${t('action_change_status')}</button>
        <button class="ghost" onclick="openEditPatientModal()" title="${getLang()==='en' ? 'Edit demographics, conditions, or monitored tools' : 'Editar datos demográficos, condiciones o herramientas monitoreadas'}">✏️ ${getLang()==='en' ? 'Edit patient' : 'Editar paciente'}</button>
        <!-- brigade indicator shown in the banner above; row flag shown on registry -->
      </div>
    </div>

    <!-- ── COCM TRACKING (psych consult, BHCM contact, review flag) ── -->
    ${renderCoCMTracking(p, lang)}

    <!-- PER-PATIENT TO-DO -->
    ${renderTodoBox(p, lang)}

    <!-- SUGGESTIONS / PROMPTS -->
    ${renderPrompts(p, lang)}

    <!-- LAUNCH TOOLS -->
    ${(() => {
      const en = getLang() === 'en';
      const schemaMap = {};
      const _TS = window.TOOL_SCHEMA; if (_TS) _TS.forEach(s => schemaMap[s.key] = s);
      const completedSet = new Set((PSTATE.visits||[]).filter(v=>v.Score!==''&&v.Score!=null).map(v=>v.Tool).filter(Boolean));
      const rawKeys = (p.Tools||'').split(',').map(s=>s.trim()).filter(Boolean);
      const allToolKeys = rawKeys.includes('PSC-17') ? rawKeys : ['PSC-17', ...rawKeys];

      // Build screening and monitoring key lists — 'both' tools appear in BOTH
      const screeningKeys = [];
      const monitoringKeys = [];
      allToolKeys.forEach(tk => {
        const ts = schemaMap[tk];
        if (!ts) { monitoringKeys.push(tk); return; }
        if (ts.type === 'screening' || ts.type === 'both') screeningKeys.push(tk);
        if (ts.type === 'monitoring' || ts.type === 'both') monitoringKeys.push(tk);
      });
      // PSC-17 first in screening
      const scIdx = screeningKeys.indexOf('PSC-17');
      if (scIdx > 0) { screeningKeys.splice(scIdx, 1); screeningKeys.unshift('PSC-17'); }

      // One launch button row (clinician + optional share)
      function toolRow(tk, isScreening) {
        const hasBase = !!TOOL_URL_MAP[tk];
        const hasExt  = !!(typeof TOOL_EXT_URL_MAP !== 'undefined' && TOOL_EXT_URL_MAP[tk]);
        const isDone  = isScreening && completedSet.has(tk);
        const doneStyle = isDone ? 'opacity:0.45;text-decoration:line-through;' : '';
        const doneHint  = isDone ? `<span style="font-size:9px;color:var(--color-success,#5dba5d);margin-left:4px;">✓ ${en?'done':'listo'}</span>` : '';
        let noteText = '';
        if (tk === 'CAP') noteText = en?'priority · teacher':'prioridad · maestro';
        else if (tk === 'Vanderbilt-Teacher' && !isScreening && monitoringKeys.includes('CAP')) noteText = en?'if CAP not viable':'si CAP no viable';
        const noteHint = noteText ? `<span style="font-size:9px;color:var(--color-text-muted);margin-left:4px;">(${noteText})</span>` : '';
        const safeTk = tk.replace(/'/g, "\\'");
        if (!hasBase) return `<div style="display:inline-flex;align-items:center;gap:4px;"><span class="tool-launch-btn" style="opacity:0.4;${doneStyle}">${tk}</span>${doneHint}${noteHint}</div>`;
        return `<div style="display:inline-flex;align-items:center;gap:4px;">
          <div style="display:inline-flex;align-items:stretch;gap:0;">
            <a class="tool-launch-btn" href="${TOOL_URL_MAP[tk]}" target="_blank" style="${hasExt?'border-top-right-radius:0;border-bottom-right-radius:0;':''}${doneStyle}" title="${en?'Open clinician version':'Abrir versión para clínico'}">${tk}</a>
            ${hasExt ? `<button class="tool-launch-btn" onclick="shareToolLink('${safeTk}')" title="${en?'Copy share message':'Copiar mensaje para compartir'}" style="border-left:0;border-top-left-radius:0;border-bottom-left-radius:0;padding-left:10px;padding-right:10px;" aria-label="Share">📤</button>` : ''}
          </div>${doneHint}${noteHint}
        </div>`;
      }

      function subHdr(label) {
        return `<div style="width:100%;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-muted);margin:10px 0 6px;padding-bottom:3px;border-bottom:1px solid var(--color-border);">${label}</div>`;
      }

      const screeningRows = screeningKeys.map(tk => toolRow(tk, true)).join('');
      const monitoringRows = monitoringKeys.map(tk => toolRow(tk, false)).join('');

      // Share panel — deduplicated shareable keys
      const shareableAll = [...new Set(allToolKeys)].filter(tk => typeof TOOL_EXT_URL_MAP !== 'undefined' && TOOL_EXT_URL_MAP[tk]);
      const shareSection = shareableAll.length ? `
        <div id="shareMultiPanel" style="margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-border);">
          <div style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-muted);margin-bottom:6px;">📤 ${en?'Share questionnaires':'Compartir cuestionarios'}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
            ${shareableAll.map(tk => `<label style="display:inline-flex;gap:4px;align-items:center;padding:4px 10px;background:var(--color-surface-offset);border-radius:var(--radius-full);font-size:var(--text-xs);cursor:pointer;"><input type="checkbox" name="shareToolSel" value="${escapeHtml(tk)}" checked style="margin:0;"/>${escapeHtml(tk)}</label>`).join('')}
          </div>
          <button class="tool-launch-btn" onclick="shareSelectedTools()" style="width:100%;padding:7px;font-weight:600;border-radius:var(--radius-md);">${en?'Copy selected':'Copiar seleccionados'}</button>
        </div>` : '';

      return `
      <div class="sec-card">
        <h2 style="display:flex;align-items:center;gap:8px;">
          <span>${t('pat_complete_tool')}</span>
          <button onclick="openEditPatientModal()" style="margin-left:auto;font-size:var(--text-xs);padding:4px 10px;border-radius:var(--radius-md);background:var(--color-surface-offset);border:1px solid var(--color-border);color:var(--color-text-muted);cursor:pointer;font-weight:600;" title="${en?'Edit tools tracked for this patient':'Editar herramientas para este paciente'}">✏️ ${en?'Edit tools':'Editar herramientas'}</button>
        </h2>
        <p style="font-size:10.5px;line-height:1.4;color:var(--color-text-muted);margin-bottom:var(--space-3);">${t('pat_tools_help')}</p>
        ${subHdr(en?'Baseline Screening':'Detección Basal')}
        <div class="tool-launch-grid" style="margin-bottom:var(--space-2);">${screeningRows||`<span style="font-size:var(--text-xs);color:var(--color-text-muted);">${en?'None':'Ninguna'}</span>`}</div>
        ${subHdr(en?'Monitoring':'Monitoreo')}
        <div class="tool-launch-grid">${monitoringRows||`<span style="font-size:var(--text-xs);color:var(--color-text-muted);">${en?'None':'Ninguna'}</span>`}</div>
        ${shareSection}
      </div>`;
    })()}

    <!-- TRENDS -->
    <div class="sec-card">
      <h2><span>${t('pat_trends_by_tool')}</span></h2>
      <div class="trend-grid">
        ${renderTrends(toolKeys, lang)}
      </div>
    </div>

    <!-- VISITS TIMELINE -->
    <div class="sec-card">
      <h2>
        <span>${t('visit_score_history')}</span>
        <span style="font-size: var(--text-sm); color: var(--color-text-muted); font-weight: 400;">${PSTATE.visits.length} ${PSTATE.visits.length === 1 ? t('visit_singular') : t('visits')}</span>
      </h2>
      ${renderVisits(lang)}
    </div>

    <!-- MEDICATIONS -->
    <div class="sec-card">
      <h2>
        <span>${t('pat_med_history')}</span>
        <span style="font-size: var(--text-sm); color: var(--color-text-muted); font-weight: 400;">${PSTATE.meds.length} ${PSTATE.meds.length === 1 ? t('event_singular') : t('events')}</span>
      </h2>
      ${renderMeds(lang)}
    </div>
  `;
}

// ═════════════════════════════════════════════════════════════════
// CoCM TRACKING CARD — last psych consult, last BHCM contact, review flag
// All three fields are optional; missing values render as “—”.
// Feature flags hide the corresponding rows entirely when disabled.
// ═════════════════════════════════════════════════════════════════
function renderCoCMTracking(p, lang) {
  const showPsych   = featGet('show_psych_consult');
  const showContact = featGet('show_bhcm_contact');
  const showReview  = featGet('show_review_flag');
  if (!showPsych && !showContact && !showReview) return '';

  const ds = (iso) => {
    if (!iso) return `<span class="cell-empty">—</span>`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return `<span class="cell-empty">—</span>`;
    const days = Math.floor((Date.now() - d.getTime())/86400000);
    const ago = days === 0 ? t('today') : days === 1 ? t('yesterday') : t('days_ago', { n: days });
    return `<strong>${escapeHtml(iso)}</strong> <span style="color:var(--color-text-muted);font-size:var(--text-xs);">· ${ago}</span>`;
  };

  const reviewChecked = String(p.Review_Flag||'').toUpperCase() === 'TRUE';

  const rows = [];
  if (showPsych) {
    rows.push(`
      <div class="cocm-row">
        <div class="cocm-label">${t('psych_consult_label')}</div>
        <div class="cocm-value">${ds(p.Last_Psych_Consult_Date)}</div>
        <div class="cocm-actions">
          <button class="ghost sm" onclick="editPsychConsult()">${t('edit')}</button>
          <button class="ghost sm" onclick="setPsychConsultToday()">${t('today_btn')}</button>
        </div>
      </div>`);
  }
  if (showContact) {
    const bhcmByName = p.Last_BHCM_Contact_By
      ? getUserDisplayName(p.Last_BHCM_Contact_By, PSTATE.authorizedUsers || [])
      : '';
    const noteHtml = p.Last_BHCM_Contact_Note ? renderMarkdownInline(p.Last_BHCM_Contact_Note) : '';
    rows.push(`
      <div class="cocm-row">
        <div class="cocm-label">${t('last_contact_label')}</div>
        <div class="cocm-value">
          ${ds(p.Last_BHCM_Contact_Date)}
          ${noteHtml ? `<div class="bhcm-note">${noteHtml}</div>` : ''}
          ${bhcmByName ? `<div class="bhcm-by">— ${t('last_contact_by')} ${escapeHtml(bhcmByName)}</div>` : ''}
        </div>
        <div class="cocm-actions">
          <button class="ghost sm" onclick="editBHCMContact()">${t('edit')}</button>
          <button class="ghost sm" onclick="setBHCMContactToday()">${t('today_btn')}</button>
        </div>
      </div>`);
  }
  if (showReview) {
    rows.push(`
      <div class="cocm-row">
        <div class="cocm-label">${t('review_flag_label')}</div>
        <div class="cocm-value">
          <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" ${reviewChecked ? 'checked' : ''} onchange="toggleReviewFlag(this.checked)" />
            <span>${reviewChecked ? `<span class="flag-review">${t('flag_review_short')}</span>` : '<span class="cell-empty">—</span>'}</span>
          </label>
        </div>
        <div class="cocm-actions"></div>
      </div>`);
  }

  return `
    <div class="sec-card">
      <h2><span>${t('psych_consult_section')}</span></h2>
      <div class="cocm-grid">
        ${rows.join('')}
      </div>
    </div>
  `;
}

// ── Edit handlers for CoCM tracking fields ──────────────────────
function _validISO(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime()); }

async function editPsychConsult() {
  const current = PSTATE.patient.Last_Psych_Consult_Date || '';
  const val = prompt(t('psych_consult_prompt'), current);
  if (val === null) return;
  const trimmed = val.trim();
  if (trimmed && !_validISO(trimmed)) { alert('YYYY-MM-DD'); return; }
  await _patchPatient({ Last_Psych_Consult_Date: trimmed });
}
async function setPsychConsultToday() {
  await _patchPatient({ Last_Psych_Consult_Date: todayISO() });
}
async function editBHCMContact() {
  const current = PSTATE.patient.Last_BHCM_Contact_Date || '';
  const val = prompt(t('bhcm_contact_prompt'), current);
  if (val === null) return;
  const trimmed = val.trim();
  if (trimmed && !_validISO(trimmed)) { alert('YYYY-MM-DD'); return; }
  const noteVal = prompt(t('bhcm_contact_note_prompt'), PSTATE.patient.Last_BHCM_Contact_Note || '');
  const patch = { Last_BHCM_Contact_Date: trimmed, Last_BHCM_Contact_By: PSTATE.user || '' };
  if (noteVal !== null) patch.Last_BHCM_Contact_Note = noteVal.trim();
  await _patchPatient(patch);
}
async function setBHCMContactToday() {
  await _patchPatient({ Last_BHCM_Contact_Date: todayISO(), Last_BHCM_Contact_By: PSTATE.user || '' });
}
async function toggleReviewFlag(checked) {
  await _patchPatient({ Review_Flag: checked ? 'TRUE' : '' });
}

// ── Stable-status helpers ─────────────────────────────────────
// Promote Active patient → Stable. Resets the 16-week psych-consult clock.
async function promoteToStable() {
  const msg = getLang()==='en'
    ? 'Promote this patient to Stable status? Psych review cadence will move to every 16 weeks, starting today.'
    : '¿Promover este paciente a Estable? La cadencia de revisión psiq. pasa a cada 16 semanas, a partir de hoy.';
  if (!confirm(msg)) return;
  await _patchPatient({
    Status: 'Estable',
    Last_Psych_Consult_Date: todayISO()
  });
}

// Confirm that a Stable patient is still stable. Resets the 16-week clock.
async function confirmStable() {
  const msg = getLang()==='en'
    ? 'Confirm that this patient is still stable? This resets the 16-week psych review clock to today.'
    : '¿Confirmar que este paciente sigue estable? Reinicia el reloj de revisión psiq. de 16 semanas a hoy.';
  if (!confirm(msg)) return;
  await _patchPatient({ Last_Psych_Consult_Date: todayISO() });
}

// Local version of the suggest-stable predicate for the patient detail page.
function _shouldSuggestStableLocal() {
  const lastVisit = PSTATE.visits[0];
  if (!lastVisit) return false;
  const tool = lastVisit.Tool;
  if (!tool) return false;
  // Visits on this tool, chronological
  const visits = PSTATE.visits
    .filter(v => v.Tool === tool)
    .slice()
    .sort((a,b) => String(a.Visit_Date).localeCompare(String(b.Visit_Date)));
  if (visits.length < 3) return false;
  const last3 = visits.slice(-3);
  if (!last3.every(v => _isMinimalScore(tool, v.Score))) return false;
  for (let i = 1; i < last3.length; i++) {
    const gap = Math.abs(daysBetween(last3[i-1].Visit_Date, last3[i].Visit_Date));
    if (gap < 56) return false;
  }
  return true;
}
function _isMinimalScore(tool, raw) {
  const s = Number(raw);
  if (isNaN(s)) return false;
  const tk = String(tool||'');
  if (/^PHQ/i.test(tk))        return s < 5;
  if (/^GAD/i.test(tk))        return s < 5;
  if (/^SCARED/i.test(tk))     return s < 8;
  if (/^SMFQ/i.test(tk))       return s < 8;
  if (/^Vanderbilt/i.test(tk)) return s < 15;
  return false;
}

async function _patchPatient(patch) {
  const now = new Date().toISOString();
  // Snapshot previous values for undo
  const prev = {};
  Object.keys(patch).forEach(k => { prev[k] = PSTATE.patient[k]; });
  // Optimistic local update
  Object.assign(PSTATE.patient, patch);
  render();
  try {
    await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
      ...patch,
      Updated_By: PSTATE.user || 'unknown',
      Updated_At: now,
    });
    if (typeof showToast === 'function') {
      showToast(t('saved'), { variant: 'success', undo: async () => {
        Object.assign(PSTATE.patient, prev);
        await updateRow('Pacientes', PSTATE.patient.Patient_ID, prev);
        render();
      }});
    }
  } catch (err) {
    // Rollback optimistic update on failure
    Object.assign(PSTATE.patient, prev);
    render();
    if (typeof showToast === 'function') {
      showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => _patchPatient(patch) });
    } else {
      alert((err && err.message) || String(err));
    }
  }
}

function renderPrompts(p, lang) {
  const prompts = [];

  // 1. Safety flag unacknowledged
  if (p.Safety_Flag==='TRUE' && !p.Safety_Flag_Ack_At) {
    prompts.push({
      text: t('safety_prompt_body'),
      actions: [[t('action_ack'), 'acknowledgeSafety()']]
    });
  }

  // 2. Lapsed visit (>8wk for Active, >16wk for Stable)
  const lastVisit = PSTATE.visits[0];
  const daysSince = lastVisit ? daysBetween(lastVisit.Visit_Date, todayISO()) : 9999;
  const isStablePt = /^(estable|stable)$/i.test(String(p.Status||''));
  const lapsedThresh = isStablePt ? 112 : 56;
  if (daysSince > lapsedThresh && daysSince < 9999) {
    prompts.push({
      text: t('stuck_msg', { days: daysSince }),
      actions: [[t('action_log_visit'), 'openVisitModal()']]
    });
  }

  // 2b. Confirm-stable nudge: Stable patient with > 16wk since last contact or psych consult
  if (isStablePt) {
    const psychDays = p.Last_Psych_Consult_Date ? daysBetween(p.Last_Psych_Consult_Date, todayISO()) : 9999;
    if (psychDays > 112) {
      prompts.push({
        text: (getLang()==='en'
          ? 'Stable patient — no psych contact in over 16 weeks. Confirm still stable (resets the 16-week clock) or move back to Active.'
          : 'Paciente estable — sin contacto psiq. en más de 16 semanas. Confirme que sigue estable (reinicia el reloj de 16 semanas) o regéselo a Activo.'),
        actions: [
          [getLang()==='en' ? 'Still stable' : 'Sigue estable', 'confirmStable()'],
          [getLang()==='en' ? 'Return to Active' : 'Regresar a Activo', `setStatus('Activo')`]
        ]
      });
    }
  }

  // 2c. Auto-suggest Stable: 3 consecutive minimal-score visits ≥8wk apart
  if (!isStablePt && /^(activo|active)$/i.test(String(p.Status||'')) && _shouldSuggestStableLocal()) {
    prompts.push({
      text: (getLang()==='en'
        ? 'This patient has had 3 consecutive visits in the minimal-score range, each at least 8 weeks apart. Consider promoting to Stable (monitoring shifts to every 16 weeks).'
        : 'Este paciente tiene 3 visitas consecutivas en el rango mínimo, separadas ≥8 semanas. Considere promoverlo a Estable (monitoreo pasa a cada 16 semanas).'),
      actions: [
        [getLang()==='en' ? 'Promote to Stable' : 'Promover a Estable', 'promoteToStable()']
      ]
    });
  }

  // 2d. Needs baseline psychometrics (no scores recorded at all)
  const hasAnyScore = PSTATE.visits.some(v => v.Score !== '' && v.Score != null && !isNaN(Number(v.Score)));
  if (!hasAnyScore) {
    prompts.push({
      text: t('flag_needs_baseline_banner'),
      actions: [[t('action_add_visit'), 'openVisitModal()']]
    });
  }

  // 2e. Needs updated psychometric score (last score > 4 weeks)
  if (hasAnyScore) {
    const scoredVisits = PSTATE.visits.filter(v => v.Score !== '' && v.Score != null && !isNaN(Number(v.Score)));
    // PSTATE.visits already sorted descending by date
    const lastScoreDays = scoredVisits.length ? daysBetween(scoredVisits[0].Visit_Date, todayISO()) : 9999;
    const statusRaw = String(p.Status||'').toLowerCase();
    const statusActive = !statusRaw || ['activo','estable','stable','active'].includes(statusRaw);
    if (statusActive && lastScoreDays > 28 && lastScoreDays < 9999) {
      prompts.push({
        text: t('flag_needs_update_banner'),
        actions: [[t('action_add_visit'), 'openVisitModal()']]
      });
    }
  }

  // 3. Not improving
  const latestToolKey = lastVisit?.Tool;
  if (latestToolKey) {
    const toolVisits = PSTATE.visits.filter(v => v.Tool===latestToolKey).slice().reverse();
    if (toolVisits.length >= 3) {
      const first = Number(toolVisits[0].Score);
      const last  = Number(toolVisits[toolVisits.length-1].Score);
      const weeks = daysBetween(toolVisits[0].Visit_Date, toolVisits[toolVisits.length-1].Visit_Date) / 7;
      if (weeks >= 8 && !isNaN(first) && !isNaN(last)) {
        const reduction = first > 0 ? (first - last) / first : 0;
        if (reduction < 0.5 || last >= first) {
          prompts.push({
            text: t('not_improving_msg', { tool: latestToolKey, first, last, weeks: Math.round(weeks) }),
            actions: []
          });
        }
      }
    }
  }

  // 4. Remission → consider Prioridad Baja
  if (latestToolKey && p.Status === 'Activo') {
    const toolVisits = PSTATE.visits.filter(v => v.Tool===latestToolKey);
    if (toolVisits.length >= 2) {
      const last2 = toolVisits.slice(0,2);
      const tier = PSTATE.tools[latestToolKey];
      if (tier && last2.every(v => Number(v.Score) < tier.remission)) {
        prompts.push({
          text: t('remission_msg', { tool: latestToolKey }),
          actions: [[t('action_move_low'), `setStatus('Prioridad Baja')`]]
        });
      }
    }
  }

  if (!prompts.length) return '';
  return `
    <div class="sec-card" style="border-color: var(--color-primary); background: var(--color-primary-bg);">
      <h2 style="border:none;padding:0;margin-bottom:var(--space-3);"><span>${t('pat_recommendations')}</span></h2>
      ${prompts.map(pr => `
        <div class="prompt-card">
          ${escapeHtml(pr.text)}
          ${pr.actions.length ? `<div class="prompt-actions">${pr.actions.map(([l,fn]) => `<button class="primary" onclick="${fn}">${l}</button>`).join('')}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderTrends(toolKeys, lang) {
  if (!toolKeys.length) return `<p style="color:var(--color-text-muted);">—</p>`;
  return toolKeys.map(tool => {
    const visits = PSTATE.visits.filter(v => v.Tool===tool).slice().reverse();
    const latest = visits[visits.length-1];
    const baseline = visits[0];
    const cutoffs = PSTATE.tools[tool];
    const tier = latest ? scoreToTier(latest.Score, cutoffs) : 'Sin datos';
    const tierLbl = translateTier(tier);
    const tierCls = TIER_CLASS[tier]?.replace('tier-','') || 'nodata';
    const delta = (latest && baseline) ? (Number(latest.Score) - Number(baseline.Score)) : null;
    const deltaStr = delta == null ? '—' : (delta > 0 ? `+${delta}` : `${delta}`);
    const values = visits.map(v => Number(v.Score)).filter(x => !isNaN(x));
    return `
      <div class="trend-card">
        <h3><span>${tool}</span><span class="tool-badge tier-${tierCls}">${tierLbl}</span></h3>
        <div class="trend-score">${latest ? latest.Score : '—'}
          ${delta!=null ? `<span style="font-size: var(--text-sm); margin-left: 8px; color: ${delta<0?'var(--color-success)':delta>0?'var(--color-error)':'var(--color-text-muted)'};">${deltaStr}</span>` : ''}
        </div>
        <div class="trend-sub">${visits.length} ${t('visits')} · ${t('baseline_short')} ${baseline?baseline.Score:'—'}</div>
        ${bigSparkline(values, cutoffs)}
      </div>
    `;
  }).join('');
}

function bigSparkline(values, cutoffs) {
  const en = getLang() === 'en';
  // Single-point or no data: show placeholder message instead of chart
  if (!values || values.length < 2) {
    const msg = en ? 'Add another score to see trend' : 'Agregue otro puntaje para ver la tendencia';
    return `<div style="font-size:10px;color:var(--color-text-muted);padding:4px 0;font-style:italic;">${msg}</div>`;
  }
  // Fixed chart geometry with space for axis labels on left
  const w = 300, h = 90, padL = 34, padR = 6, padT = 6, padB = 16;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Determine y-axis range:
  // 1. Use cutoffs.max_score if present (non-null integer in Config Value JSON)
  // 2. For categorical tools (severe===999 or max_score===null), fall back to data-based range
  // 3. Otherwise use cutoff-based range
  let yMin = 0, yMax = 27;
  const hasCutoffs = cutoffs && (typeof cutoffs.severe === 'number' || typeof cutoffs.moderate === 'number');
  const isCategorical = cutoffs && (cutoffs.severe === 999 || cutoffs.max_score === null);
  if (cutoffs && typeof cutoffs.max_score === 'number' && cutoffs.max_score !== null && !isCategorical) {
    // Use explicit max_score from Config sheet
    const dataMax = Math.max(...values);
    yMax = Math.max(cutoffs.max_score, dataMax);
    yMin = 0;
  } else if (hasCutoffs && !isCategorical) {
    // Max from cutoff.severe or data max, plus headroom
    const dataMax = Math.max(...values);
    const cutMax = Math.max(cutoffs.severe || 0, cutoffs.moderate || 0, cutoffs.mild || 0, cutoffs.remission || 0);
    yMax = Math.max(dataMax, cutMax) * 1.1;
    yMin = 0;
  } else {
    const dataMax = Math.max(...values), dataMin = Math.min(...values);
    const pad = Math.max(1, (dataMax - dataMin) * 0.15);
    yMax = dataMax + pad;
    yMin = Math.max(0, dataMin - pad);
  }
  if (yMax === yMin) yMax = yMin + 1;
  const yRange = yMax - yMin;
  const yScale = v => padT + plotH - ((v - yMin) / yRange) * plotH;
  const xStep = plotW / (values.length - 1);
  const xScale = i => padL + i * xStep;

  // Severity bands (only when cutoffs available)
  // Band colors match tier colors at low opacity
  let bands = '';
  let bandLabels = '';
  if (hasCutoffs) {
    const sev = cutoffs.severe, mod = cutoffs.moderate, mild = cutoffs.mild, rem = cutoffs.remission;
    // Higher score = more severe (true for PHQ-A, GAD-7, SCARED, most questionnaires)
    // Band order from bottom: remission (lightest green), mild (amber-ish), moderate (orange), severe (red)
    const band = (lo, hi, color) => {
      if (lo == null || hi == null || lo >= hi) return '';
      const y1 = yScale(hi), y2 = yScale(lo);
      return `<rect x="${padL}" y="${y1}" width="${plotW}" height="${y2-y1}" fill="${color}" opacity="0.08"/>`;
    };
    // Use cutoff tiers to paint from yMin up to severe
    if (typeof rem === 'number')  bands += band(yMin, rem, 'var(--color-success)');
    if (typeof mild === 'number' && typeof rem === 'number') bands += band(rem, mild, 'var(--color-success)');
    if (typeof mod === 'number' && typeof mild === 'number')  bands += band(mild, mod, '#f59e0b');
    if (typeof sev === 'number' && typeof mod === 'number')   bands += band(mod, sev, '#ea580c');
    if (typeof sev === 'number') bands += band(sev, yMax, 'var(--color-error)');
  }

  // Y-axis tick labels
  const ticks = [];
  if (hasCutoffs) {
    // Show 0, mild, moderate, severe as y-axis reference lines/labels
    const pushTick = (val, label) => { if (typeof val === 'number') ticks.push({ val, label }); };
    pushTick(0, '0');
    pushTick(cutoffs.mild, String(cutoffs.mild));
    pushTick(cutoffs.moderate, String(cutoffs.moderate));
    pushTick(cutoffs.severe, String(cutoffs.severe));
  } else {
    // Simple min/max ticks
    ticks.push({ val: yMin, label: String(Math.round(yMin)) });
    ticks.push({ val: yMax, label: String(Math.round(yMax)) });
  }
  const tickMarks = ticks.map(ti => {
    const y = yScale(ti.val);
    return `<g>
      <line x1="${padL-3}" y1="${y}" x2="${padL}" y2="${y}" stroke="var(--color-text-muted)" stroke-width="0.5"/>
      <text x="${padL-5}" y="${y+3}" text-anchor="end" font-size="9" fill="var(--color-text-muted)">${ti.label}</text>
    </g>`;
  }).join('');

  // Plot area border (bottom + left axis)
  const axes = `
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+plotH}" stroke="var(--color-border)" stroke-width="0.5"/>
    <line x1="${padL}" y1="${padT+plotH}" x2="${padL+plotW}" y2="${padT+plotH}" stroke="var(--color-border)" stroke-width="0.5"/>
  `;

  // Data line and dots
  const pts = values.map((v,i) => `${xScale(i)},${yScale(v)}`);
  const last = values[values.length-1], first = values[0];
  const color = last < first ? 'var(--color-success)' : last > first ? 'var(--color-error)' : 'var(--color-text-muted)';
  const circles = values.map((v,i) => `<circle cx="${xScale(i)}" cy="${yScale(v)}" r="3" fill="${color}" stroke="var(--color-surface)" stroke-width="1"/>`).join('');

  return `<svg class="big-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;">
    ${bands}
    ${axes}
    ${tickMarks}
    <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts.join(' ')}"/>
    ${circles}
  </svg>`;
}

function renderVisits(lang) {
  if (!PSTATE.visits.length) return `<p style="color:var(--color-text-muted);">${t('no_visits')}</p>`;
  const en = lang === 'en';
  const authUsers = PSTATE.authorizedUsers || [];
  const header = `
    <div class="visit-row visit-row-header">
      <div class="vdate">${t('label_date')}</div>
      <div class="vtype">${en?'Type':'Tipo'}</div>
      <div class="vtool">${t('label_tool')}</div>
      <div class="vnote">${t('label_note')}</div>
      <div class="vscore">${t('score_col_label')}</div>
      <div class="vtier">${en?'Tier':'Nivel'}</div>
      <div class="vedit"></div>
    </div>`;
  return `<div class="visit-timeline">` + header + PSTATE.visits.map(v => {
    const tier = scoreToTier(v.Score, PSTATE.tools[v.Tool]);
    const tierCls = TIER_CLASS[tier] || 'tier-nodata';
    const tierLbl = translateTier(tier);
    const siBadge = v.SI_Positive==='TRUE' ? '<span class="pat-row-safety" style="font-size:10px;padding:1px 6px;background:var(--color-error);color:white;border-radius:999px;">SI+</span>' : '';
    const entryType = v.Entry_Type || 'Visit';
    const isScore = entryType.toLowerCase() === 'score';
    const typeBadge = isScore
      ? `<span class="entry-type-chip type-score" title="${en?'Score only (no visit)':'Solo puntaje (sin visita)'}">${en?'Score':'Puntaje'}</span>`
      : `<span class="entry-type-chip type-visit">${en?'Visit':'Visita'}</span>`;
    const creator = v.Created_By || '';
    const creatorDisplay = creator ? getUserDisplayName(creator, authUsers) : '';
    const updatedName = v.Updated_By ? getUserDisplayName(v.Updated_By, authUsers) : '';
    const updatedBadge = v.Updated_At ? ` <span title="${en?'Edited ':'Editado '}${escapeHtml(v.Updated_At)}${updatedName ? (en?' by ':' por ')+escapeHtml(updatedName) : ''}" class="vupdated">(${en?'edited':'editado'})</span>` : '';
    const creatorLine = creatorDisplay ? `<div class="vcreator">— ${escapeHtml(creatorDisplay)}${updatedBadge}</div>` : '';
    const editBtn = `<button class="vedit-btn" onclick="openEditVisitModal('${escapeHtml(v.Visit_ID)}')" title="${en?'Edit visit':'Editar visita'}">✎</button>`;
    const deleteBtn = `<button class="ghost" style="padding:4px 8px;font-size:var(--text-xs);color:var(--color-error);border-color:var(--color-error);" onclick="confirmDeleteVisit('${escapeHtml(v.Visit_ID)}')" title="${en?'Delete':'Eliminar'}">🗑</button>`;
    const noteHtml = v.Visit_Note ? renderMarkdownInline(v.Visit_Note) : '';
    const noteId = `vnote-${escapeHtml(v.Visit_ID)}`;
    const longNote = v.Visit_Note && v.Visit_Note.length > 120;
    const noteInner = longNote
      ? `<span class="vnote-preview" id="${noteId}-preview" style="display:block;">`
        + `<span style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${noteHtml}</span>`
        + `<button class="vnote-expand-btn" onclick="toggleNoteExpand('${noteId}')" style="background:none;border:none;padding:0;color:var(--color-primary);font-size:inherit;cursor:pointer;margin-top:2px;">${en?'▼ Show full note':'▼ Ver nota completa'}</button>`
        + `</span>`
        + `<span class="vnote-full" id="${noteId}-full" style="display:none;">`
        + noteHtml
        + `<button class="vnote-expand-btn" onclick="toggleNoteExpand('${noteId}')" style="background:none;border:none;padding:0;color:var(--color-primary);font-size:inherit;cursor:pointer;margin-top:2px;display:block;">${en?'▲ Collapse':'▲ Colapsar'}</button>`
        + `</span>`
      : noteHtml;
    return `
      <div class="visit-row${isScore?' visit-row-score':''}">
        <div class="vdate">${v.Visit_Date}</div>
        <div class="vtype">${typeBadge}</div>
        <div class="vtool">${v.Tool||'—'}</div>
        <div class="vnote">${noteInner} ${siBadge}${creatorLine}</div>
        <div class="vscore">${v.Score||'—'}</div>
        <div class="vtier ${tierCls}">${tierLbl}</div>
        <div class="vedit">${editBtn}${deleteBtn}</div>
      </div>
    `;
  }).join('') + `</div>`;
}

function renderMeds(lang) {
  if (!PSTATE.meds.length) return `<p style="color:var(--color-text-muted);">${t('no_meds')}</p>`;
  return PSTATE.meds.map(m => {
    const freqPart = m.Frequency ? ` <span style="color:var(--color-text-muted);font-weight:400;">· ${escapeHtml(m.Frequency)}</span>` : '';
    const notesLine = m.Notes ? `<div class="mnotes" style="grid-column:1 / -1;">${renderMarkdownInline(m.Notes)}</div>` : '';
    return `
    <div class="med-row">
      <div class="mdate">${m.Date}</div>
      <div class="mmed">${escapeHtml(m.Medication)} ${m.Dose?`<span style="color:var(--color-text-muted);font-weight:400;">· ${m.Dose}</span>`:''}${freqPart}</div>
      <div class="maction">${escapeHtml(translateMedAction(m.Action)||'')}</div>
      <div class="mpresc" style="grid-column:span 2;">${escapeHtml(m.Reason||'')}${m.Reason && m.Prescriber ? ' · ' : ''}${escapeHtml(m.Prescriber||'')}</div>
      ${notesLine}
    </div>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════════════════════════
async function acknowledgeSafety() {
  if (!confirm(t('safety_confirm_ack'))) return;
  const now = new Date().toISOString();
  const prev = {
    Safety_Flag_Ack_By: PSTATE.patient.Safety_Flag_Ack_By,
    Safety_Flag_Ack_At: PSTATE.patient.Safety_Flag_Ack_At,
  };
  try {
    await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
      Safety_Flag_Ack_By: PSTATE.user || 'unknown',
      Safety_Flag_Ack_At: now,
      Updated_By: PSTATE.user,
      Updated_At: now,
    });
    PSTATE.patient.Safety_Flag_Ack_By = PSTATE.user;
    PSTATE.patient.Safety_Flag_Ack_At = now;
    showToast(t('saved'), { variant: 'success', undo: async () => {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, prev);
      PSTATE.patient.Safety_Flag_Ack_By = prev.Safety_Flag_Ack_By;
      PSTATE.patient.Safety_Flag_Ack_At = prev.Safety_Flag_Ack_At;
      render();
    }});
    render();
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => acknowledgeSafety() });
  }
}

async function raiseSafety() {
  const reason = prompt(t('safety_reason_prompt'));
  if (!reason) return;
  const now = new Date().toISOString();
  const prev = {
    Safety_Flag: PSTATE.patient.Safety_Flag,
    Safety_Flag_Ack_By: PSTATE.patient.Safety_Flag_Ack_By,
    Safety_Flag_Ack_At: PSTATE.patient.Safety_Flag_Ack_At,
    Notes: PSTATE.patient.Notes,
  };
  try {
    await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
      Safety_Flag: 'TRUE',
      Safety_Flag_Ack_By: '',
      Safety_Flag_Ack_At: '',
      Notes: (PSTATE.patient.Notes ? PSTATE.patient.Notes + '\n' : '') + `[${now.slice(0,10)}] Safety flag: ${reason}`,
      Updated_By: PSTATE.user, Updated_At: now,
    });
    PSTATE.patient.Safety_Flag = 'TRUE';
    PSTATE.patient.Safety_Flag_Ack_By = '';
    PSTATE.patient.Safety_Flag_Ack_At = '';
    PSTATE.patient.Notes = (prev.Notes ? prev.Notes + '\n' : '') + `[${now.slice(0,10)}] Safety flag: ${reason}`;
    showToast(t('saved'), { variant: 'success', undo: async () => {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, prev);
      Object.assign(PSTATE.patient, prev);
      render();
    }});
    render();
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => raiseSafety() });
  }
}

function toggleStatus() {
  const cur = PSTATE.patient.Status || 'Activo';
  const options = [
    { v:'Activo',      defEs:'Terapia y monitoreo CoCM activo',                   defEn:'Active therapy and CoCM monitoring' },
    { v:'Estable',     defEs:'Monitoreo CoCM reducido, cadencia de 16 semanas',   defEn:'Reduced CoCM monitoring, 16-week cadence' },
    { v:'Inactivo',    defEs:'Solo terapia — CoCM pausado. Puede revisarse periódicamente a menor frecuencia.', defEn:'Therapy only — CoCM paused. May still be reviewed periodically at a lower frequency than active patients.' },
    { v:'Transferido', defEs:'Ya no es estudiante de Camasca',                    defEn:'No longer a Camasca student' },
    { v:'Otro',        defEs:'Especificar (texto libre)',                         defEn:'Specify (freetext)' },
  ];
  const en = getLang()==='en';
  const rows = options.map(o => {
    const checked = o.v === cur ? 'checked' : '';
    const def = en ? o.defEn : o.defEs;
    const label = translateStatus(o.v);
    return `<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:6px;cursor:pointer;">
      <input type="radio" name="stOpt" value="${o.v}" ${checked} style="margin-top:3px;"/>
      <div>
        <div style="font-weight:600;color:var(--color-text);">${label}</div>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px;">${def}</div>
      </div>
    </label>`;
  }).join('');
  document.getElementById('statusForm').innerHTML = `
    ${rows}
    <div id="stOtherWrap" style="margin-top:8px;display:${cur && !options.slice(0,4).some(o=>o.v===cur) ? 'block':'none'};">
      <label class="np-label">${en?'Specify':'Especificar'}</label>
      <input type="text" id="stOther" value="${cur && !['Activo','Estable','Inactivo','Transferido'].includes(cur) ? escapeHtml(cur) : ''}" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
    </div>
  `;
  // Wire visibility of Other freetext
  document.querySelectorAll('input[name="stOpt"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('stOtherWrap').style.display = r.checked && r.value === 'Otro' ? 'block' : 'none';
    });
  });
  document.getElementById('statusModal').style.display = 'flex';
  const btn = document.getElementById('statusSaveBtn');
  if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; }
}

function closeStatusModal() { document.getElementById('statusModal').style.display = 'none'; }

async function submitStatus() {
  const picked = document.querySelector('input[name="stOpt"]:checked');
  if (!picked) return;
  let newStatus = picked.value;
  if (newStatus === 'Otro') {
    const other = (document.getElementById('stOther')?.value || '').trim();
    if (!other) { showToast(t('err_status_other_req') || 'Especifique el estado', { variant:'warn' }); return; }
    newStatus = other;
  }
  const btn = document.getElementById('statusSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = (getLang()==='en'?'Saving…':'Guardando…'); }
  await setStatus(newStatus);
  closeStatusModal();
}

async function setStatus(newStatus) {
  const prev = PSTATE.patient.Status;
  const now = new Date().toISOString();
  try {
    await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
      Status: newStatus, Updated_By: PSTATE.user, Updated_At: now,
    });
    PSTATE.patient.Status = newStatus;
    showToast(t('saved'), { variant: 'success', undo: async () => {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, { Status: prev });
      PSTATE.patient.Status = prev;
      render();
    }});
    render();
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => setStatus(newStatus) });
  }
}

// ── Visit modal ────────────────────────────────────────────────
function openVisitModal() {
  const patientTools = (PSTATE.patient.Tools||'').split(',').map(s=>s.trim()).filter(Boolean);
  // Sticky tool: prefer most recently used tool for this patient
  const lastUsedTool = PSTATE.visits[0]?.Tool;
  const defaultTool = lastUsedTool && patientTools.includes(lastUsedTool)
    ? lastUsedTool
    : patientTools[0] || Object.keys(PSTATE.tools)[0] || '';

  // Build tool options: patient's tools first (with recent one preselected), then others
  const otherTools = Object.keys(PSTATE.tools).filter(tk => !patientTools.includes(tk));
  const toolOptions = [
    ...patientTools.map(tk => ({ v: tk, l: tk, preferred: true })),
    ...otherTools.map(tk => ({ v: tk, l: tk + ' *', preferred: false })),
  ];

  // Depression/anxiety/MDD-GAD conditions require safety-first layout
  const primaryConds = (PSTATE.patient.Conditions||'').split(',').map(s=>s.trim());
  const needsSafetyFirst = primaryConds.some(c => /depress|anxiety|mdd|gad/i.test(c));

  const safetySection = needsSafetyFirst ? `
    <div style="background:oklch(from var(--color-error) l c h / 0.08);border:1px solid oklch(from var(--color-error) l c h / 0.3);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-3);">
      <div style="font-weight:700;color:var(--color-error);font-size:var(--text-sm);margin-bottom:6px;">⚠ ${t('safety_concern_title')}</div>
      <label style="display:flex;gap:10px;align-items:center;font-size:var(--text-sm);cursor:pointer;">
        <input type="checkbox" id="vSI" style="width:18px;height:18px;cursor:pointer;" />
        <span>${t('safety_si_prompt')}</span>
      </label>
      <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:6px;margin-left:28px;">${getLang()==='en' ? 'Checking this will auto-raise a safety flag for this patient.' : 'Marcar esto activa automáticamente una bandera de seguridad para el paciente.'}</div>
    </div>
  ` : `
    <input type="hidden" id="vSI" />
  `;

  const en = getLang() === 'en';
  const toolOptionsHtml = toolOptions.map(o => `<option value="${o.v}">${o.l}</option>`).join('');
  const inputSt = 'width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);';
  document.getElementById('visitForm').innerHTML = `
    ${safetySection}
    <div>
      <label class="np-label">${t('label_date')}</label>
      <input type="date" id="vDate" value="${new Date().toISOString().slice(0,10)}" style="${inputSt}max-width:200px;"/>
    </div>
    <div id="vToolRows" style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:var(--space-2);"></div>
    <button type="button" id="vAddToolBtn" onclick="addVisitToolRow()" style="margin-top:var(--space-2);background:transparent;border:1px dashed var(--color-border);color:var(--color-primary);padding:6px 12px;border-radius:var(--radius-md);font-size:var(--text-sm);cursor:pointer;">+ ${en?'Add another tool':'Agregar otra herramienta'}</button>
    <div style="margin-top: var(--space-3);">
      <label class="np-label">${t('label_note')} <span style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:400;text-transform:none;">(${t('label_optional')})</span></label>
      <textarea id="vNote" rows="2" style="${inputSt}" placeholder="${en?'Visit note (supports **bold** / *italic*)':'Nota de visita (admite **negrita** / *cursiva*)'}"></textarea>
    </div>
    <template id="vToolRowTmpl">
      <div class="v-tool-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:var(--space-2);align-items:end;">
        <div>
          <label class="np-label">${t('label_tool')}</label>
          <select class="vToolSel" style="${inputSt}">${toolOptionsHtml}</select>
        </div>
        <div>
          <label class="np-label">${t('label_score')} <span style="color:var(--color-error);">*</span></label>
          <input type="number" class="vScoreInp" style="${inputSt}"/>
        </div>
        <button type="button" class="vRemoveRowBtn" onclick="removeVisitToolRow(this)" title="${en?'Remove':'Quitar'}" style="background:transparent;border:1px solid var(--color-border);color:var(--color-text-muted);padding:8px 10px;border-radius:var(--radius-md);cursor:pointer;">×</button>
      </div>
    </template>
  `;
  // Add first row with defaultTool preselected
  addVisitToolRow(defaultTool);
  document.getElementById('visitModal').style.display = 'flex';
  setTimeout(() => document.querySelector('.vScoreInp')?.focus(), 50);
}

function addVisitToolRow(preselect) {
  const host = document.getElementById('vToolRows');
  const tmpl = document.getElementById('vToolRowTmpl');
  if (!host || !tmpl) return;
  const frag = tmpl.content.cloneNode(true);
  const row = frag.querySelector('.v-tool-row');
  if (preselect) {
    const sel = row.querySelector('.vToolSel');
    if (sel) sel.value = preselect;
  }
  // Hide first row's remove button when there's only one row
  host.appendChild(frag);
  updateVisitRowRemoveButtons();
}

function removeVisitToolRow(btn) {
  const row = btn.closest('.v-tool-row');
  if (row) row.remove();
  updateVisitRowRemoveButtons();
}

function updateVisitRowRemoveButtons() {
  const rows = document.querySelectorAll('#vToolRows .v-tool-row');
  rows.forEach((r, i) => {
    const btn = r.querySelector('.vRemoveRowBtn');
    if (btn) btn.style.visibility = (rows.length === 1) ? 'hidden' : 'visible';
  });
}
if (typeof window !== 'undefined') {
  window.addVisitToolRow = addVisitToolRow;
  window.removeVisitToolRow = removeVisitToolRow;
}
function closeVisitModal() { document.getElementById('visitModal').style.display = 'none'; }

async function submitVisit() {
  const btn = document.getElementById('visitSaveBtn');
  if (btn && btn.disabled) return;       // double-click guard
  const reenable = () => { if (btn) { btn.disabled = false; btn.textContent = (getLang()==='en'?'Save':'Guardar'); } };

  // Collect tool/score pairs from all rows
  const rows = Array.from(document.querySelectorAll('#vToolRows .v-tool-row'));
  const entries = rows.map(r => ({
    tool: r.querySelector('.vToolSel')?.value || '',
    score: r.querySelector('.vScoreInp')?.value || '',
  })).filter(e => e.tool || e.score !== '');

  if (!entries.length) {
    showToast(t('err_tool_score_req'), { variant: 'warn' });
    return;
  }
  for (const e of entries) {
    if (!e.tool || e.score === '') {
      showToast(t('err_tool_score_req'), { variant: 'warn' });
      return;
    }
    if (!isNaN(Number(e.score)) && (Number(e.score) < 0 || Number(e.score) > 100)) {
      showToast(t('err_score_range', { tool: e.tool }), { variant: 'warn' });
      return;
    }
  }

  if (btn) { btn.disabled = true; btn.textContent = (getLang()==='en'?'Saving…':'Guardando…'); }

  const siEl = document.getElementById('vSI');
  const siPositive = siEl && siEl.type === 'checkbox' ? (siEl.checked ? 'TRUE' : 'FALSE') : 'FALSE';
  const visitDate = document.getElementById('vDate').value;
  const visitNote = document.getElementById('vNote').value.trim();
  const now = new Date().toISOString();
  const visitIdBase = `V-${Date.now()}`;

  const createdRows = [];
  try {
    for (let i = 0; i < entries.length; i++) {
      const { tool, score } = entries[i];
      const baseline = PSTATE.visits.filter(v => v.Tool===tool).slice(-1)[0]?.Baseline_Score
                     || PSTATE.visits.filter(v => v.Tool===tool)[0]?.Score
                     || score;
      const row = {
        Visit_ID: i === 0 ? visitIdBase : `${visitIdBase}-t${i+1}`,
        Patient_ID: PSTATE.patient.Patient_ID,
        Visit_Date: visitDate,
        Therapist: PSTATE.user || PSTATE.patient.Therapist || '',
        Tool: tool,
        Score: score,
        Baseline_Score: baseline,
        Subscale_Scores: '',
        SI_Positive: i === 0 ? siPositive : 'FALSE', // SI attaches to first row only
        Not_Improving_Flag: '',
        Visit_Note: i === 0 ? visitNote : '',
        Entry_Type: 'Visit',
        Created_By: PSTATE.user || 'unknown',
        Created_At: now,
        Updated_By: '',
        Updated_At: '',
        Schema_Version: '1.0',
      };
      const res = await writeRow('Visitas', row);
      createdRows.push(row);
    }
    showToast(entries.length > 1
      ? (getLang()==='en' ? `${entries.length} tools logged` : `${entries.length} herramientas registradas`)
      : t('saved_visit'), { variant: 'success' });
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => submitVisit() });
    reenable();
    return;
  }

  // Auto-raise safety if SI positive
  if (siPositive === 'TRUE' && PSTATE.patient.Safety_Flag !== 'TRUE') {
    try {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
        Safety_Flag: 'TRUE', Updated_By: PSTATE.user, Updated_At: now,
      });
    } catch (_) { /* non-fatal */ }
    PSTATE.patient.Safety_Flag = 'TRUE';
    PSTATE.patient.Safety_Flag_Ack_At = '';
  }
  // Auto-update Last_BHCM_Contact_Date — therapist-only (aligns with AIMS CoCM).
  // Psychiatrist contacts show in Visit history instead; they don't overwrite the BHCM contact row.
  if (isTherapistRole(PSTATE.user, PSTATE.authorizedUsers || [])) {
    try {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
        Last_BHCM_Contact_Date: visitDate,
        Last_BHCM_Contact_Note: visitNote || '',
        Last_BHCM_Contact_By: PSTATE.user || '',
        Updated_By: PSTATE.user || '', Updated_At: now,
      });
      PSTATE.patient.Last_BHCM_Contact_Date = visitDate;
      PSTATE.patient.Last_BHCM_Contact_Note = visitNote || '';
      PSTATE.patient.Last_BHCM_Contact_By = PSTATE.user || '';
    } catch (_) { /* non-fatal */ }
  }

  createdRows.reverse().forEach(r => PSTATE.visits.unshift(r));
  closeVisitModal();
  render();
}

// ── Med modal ──────────────────────────────────────────────────
const MED_FORMULARY = [
  'Gabapentin 300 mg',
  'Fluoxetine 20 mg',
  'Hydroxyzine 25 mg',
  'Guanfacine 1 mg',
  'Levetiracetam (Keppra) 500 mg',
  'Diazepam 5 mg',
  'Quetiapine (Seroquel) 50 mg',
  'Melatonin 1 mg',
];
const MED_FREQ_PRESETS = [
  { v:'QD-AM',  en:'Daily, every morning',  es:'Diario, cada mañana' },
  { v:'QD-PM',  en:'Daily, every evening',  es:'Diario, cada noche' },
  { v:'QHS',    en:'QHS, before bed',       es:'QHS, al acostarse' },
  { v:'BID',    en:'BID',                   es:'BID (2 veces al día)' },
  { v:'TID',    en:'TID',                   es:'TID (3 veces al día)' },
];

function openMedModal() {
  const en = getLang()==='en';
  const patientConds = (PSTATE.patient.Conditions||'').split(',').map(s=>s.trim()).filter(Boolean);
  const condCheckboxes = patientConds.map(c => {
    const d = (PSTATE.conditions && PSTATE.conditions[c]) || null;
    const lbl = d ? (en ? d.en : d.es) : c;
    return `<label style="display:inline-flex;gap:4px;align-items:center;padding:4px 10px;background:var(--color-surface-offset);border-radius:var(--radius-full);font-size:var(--text-xs);cursor:pointer;"><input type="checkbox" class="mReasonCond" value="${escapeHtml(lbl)}"/>${lbl}</label>`;
  }).join('');

  document.getElementById('medForm').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
      <div>
        <label class="np-label">${t('label_date')}</label>
        <input type="date" id="mDate" value="${new Date().toISOString().slice(0,10)}" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label class="np-label">${t('label_action')}</label>
        <select id="mAction" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          <option value="START">${t('med_start')}</option>
          <option value="INCREASE">${t('med_increase')}</option>
          <option value="DECREASE">${t('med_decrease')}</option>
          <option value="CONTINUE">${t('med_continue')}</option>
          <option value="HOLD">${t('med_hold')}</option>
          <option value="STOP">${t('med_stop')}</option>
        </select>
      </div>
      <div>
        <label class="np-label">${t('label_medication')} <span style="color:var(--color-error);">*</span></label>
        <select id="mMedSel" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          <option value="">—</option>
          ${MED_FORMULARY.map(m => `<option value="${m}">${m}</option>`).join('')}
          <option value="__other__">${en?'Other (specify)':'Otro (especificar)'}</option>
        </select>
        <input type="text" id="mMedOther" placeholder="${en?'Specify medication':'Especificar medicamento'}" style="display:none;margin-top:6px;width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label class="np-label">${t('label_dose')}</label>
        <div style="position:relative;">
          <input type="number" id="mDose" placeholder="20" step="0.5" min="0" style="width:100%;padding:8px 42px 8px 8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
          <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--color-text-muted);font-size:var(--text-sm);pointer-events:none;">mg</span>
        </div>
      </div>
      <div>
        <label class="np-label">${t('label_frequency')}</label>
        <select id="mFreqSel" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          <option value="">—</option>
          ${MED_FREQ_PRESETS.map(p => `<option value="${p.v}">${en?p.en:p.es}</option>`).join('')}
        </select>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:var(--text-sm);cursor:pointer;">
          <input type="checkbox" id="mPRN" style="width:16px;height:16px;"/>
          <span>PRN (${en?'as needed':'según sea necesario'})</span>
        </label>
      </div>
      <div>
        <label class="np-label">${t('label_prescriber')}</label>
        <select id="mPresc" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          ${PSTATE.team.filter(tm => tm.role==='psychiatrist').map(tm => `<option value="${tm.name}">${tm.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top: var(--space-3);">
      <label class="np-label">${t('label_reason')}</label>
      ${condCheckboxes ? `<div id="mReasonConds" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">${condCheckboxes}</div>` : ''}
      <input type="text" id="mReason" placeholder="${en?'Additional reason (optional)':'Razón adicional (opcional)'}" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
    </div>
    <div style="margin-top: var(--space-3);">
      <label class="np-label">${t('label_notes')}</label>
      <textarea id="mNotes" rows="2" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"></textarea>
    </div>
  `;
  // Toggle "Other" freetext visibility
  const selEl = document.getElementById('mMedSel');
  const otherEl = document.getElementById('mMedOther');
  selEl.addEventListener('change', () => {
    const isOther = selEl.value === '__other__';
    otherEl.style.display = isOther ? 'block' : 'none';
    if (isOther) setTimeout(() => otherEl.focus(), 50);
  });
  const mbtn = document.getElementById('medSaveBtn');
  if (mbtn) { mbtn.disabled = false; mbtn.textContent = (en?'Save':'Guardar'); }
  document.getElementById('medModal').style.display = 'flex';
  setTimeout(() => document.getElementById('mMedSel')?.focus(), 50);
}
function closeMedModal() { document.getElementById('medModal').style.display = 'none'; }

async function submitMed() {
  const btn = document.getElementById('medSaveBtn');
  if (btn && btn.disabled) return;
  if (btn) { btn.disabled = true; btn.textContent = (getLang()==='en'?'Saving…':'Guardando…'); }
  const reenable = () => { if (btn) { btn.disabled = false; btn.textContent = (getLang()==='en'?'Save':'Guardar'); } };

  // Medication: formulary selection or "other" freetext
  const medSelEl = document.getElementById('mMedSel');
  const medOtherEl = document.getElementById('mMedOther');
  let med = '';
  if (medSelEl) {
    med = medSelEl.value === '__other__' ? (medOtherEl?.value || '').trim() : medSelEl.value;
  }
  if (!med) { showToast(t('err_med_required'), { variant: 'warn' }); reenable(); return; }

  // Dose: numeric with implicit mg unit
  const doseRaw = (document.getElementById('mDose').value || '').trim();
  const doseStr = doseRaw ? `${doseRaw} mg` : '';

  // Frequency: preset + PRN checkbox
  const freqSelEl = document.getElementById('mFreqSel');
  const isPRN = !!document.getElementById('mPRN')?.checked;
  let freq = freqSelEl?.value || '';
  if (freq === 'QD-AM') freq = (getLang()==='en'?'Daily, every morning':'Diario, cada mañana');
  else if (freq === 'QD-PM') freq = (getLang()==='en'?'Daily, every evening':'Diario, cada noche');
  else if (freq === 'QHS') freq = (getLang()==='en'?'QHS, before bed':'QHS, al acostarse');
  if (isPRN) freq = (freq ? freq + ' + PRN' : 'PRN');

  // Reason: checkboxes + freetext
  const reasonCbs = [...document.querySelectorAll('.mReasonCond:checked')].map(c => c.value);
  const reasonText = (document.getElementById('mReason').value || '').trim();
  const reason = [reasonCbs.join(', '), reasonText].filter(Boolean).join(' — ');

  const now = new Date().toISOString();
  const row = {
    Med_ID: `M-${Date.now()}`,
    Patient_ID: PSTATE.patient.Patient_ID,
    Date: document.getElementById('mDate').value,
    Medication: med,
    Dose: doseStr,
    Frequency: freq,
    Action: document.getElementById('mAction').value,
    Prescriber: document.getElementById('mPresc').value,
    Reason: reason,
    Notes: document.getElementById('mNotes').value.trim(),
    Created_By: PSTATE.user || 'unknown',
    Created_At: now,
    Schema_Version: '1.0',
  };
  try {
    const res = await writeRow('Medicamentos', row);
    if (res.queued) showToast(t('queued_pending'), { variant: 'warn' });
    else showToast(t('saved_med'), { variant: 'success' });
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => submitMed() });
    reenable();
    return;
  }
  PSTATE.meds.unshift(row);
  closeMedModal();
  render();
}

function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Auth gate reused from registro-app.js is not available here (separate HTML page),
// so we inline a slim version that calls pingAuth and blocks on unauthorized users.
async function _pacAuthGate() {
  if (typeof pingAuth !== 'function') return { status: 'ok', user: { email: '', name: '', role: '' } };
  const result = await pingAuth();
  if (result.status === 'ok' || result.status === 'no_relay') return result.status === 'ok' ? result : { status: 'ok', user: { email: '', name: '', role: '' } };
  const isEN = (document.documentElement.getAttribute('data-lang') === 'en');
  const host = document.querySelector('.page-content') || document.querySelector('.main-content') || document.querySelector('.reg-page') || document.body;
  let title, bodyHtml, ctaLabel = null, ctaHref = null;
  if (result.status === 'signin_required') {
    title = isEN ? 'Google sign-in required' : 'Requiere inicio de sesión con Google';
    bodyHtml = isEN
      ? `<p>This registry is restricted to authorized clinic staff. Sign in with your Google account to continue.</p>`
      : `<p>Este registro está restringido al personal autorizado. Inicie sesión con su cuenta de Google para continuar.</p>`;
    ctaLabel = isEN ? 'Sign in with Google' : 'Iniciar sesión con Google';
    ctaHref = result.signInUrl;
  } else if (result.status === 'unauthorized') {
    title = isEN ? 'Access denied' : 'Acceso denegado';
    const email = result.email || (isEN ? 'your account' : 'su cuenta');
    bodyHtml = isEN
      ? `<p>The account <strong>${email}</strong> is not authorized.</p><p>Contact <a href="mailto:cocm.camasca@gmail.com">cocm.camasca@gmail.com</a> to be added.</p>`
      : `<p>La cuenta <strong>${email}</strong> no está autorizada.</p><p>Contacte a <a href="mailto:cocm.camasca@gmail.com">cocm.camasca@gmail.com</a>.</p>`;
  } else {
    title = isEN ? 'Connection error' : 'Error de conexión';
    bodyHtml = `<pre style="background:#f9fafb; padding:10px; border-radius:6px; font-size:12px;">${String(result.message || '').replace(/</g,'&lt;')}</pre>`;
    ctaLabel = isEN ? 'Reload' : 'Recargar';
    ctaHref = location.href;
  }
  host.innerHTML = `
    <div style="max-width:520px;margin:10vh auto;padding:32px 28px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.06);font-family:system-ui;">
      <h2 style="margin:0 0 12px;font-size:20px;">${title}</h2>
      <div style="color:#374151;line-height:1.55;font-size:15px;">${bodyHtml}</div>
      ${ctaLabel && ctaHref ? `<div style="margin-top:20px;"><a href="${ctaHref}" style="display:inline-block;background:#0369a1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">${ctaLabel}</a></div>` : ''}
    </div>`;
  return { status: 'blocked' };
}

// ── Brigade Flag modal ────────────────────────────────────────────
function openBrigadeModal() {
  const host = document.getElementById('brigadeModal');
  if (!host) return;
  const p = PSTATE.patient || {};
  const en = getLang() === 'en';
  const inputStyle = 'width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);';
  document.getElementById('brigadeForm').innerHTML = `
    <label style="display:flex;gap:10px;align-items:center;font-size:var(--text-sm);cursor:pointer;font-weight:600;">
      <input type="checkbox" id="brigadeCheckbox" ${isTruthyFlag(p.Brigade_Flag)?'checked':''} style="width:18px;height:18px;cursor:pointer;"/>
      <span>🚩 ${en?'Flag for next brigade':'Marcar para próxima brigada'}</span>
    </label>
    <input type="text" id="brigadeReason" placeholder="${en?'Reason / details — supports **bold** / *italic*':'Razón / detalles — admite **negrita** / *cursiva*'}" value="${escapeHtml(p.Brigade_Reason||'')}" style="${inputStyle}margin-top:10px;"/>
    <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">${en?'Flags this patient to be seen by the next brigade. Appears on the registry Brigade filter chip.':'Marca a este paciente para ser visto en la próxima brigada. Aparece en el filtro de Brigada del registro.'}</div>
  `;
  host.style.display = 'flex';
}
function closeBrigadeModal() {
  const host = document.getElementById('brigadeModal');
  if (host) host.style.display = 'none';
}
async function submitBrigade() {
  const btn = document.getElementById('brigadeSaveBtn');
  if (btn && btn.disabled) return;
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  const brigadeFlag = document.getElementById('brigadeCheckbox')?.checked ? 'TRUE' : '';
  const brigadeReason = (document.getElementById('brigadeReason')?.value || '').trim();
  const p = PSTATE.patient || {};
  const en = getLang() === 'en';
  try {
    const result = await updateRow('Pacientes', p.Patient_ID, {
      Brigade_Flag: brigadeFlag,
      Brigade_Reason: brigadeReason,
      Updated_By: PSTATE.user || 'unknown',
      Updated_At: new Date().toISOString(),
    });
    if (result && (result.status === 'ok' || result.ok)) {
      PSTATE.patient = { ...p, Brigade_Flag: brigadeFlag, Brigade_Reason: brigadeReason };
      // Also update in shared STATE if available
      if (typeof STATE !== 'undefined' && STATE.pacientes) {
        const idx = STATE.pacientes.findIndex(x => x.Patient_ID === p.Patient_ID);
        if (idx >= 0) STATE.pacientes[idx] = { ...STATE.pacientes[idx], Brigade_Flag: brigadeFlag, Brigade_Reason: brigadeReason };
      }
      closeBrigadeModal();
      render();
    } else {
      showToast((en ? 'Save failed: ' : 'Error al guardar: ') + (result?.message || 'unknown error'), { variant: 'error' });
      if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; }
    }
  } catch(e) {
    showToast((en ? 'Save failed: ' : 'Error al guardar: ') + e.message, { variant: 'error' });
    if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; }
  }
}
if (typeof window !== 'undefined') {
  window.openBrigadeModal = openBrigadeModal;
  window.closeBrigadeModal = closeBrigadeModal;
  window.submitBrigade = submitBrigade;
}

// ── Edit Patient modal (demographics + conditions + monitored tools) ──
// Live DOB → Age helper for edit modal
function updateEpAge(dobVal) {
  const el = document.getElementById('epAgeDisplay');
  if (!el) return;
  if (!dobVal) { el.textContent = '—'; return; }
  const age = Math.floor((Date.now() - new Date(dobVal).getTime()) / 31557600000);
  el.textContent = isNaN(age) || age < 0 ? '—' : String(age);
}
if (typeof window !== 'undefined') window.updateEpAge = updateEpAge;

function openEditPatientModal() {
  const p = PSTATE.patient || {};
  const en = getLang() === 'en';
  const curConds = new Set((p.Conditions||'').split(',').map(s=>s.trim()).filter(Boolean));
  const curTools = new Set((p.Tools||'').split(',').map(s=>s.trim()).filter(Boolean));
  const condKeys = Object.keys(PSTATE.conditions || {});
  const toolKeysAll = Object.keys(PSTATE.tools || {});

  const sexVal = (p.Sex || '').trim();

  // Primary condition select: current stored value if any, else auto-infer
  // from first listed condition. Shows ⚠ verify badge when not yet verified.
  const pcStored = (typeof normalizeConditionKey === 'function') ? normalizeConditionKey(p.Primary_Condition) : '';
  const pcVerified = (typeof isTruthyFlag === 'function') ? isTruthyFlag(p.Primary_Condition_Verified) : false;
  const firstCond = (p.Conditions||'').split(',').map(s=>s.trim()).filter(Boolean)[0] || '';
  const pcInferred = (typeof normalizeConditionKey === 'function') ? normalizeConditionKey(firstCond) : firstCond;
  const pcCurrent = pcStored || pcInferred || '';
  const pcNeedsVerify = !pcVerified || !pcStored;
  const pcOptionHtml = condKeys.map(c => {
    const d = PSTATE.conditions[c] || {};
    const lbl = en ? (d.en || c) : (d.es || c);
    return `<option value="${escapeHtml(c)}" ${pcCurrent===c?'selected':''}>${escapeHtml(lbl)}</option>`;
  }).join('');

  // Detect any freetext 'other' condition stored that isn't a known condKey
  const _knownCondSet = new Set(condKeys);
  const _otherCondVal = [...curConds].find(c => !_knownCondSet.has(c)) || '';
  const _otherCondChecked = !!_otherCondVal;

  const condRows = condKeys.map(c => {
    const d = PSTATE.conditions[c] || {};
    const lbl = en ? (d.en || c) : (d.es || c);
    return `<label style="display:flex;gap:8px;align-items:center;padding:6px 4px;cursor:pointer;font-size:var(--text-sm);">
      <input type="checkbox" name="epCond" value="${escapeHtml(c)}" ${curConds.has(c)?'checked':''} style="width:16px;height:16px;cursor:pointer;" onchange="epUpdateTools()"/>
      <span>${escapeHtml(lbl)}</span>
    </label>`;
  }).join('') + `
    <div style="padding:6px 4px;">
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer;font-size:var(--text-sm);" onclick="(function(e){e.stopPropagation();var cb=document.getElementById('epCondOtherCb');var wrap=document.getElementById('epCondOtherWrap');if(e.target!==cb){cb.checked=!cb.checked;}wrap.style.display=cb.checked?'block':'none';if(cb.checked)setTimeout(()=>document.getElementById('epCondOtherText').focus(),50);}).call(this,event)">
        <input type="checkbox" id="epCondOtherCb" ${_otherCondChecked?'checked':''} style="width:16px;height:16px;cursor:pointer;" onclick="event.stopPropagation();document.getElementById('epCondOtherWrap').style.display=this.checked?'block':'none';if(this.checked)setTimeout(()=>document.getElementById('epCondOtherText').focus(),50);"/>
        <span>${en?'Other':'Otro'}</span>
      </label>
      <div id="epCondOtherWrap" style="display:${_otherCondChecked?'block':'none'};margin-top:6px;padding-left:24px;">
        <input type="text" id="epCondOtherText" value="${escapeHtml(_otherCondVal)}" placeholder="${en?'Specify condition':'Especificar condición'}" style="width:100%;padding:7px 8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm);"/>
      </div>
    </div>`;

  // Compute which tools have already been completed (have at least one score in Visitas)
  const _completedToolsSet = new Set((PSTATE.visits||[]).filter(v=>v.Score!==''&&v.Score!=null).map(v=>v.Tool).filter(Boolean));
  const completedToolsArr = [..._completedToolsSet];
  const epAge = p.DOB ? Math.floor((Date.now()-new Date(p.DOB).getTime())/31557600000) : (p.Age ? Number(p.Age) : null);
  const epConds = (p.Conditions||''). split(',').map(s=>s.trim()).filter(Boolean);

  const inputStyle = 'width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);';
  document.getElementById('editPatientForm').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
      <div style="grid-column:1 / -1;">
        <label class="np-label">${en?'Name':'Nombre'} <span style="color:var(--color-error);">*</span></label>
        <input type="text" id="epName" value="${escapeHtml(p.Patient_Name||'')}" style="${inputStyle}"/>
      </div>
      <div>
        <label class="np-label">${en?'Date of birth':'Fecha de nacimiento'}</label>
        <input type="date" id="epDOB" value="${escapeHtml(p.DOB||'')}" style="${inputStyle}" oninput="updateEpAge(this.value);epUpdateTools()"/>
      </div>
      <div>
        <label class="np-label">${en?'Age':'Edad'}</label>
        <div id="epAgeDisplay" style="${inputStyle}background:var(--color-surface-3,var(--color-surface-2));color:var(--color-text-muted);cursor:default;">${escapeHtml(p.DOB ? String(Math.floor((Date.now()-new Date(p.DOB).getTime())/31557600000)) : (p.Age||'—'))}</div>
      </div>
      <div>
        <label class="np-label">${en?'Sex':'Sexo'}</label>
        <select id="epSex" style="${inputStyle}">
          <option value="" ${sexVal===''?'selected':''}>—</option>
          <option value="F" ${sexVal==='F'?'selected':''}>F</option>
          <option value="M" ${sexVal==='M'?'selected':''}>M</option>
          <option value="Otro" ${sexVal && !['F','M',''].includes(sexVal) ? 'selected' : ''}>${en?'Other':'Otro'}</option>
        </select>
      </div>
      <div>
        <label class="np-label">${en?'Enrollment date':'Fecha de ingreso'}</label>
        <input type="date" id="epEnrolled" value="${escapeHtml(p.Enrollment_Date||'')}" style="${inputStyle}"/>
      </div>
      <div style="grid-column:1 / -1;">
        <label class="np-label">${en?'Therapist':'Terapeuta'}</label>
        ${(() => {
          const therapistList = (PSTATE.authorizedUsers || []).filter(u => u.role === 'therapist' && (u.active === 'TRUE' || u.active === true));
          if (therapistList.length === 0) {
            // Fallback: use team list from Config if AuthorizedUsers unavailable
            const teamTherapists = (PSTATE.team || []).filter(t => t.role === 'therapist');
            const opts = teamTherapists.map(t => `<option value="${escapeHtml(t.name)}" ${p.Therapist===t.name?'selected':''}>${escapeHtml(t.name)}</option>`).join('');
            return `<select id="epTherapist" style="${inputStyle}"><option value="">— ${en?'select':'seleccionar'} —</option>${opts}</select>`;
          }
          const opts = therapistList.map(u => { const n = escapeHtml(u.name||u.email||''); return `<option value="${n}" ${p.Therapist===n?'selected':''}>${n}</option>`; }).join('');
          return `<select id="epTherapist" style="${inputStyle}"><option value="">— ${en?'select':'seleccionar'} —</option>${opts}</select>`;
        })()} 
      </div>
      <div style="grid-column:1 / -1;">
        <label class="np-label">${en?'Caregiver phone':'Tel\u00e9fono del cuidador'}</label>
        <input type="tel" id="epPhone" value="${escapeHtml(p.Caregiver_Phone||'')}" placeholder="+504..." style="${inputStyle}"/>
      </div>
      <div style="grid-column:1 / -1;">
        <label class="np-label">${en?'Status':'Estado'}</label>
        <select id="epStatus" style="${inputStyle}">
          <option value="Activo" ${(p.Status||'Activo')==='Activo'?'selected':''}>${en?'Therapy + CoCM':'Terapia + CoCM'}</option>
          <option value="Estable" ${p.Status==='Estable'?'selected':''}>${en?'Stable; ↓ CoCM frequency':'Estable; ↓ frec. CoCM'}</option>
          <option value="Inactivo" ${p.Status==='Inactivo'?'selected':''}>${en?'Therapy only':'Solo terapia'}</option>
          <option value="Transferido" ${p.Status==='Transferido'?'selected':''}>${en?'Transferred':'Transferido'}</option>
        </select>
        <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">
          ${en
            ? '"Therapy only" patients may still be reviewed periodically, but at a lower frequency than active patients.'
            : 'Los pacientes de “solo terapia” pueden revisarse periódicamente, pero a menor frecuencia que los pacientes activos.'}
        </div>
      </div>
    </div>
    <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-border);">
      <label class="np-label" style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">
        <span>${en?'Primary condition':'Condición primaria'} <span style="color:var(--color-error);">*</span></span>
        ${pcNeedsVerify ? `<span class="verify-primary-badge">⚠ ${en?'verify':'verificar'}</span>` : ''}
      </label>
      <select id="epPrimaryCondition" style="${inputStyle}">
        <option value="">—</option>
        ${pcOptionHtml}
      </select>
      <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:4px;">${en?'Used for registry grouping. Auto-inferred from first listed condition until you confirm.':'Usado para agrupar el registro. Auto-inferido desde la primera condición listada hasta confirmar.'}</div>
    </div>
    <div style="margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-border);">
      <label class="np-label" style="margin-bottom:6px;display:block;">${en?'Conditions':'Condiciones'}</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;">${condRows || `<span style="font-size:var(--text-xs);color:var(--color-text-muted);">${en?'No conditions configured':'No hay condiciones configuradas'}</span>`}</div>
    </div>
    <div style="margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-border);" id="epToolsSection">
      ${window.renderToolSelector('ep', [...curTools], epConds, en?'en':'es', epAge, completedToolsArr)}
    </div>
    <div style="margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--color-border);">
      <label class="np-label">${en?'Notes':'Notas'}</label>
      <textarea id="epNotes" rows="2" placeholder="${en?'Notes (supports **bold** / *italic*)':'Notas (admite **negrita** / *cursiva*)'}" style="${inputStyle}">${escapeHtml(p.Notes||'')}</textarea>
    </div>
  `;
  document.getElementById('editPatientModal').style.display = 'flex';
  const btn = document.getElementById('editPatientSaveBtn');
  if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; }
}
if (typeof window !== 'undefined') window.openEditPatientModal = openEditPatientModal;

function closeEditPatientModal() {
  document.getElementById('editPatientModal').style.display = 'none';
}
if (typeof window !== 'undefined') window.closeEditPatientModal = closeEditPatientModal;

// Re-renders tool selector when conditions or DOB change in edit patient modal
function epUpdateTools() {
  const lang = getLang();
  const dobVal = document.getElementById('epDOB')?.value || '';
  const age = dobVal ? (typeof computeAgeFromDOB === 'function' ? computeAgeFromDOB(dobVal) : Math.floor((Date.now() - new Date(dobVal).getTime()) / 31557600000)) : null;
  const conds = [...document.querySelectorAll('input[name="epCond"]:checked')].map(c => c.value);
  const primCond = document.getElementById('epPrimaryCondition')?.value || '';
  if (primCond && !conds.includes(primCond)) conds.push(primCond);
  const currentSel = [...new Set([...document.querySelectorAll('#epToolsSection input[name="toolSel-s"]:checked, #epToolsSection input[name="toolSel-m"]:checked')].map(c => c.value))];
  const completedToolsArr = [...new Set((PSTATE.visits||[]).filter(v=>v.Score!==''&&v.Score!=null).map(v=>v.Tool).filter(Boolean))];
  const sec = document.getElementById('epToolsSection');
  if (sec) {
    sec.innerHTML = window.renderToolSelector('ep', currentSel, conds, lang, age, completedToolsArr);
  }
}
if (typeof window !== 'undefined') window.epUpdateTools = epUpdateTools;

async function submitEditPatient() {
  const en = getLang() === 'en';
  const btn = document.getElementById('editPatientSaveBtn');
  if (btn && btn.disabled) return;
  const p = PSTATE.patient;
  if (!p) return;

  const name = (document.getElementById('epName')?.value || '').trim();
  if (!name) { showToast(en?'Name is required':'El nombre es obligatorio', { variant:'warn' }); return; }

  const dob      = (document.getElementById('epDOB')?.value || '').trim();
  const ageVal   = dob ? String(Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)) : (p.Age || '');
  const sex      = (document.getElementById('epSex')?.value || '').trim();
  const therapist= (document.getElementById('epTherapist')?.value || '').trim();
  // Auto-compute initials: first letter of first word + first letter of last word, uppercase
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length-1][0]).toUpperCase()
    : (nameParts[0]?.[0] || '').toUpperCase();
  const notes    = (document.getElementById('epNotes')?.value || '').trim();
  const _epCondOtherCb = document.getElementById('epCondOtherCb');
  const _epCondOtherText = (document.getElementById('epCondOtherText')?.value || '').trim();
  const _otherEntry = (_epCondOtherCb?.checked && _epCondOtherText) ? [_epCondOtherText] : [];
  const conds    = [...document.querySelectorAll('input[name="epCond"]:checked')].map(c=>c.value).concat(_otherEntry).join(',');
  const tools    = [...new Set([...document.querySelectorAll('#epToolsSection input[name="toolSel-s"]:checked, #epToolsSection input[name="toolSel-m"]:checked')].map(c => c.value))].join(',');
  const primaryCondition = (document.getElementById('epPrimaryCondition')?.value || '').trim();
  const status = (document.getElementById('epStatus')?.value || '').trim() || (p.Status || 'Activo');

  // Brigade flag is managed via the dedicated Brigade modal, not Edit Patient
  const brigadeFlag = p.Brigade_Flag || '';
  const brigadeReason = p.Brigade_Reason || '';

  // Capture previous values for undo
  const prev = {
    Patient_Name: p.Patient_Name || '',
    Initials: p.Initials || '',
    DOB: p.DOB || '',
    Age: p.Age || '',
    Sex: p.Sex || '',
    Enrollment_Date: p.Enrollment_Date || '',
    Therapist: p.Therapist || '',
    Conditions: p.Conditions || '',
    Primary_Condition: p.Primary_Condition || '',
    Primary_Condition_Verified: p.Primary_Condition_Verified || '',
    Tools: p.Tools || '',
    Notes: p.Notes || '',
    Status: p.Status || '',
    Brigade_Flag: p.Brigade_Flag || '',
    Brigade_Reason: p.Brigade_Reason || '',
  };
  const enrolled = (document.getElementById('epEnrolled')?.value || '').trim();
  const updates = {
    Patient_Name: name,
    Initials: initials,
    DOB: dob,
    Age: ageVal,
    Sex: sex,
    Enrollment_Date: enrolled,
    Therapist: therapist,
    Conditions: conds,
    Primary_Condition: primaryCondition,
    Primary_Condition_Verified: primaryCondition ? 'TRUE' : '',
    Tools: tools,
    Notes: notes,
    Status: status,
    Brigade_Flag: brigadeFlag,
    Brigade_Reason: brigadeReason,
    Updated_By: PSTATE.user || '',
    Updated_At: new Date().toISOString(),
  };

  if (btn) { btn.disabled = true; btn.textContent = en ? 'Saving…' : 'Guardando…'; }
  try {
    await updateRow('Pacientes', p.Patient_ID, updates);
    Object.assign(p, updates);
    closeEditPatientModal();
    showToast(t('saved'), { variant:'success', undo: async () => {
      await updateRow('Pacientes', p.Patient_ID, prev);
      Object.assign(p, prev);
      render();
    }});
    render();
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; }
    showToast(t('generic_error', { msg: err.message }), { variant:'error', retry: () => submitEditPatient() });
  }
}
if (typeof window !== 'undefined') window.submitEditPatient = submitEditPatient;

// ── Share tool link (outside-party version) ─────────────────────
// Builds a WhatsApp/email-ready message with the -ext.html URL and copies
// to clipboard. Used by the 📤 button next to each tool in Launch Tools.
async function shareToolLink(toolKey) {
  try {
    const url = (typeof TOOL_EXT_URL_MAP !== 'undefined') ? TOOL_EXT_URL_MAP[toolKey] : null;
    if (!url) {
      showToast(getLang()==='en' ? 'No shareable version for this tool' : 'No hay versión compartible para esta herramienta', { variant: 'warn' });
      return;
    }
    const p = PSTATE.patient || {};
    const fullName = String(p.Patient_Name || '').trim();
    const firstName = fullName.split(/\s+/)[0] || (getLang()==='en' ? 'your child' : 'su hijo/a');
    const therapist = String(p.Therapist || '').trim() || 'CoCM Pediátrico Camasca';
    const isEN = getLang() === 'en';
    let msg;
    if (isEN) {
      msg = `Hello — please help us by completing this short questionnaire about ${firstName}. It takes only a few minutes and the results help guide ${firstName}'s care.\n\n${toolKey}:\n${url}\n\nThank you!\n— ${therapist}`;
    } else {
      msg = `Hola — por favor ayúdenos completando este breve cuestionario sobre ${firstName}. Solo toma unos minutos y los resultados nos ayudan a guiar la atención de ${firstName}.\n\n${toolKey}:\n${url}\n\n¡Gracias!\n— ${therapist}`;
    }
    // Try clipboard API first, fall back to execCommand
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(msg);
        copied = true;
      }
    } catch(_) {}
    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = msg;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copied = true;
      } catch(_) {}
    }
    if (copied) {
      showToast(isEN ? `Share message copied — paste into WhatsApp/email` : `Mensaje copiado — pégalo en WhatsApp/correo`, { variant: 'success' });
    } else {
      // Last resort: show the message in a prompt so user can copy manually
      window.prompt(isEN ? 'Copy this message:' : 'Copia este mensaje:', msg);
    }
  } catch(err) {
    showToast((getLang()==='en' ? 'Share failed: ' : 'Error al compartir: ') + (err && err.message ? err.message : String(err)), { variant: 'error' });
  }
}
// Expose globally for inline onclick handlers
if (typeof window !== 'undefined') window.shareToolLink = shareToolLink;

// ── Share selected questionnaires ─────────────────────────────────────────────
// Reads checkboxes from shareToolSel, builds combined WhatsApp/email message,
// copies to clipboard. Replaces the old shareAllTools single-button approach.
async function shareSelectedTools() {
  try {
    const p = PSTATE.patient || {};
    const checked = [...document.querySelectorAll('input[name="shareToolSel"]:checked')].map(c => c.value);
    const shareableKeys = checked.filter(tk => typeof TOOL_EXT_URL_MAP !== 'undefined' && TOOL_EXT_URL_MAP[tk]);
    if (!shareableKeys.length) {
      showToast(getLang()==='en' ? 'Select at least one questionnaire to share' : 'Selecciona al menos un cuestionario', { variant: 'warn' });
      return;
    }
    const fullName = String(p.Patient_Name || '').trim();
    const firstName = fullName.split(/\s+/)[0] || (getLang()==='en' ? 'your child' : 'su hijo/a');
    const therapist = String(p.Therapist || '').trim() || 'CoCM Pediátrico Camasca';
    const isEN = getLang() === 'en';
    const toolLines = shareableKeys.map(tk => `${tk}:\n${TOOL_EXT_URL_MAP[tk]}`).join('\n\n');
    let msg;
    if (isEN) {
      msg = `Hello — please help us by completing the following questionnaires about ${firstName}. Each takes only a few minutes and the results help guide ${firstName}'s care.\n\n${toolLines}\n\nThank you!\n— ${therapist}`;
    } else {
      msg = `Hola — por favor ayúdenos completando los siguientes cuestionarios sobre ${firstName}. Cada uno toma solo unos minutos y los resultados nos ayudan a guiar la atención de ${firstName}.\n\n${toolLines}\n\n¡Gracias!\n— ${therapist}`;
    }
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(msg);
        copied = true;
      }
    } catch(_) {}
    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = msg;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copied = true;
      } catch(_) {}
    }
    if (copied) {
      showToast(isEN
        ? `${shareableKeys.length} questionnaire${shareableKeys.length===1?'':'s'} copied — paste into WhatsApp/email`
        : `${shareableKeys.length} cuestionario${shareableKeys.length===1?'':'s'} copiado${shareableKeys.length===1?'':'s'} — pega en WhatsApp/correo`,
        { variant: 'success' });
    } else {
      window.prompt(isEN ? 'Copy this message:' : 'Copia este mensaje:', msg);
    }
  } catch(err) {
    showToast((getLang()==='en' ? 'Share failed: ' : 'Error al compartir: ') + (err && err.message ? err.message : String(err)), { variant: 'error' });
  }
}
if (typeof window !== 'undefined') window.shareSelectedTools = shareSelectedTools;

// Legacy alias — kept in case any old reference exists
async function shareAllTools() { return shareSelectedTools(); }
if (typeof window !== 'undefined') window.shareAllTools = shareAllTools;

// ── Visit note expand/collapse ────────────────────────────────
function toggleNoteExpand(noteId) {
  const preview = document.getElementById(noteId + '-preview');
  const full    = document.getElementById(noteId + '-full');
  if (!preview || !full) return;
  const expanded = full.style.display !== 'none';
  preview.style.display = expanded ? 'block' : 'none';
  full.style.display    = expanded ? 'none'  : 'block';
}
if (typeof window !== 'undefined') window.toggleNoteExpand = toggleNoteExpand;

// ════════════════════════════════════════════════════════════════
// LOG SCORE MODAL (Entry_Type='score' — no visit, no SI checkbox)
// ════════════════════════════════════════════════════════════════
function openScoreModal() {
  const en = getLang() === 'en';
  const patientTools = (PSTATE.patient.Tools||'').split(',').map(s=>s.trim()).filter(Boolean);
  const lastUsedTool = PSTATE.visits[0]?.Tool;
  const defaultTool = lastUsedTool && patientTools.includes(lastUsedTool)
    ? lastUsedTool
    : patientTools[0] || Object.keys(PSTATE.tools)[0] || '';
  const otherTools = Object.keys(PSTATE.tools).filter(tk => !patientTools.includes(tk));
  const toolOptions = [
    ...patientTools.map(tk => ({ v: tk, l: tk })),
    ...otherTools.map(tk => ({ v: tk, l: tk + ' *' })),
  ];
  const inputSt = 'width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);';
  // Reuse the visitModal container but rebuild its body
  let host = document.getElementById('scoreModal');
  if (!host) {
    host = document.createElement('div');
    host.id = 'scoreModal';
    host.className = 'modal-backdrop';
    host.style.display = 'none';
    host.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div class="modal-header">
          <h3>${en?'Log score only':'Registrar puntaje (sin visita)'}</h3>
          <button class="modal-close" onclick="closeScoreModal()">×</button>
        </div>
        <div class="modal-body" id="scoreForm"></div>
        <div class="modal-footer">
          <button class="ghost" onclick="closeScoreModal()">${en?'Cancel':'Cancelar'}</button>
          <button class="primary" id="scoreSaveBtn" onclick="submitScore()">${en?'Save':'Guardar'}</button>
        </div>
      </div>`;
    document.body.appendChild(host);
  }
  document.getElementById('scoreForm').innerHTML = `
    <div style="background:oklch(from var(--color-primary) l c h / 0.06);border:1px solid oklch(from var(--color-primary) l c h / 0.25);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-xs);color:var(--color-text-muted);">
      ${en?'Use this when a score is returned outside of a visit (e.g. teacher Vanderbilt, parent rating scale).':'Usar cuando un puntaje llega fuera de una visita (p. ej. Vanderbilt de maestro, escala de padre).'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
      <div>
        <label class="np-label">${t('label_date')}</label>
        <input type="date" id="sDate" value="${new Date().toISOString().slice(0,10)}" style="${inputSt}"/>
      </div>
      <div>
        <label class="np-label">${t('label_tool')}</label>
        <select id="sTool" style="${inputSt}">
          ${toolOptions.map(o => `<option value="${o.v}" ${o.v===defaultTool?'selected':''}>${o.l}</option>`).join('')}
        </select>
      </div>
      <div style="grid-column:1/-1;">
        <label class="np-label">${t('label_score')} <span style="color:var(--color-error);">*</span></label>
        <input type="number" id="sScore" style="${inputSt}" autofocus/>
      </div>
    </div>
    <div style="margin-top:var(--space-3);">
      <label class="np-label">${t('label_note')} <span style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:400;text-transform:none;">(${t('label_optional')})</span></label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
        <button type="button" class="chip-fill" onclick="sNoteFill('${en?'Teacher form returned':'Formulario de maestro devuelto'}')">${en?'Teacher form returned':'Formulario de maestro devuelto'}</button>
        <button type="button" class="chip-fill" onclick="sNoteFill('${en?'Parent/caregiver rating':'Puntaje de padre/cuidador'}')">${en?'Parent/caregiver rating':'Puntaje de padre/cuidador'}</button>
      </div>
      <textarea id="sNote" rows="2" placeholder="${en?'e.g. teacher form returned via WhatsApp':'p. ej. formulario de maestro devuelto por WhatsApp'}" style="${inputSt}"></textarea>
      <div style="font-size:10.5px;color:var(--color-text-muted);margin-top:4px;font-style:italic;">${en?'Tip: wrap text in **bold** or *italic* for emphasis.':'Consejo: usa **negrita** o *cursiva* para resaltar.'}</div>
    </div>
  `;
  host.style.display = 'flex';
  setTimeout(() => document.getElementById('sScore')?.focus(), 50);
}
function closeScoreModal() {
  const m = document.getElementById('scoreModal');
  if (m) m.style.display = 'none';
}
async function submitScore() {
  const btn = document.getElementById('scoreSaveBtn');
  if (btn && btn.disabled) return;
  const en = getLang() === 'en';
  const tool = document.getElementById('sTool').value;
  const score = document.getElementById('sScore').value;
  if (!tool || score === '') {
    showToast(t('err_tool_score_req'), { variant: 'warn' });
    return;
  }
  if (!isNaN(Number(score)) && (Number(score) < 0 || Number(score) > 100)) {
    showToast(t('err_score_range', { tool }), { variant: 'warn' });
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = en ? 'Saving…' : 'Guardando…'; }
  const reenable = () => { if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; } };
  const baseline = PSTATE.visits.filter(v => v.Tool===tool).slice(-1)[0]?.Baseline_Score
                 || PSTATE.visits.filter(v => v.Tool===tool)[0]?.Score
                 || score;
  const now = new Date().toISOString();
  const row = {
    Visit_ID: `S-${Date.now()}`,
    Patient_ID: PSTATE.patient.Patient_ID,
    Visit_Date: document.getElementById('sDate').value,
    Therapist: PSTATE.user || PSTATE.patient.Therapist || '',
    Tool: tool,
    Score: score,
    Baseline_Score: baseline,
    Subscale_Scores: '',
    SI_Positive: 'FALSE',
    Not_Improving_Flag: '',
    Visit_Note: document.getElementById('sNote').value.trim(),
    Entry_Type: 'Score',
    Created_By: PSTATE.user || 'unknown',
    Created_At: now,
    Updated_By: '',
    Updated_At: '',
    Schema_Version: '1.0',
  };
  try {
    const res = await writeRow('Visitas', row);
    if (res.queued) showToast(t('queued_pending'), { variant: 'warn' });
    else showToast(en?'Score saved':'Puntaje guardado', { variant: 'success' });
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => submitScore() });
    reenable();
    return;
  }
  // Auto-update Last_BHCM_Contact_Date — therapist-only
  if (isTherapistRole(PSTATE.user, PSTATE.authorizedUsers || [])) {
    try {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
        Last_BHCM_Contact_Date: row.Visit_Date,
        Last_BHCM_Contact_Note: row.Visit_Note || '',
        Last_BHCM_Contact_By: PSTATE.user || '',
        Updated_By: PSTATE.user || '', Updated_At: now,
      });
      PSTATE.patient.Last_BHCM_Contact_Date = row.Visit_Date;
      PSTATE.patient.Last_BHCM_Contact_Note = row.Visit_Note || '';
      PSTATE.patient.Last_BHCM_Contact_By = PSTATE.user || '';
    } catch (_) { /* non-fatal */ }
  }

  PSTATE.visits.unshift(row);
  closeScoreModal();
  render();
}
if (typeof window !== 'undefined') {
  window.openScoreModal = openScoreModal;
  window.closeScoreModal = closeScoreModal;
  window.submitScore = submitScore;
}

// ════════════════════════════════════════════════════════════════
// PER-PATIENT TO-DO BOX
// Stored as JSON array in Pacientes.Todo_Items
// Shape: [{id, text, created_at}]
// Remove = hard delete (user confirmed: no archive)
// ════════════════════════════════════════════════════════════════
function parseTodoItems(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => x && x.id && typeof x.text === 'string') : [];
  } catch (_) { return []; }
}
function serializeTodoItems(arr) {
  return JSON.stringify(arr || []);
}
function renderTodoBox(p, lang) {
  const en = lang === 'en';
  const items = parseTodoItems(p.Todo_Items);
  const rows = items.map(it => `
    <div class="todo-row" data-todo-id="${escapeHtml(it.id)}">
      <input type="checkbox" class="todo-check" onchange="removeTodo('${escapeHtml(it.id)}')" style="width:18px;height:18px;cursor:pointer;flex-shrink:0;"/>
      <span class="todo-text">${escapeHtml(it.text)}</span>
    </div>
  `).join('');
  return `
    <div class="sec-card" id="todoCard">
      <h2><span>${en?'To-do for this patient':'Pendientes de este paciente'}</span></h2>
      <p style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2);">${en?'Check an item to mark done and remove it.':'Marcar para completar y quitar.'}</p>
      <div id="todoList" style="display:flex;flex-direction:column;gap:6px;margin-bottom:var(--space-3);">
        ${rows || `<span style="font-size:var(--text-sm);color:var(--color-text-muted);font-style:italic;">${en?'No pending items.':'Sin pendientes.'}</span>`}
      </div>
      <div style="display:flex;gap:var(--space-2);">
        <input type="text" id="todoInput" placeholder="${en?'Add a to-do item…':'Agregar pendiente…'}" onkeydown="if(event.key==='Enter'){event.preventDefault();addTodo();}" style="flex:1;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);font-size:var(--text-sm);"/>
        <button class="ghost" onclick="addTodo()" style="padding:8px 14px;border:1px solid var(--color-border);background:transparent;color:var(--color-text);border-radius:var(--radius-md);font-weight:600;font-size:var(--text-sm);cursor:pointer;">${en?'Add':'Agregar'}</button>
      </div>
    </div>
  `;
}
async function addTodo() {
  const inp = document.getElementById('todoInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  const p = PSTATE.patient;
  if (!p) return;
  const items = parseTodoItems(p.Todo_Items);
  const newItem = { id: `td-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, text, created_at: new Date().toISOString() };
  items.push(newItem);
  const newRaw = serializeTodoItems(items);
  try {
    await updateRow('Pacientes', p.Patient_ID, { Todo_Items: newRaw, Updated_By: PSTATE.user || '', Updated_At: new Date().toISOString() });
    p.Todo_Items = newRaw;
    inp.value = '';
    render();
    setTimeout(() => document.getElementById('todoInput')?.focus(), 50);
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => addTodo() });
  }
}
async function removeTodo(id) {
  const p = PSTATE.patient;
  if (!p) return;
  const items = parseTodoItems(p.Todo_Items).filter(it => it.id !== id);
  const newRaw = serializeTodoItems(items);
  try {
    await updateRow('Pacientes', p.Patient_ID, { Todo_Items: newRaw, Updated_By: PSTATE.user || '', Updated_At: new Date().toISOString() });
    p.Todo_Items = newRaw;
    render();
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error' });
  }
}
if (typeof window !== 'undefined') {
  window.addTodo = addTodo;
  window.removeTodo = removeTodo;
}

document.addEventListener('DOMContentLoaded', async () => {
  const savedLang = localStorage.getItem('coCMCamasca.lang') || 'es';
  setLang(savedLang);
  initDataset();
  const gate = await _pacAuthGate();
  if (gate.status !== 'ok') return;
  if (gate.user && gate.user.email) {
    PSTATE.user = gate.user.email;
    try { localStorage.setItem(REG_LS.USER, gate.user.email); } catch(_) {}
  }
  load();
});


// ════════════════════════════════════════════════════════════════
// PHASE 2.5 — LOG MENU (split-button dropdown)
// ════════════════════════════════════════════════════════════════
function toggleLogMenu(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('logMenu');
  const btn = document.getElementById('logMenuBtn');
  if (!m) return;
  const show = m.style.display === 'none' || !m.style.display;
  m.style.display = show ? 'block' : 'none';
  if (btn) btn.setAttribute('aria-expanded', show ? 'true' : 'false');
  if (show) {
    setTimeout(() => {
      document.addEventListener('click', closeLogMenuOnOutside, { once: true });
    }, 0);
  }
}
function closeLogMenu() {
  const m = document.getElementById('logMenu');
  const btn = document.getElementById('logMenuBtn');
  if (m) m.style.display = 'none';
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function closeLogMenuOnOutside(e) {
  const m = document.getElementById('logMenu');
  const btn = document.getElementById('logMenuBtn');
  if (!m) return;
  if (m.contains(e.target) || (btn && btn.contains(e.target))) {
    document.addEventListener('click', closeLogMenuOnOutside, { once: true });
    return;
  }
  closeLogMenu();
}
if (typeof window !== 'undefined') {
  window.toggleLogMenu = toggleLogMenu;
  window.closeLogMenu = closeLogMenu;
}

// ════════════════════════════════════════════════════════════════
// PHASE 2.5 — LOG VISIT (NO SCORE) MODAL
// Entry_Type='Visit', Tool/Score blank. Required: date + note.
// ════════════════════════════════════════════════════════════════
function openVisitOnlyModal() {
  const en = getLang() === 'en';
  const primaryConds = (PSTATE.patient.Conditions||'').split(',').map(s=>s.trim());
  const needsSafetyFirst = primaryConds.some(c => /depress|anxiety|mdd|gad/i.test(c));
  const safetySection = needsSafetyFirst ? `
    <div style="background:oklch(from var(--color-error) l c h / 0.08);border:1px solid oklch(from var(--color-error) l c h / 0.3);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-3);">
      <div style="font-weight:700;color:var(--color-error);font-size:var(--text-sm);margin-bottom:6px;">⚠ ${t('safety_concern_title')}</div>
      <label style="display:flex;gap:10px;align-items:center;font-size:var(--text-sm);cursor:pointer;">
        <input type="checkbox" id="voSI" style="width:18px;height:18px;cursor:pointer;" />
        <span>${t('safety_si_prompt')}</span>
      </label>
      <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:6px;margin-left:28px;">${en ? 'Checking this will auto-raise a safety flag for this patient.' : 'Marcar esto activa automáticamente una bandera de seguridad para el paciente.'}</div>
    </div>
  ` : `<input type="hidden" id="voSI" />`;
  const inputSt = 'width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);';
  let host = document.getElementById('visitOnlyModal');
  if (!host) {
    host = document.createElement('div');
    host.id = 'visitOnlyModal';
    host.className = 'modal-backdrop';
    host.style.display = 'none';
    host.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div class="modal-header">
          <h3>${en?'Log visit (no score)':'Registrar visita (sin puntaje)'}</h3>
          <button class="modal-close" onclick="closeVisitOnlyModal()">×</button>
        </div>
        <div class="modal-body" id="visitOnlyForm"></div>
        <div class="modal-footer">
          <button class="ghost" onclick="closeVisitOnlyModal()">${en?'Cancel':'Cancelar'}</button>
          <button class="primary" id="visitOnlySaveBtn" onclick="submitVisitOnly()">${en?'Save':'Guardar'}</button>
        </div>
      </div>`;
    document.body.appendChild(host);
  }
  document.getElementById('visitOnlyForm').innerHTML = `
    <div style="background:oklch(from var(--color-primary) l c h / 0.06);border:1px solid oklch(from var(--color-primary) l c h / 0.25);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-xs);color:var(--color-text-muted);">
      ${en ? 'Use this for clinical visits without a psychometric score (safety check, medication titration, family session, missed assessment, etc.).' : 'Usar para visitas clínicas sin puntaje (chequeo de seguridad, titulación de medicamento, sesión familiar, cita sin cuestionario, etc.).'}
    </div>
    ${safetySection}
    <div>
      <label class="np-label">${t('label_date')}</label>
      <input type="date" id="voDate" value="${new Date().toISOString().slice(0,10)}" style="${inputSt}max-width:200px;"/>
    </div>
    <div style="margin-top:var(--space-3);">
      <label class="np-label">${t('label_note')} <span style="color:var(--color-error);">*</span></label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
        <button type="button" class="chip-fill" onclick="voNoteFill('${en?'Routine follow-up':'Seguimiento de rutina'}')">${en?'Routine follow-up':'Seguimiento de rutina'}</button>
        <button type="button" class="chip-fill" onclick="voNoteFill('${en?'Parent/caregiver contact':'Contacto con padre/cuidador'}')">${en?'Parent/caregiver contact':'Contacto con padre/cuidador'}</button>
      </div>
      <textarea id="voNote" rows="3" placeholder="${en?'What happened this visit? (supports **bold** / *italic*)':'¿Qué ocurrió en esta visita? (admite **negrita** / *cursiva*)'}" style="${inputSt}"></textarea>
      <div style="font-size:10px;color:var(--color-text-muted);margin-top:2px;">${en?'Markdown: **bold**, *italic*':'Markdown: **negrita**, *cursiva*'}</div>
    </div>
  `;
  host.style.display = 'flex';
  setTimeout(() => document.getElementById('voNote')?.focus(), 50);
}
function closeVisitOnlyModal() {
  const m = document.getElementById('visitOnlyModal');
  if (m) m.style.display = 'none';
}
async function submitVisitOnly() {
  const btn = document.getElementById('visitOnlySaveBtn');
  if (btn && btn.disabled) return;
  const en = getLang() === 'en';
  const reenable = () => { if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; } };
  const visitDate = document.getElementById('voDate').value;
  const visitNote = (document.getElementById('voNote').value || '').trim();
  if (!visitDate) { showToast(en?'Date required':'Fecha obligatoria', { variant:'warn' }); return; }
  if (!visitNote) { showToast(en?'Note required for a no-score visit':'Se requiere una nota para visita sin puntaje', { variant:'warn' }); return; }
  const siEl = document.getElementById('voSI');
  const siPositive = siEl && siEl.type === 'checkbox' ? (siEl.checked ? 'TRUE' : 'FALSE') : 'FALSE';
  const now = new Date().toISOString();
  const row = {
    Visit_ID: `V-${Date.now()}`,
    Patient_ID: PSTATE.patient.Patient_ID,
    Visit_Date: visitDate,
    Therapist: PSTATE.user || PSTATE.patient.Therapist || '',
    Tool: '',
    Score: '',
    Baseline_Score: '',
    Subscale_Scores: '',
    SI_Positive: siPositive,
    Not_Improving_Flag: '',
    Visit_Note: visitNote,
    Entry_Type: 'Visit',
    Created_By: PSTATE.user || 'unknown',
    Created_At: now,
    Updated_By: '',
    Updated_At: '',
    Schema_Version: '1.0',
  };
  if (btn) { btn.disabled = true; btn.textContent = en ? 'Saving…' : 'Guardando…'; }
  try {
    await writeRow('Visitas', row);
    showToast(en?'Visit saved':'Visita guardada', { variant: 'success' });
  } catch (err) {
    showToast(t('generic_error', { msg: err.message }), { variant: 'error', retry: () => submitVisitOnly() });
    reenable();
    return;
  }
  // Auto-raise safety if SI positive
  if (siPositive === 'TRUE' && PSTATE.patient.Safety_Flag !== 'TRUE') {
    try {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
        Safety_Flag: 'TRUE', Updated_By: PSTATE.user || '', Updated_At: now,
      });
    } catch (_) {}
    PSTATE.patient.Safety_Flag = 'TRUE';
    PSTATE.patient.Safety_Flag_Ack_At = '';
  }
  // Auto-update Last_BHCM_Contact_Date — therapist-only
  if (isTherapistRole(PSTATE.user, PSTATE.authorizedUsers || [])) {
    try {
      await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
        Last_BHCM_Contact_Date: visitDate,
        Last_BHCM_Contact_Note: visitNote,
        Last_BHCM_Contact_By: PSTATE.user || '',
        Updated_By: PSTATE.user || '', Updated_At: now,
      });
      PSTATE.patient.Last_BHCM_Contact_Date = visitDate;
      PSTATE.patient.Last_BHCM_Contact_Note = visitNote;
      PSTATE.patient.Last_BHCM_Contact_By = PSTATE.user || '';
    } catch (_) {}
  }
  PSTATE.visits.unshift(row);
  closeVisitOnlyModal();
  render();
}
function voNoteFill(phrase) {
  const ta = document.getElementById('voNote');
  if (!ta) return;
  ta.value = phrase;
  ta.focus();
}
function sNoteFill(text) {
  const ta = document.getElementById('sNote');
  if (!ta) return;
  const cur = (ta.value || '').trim();
  ta.value = cur ? (cur + (cur.endsWith('.') ? ' ' : '. ') + text) : text;
  ta.focus();
}
if (typeof window !== 'undefined') window.sNoteFill = sNoteFill;
if (typeof window !== 'undefined') {
  window.openVisitOnlyModal = openVisitOnlyModal;
  window.closeVisitOnlyModal = closeVisitOnlyModal;
  window.submitVisitOnly = submitVisitOnly;
  window.voNoteFill = voNoteFill;
}

// ════════════════════════════════════════════════════════════════
// PHASE 2.5 — EDIT VISIT MODAL
// Allows editing: Date, Tool, Score, Note, Entry_Type
// Audit fields (Updated_By, Updated_At) auto-populate.
// ════════════════════════════════════════════════════════════════
function openEditVisitModal(visitId) {
  // Reset save button state in case prior save left it disabled
  const editBtn = document.getElementById('editVisitSaveBtn');
  if (editBtn) { editBtn.disabled = false; editBtn.textContent = getLang()==='en' ? 'Save' : 'Guardar'; }
  const v = (PSTATE.visits || []).find(x => x.Visit_ID === visitId);
  if (!v) { showToast(getLang()==='en'?'Visit not found':'Visita no encontrada', { variant:'warn' }); return; }
  const en = getLang() === 'en';
  const patientTools = (PSTATE.patient.Tools||'').split(',').map(s=>s.trim()).filter(Boolean);
  const otherTools = Object.keys(PSTATE.tools||{}).filter(tk => !patientTools.includes(tk));
  const toolOptions = [
    { v: '', l: en?'— (no tool)':'— (sin herramienta)' },
    ...patientTools.map(tk => ({ v: tk, l: tk })),
    ...otherTools.map(tk => ({ v: tk, l: tk + ' *' })),
  ];
  const inputSt = 'width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);';
  let host = document.getElementById('editVisitModal');
  if (!host) {
    host = document.createElement('div');
    host.id = 'editVisitModal';
    host.className = 'modal-backdrop';
    host.style.display = 'none';
    host.innerHTML = `
      <div class="modal" style="max-width:560px;">
        <div class="modal-header">
          <h3 id="evModalTitle">${en?'Edit visit':'Editar visita'}</h3>
          <button class="modal-close" onclick="closeEditVisitModal()">×</button>
        </div>
        <div class="modal-body" id="editVisitForm"></div>
        <div class="modal-footer">
          <button class="ghost" onclick="closeEditVisitModal()">${en?'Cancel':'Cancelar'}</button>
          <button class="primary" id="editVisitSaveBtn" onclick="submitEditVisit()">${en?'Save':'Guardar'}</button>
        </div>
      </div>`;
    document.body.appendChild(host);
  }
  const curEntry = (v.Entry_Type || 'Visit').toLowerCase();
  document.getElementById('editVisitForm').innerHTML = `
    <input type="hidden" id="evVisitId" value="${escapeHtml(v.Visit_ID)}"/>
    <div style="background:oklch(from var(--color-primary) l c h / 0.06);border:1px solid oklch(from var(--color-primary) l c h / 0.25);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-xs);color:var(--color-text-muted);">
      ${en ? 'Changes are logged to the audit trail. The original Created_By + Created_At are preserved.' : 'Los cambios se registran en el historial de auditoría. Se conservan Created_By y Created_At originales.'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
      <div>
        <label class="np-label">${en?'Entry type':'Tipo de entrada'}</label>
        <select id="evEntryType" style="${inputSt}">
          <option value="Visit" ${curEntry==='visit'?'selected':''}>${en?'Visit':'Visita'}</option>
          <option value="Score" ${curEntry==='score'?'selected':''}>${en?'Score only':'Solo puntaje'}</option>
        </select>
      </div>
      <div>
        <label class="np-label">${t('label_date')}</label>
        <input type="date" id="evDate" value="${escapeHtml(v.Visit_Date||'')}" style="${inputSt}"/>
      </div>
      <div>
        <label class="np-label">${t('label_tool')}</label>
        <select id="evTool" style="${inputSt}">
          ${toolOptions.map(o => `<option value="${escapeHtml(o.v)}" ${o.v===(v.Tool||'')?'selected':''}>${escapeHtml(o.l)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="np-label">${t('label_score')}</label>
        <input type="number" id="evScore" value="${escapeHtml(v.Score||'')}" style="${inputSt}"/>
      </div>
      <div style="grid-column:1/-1;">
        <label class="np-label">${t('label_note')}</label>
        <textarea id="evNote" rows="3" placeholder="${en?'Visit note (supports **bold** / *italic*)':'Nota de visita (admite **negrita** / *cursiva*)'}" style="${inputSt}">${escapeHtml(v.Visit_Note||'')}</textarea>
      </div>
    </div>
  `;
  host.style.display = 'flex';
}
function closeEditVisitModal() {
  const m = document.getElementById('editVisitModal');
  if (m) m.style.display = 'none';
}
async function submitEditVisit() {
  const btn = document.getElementById('editVisitSaveBtn');
  if (btn && btn.disabled) return;
  const en = getLang() === 'en';
  const visitId = document.getElementById('evVisitId').value;
  const v = (PSTATE.visits || []).find(x => x.Visit_ID === visitId);
  if (!v) { showToast(en?'Visit not found':'Visita no encontrada', { variant:'warn' }); return; }
  const entryType = document.getElementById('evEntryType').value;
  const visitDate = document.getElementById('evDate').value;
  const tool = document.getElementById('evTool').value;
  const score = document.getElementById('evScore').value;
  const note = document.getElementById('evNote').value.trim();
  if (!visitDate) { showToast(en?'Date is required':'La fecha es obligatoria', { variant:'warn' }); return; }
  if (score !== '' && !isNaN(Number(score)) && (Number(score) < 0 || Number(score) > 100)) {
    showToast(t('err_score_range', { tool: tool || '—' }), { variant:'warn' }); return;
  }
  // For Score entry_type, require tool+score
  if (entryType === 'Score') {
    if (!tool || score === '') { showToast(t('err_tool_score_req'), { variant:'warn' }); return; }
  }
  const now = new Date().toISOString();
  const prev = {
    Visit_Date: v.Visit_Date || '',
    Tool: v.Tool || '',
    Score: v.Score || '',
    Visit_Note: v.Visit_Note || '',
    Entry_Type: v.Entry_Type || '',
    Updated_By: v.Updated_By || '',
    Updated_At: v.Updated_At || '',
  };
  const updates = {
    Visit_Date: visitDate,
    Tool: tool,
    Score: score,
    Visit_Note: note,
    Entry_Type: entryType,
    Updated_By: PSTATE.user || '',
    Updated_At: now,
  };
  if (btn) { btn.disabled = true; btn.textContent = en ? 'Saving…' : 'Guardando…'; }
  try {
    await updateRow('Visitas', visitId, updates);
    Object.assign(v, updates);
    showToast(t('saved'), { variant:'success', undo: async () => {
      await updateRow('Visitas', visitId, prev);
      Object.assign(v, prev);
      render();
    }});
    closeEditVisitModal();
    render();
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = en ? 'Save' : 'Guardar'; }
    showToast(t('generic_error', { msg: err.message }), { variant:'error', retry: () => submitEditVisit() });
  }
}
// ── Styled confirm dialog (replaces native confirm()) ──────────
let _confirmDeleteResolve = null;
function confirmDialog({ heading, message, okLabel, cancelLabel }) {
  return new Promise(resolve => {
    _confirmDeleteResolve = resolve;
    document.getElementById('confirmDeleteHeading').textContent = heading;
    document.getElementById('confirmDeleteMsg').textContent = message;
    document.getElementById('confirmDeleteOkBtn').textContent = okLabel;
    document.getElementById('confirmDeleteCancelBtn').textContent = cancelLabel;
    document.getElementById('confirmDeleteModal').style.display = 'flex';
  });
}
function _resolveConfirmDelete(result) {
  document.getElementById('confirmDeleteModal').style.display = 'none';
  if (_confirmDeleteResolve) { _confirmDeleteResolve(result); _confirmDeleteResolve = null; }
}
if (typeof window !== 'undefined') window._resolveConfirmDelete = _resolveConfirmDelete;

async function confirmDeleteVisit(visitId) {
  const en = getLang() === 'en';
  const confirmed = await confirmDialog({
    heading: en ? 'Delete entry?' : '¿Eliminar entrada?',
    message: en
      ? 'Are you sure you want to delete this visit entry? This cannot be undone.'
      : '¿Seguro que quieres eliminar esta entrada? Esta acción no se puede deshacer.',
    okLabel:     en ? 'Yes, delete' : 'Sí, eliminar',
    cancelLabel: en ? 'Cancel'      : 'Cancelar',
  });
  if (!confirmed) return;
  try {
    const result = await deleteRow('Visitas', visitId);
    if (result && (result.status === 'ok' || result.ok)) {
      PSTATE.visits = PSTATE.visits.filter(v => v.Visit_ID !== visitId);
      if (typeof STATE !== 'undefined' && STATE.visitas) {
        STATE.visitas = STATE.visitas.filter(v => v.Visit_ID !== visitId);
      }
      showToast(en ? 'Entry deleted.' : 'Entrada eliminada.', { variant: 'success' });
      render();
    } else {
      showToast((en ? 'Delete failed: ' : 'Error al eliminar: ') + (result?.message || 'unknown'), { variant: 'error' });
    }
  } catch(e) {
    showToast((en ? 'Delete failed: ' : 'Error al eliminar: ') + e.message, { variant: 'error' });
  }
}
if (typeof window !== 'undefined') window.confirmDeleteVisit = confirmDeleteVisit;

async function confirmDeletePatient() {
  const en = getLang() === 'en';
  const p = PSTATE.patient;
  if (!p) return;
  const confirmed = await confirmDialog({
    heading: en ? `Delete ${p.Patient_Name}?` : `¿Eliminar a ${p.Patient_Name}?`,
    message: en
      ? `Are you sure you want to permanently delete ${p.Patient_Name} (${p.Patient_ID})? This will NOT delete their visits or medication records. This cannot be undone.`
      : `¿Seguro que quieres eliminar permanentemente a ${p.Patient_Name} (${p.Patient_ID})? Esto NO eliminará sus visitas ni registros de medicamentos. No se puede deshacer.`,
    okLabel:     en ? 'Yes, delete patient' : 'Sí, eliminar paciente',
    cancelLabel: en ? 'Cancel'              : 'Cancelar',
  });
  if (!confirmed) return;
  try {
    const result = await deleteRow('Pacientes', p.Patient_ID);
    if (result && (result.status === 'ok' || result.ok)) {
      if (typeof STATE !== 'undefined' && STATE.pacientes) {
        STATE.pacientes = STATE.pacientes.filter(x => x.Patient_ID !== p.Patient_ID);
        STATE.enrichedPatients = computePatientTiers(STATE.pacientes, STATE.visitas, STATE.tools);
      }
      showToast(en ? `${p.Patient_Name} deleted.` : `${p.Patient_Name} eliminado/a.`, { variant: 'success' });
      window.location.href = 'registro.html';
    } else {
      showToast((en ? 'Delete failed: ' : 'Error al eliminar: ') + (result?.message || 'unknown'), { variant: 'error' });
    }
  } catch(e) {
    showToast((en ? 'Delete failed: ' : 'Error al eliminar: ') + e.message, { variant: 'error' });
  }
}
if (typeof window !== 'undefined') window.confirmDeletePatient = confirmDeletePatient;

if (typeof window !== 'undefined') {
  window.openEditVisitModal = openEditVisitModal;
  window.closeEditVisitModal = closeEditVisitModal;
  window.submitEditVisit = submitEditVisit;
}


// ── v2.5.2b: global keyboard shortcuts for modals ──
// Esc: close any open modal. Cmd/Ctrl+Enter: save visit-form modals.
(function registerModalKeys() {
  if (typeof document === 'undefined') return;
  document.addEventListener('keydown', (e) => {
    // Esc — close topmost visible modal
    if (e.key === 'Escape') {
      const openModals = ['visitModal','scoreModal','visitOnlyModal','editVisitModal','editPatientModal','brigadeModal','todoModal']
        .map(id => document.getElementById(id))
        .filter(m => m && m.style.display !== 'none' && getComputedStyle(m).display !== 'none');
      if (openModals.length) {
        // Close the last-opened (DOM order last)
        const target = openModals[openModals.length - 1];
        const closeBtn = target.querySelector('.modal-close') || target.querySelector('button.ghost');
        if (closeBtn) closeBtn.click();
        e.preventDefault();
      }
      return;
    }
    // Cmd/Ctrl + Enter — submit visit-form modals
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const formMap = [
        { modal: 'visitModal',     btnId: 'visitSaveBtn',     fn: 'submitVisit'     },
        { modal: 'scoreModal',     btnId: 'scoreSaveBtn',     fn: 'submitScore'     },
        { modal: 'visitOnlyModal', btnId: 'visitOnlySaveBtn', fn: 'submitVisitOnly' },
      ];
      for (const { modal, btnId, fn } of formMap) {
        const m = document.getElementById(modal);
        if (m && m.style.display !== 'none') {
          const btn = document.getElementById(btnId);
          if (btn && !btn.disabled && typeof window[fn] === 'function') {
            window[fn]();
            e.preventDefault();
            return;
          }
        }
      }
    }
  });
})();
