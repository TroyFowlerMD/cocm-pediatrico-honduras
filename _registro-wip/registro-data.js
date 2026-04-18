/* ============================================================
   CoCM Camasca — Registry data layer
   ============================================================
   Responsibilities:
   - Config persistence (localStorage)
   - Fetch Pacientes / Visitas / Medicamentos / Config from
     either (a) Apps Script Web App or (b) published CSV
   - Fall back to embedded demo data when nothing configured
   - Write operations proxy to Apps Script (stubbed until deploy)
   - Log all local writes to localStorage audit queue
   ============================================================ */

const REG_LS = {
  APPS_SCRIPT_URL: 'coCMCamasca.appsScriptUrl',
  CSV_BASE_URL:    'coCMCamasca.csvBaseUrl',
  USER:            'coCMCamasca.user',
  PENDING_WRITES:  'coCMCamasca.pendingWrites',
  CACHE:           'coCMCamasca.cache',
};

// Default Apps Script relay URL. Users can override via the Config modal,
// but the default points at Troy's deployed relay so the dashboard is
// live-by-default when loaded. When ownership transfers, update this
// constant + redeploy the page.
const REG_DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjjT0zEXEccqbL0wqpmGMsrOfTVMBNINF8ki9U_XzIdRx_VTp-XmQGEDeSpI_uKf4J/exec';

// ── Spreadsheet layout (must match the deployed Sheet) ─────────
const REG_GIDS = {
  Pacientes:    1939309800,
  Visitas:      2002702116,
  Medicamentos: 135204510,
  Config:       1274977205,
  Auditoria:    690792597,
  Sugerencias:  315401556,
};
const REG_HEADERS = {
  Pacientes: ["Patient_ID","Patient_Name","Initials","DOB","Age","Sex","Therapist","Conditions","Tools","Enrollment_Date","Status","Priority","Safety_Flag","Safety_Flag_Ack_By","Safety_Flag_Ack_At","Notes","Created_By","Created_At","Updated_By","Updated_At","Schema_Version"],
  Visitas:   ["Visit_ID","Patient_ID","Visit_Date","Therapist","Tool","Score","Baseline_Score","Subscale_Scores","SI_Positive","Not_Improving_Flag","Visit_Note","Created_By","Created_At","Updated_By","Updated_At","Schema_Version"],
  Medicamentos: ["Med_ID","Patient_ID","Date","Medication","Dose","Frequency","Action","Prescriber","Reason","Notes","Created_By","Created_At","Schema_Version"],
  Config:    ["Category","Key","Value","Display_ES","Display_EN","Active","Notes"],
  Auditoria: ["Audit_ID","Timestamp","User","Action","Tab","Row_ID","Field","Old_Value","New_Value"],
  Sugerencias: ["Suggestion_ID","Timestamp","Submitter","Category","Priority","Description","Attachment_URL","Status","Resolution_Notes","Resolved_By","Resolved_At"],
};

// ── Tool → portal URL map ───────────────────────────────────────
// Matches repo filenames. SMFQ-C = child short, SMFQ-P = parent short.
const TOOL_URL_MAP = {
  "PHQ-A":             "phqa.html",
  "GAD-7":             "gad7.html",
  "SCARED-N":          "scared.html",
  "SCARED-Parent":     "scared-parent.html",
  "SMFQ-C":            "smfq.html",
  "SMFQ-P":            "mfq-parent.html",
  "SNAP-IV":           "snapiv.html",
  "Vanderbilt-Parent": "vanderbilt-parent.html",
  "Vanderbilt-Teacher":"vanderbilt-teacher.html",
  "PSC-17":            "psc17.html",
  "CAP":               "cap.html",
  "CRAFFT":            "crafft.html",
  "DAST-10":           "dast10.html",
  "ASRS":              "asrs.html",
};

