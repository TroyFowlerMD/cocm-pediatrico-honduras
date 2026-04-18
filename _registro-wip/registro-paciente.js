/* ============================================================
   CoCM Camasca — Patient detail page
   ============================================================ */

let PSTATE = {
  patient: null,
  visits: [],
  meds: [],
  tools: {},
  conditions: {},
  team: [],
  user: '',
};

// ── Language toggle (shared pattern) ───────────────────────────
function setLang(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang);
  localStorage.setItem('coCMCamasca.lang', lang);
  const isEN = lang === 'en';
  document.querySelectorAll('[data-es]').forEach(el => {
    const es = el.getAttribute('data-es'), en = el.getAttribute('data-en');
    if (en) el.textContent = isEN ? en : es;
  });
  const btnES = document.getElementById('btnES'), btnEN = document.getElementById('btnEN');
  if (btnES) btnES.classList.toggle('active', !isEN);
  if (btnEN) btnEN.classList.toggle('active', isEN);
  render();
}

// ── Theme toggle ────────────────────────────────────────────────
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

function urlParam(name) {
  return new URLSearchParams(location.search).get(name);
}

// ════════════════════════════════════════════════════════════════
// LOAD
// ════════════════════════════════════════════════════════════════
async function load() {
  const id = urlParam('id');
  if (!id) {
    document.getElementById('patBody').innerHTML = '<div class="empty-state"><p>Falta el parámetro ?id=</p></div>';
    return;
  }
  PSTATE.user = localStorage.getItem(REG_LS.USER) || '';
  const [pacientes, visitas, meds, config] = await Promise.all([
    fetchTab('Pacientes'), fetchTab('Visitas'), fetchTab('Medicamentos'), fetchTab('Config')
  ]);
  PSTATE.patient = pacientes.find(p => p.Patient_ID === id);
  PSTATE.visits = visitas.filter(v => v.Patient_ID === id)
                         .sort((a,b) => String(b.Visit_Date).localeCompare(String(a.Visit_Date)));
  PSTATE.meds = meds.filter(m => m.Patient_ID === id)
                    .sort((a,b) => String(b.Date).localeCompare(String(a.Date)));
  PSTATE.tools = parseToolCutoffs(config);
  PSTATE.conditions = Object.fromEntries(
    config.filter(r => r.Category==='condition' && r.Active==='TRUE').map(r => [r.Key, {es:r.Display_ES, en:r.Display_EN}])
  );
  PSTATE.team = config.filter(r => r.Category==='team' && r.Active==='TRUE').map(r => ({name:r.Key, role:r.Value}));
  render();
}