// ── Severity tier ordering ─────────────────────────────────────
const TIER_ORDER = ["Severa","Moderada","Leve","Remisión","Sin datos"];
const TIER_CLASS = {
  "Severa":    "tier-severe",
  "Moderada":  "tier-moderate",
  "Leve":      "tier-mild",
  "Remisión":  "tier-remission",
  "Sin datos": "tier-nodata",
};
const TIER_EN = {
  "Severa":    "Severe",
  "Moderada":  "Moderate",
  "Leve":      "Mild",
  "Remisión":  "Remission",
  "Sin datos": "No data",
};

// ════════════════════════════════════════════════════════════════
// CONFIG PERSISTENCE
// ════════════════════════════════════════════════════════════════
function cfgGet(key) {
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  // Fall back to bundled default for the Apps Script URL only
  if (key === REG_LS.APPS_SCRIPT_URL && REG_DEFAULT_APPS_SCRIPT_URL) {
    return REG_DEFAULT_APPS_SCRIPT_URL;
  }
  return '';
}
function cfgSet(key, val) { if (val) localStorage.setItem(key, val); else localStorage.removeItem(key); }

function getDataMode() {
  if (cfgGet(REG_LS.APPS_SCRIPT_URL)) return 'appsscript';
  if (cfgGet(REG_LS.CSV_BASE_URL))    return 'csv';
  return 'demo';
}

// ════════════════════════════════════════════════════════════════
// CSV PARSER (offline, no deps)
// ════════════════════════════════════════════════════════════════
function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter(r => r.some(v => String(v).trim() !== ''))
    .map(r => Object.fromEntries(headers.map((h,i) => [h, r[i] ?? ''])));
}

// ════════════════════════════════════════════════════════════════
// FETCH LAYER
// ════════════════════════════════════════════════════════════════
async function fetchTab(tabName) {
  const mode = getDataMode();
  if (mode === 'demo') return DEMO_DATA[tabName] || [];
  if (mode === 'csv') {
    const base = cfgGet(REG_LS.CSV_BASE_URL);
    const gid  = REG_GIDS[tabName];
    const url  = base.includes('gid=') ? base : `${base}&gid=${gid}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`CSV fetch failed for ${tabName}: ${res.status}`);
    return parseCSV(await res.text());
  }
  if (mode === 'appsscript') {
    const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
    const res = await fetch(`${url}?op=read&tab=${encodeURIComponent(tabName)}`);
    if (!res.ok) throw new Error(`Apps Script fetch failed for ${tabName}: ${res.status}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Apps Script error');
    return json.rows || [];
  }
}

async function fetchAll() {
  const [pacientes, visitas, meds, config] = await Promise.all([
    fetchTab('Pacientes'),
    fetchTab('Visitas'),
    fetchTab('Medicamentos'),
    fetchTab('Config'),
  ]);
  return { pacientes, visitas, meds, config };
}

// ════════════════════════════════════════════════════════════════
// WRITE LAYER (Apps Script only; queues locally otherwise)
// ════════════════════════════════════════════════════════════════
async function writeRow(tab, row) {
  const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
  if (!url) {
    // Queue locally
    const q = JSON.parse(localStorage.getItem(REG_LS.PENDING_WRITES) || '[]');
    q.push({ ts: new Date().toISOString(), op: 'append', tab, row });
    localStorage.setItem(REG_LS.PENDING_WRITES, JSON.stringify(q));
    return { ok: false, queued: true };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ op: 'append', tab, row }),
  });
  const json = await res.json();
  return json;
}

async function updateRow(tab, rowId, updates) {
  const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
  if (!url) {
    const q = JSON.parse(localStorage.getItem(REG_LS.PENDING_WRITES) || '[]');
    q.push({ ts: new Date().toISOString(), op: 'update', tab, rowId, updates });
    localStorage.setItem(REG_LS.PENDING_WRITES, JSON.stringify(q));
    return { ok: false, queued: true };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ op: 'update', tab, rowId, updates }),
  });
  return await res.json();
}