// ════════════════════════════════════════════════════════════════
// RENDER
// ════════════════════════════════════════════════════════════════
function render() {
  if (!PSTATE.patient) {
    document.getElementById('patBody').innerHTML = '<div class="empty-state"><p>Paciente no encontrado.</p></div>';
    return;
  }
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  const p = PSTATE.patient;

  document.getElementById('patTopbarName').textContent = p.Patient_Name;
  document.getElementById('patTopbarId').textContent = `${p.Patient_ID} · ${p.Age||'?'}${lang==='en'?'y':'a'} · ${p.Sex||''} · ${p.Therapist||''}`;

  const condChips = (p.Conditions||'').split(',').map(s=>s.trim()).filter(Boolean).map(c => {
    const d = PSTATE.conditions[c];
    return `<span class="cond-chip">${d ? (lang==='en'?d.en:d.es) : c}</span>`;
  }).join(' ');

  const toolKeys = (p.Tools||'').split(',').map(s=>s.trim()).filter(Boolean);

  const safetyActive = p.Safety_Flag==='TRUE' && !p.Safety_Flag_Ack_At;

  document.getElementById('patBody').innerHTML = `
    <!-- HEADER -->
    <div class="pat-header-card">
      <div class="pat-header-top">
        <span class="pat-header-name">${escapeHtml(p.Patient_Name)}</span>
        <span class="pat-header-id">${p.Patient_ID}</span>
      </div>
      <div class="pat-header-meta">
        <span><strong data-es="Edad" data-en="Age">${lang==='en'?'Age':'Edad'}:</strong> ${p.Age||'—'}</span>
        <span><strong data-es="Sexo" data-en="Sex">${lang==='en'?'Sex':'Sexo'}:</strong> ${p.Sex||'—'}</span>
        <span><strong data-es="FdN" data-en="DOB">${lang==='en'?'DOB':'FdN'}:</strong> ${p.DOB||'—'}</span>
        <span><strong data-es="Terapeuta" data-en="Therapist">${lang==='en'?'Therapist':'Terapeuta'}:</strong> ${escapeHtml(p.Therapist||'—')}</span>
        <span><strong data-es="Ingreso" data-en="Enrolled">${lang==='en'?'Enrolled':'Ingreso'}:</strong> ${p.Enrollment_Date||'—'}</span>
        <span><strong data-es="Estado" data-en="Status">${lang==='en'?'Status':'Estado'}:</strong> ${p.Status||'—'}</span>
      </div>
      <div style="margin-top: var(--space-3);"><strong style="font-size:var(--text-xs);color:var(--color-text-muted);text-transform:uppercase;" data-es="Condiciones" data-en="Conditions">${lang==='en'?'Conditions':'Condiciones'}:</strong> ${condChips || '—'}</div>
      ${p.Notes ? `<div style="margin-top: var(--space-3); font-size: var(--text-sm); color: var(--color-text-muted);"><strong data-es="Notas" data-en="Notes">${lang==='en'?'Notes':'Notas'}:</strong> ${escapeHtml(p.Notes)}</div>` : ''}
      ${safetyActive ? `
        <div class="pat-safety-banner">
          <span>⚠️ <strong data-es="Bandera de seguridad activa" data-en="Active safety flag">${lang==='en'?'Active safety flag':'Bandera de seguridad activa'}</strong></span>
          <button onclick="acknowledgeSafety()" data-es="Reconocer" data-en="Acknowledge">Reconocer</button>
        </div>
      ` : ''}
      <div class="quick-actions">
        <button class="primary" onclick="openVisitModal()" data-es="+ Registrar visita" data-en="+ Log visit">+ Registrar visita</button>
        <button class="ghost" onclick="openMedModal()" data-es="+ Medicamento" data-en="+ Medication">+ Medicamento</button>
        ${!safetyActive ? `<button class="danger" onclick="raiseSafety()" data-es="Marcar bandera de seguridad" data-en="Raise safety flag">Marcar bandera</button>` : ''}
        <button class="ghost" onclick="toggleStatus()" data-es="Cambiar estado" data-en="Change status">Cambiar estado</button>
      </div>
    </div>

    <!-- SUGGESTIONS / PROMPTS -->
    ${renderPrompts(p, lang)}

    <!-- LAUNCH TOOLS -->
    <div class="sec-card">
      <h2><span data-es="Completar herramienta" data-en="Complete a tool">Completar herramienta</span></h2>
      <p style="font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-3);" data-es="Abre la herramienta en una nueva pestaña. Al terminar, use &laquo;Registrar visita&raquo; para guardar el puntaje." data-en="Opens the tool in a new tab. When finished, use &laquo;Log visit&raquo; to save the score.">Abre la herramienta en una nueva pestaña. Al terminar, use «Registrar visita» para guardar el puntaje.</p>
      <div class="tool-launch-grid">
        ${toolKeys.map(t => TOOL_URL_MAP[t] ? `<a class="tool-launch-btn" href="${TOOL_URL_MAP[t]}" target="_blank">${t}</a>` : `<span class="tool-launch-btn" style="opacity:0.4;">${t}</span>`).join('')}
      </div>
    </div>

    <!-- TRENDS -->
    <div class="sec-card">
      <h2><span data-es="Tendencias por herramienta" data-en="Trends by tool">Tendencias por herramienta</span></h2>
      <div class="trend-grid">
        ${renderTrends(toolKeys, lang)}
      </div>
    </div>

    <!-- VISITS TIMELINE -->
    <div class="sec-card">
      <h2><span data-es="Historial de visitas" data-en="Visit history">Historial de visitas</span> <span style="font-size: var(--text-sm); color: var(--color-text-muted); font-weight: 400;">${PSTATE.visits.length} ${lang==='en'?'visits':'visitas'}</span></h2>
      ${renderVisits(lang)}
    </div>

    <!-- MEDICATIONS -->
    <div class="sec-card">
      <h2><span data-es="Historial de medicamentos" data-en="Medication history">Historial de medicamentos</span> <span style="font-size: var(--text-sm); color: var(--color-text-muted); font-weight: 400;">${PSTATE.meds.length} ${lang==='en'?'events':'eventos'}</span></h2>
      ${renderMeds(lang)}
    </div>
  `;
}