// ════════════════════════════════════════════════════════════════
// HELPERS — tool cutoffs, tier calculation
// ════════════════════════════════════════════════════════════════
function parseToolCutoffs(configRows) {
  const tools = {};
  for (const r of configRows) {
    if (r.Category !== 'tool' || r.Active !== 'TRUE') continue;
    try {
      const cut = JSON.parse(r.Value);
      tools[r.Key] = { ...cut, displayES: r.Display_ES, displayEN: r.Display_EN };
    } catch (e) { /* ignore bad JSON */ }
  }
  return tools;
}

/**
 * Given a tool key + score, return severity tier.
 * Cutoffs schema: { remission, mild, moderate, severe }
 *   score < remission      → "Remisión"
 *   score < mild           → "Leve"
 *   score < moderate       → "Moderada"
 *   else                   → "Severa"
 * If tool has no numeric cutoffs (categorical), returns 'Sin datos'.
 */
function scoreToTier(score, cutoffs) {
  if (score == null || score === '' || isNaN(Number(score))) return 'Sin datos';
  const s = Number(score);
  if (!cutoffs) return 'Sin datos';
  if (cutoffs.mild === 999 && cutoffs.moderate === 999) return 'Sin datos'; // categorical
  if (s < cutoffs.remission) return 'Remisión';
  if (s < cutoffs.mild)      return 'Leve';
  if (s < cutoffs.moderate)  return 'Moderada';
  return 'Severa';
}

function tierRank(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i < 0 ? 99 : i;
}

/**
 * For each patient, find their latest visit per tool and determine
 * highest-severity tier across tools as "primary tier".
 */
function computePatientTiers(pacientes, visitas, tools) {
  const byPt = {};
  for (const v of visitas) {
    if (!v.Patient_ID) continue;
    (byPt[v.Patient_ID] ||= []).push(v);
  }
  for (const list of Object.values(byPt)) {
    list.sort((a,b) => String(b.Visit_Date).localeCompare(String(a.Visit_Date)));
  }

  return pacientes.map(p => {
    const visits = byPt[p.Patient_ID] || [];
    // Latest per tool
    const latestByTool = {};
    for (const v of visits) {
      if (!latestByTool[v.Tool]) latestByTool[v.Tool] = v;
    }
    let worstTier = 'Sin datos';
    let worstTool = null;
    let worstScore = null;
    const toolScores = {};
    for (const [tool, v] of Object.entries(latestByTool)) {
      const t = scoreToTier(v.Score, tools[tool]);
      toolScores[tool] = { score: v.Score, tier: t, date: v.Visit_Date, visit: v };
      if (tierRank(t) < tierRank(worstTier)) {
        worstTier = t; worstTool = tool; worstScore = v.Score;
      }
    }
    const lastVisitDate = visits[0]?.Visit_Date || p.Enrollment_Date || '';
    return {
      ...p,
      _visits: visits,
      _latestByTool: latestByTool,
      _tier: worstTier,
      _tierTool: worstTool,
      _tierScore: worstScore,
      _toolScores: toolScores,
      _lastVisitDate: lastVisitDate,
      _daysSinceLastVisit: lastVisitDate ? daysBetween(lastVisitDate, todayISO()) : 9999,
      _safetyActive: p.Safety_Flag === 'TRUE' && !p.Safety_Flag_Ack_At,
    };
  });
}

function daysBetween(a, b) {
  const da = new Date(a), db = new Date(b);
  if (isNaN(+da) || isNaN(+db)) return 9999;
  return Math.floor((db - da) / 86400000);
}

function todayISO() { return new Date().toISOString().slice(0,10); }