function renderPrompts(p, lang) {
  const prompts = [];

  // Prompt 1: Safety flag unacknowledged
  if (p.Safety_Flag==='TRUE' && !p.Safety_Flag_Ack_At) {
    prompts.push({
      text: lang==='en'
        ? 'Safety concern flagged. Review suicidality/self-harm assessment and document plan before acknowledging.'
        : 'Preocupación de seguridad marcada. Revise evaluación de ideación suicida/autolesión y documente plan antes de reconocer.',
      actions: [[lang==='en'?'Acknowledge':'Reconocer', 'acknowledgeSafety()']]
    });
  }

  // Prompt 2: Stale (>8wks)
  const lastVisit = PSTATE.visits[0];
  const daysSince = lastVisit ? daysBetween(lastVisit.Visit_Date, todayISO()) : 9999;
  if (daysSince > 56 && daysSince < 9999) {
    prompts.push({
      text: lang==='en'
        ? `No visit in ${daysSince} days. Consider outreach or rescheduling.`
        : `Sin visita hace ${daysSince} días. Considere contactar o reprogramar.`,
      actions: [[lang==='en'?'Log visit':'Registrar visita', 'openVisitModal()']]
    });
  }

  // Prompt 3: Not improving
  const latestToolKey = lastVisit?.Tool;
  if (latestToolKey) {
    const toolVisits = PSTATE.visits.filter(v => v.Tool===latestToolKey).reverse();
    if (toolVisits.length >= 3) {
      const first = Number(toolVisits[0].Score);
      const last  = Number(toolVisits[toolVisits.length-1].Score);
      const weeks = daysBetween(toolVisits[0].Visit_Date, toolVisits[toolVisits.length-1].Visit_Date) / 7;
      if (weeks >= 8 && !isNaN(first) && !isNaN(last)) {
        const reduction = first > 0 ? (first - last) / first : 0;
        if (reduction < 0.5 || last >= first) {
          prompts.push({
            text: lang==='en'
              ? `${latestToolKey}: ${first}→${last} over ${Math.round(weeks)} weeks (<50% reduction). Consider medication review or intensification.`
              : `${latestToolKey}: ${first}→${last} en ${Math.round(weeks)} semanas (<50% reducción). Considere revisión o intensificación de tratamiento.`,
            actions: []
          });
        }
      }
    }
  }

  // Prompt 4: Remission → consider Prioridad Baja
  if (latestToolKey && p.Status === 'Activo') {
    const toolVisits = PSTATE.visits.filter(v => v.Tool===latestToolKey);
    if (toolVisits.length >= 2) {
      const last2 = toolVisits.slice(0,2);
      const tier = PSTATE.tools[latestToolKey];
      if (tier && last2.every(v => Number(v.Score) < tier.remission)) {
        prompts.push({
          text: lang==='en'
            ? `Two consecutive ${latestToolKey} scores below remission threshold. Consider moving to Low Priority.`
            : `Dos puntajes consecutivos de ${latestToolKey} bajo umbral de remisión. Considere mover a Prioridad Baja.`,
          actions: [[lang==='en'?'Move to Low Priority':'Mover a Prioridad Baja', `setStatus('Prioridad Baja')`]]
        });
      }
    }
  }

  if (!prompts.length) return '';
  return `
    <div class="sec-card" style="border-color: var(--color-primary); background: var(--color-primary-bg);">
      <h2 style="border:none;padding:0;margin-bottom:var(--space-3);"><span data-es="Recomendaciones" data-en="Recommendations">Recomendaciones</span></h2>
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
    const tierLbl = lang==='en' ? TIER_EN[tier] : tier;
    const delta = (latest && baseline) ? (Number(latest.Score) - Number(baseline.Score)) : null;
    const deltaStr = delta == null ? '—' : (delta > 0 ? `+${delta}` : `${delta}`);
    const values = visits.map(v => Number(v.Score)).filter(x => !isNaN(x));
    return `
      <div class="trend-card">
        <h3><span>${tool}</span><span class="tool-badge tier-${TIER_CLASS[tier]?.replace('tier-','')||'nodata'}">${tierLbl}</span></h3>
        <div class="trend-score">${latest ? latest.Score : '—'}
          ${delta!=null ? `<span style="font-size: var(--text-sm); margin-left: 8px; color: ${delta<0?'var(--color-success)':delta>0?'var(--color-error)':'var(--color-text-muted)'};">${deltaStr}</span>` : ''}
        </div>
        <div class="trend-sub">${visits.length} ${lang==='en'?'visits':'visitas'} · ${lang==='en'?'baseline':'base'} ${baseline?baseline.Score:'—'}</div>
        ${bigSparkline(values)}
      </div>
    `;
  }).join('');
}

function bigSparkline(values) {
  if (!values || values.length < 2) return '<svg class="big-spark"></svg>';
  const w = 260, h = 48, pad = 4;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const step = (w - pad*2) / (values.length - 1);
  const pts = values.map((v,i) => `${pad + i*step},${h - pad - ((v - min)/range) * (h - pad*2)}`);
  const last = values[values.length-1], first = values[0];
  const color = last < first ? 'var(--color-success)' : last > first ? 'var(--color-error)' : 'var(--color-text-muted)';
  const circles = values.map((v,i) => {
    const cx = pad + i*step;
    const cy = h - pad - ((v - min)/range) * (h - pad*2);
    return `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${color}"/>`;
  }).join('');
  return `<svg class="big-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline fill="none" stroke="${color}" stroke-width="1.5" points="${pts.join(' ')}"/>
    ${circles}
  </svg>`;
}