// ════════════════════════════════════════════════════════════════
// DEMO DATA  (used when nothing configured; keeps UI navigable)
// ════════════════════════════════════════════════════════════════
const DEMO_DATA = {
  Pacientes: [
    {Patient_ID:"CCM-0001",Patient_Name:"Demo Paciente Uno",Initials:"DPU",DOB:"2012-03-14",Age:"13",Sex:"F",Therapist:"Eylin Ramos",Conditions:"depression",Tools:"SMFQ-C,PHQ-A",Enrollment_Date:"2025-11-12",Status:"Activo",Priority:"",Safety_Flag:"TRUE",Safety_Flag_Ack_By:"",Safety_Flag_Ack_At:"",Notes:"Ideación suicida pasiva — monitoreo estrecho",Created_By:"system",Created_At:"2025-11-12",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Patient_ID:"CCM-0002",Patient_Name:"Demo Paciente Dos",Initials:"DPD",DOB:"2014-06-02",Age:"11",Sex:"M",Therapist:"Eylin Ramos",Conditions:"adhd",Tools:"Vanderbilt-Parent,Vanderbilt-Teacher",Enrollment_Date:"2025-10-05",Status:"Activo",Priority:"",Safety_Flag:"FALSE",Safety_Flag_Ack_By:"",Safety_Flag_Ack_At:"",Notes:"",Created_By:"system",Created_At:"2025-10-05",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Patient_ID:"CCM-0003",Patient_Name:"Demo Paciente Tres",Initials:"DPT",DOB:"2010-09-18",Age:"15",Sex:"F",Therapist:"Karelia Marquez",Conditions:"anxiety,mdd_gad",Tools:"GAD-7,PHQ-A,SCARED-N",Enrollment_Date:"2025-09-01",Status:"Activo",Priority:"",Safety_Flag:"FALSE",Safety_Flag_Ack_By:"",Safety_Flag_Ack_At:"",Notes:"",Created_By:"system",Created_At:"2025-09-01",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Patient_ID:"CCM-0004",Patient_Name:"Demo Paciente Cuatro (remisión)",Initials:"DPC",DOB:"2011-01-20",Age:"14",Sex:"M",Therapist:"Karelia Marquez",Conditions:"depression",Tools:"SMFQ-C",Enrollment_Date:"2025-06-10",Status:"Activo",Priority:"",Safety_Flag:"FALSE",Safety_Flag_Ack_By:"",Safety_Flag_Ack_At:"",Notes:"",Created_By:"system",Created_At:"2025-06-10",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
  ],
  Visitas: [
    {Visit_ID:"V-0001",Patient_ID:"CCM-0001",Visit_Date:"2025-11-12",Therapist:"Eylin Ramos",Tool:"SMFQ-C",Score:"17",Baseline_Score:"17",Subscale_Scores:"",SI_Positive:"TRUE",Not_Improving_Flag:"FALSE",Visit_Note:"Baseline",Created_By:"system",Created_At:"2025-11-12",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0002",Patient_ID:"CCM-0001",Visit_Date:"2026-01-08",Therapist:"Eylin Ramos",Tool:"SMFQ-C",Score:"14",Baseline_Score:"17",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"FALSE",Visit_Note:"",Created_By:"system",Created_At:"2026-01-08",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0003",Patient_ID:"CCM-0001",Visit_Date:"2026-03-15",Therapist:"Eylin Ramos",Tool:"SMFQ-C",Score:"13",Baseline_Score:"17",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"TRUE",Visit_Note:"Slow improvement",Created_By:"system",Created_At:"2026-03-15",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0010",Patient_ID:"CCM-0003",Visit_Date:"2025-09-01",Therapist:"Karelia Marquez",Tool:"GAD-7",Score:"16",Baseline_Score:"16",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"FALSE",Visit_Note:"Baseline",Created_By:"system",Created_At:"2025-09-01",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0011",Patient_ID:"CCM-0003",Visit_Date:"2025-10-20",Therapist:"Karelia Marquez",Tool:"GAD-7",Score:"11",Baseline_Score:"16",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"FALSE",Visit_Note:"",Created_By:"system",Created_At:"2025-10-20",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0012",Patient_ID:"CCM-0003",Visit_Date:"2026-02-05",Therapist:"Karelia Marquez",Tool:"GAD-7",Score:"6",Baseline_Score:"16",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"FALSE",Visit_Note:"",Created_By:"system",Created_At:"2026-02-05",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0020",Patient_ID:"CCM-0004",Visit_Date:"2025-06-10",Therapist:"Karelia Marquez",Tool:"SMFQ-C",Score:"14",Baseline_Score:"14",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"FALSE",Visit_Note:"Baseline",Created_By:"system",Created_At:"2025-06-10",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0021",Patient_ID:"CCM-0004",Visit_Date:"2025-09-10",Therapist:"Karelia Marquez",Tool:"SMFQ-C",Score:"7",Baseline_Score:"14",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"FALSE",Visit_Note:"",Created_By:"system",Created_At:"2025-09-10",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
    {Visit_ID:"V-0022",Patient_ID:"CCM-0004",Visit_Date:"2026-01-10",Therapist:"Karelia Marquez",Tool:"SMFQ-C",Score:"5",Baseline_Score:"14",Subscale_Scores:"",SI_Positive:"FALSE",Not_Improving_Flag:"FALSE",Visit_Note:"Considerar Prioridad Baja",Created_By:"system",Created_At:"2026-01-10",Updated_By:"",Updated_At:"",Schema_Version:"1.0"},
  ],
  Medicamentos: [],
  Config: [
    {Category:"team",Key:"Eylin Ramos",Value:"therapist",Display_ES:"Terapeuta",Display_EN:"Therapist",Active:"TRUE",Notes:""},
    {Category:"team",Key:"Karelia Marquez",Value:"therapist",Display_ES:"Terapeuta",Display_EN:"Therapist",Active:"TRUE",Notes:""},
    {Category:"team",Key:"Troy Fowler, MD",Value:"psychiatrist",Display_ES:"Psiquiatra",Display_EN:"Psychiatrist",Active:"TRUE",Notes:""},
    {Category:"team",Key:"Nick Ladd, MD",Value:"psychiatrist",Display_ES:"Psiquiatra",Display_EN:"Psychiatrist",Active:"TRUE",Notes:""},
    {Category:"condition",Key:"depression",Value:"",Display_ES:"Depresión",Display_EN:"Depression",Active:"TRUE",Notes:""},
    {Category:"condition",Key:"anxiety",Value:"",Display_ES:"Ansiedad",Display_EN:"Anxiety",Active:"TRUE",Notes:""},
    {Category:"condition",Key:"adhd",Value:"",Display_ES:"TDAH",Display_EN:"ADHD",Active:"TRUE",Notes:""},
    {Category:"condition",Key:"mdd_gad",Value:"",Display_ES:"MDD / GAD",Display_EN:"MDD/GAD",Active:"TRUE",Notes:""},
    {Category:"tool",Key:"SMFQ-C",Value:JSON.stringify({remission:8,mild:11,moderate:15,severe:999}),Display_ES:"SMFQ-C",Display_EN:"SMFQ-C",Active:"TRUE",Notes:""},
    {Category:"tool",Key:"SMFQ-P",Value:JSON.stringify({remission:8,mild:11,moderate:15,severe:999}),Display_ES:"SMFQ-P",Display_EN:"SMFQ-P",Active:"TRUE",Notes:""},
    {Category:"tool",Key:"PHQ-A",Value:JSON.stringify({remission:5,mild:10,moderate:15,severe:999}),Display_ES:"PHQ-A",Display_EN:"PHQ-A",Active:"TRUE",Notes:""},
    {Category:"tool",Key:"GAD-7",Value:JSON.stringify({remission:5,mild:10,moderate:15,severe:999}),Display_ES:"GAD-7",Display_EN:"GAD-7",Active:"TRUE",Notes:""},
    {Category:"tool",Key:"SCARED-N",Value:JSON.stringify({remission:25,mild:999,moderate:999,severe:999}),Display_ES:"SCARED-N",Display_EN:"SCARED-N",Active:"TRUE",Notes:""},
    {Category:"tool",Key:"Vanderbilt-Parent",Value:JSON.stringify({remission:0,mild:999,moderate:999,severe:999}),Display_ES:"Vanderbilt-P",Display_EN:"Vanderbilt-P",Active:"TRUE",Notes:""},
  ],
};