function renderVisits(lang) {
  if (!PSTATE.visits.length) return `<p style="color:var(--color-text-muted);">${lang==='en'?'No visits yet.':'Sin visitas aún.'}</p>`;
  return `<div class="visit-timeline">` + PSTATE.visits.map(v => {
    const tier = scoreToTier(v.Score, PSTATE.tools[v.Tool]);
    const tierCls = TIER_CLASS[tier] || 'tier-nodata';
    const tierLbl = lang==='en' ? TIER_EN[tier] : tier;
    return `
      <div class="visit-row">
        <div class="vdate">${v.Visit_Date}</div>
        <div class="vtool">${v.Tool||'—'}</div>
        <div class="vnote">${escapeHtml(v.Visit_Note||'')} ${v.SI_Positive==='TRUE' ? '<span class="pat-row-safety" style="font-size:10px;padding:1px 6px;background:var(--color-error);color:white;border-radius:999px;">SI+</span>' : ''}</div>
        <div class="vscore">${v.Score||'—'}</div>
        <div class="vtier ${tierCls}">${tierLbl}</div>
      </div>
    `;
  }).join('') + `</div>`;
}

function renderMeds(lang) {
  if (!PSTATE.meds.length) return `<p style="color:var(--color-text-muted);">${lang==='en'?'No medication events.':'Sin eventos de medicamentos.'}</p>`;
  return PSTATE.meds.map(m => `
    <div class="med-row">
      <div class="mdate">${m.Date}</div>
      <div class="mmed">${escapeHtml(m.Medication)} ${m.Dose?`<span style="color:var(--color-text-muted);font-weight:400;">· ${m.Dose}</span>`:''}</div>
      <div class="maction">${m.Action||''}</div>
      <div>${escapeHtml(m.Reason||'')}</div>
      <div style="color:var(--color-text-muted);font-size:var(--text-xs);">${escapeHtml(m.Prescriber||'')}</div>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════════════════════════
async function acknowledgeSafety() {
  if (!confirm(document.documentElement.getAttribute('data-lang')==='en' ? 'Acknowledge safety flag for this patient?' : '¿Reconocer bandera de seguridad?')) return;
  const now = new Date().toISOString();
  await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
    Safety_Flag_Ack_By: PSTATE.user || 'unknown',
    Safety_Flag_Ack_At: now,
    Updated_By: PSTATE.user,
    Updated_At: now,
  });
  PSTATE.patient.Safety_Flag_Ack_By = PSTATE.user;
  PSTATE.patient.Safety_Flag_Ack_At = now;
  render();
}

async function raiseSafety() {
  const reason = prompt(document.documentElement.getAttribute('data-lang')==='en' ? 'Reason for safety flag?' : '¿Motivo de la bandera?');
  if (!reason) return;
  const now = new Date().toISOString();
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
  render();
}

async function toggleStatus() {
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  const options = ['Activo','Prioridad Baja','Inactivo','Transferido'];
  const cur = PSTATE.patient.Status || 'Activo';
  const choice = prompt(
    (lang==='en' ? 'New status (Activo, Prioridad Baja, Inactivo, Transferido):' : 'Nuevo estado (Activo, Prioridad Baja, Inactivo, Transferido):') + `\nCurrent: ${cur}`,
    cur
  );
  if (!choice || !options.includes(choice)) return;
  await setStatus(choice);
}

async function setStatus(newStatus) {
  const now = new Date().toISOString();
  await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
    Status: newStatus, Updated_By: PSTATE.user, Updated_At: now,
  });
  PSTATE.patient.Status = newStatus;
  render();
}

// ── Visit modal ────────────────────────────────────────────────
function openVisitModal() {
  const toolKeys = (PSTATE.patient.Tools||'').split(',').map(s=>s.trim()).filter(Boolean);
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  document.getElementById('visitForm').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Date':'Fecha'}</label>
        <input type="date" id="vDate" value="${new Date().toISOString().slice(0,10)}" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Tool':'Herramienta'}</label>
        <select id="vTool" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          ${toolKeys.map(t => `<option value="${t}">${t}</option>`).join('')}
          ${Object.keys(PSTATE.tools).filter(t => !toolKeys.includes(t)).map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Score':'Puntaje'}</label>
        <input type="number" id="vScore" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'SI positive?':'¿IS positiva?'}</label>
        <select id="vSI" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          <option value="FALSE">No</option><option value="TRUE">${lang==='en'?'Yes':'Sí'}</option>
        </select>
      </div>
    </div>
    <div style="margin-top: var(--space-3);">
      <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Subscales (JSON, optional)':'Subescalas (JSON, opcional)'}</label>
      <input type="text" id="vSub" placeholder='{"internalizing":4,"attention":6}' style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);font-family:ui-monospace,monospace;font-size:var(--text-xs);"/>
    </div>
    <div style="margin-top: var(--space-3);">
      <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Note':'Nota'}</label>
      <textarea id="vNote" rows="3" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"></textarea>
    </div>
  `;
  document.getElementById('visitModal').style.display = 'flex';
}
function closeVisitModal() { document.getElementById('visitModal').style.display = 'none'; }

async function submitVisit() {
  const tool = document.getElementById('vTool').value;
  const score = document.getElementById('vScore').value;
  if (!tool || score === '') return alert('Herramienta y puntaje requeridos');
  const baseline = PSTATE.visits.filter(v => v.Tool===tool).slice(-1)[0]?.Baseline_Score
                 || PSTATE.visits.filter(v => v.Tool===tool)[0]?.Score
                 || score;
  const now = new Date().toISOString();
  const row = {
    Visit_ID: `V-${Date.now()}`,
    Patient_ID: PSTATE.patient.Patient_ID,
    Visit_Date: document.getElementById('vDate').value,
    Therapist: PSTATE.user || PSTATE.patient.Therapist || '',
    Tool: tool,
    Score: score,
    Baseline_Score: baseline,
    Subscale_Scores: document.getElementById('vSub').value.trim(),
    SI_Positive: document.getElementById('vSI').value,
    Not_Improving_Flag: 'FALSE',
    Visit_Note: document.getElementById('vNote').value.trim(),
    Created_By: PSTATE.user || 'unknown',
    Created_At: now,
    Updated_By: '',
    Updated_At: '',
    Schema_Version: '1.0',
  };
  const res = await writeRow('Visitas', row);
  if (res.queued) alert(document.documentElement.getAttribute('data-lang')==='en' ? 'Queued locally.' : 'Guardado en cola local.');

  // Auto-raise safety if SI positive
  if (row.SI_Positive === 'TRUE' && PSTATE.patient.Safety_Flag !== 'TRUE') {
    await updateRow('Pacientes', PSTATE.patient.Patient_ID, {
      Safety_Flag: 'TRUE', Updated_By: PSTATE.user, Updated_At: now,
    });
    PSTATE.patient.Safety_Flag = 'TRUE';
    PSTATE.patient.Safety_Flag_Ack_At = '';
  }
  PSTATE.visits.unshift(row);
  closeVisitModal();
  render();
}

// ── Med modal ──────────────────────────────────────────────────
function openMedModal() {
  const lang = document.documentElement.getAttribute('data-lang') || 'es';
  const formulary = PSTATE.team; // placeholder if we add formulary as config rows later
  document.getElementById('medForm').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Date':'Fecha'}</label>
        <input type="date" id="mDate" value="${new Date().toISOString().slice(0,10)}" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Action':'Acción'}</label>
        <select id="mAction" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          <option value="START">${lang==='en'?'Start':'Iniciar'}</option>
          <option value="TITRATE">${lang==='en'?'Titrate':'Titular'}</option>
          <option value="CONTINUE">${lang==='en'?'Continue':'Continuar'}</option>
          <option value="HOLD">${lang==='en'?'Hold':'Suspender temp.'}</option>
          <option value="STOP">${lang==='en'?'Stop':'Descontinuar'}</option>
        </select>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Medication':'Medicamento'}</label>
        <input type="text" id="mMed" placeholder="Fluoxetina" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Dose':'Dosis'}</label>
        <input type="text" id="mDose" placeholder="20 mg" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Frequency':'Frecuencia'}</label>
        <input type="text" id="mFreq" placeholder="QD / BID / PRN" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
      </div>
      <div>
        <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Prescriber':'Prescriptor'}</label>
        <select id="mPresc" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);">
          ${PSTATE.team.filter(t=>t.role==='psychiatrist').map(t=>`<option value="${t.name}">${t.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top: var(--space-3);">
      <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Reason':'Motivo'}</label>
      <input type="text" id="mReason" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"/>
    </div>
    <div style="margin-top: var(--space-3);">
      <label style="font-size:var(--text-xs);color:var(--color-text-muted);font-weight:600;text-transform:uppercase;">${lang==='en'?'Notes':'Notas'}</label>
      <textarea id="mNotes" rows="2" style="width:100%;padding:8px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text);"></textarea>
    </div>
  `;
  document.getElementById('medModal').style.display = 'flex';
}
function closeMedModal() { document.getElementById('medModal').style.display = 'none'; }

async function submitMed() {
  const med = document.getElementById('mMed').value.trim();
  if (!med) return alert('Medicamento requerido');
  const now = new Date().toISOString();
  const row = {
    Med_ID: `M-${Date.now()}`,
    Patient_ID: PSTATE.patient.Patient_ID,
    Date: document.getElementById('mDate').value,
    Medication: med,
    Dose: document.getElementById('mDose').value.trim(),
    Frequency: document.getElementById('mFreq').value.trim(),
    Action: document.getElementById('mAction').value,
    Prescriber: document.getElementById('mPresc').value,
    Reason: document.getElementById('mReason').value.trim(),
    Notes: document.getElementById('mNotes').value.trim(),
    Created_By: PSTATE.user || 'unknown',
    Created_At: now,
    Schema_Version: '1.0',
  };
  const res = await writeRow('Medicamentos', row);
  if (res.queued) alert(document.documentElement.getAttribute('data-lang')==='en' ? 'Queued locally.' : 'Guardado en cola local.');
  PSTATE.meds.unshift(row);
  closeMedModal();
  render();
}

function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('coCMCamasca.lang') || 'es';
  setLang(savedLang);
  load();
});
