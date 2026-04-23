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

// ════════════════════════════════════════════════════════════════
// CLIENT EMAIL HELPER
// ════════════════════════════════════════════════════════════════
// Priority order:
//   1. Cloudflare Access JWT cookie (CF_Authorization) — set automatically
//      after Google login via Cloudflare Zero Trust.
//   2. localStorage cache (persisted from a prior CF JWT read).
//   3. Empty string — no prompt fallback (prompt removed now that CF Access
//      is enforcing authentication at the edge).
function _emailFromCFJwt() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    if (!match) return '';
    const payload = match[1].split('.')[1];
    if (!payload) return '';
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const email = (decoded.email || '').trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
  } catch (_) {}
  return '';
}

function getClientEmail(opts) {
  // 1. Try Cloudflare Access JWT
  const cfEmail = _emailFromCFJwt();
  if (cfEmail) {
    try { localStorage.setItem('coCMCamasca.user', cfEmail); } catch (_) {}
    return cfEmail;
  }
  // 2. Try localStorage cache
  try {
    const stored = (localStorage.getItem('coCMCamasca.user') || '').trim().toLowerCase();
    if (stored && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stored)) return stored;
  } catch (_) {}
  // 3. No prompt — CF Access should have caught unauthenticated users at the edge
  return '';
}

const REG_LS = {
  APPS_SCRIPT_URL:   'coCMCamasca.appsScriptUrl',
  CSV_BASE_URL:      'coCMCamasca.csvBaseUrl',
  USER:              'coCMCamasca.user',
  PENDING_WRITES:    'coCMCamasca.pendingWrites',
  CACHE:             'coCMCamasca.cache',
  FEATURES:          'coCMCamasca.features',
  FILTER_THERAPIST:  'coCMCamasca.filterTherapist',
};

// ════════════════════════════════════════════════════════════════
// FEATURE FLAGS — per-device "what to show" toggles
// ════════════════════════════════════════════════════════════════
// Therapists can simplify the UI by disabling columns they aren't ready
// to track yet. Disabling a feature only hides UI — it does NOT strip the
// underlying field from the sheet or prevent other users from using it.
// Defaults follow AIMS core recommendations; advanced / derived flags default off.
// Per user decision (April 2026): all display prefs default ON except
// simplified_mode and show_enrollment_date.
const REG_FEATURE_DEFAULTS = {
  simplified_mode:        false,  // master toggle: show only core columns
  show_psych_consult:     true,   // AIMS-essential
  show_bhcm_contact:      true,   // AIMS-essential (separate from scored visit)
  show_review_flag:       true,   // manual flag-for-review
  show_enrollment_date:   false,  // off by default — shown in detail page
  show_baseline_on_main:  true,   // AIMS-recommended
  show_trend_sparkline:   true,
  show_delta_column:      true,
  show_conditions_column: true,
  show_due_for_review:    true,   // auto-derived from psych consult date
};

// Columns hidden in simplified mode (keeps: therapist, patient, score, last visit, flags)
const REG_SIMPLIFIED_HIDDEN = new Set([
  'show_delta_column',
  'show_trend_sparkline',
  'show_conditions_column',
  'show_enrollment_date',
  'show_baseline_on_main',
]);

function featGet(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(REG_LS.FEATURES) || '{}');
    const val = (key in stored) ? stored[key] : REG_FEATURE_DEFAULTS[key];
    const simple = (key in stored) ? stored.simplified_mode : REG_FEATURE_DEFAULTS.simplified_mode;
    // Simplified mode forces some flags off regardless of individual toggle
    if (simple && REG_SIMPLIFIED_HIDDEN.has(key)) return false;
    return val !== undefined ? val : (REG_FEATURE_DEFAULTS[key] || false);
  } catch (e) {
    return REG_FEATURE_DEFAULTS[key] || false;
  }
}
function featSet(key, val) {
  try {
    const stored = JSON.parse(localStorage.getItem(REG_LS.FEATURES) || '{}');
    stored[key] = val;
    localStorage.setItem(REG_LS.FEATURES, JSON.stringify(stored));
  } catch (e) { /* ignore */ }
}
function featAll() {
  const out = {};
  Object.keys(REG_FEATURE_DEFAULTS).forEach(k => out[k] = featGet(k));
  return out;
}

// Default Apps Script relay URL. Users can override via the Config modal,
// but the default points at Troy's deployed relay so the dashboard is
// live-by-default when loaded. When ownership transfers, update this
// constant + redeploy the page.
//
// ⚠️ SECURITY (v2 — April 2026):
// The relay now gates every request on Google Sign-In. Deployment must be:
//   Execute as: User accessing the web app
//   Who has access: Anyone with Google account
// Only emails listed in the AuthorizedUsers tab (with active=TRUE) can read/write.
// Rotate this URL whenever you redeploy a new version of the relay.
const REG_DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxeYSvVau-oXTM0itCnKMjmGS8nk6dBbGs4fB71tHlVQEBZFtX9FVPGR5rRHjnIM_Qe/exec'; // v2.1 — Version 6 — active deployment

// ── Spreadsheet layout (must match the deployed Sheet) ─────────
const REG_GIDS = {
  Pacientes:       1939309800,
  Visitas:         2002702116,
  Medicamentos:    135204510,
  Config:          1274977205,
  Auditoria:       690792597,
  Sugerencias:     315401556,
  AuthorizedUsers: 129469619,
};
const REG_HEADERS = {
  // Pacientes: schema v2 adds AIMS-aligned tracking fields.
  //   Last_Psych_Consult_Date  — ISO date; most recent psychiatric consultant review
  //   Last_BHCM_Contact_Date   — ISO date; most recent meaningful therapist contact
  //                              (may or may not have a scored measure)
  //   Last_BHCM_Contact_Note   — short text describing type/outcome of contact
  //   Review_Flag              — "TRUE"/"" — manually flagged for next case review
  //   Baseline_Tool            — primary measurement tool name at enrollment (optional)
  //   Baseline_Score           — baseline score for Baseline_Tool (optional)
  //   Baseline_Date            — date baseline was collected (optional)
  // All new fields are OPTIONAL. Missing values render as "—" and never
  // break layout or derived flags.
  Pacientes: ["Patient_ID","Patient_Name","Initials","DOB","Age","Sex","Therapist","Conditions","Primary_Condition","Primary_Condition_Verified","Tools","Enrollment_Date","Status","Priority","Safety_Flag","Safety_Flag_Ack_By","Safety_Flag_Ack_At","Notes","Last_Psych_Consult_Date","Last_BHCM_Contact_Date","Last_BHCM_Contact_Note","Last_BHCM_Contact_By","Review_Flag","Baseline_Tool","Baseline_Score","Baseline_Date","Brigade_Flag","Brigade_Reason","Todo_Items","Created_By","Created_At","Updated_By","Updated_At","Schema_Version"],
  Visitas:   ["Visit_ID","Patient_ID","Visit_Date","Therapist","Tool","Score","Baseline_Score","Subscale_Scores","SI_Positive","Not_Improving_Flag","Visit_Note","Entry_Type","Created_By","Created_At","Updated_By","Updated_At","Schema_Version"],
  Medicamentos: ["Med_ID","Patient_ID","Date","Medication","Dose","Frequency","Action","Prescriber","Reason","Notes","Created_By","Created_At","Schema_Version"],
  Config:    ["Category","Key","Value","Display_ES","Display_EN","Active","Notes"],
  Auditoria: ["Audit_ID","Timestamp","User","Action","Tab","Row_ID","Field","Old_Value","New_Value"],
  Sugerencias: ["Suggestion_ID","Timestamp","Submitter","Category","Priority","Description","Attachment_URL","Status","Resolution_Notes","Resolved_By","Resolved_At"],
};


// ════════════════════════════════════════════════════════════════
// DATASET ROUTING (production vs test)
// ════════════════════════════════════════════════════════════════
// window.REG_DATASET is set by the app layer to 'real' (default) or 'test'.
// When 'test', reads/writes target the _Test suffixed worksheets.
// Supports Pacientes, Visitas, Medicamentos only — Config/Auditoria/Sugerencias
// are always shared across datasets.
const REG_DATASET_TABS = new Set(['Pacientes','Visitas','Medicamentos']);

function resolveTab(tabName) {
  const ds = (typeof window !== 'undefined' && window.REG_DATASET) || 'real';
  if (ds === 'test' && REG_DATASET_TABS.has(tabName)) {
    return tabName + '_Test';
  }
  return tabName;
}

// Test dataset GIDs (populated when Pacientes_Test / Visitas_Test / Medicamentos_Test
// worksheets are created in the Sheet). Leave 0 until known; CSV mode can't read
// until GIDs are filled in, but Apps Script mode uses tab name so it works immediately.
const REG_GIDS_TEST = {
  Pacientes_Test:   1906948828,
  Visitas_Test:     948080109,
  Medicamentos_Test: 927908472,
};

// ── Tool → portal URL map ───────────────────────────────────────
// Links to live CoCM Pediátrico hub — each tool opens in a new tab.
const COCM_TOOLS_BASE = "https://cocm-camasca.github.io/cocm-pediatrico-honduras/";
const TOOL_URL_MAP = {
  "PHQ-A":             COCM_TOOLS_BASE + "phqa.html",
  "GAD-7":             COCM_TOOLS_BASE + "gad7.html",
  "SCARED-N":          COCM_TOOLS_BASE + "scared.html",
  "SCARED-Parent":     COCM_TOOLS_BASE + "scared-parent.html",
  "SMFQ-C":            COCM_TOOLS_BASE + "smfq.html",
  "SMFQ-P":            COCM_TOOLS_BASE + "mfq-parent.html",
  "SNAP-IV":           COCM_TOOLS_BASE + "snapiv.html",
  "Vanderbilt-Parent": COCM_TOOLS_BASE + "vanderbilt-parent.html",
  "Vanderbilt-Teacher":COCM_TOOLS_BASE + "vanderbilt-teacher.html",
  "PSC-17":            COCM_TOOLS_BASE + "psc17.html",
  "CAP":               COCM_TOOLS_BASE + "cap.html",
  "CRAFFT":            COCM_TOOLS_BASE + "crafft.html",
  "DAST-10":           COCM_TOOLS_BASE + "dast10.html",
  "ASRS":              COCM_TOOLS_BASE + "asrs.html",
};

// Outside-party (ext) versions — stripped of navigation, safe to share with
// parents/teachers via WhatsApp or email. Only tools with a known -ext file.
const TOOL_EXT_URL_MAP = {
  "SCARED-Parent":     COCM_TOOLS_BASE + "scared-parent-ext.html",
  "SMFQ-P":            COCM_TOOLS_BASE + "smfq-p-ext.html",
  "SNAP-IV":           COCM_TOOLS_BASE + "snapiv-ext.html",
  "Vanderbilt-Parent": COCM_TOOLS_BASE + "vanderbilt-parent-ext.html",
  "Vanderbilt-Teacher":COCM_TOOLS_BASE + "vanderbilt-teacher-ext.html",
  "PSC-17":            COCM_TOOLS_BASE + "psc17-ext.html",
  "CAP":               COCM_TOOLS_BASE + "cap-ext.html",
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

// ── Primary condition groups (registry sort) ───────────────────
// Display order: Depression → Anxiety → PTSD → Mixed/Other → ADHD.
// ADHD last by explicit user preference ("see fires first").
const PRIMARY_GROUPS = ['depression','anxiety','ptsd','mixed_other','adhd'];
const PRIMARY_GROUP_LABELS = {
  depression:  { es: 'Depresión',          en: 'Depression' },
  anxiety:     { es: 'Ansiedad',           en: 'Anxiety' },
  ptsd:        { es: 'Trauma / PTSD',      en: 'Trauma / PTSD' },
  mixed_other: { es: 'Mixto / otros',      en: 'Mixed / other' },
  adhd:        { es: 'TDAH',               en: 'ADHD' },
};
// Map normalized condition key → primary group.
const CONDITION_TO_GROUP = {
  depression:      'depression',
  mdd_gad:         'depression', // comorbid — picks depression first
  anxiety:         'anxiety',
  social_anxiety:  'anxiety',
  adhd:            'adhd',
  trauma:          'ptsd',
  ptsd:            'ptsd',
  adjustment:      'mixed_other',
  sud_risk:        'mixed_other',
  learning:        'mixed_other',
  language:        'mixed_other',
  behavior:        'mixed_other',
  attachment:      'mixed_other',
  emperor:         'mixed_other',
  trichotillomania:'mixed_other',
  other:           'mixed_other',
};
// Map tool key → primary group (used as fallback when Conditions is blank).
const TOOL_TO_GROUP = {
  'PHQ-A':              'depression',
  'SMFQ-C':             'depression',
  'SMFQ-P':             'depression',
  'GAD-7':              'anxiety',
  'SCARED-N':           'anxiety',
  'SCARED-Parent':      'anxiety',
  'SNAP-IV':            'adhd',
  'Vanderbilt-Parent':  'adhd',
  'Vanderbilt-Teacher': 'adhd',
  'CAP':                'adhd',
  'ASRS':               'adhd',
  'PSC-17':             'mixed_other',
  'DAST-10':            'mixed_other',
  'CRAFFT':             'mixed_other',
};

// Normalize a free-text condition into one of the canonical keys above.
// Handles Spanish/English variants with accent stripping.
function normalizeConditionKey(raw) {
  if (!raw) return '';
  let s = String(raw).trim().toLowerCase();
  // Strip diacritics
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove punctuation, collapse whitespace/underscores
  s = s.replace(/[^a-z0-9 _-]/g, ' ').replace(/[\s_-]+/g, '_').replace(/^_|_$/g,'');
  // Direct canonical match
  if (CONDITION_TO_GROUP[s]) return s;
  // Aliases → canonical keys
  const aliases = {
    depresion: 'depression', depression: 'depression', mdd: 'depression', dep: 'depression',
    ansiedad: 'anxiety', anxiety: 'anxiety', gad: 'anxiety',
    ansiedad_social: 'social_anxiety', social: 'social_anxiety', social_anxiety: 'social_anxiety',
    tdah: 'adhd', adhd: 'adhd', deficit_de_atencion: 'adhd',
    trauma: 'trauma', ptsd: 'ptsd', tept: 'ptsd',
    ajuste: 'adjustment', adjustment: 'adjustment',
    sud: 'sud_risk', sud_risk: 'sud_risk', riesgo_sud: 'sud_risk', riesgo_de_consumo: 'sud_risk',
    aprendizaje: 'learning', learning: 'learning',
    lenguaje: 'language', language: 'language',
    comportamiento: 'behavior', behavior: 'behavior', conducta: 'behavior',
    apego: 'attachment', attachment: 'attachment',
    emperador: 'emperor', emperor: 'emperor',
    tricotilomania: 'trichotillomania', trichotillomania: 'trichotillomania',
    otro: 'other', other: 'other',
    mdd_gad: 'mdd_gad',
  };
  if (aliases[s]) return aliases[s];
  return s; // unknown — caller falls back to mixed_other
}

function conditionKeyToGroup(key) {
  if (!key) return 'mixed_other';
  return CONDITION_TO_GROUP[key] || 'mixed_other';
}

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
// Timeout-aware fetch wrapper. Apps Script's /exec redirect chain can hang
// indefinitely in some browser/session states; without a timeout the UI freezes.
async function fetchWithTimeout(url, opts, timeoutMs) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
  try {
    const res = await fetch(url, { ...(opts || {}), signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function fetchTab(tabName) {
  const mode = getDataMode();
  const resolved = resolveTab(tabName);
  // Demo/offline mode: honor dataset toggle by picking from DEMO_TEST_DATA when
  // resolved name ends in _Test, otherwise use DEMO_DATA. Config/etc always use DEMO_DATA.
  if (mode === 'demo') {
    if (resolved.endsWith('_Test')) {
      const baseKey = resolved.replace('_Test','');
      return (DEMO_TEST_DATA[baseKey] || [])
        .concat(DEMO_DATA[baseKey] ? [] : []); // test-only when toggled
    }
    return DEMO_DATA[tabName] || [];
  }
  if (mode === 'csv') {
    const base = cfgGet(REG_LS.CSV_BASE_URL);
    // Try test GID first for _Test tabs; fall back to production-name GID map for normal tabs.
    const gid = REG_GIDS_TEST[resolved] || REG_GIDS[resolved] || REG_GIDS[tabName];
    const url = base.includes('gid=') ? base : `${base}&gid=${gid}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CSV fetch failed for ${resolved}: ${res.status}`);
    return parseCSV(await res.text());
  }
  if (mode === 'appsscript') {
    const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
    const email = getClientEmail();
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const fullUrl = `${url}?op=read&tab=${encodeURIComponent(resolved)}${emailParam}`;
    // Retry up to 4 times on transient "Failed to fetch" OR request hang.
    // Apps Script's /exec endpoint returns a 302 to googleusercontent.com; that
    // redirect sometimes hangs indefinitely (especially first call after page load).
    // fetchWithTimeout uses AbortController so hangs become retryable timeouts.
    let lastErr;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetchWithTimeout(fullUrl, {}, 8000);
        if (!res.ok) throw new Error(`Apps Script fetch failed for ${resolved}: ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const err = new Error('AUTH_REDIRECT');
          err.code = 'AUTH_REDIRECT';
          err.signInUrl = url;
          throw err;
        }
        const json = await res.json();
        if (!json.ok) {
          const err = new Error(json.error || 'Apps Script error');
          if (/UNAUTHORIZED/i.test(json.error || '')) err.code = 'UNAUTHORIZED';
          throw err;
        }
        return json.rows || [];
      } catch (e) {
        lastErr = e;
        // Don't retry on auth errors — only on network/timeout failures
        if (e.code === 'AUTH_REDIRECT' || e.code === 'UNAUTHORIZED') throw e;
        if (attempt < 4) await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    throw lastErr;
  }
}


// ── User profile helpers (Phase 2.5.1) ─────────────────────────
// Given an email, look up Display_Name + role from a cached AuthorizedUsers list.
// Falls back to the email local-part capitalized if no match.
function getUserProfile(email, authUsers) {
  if (!email) return { email: '', name: '', role: '' };
  const norm = String(email).trim().toLowerCase();
  const u = (authUsers || []).find(r => String(r.email || '').trim().toLowerCase() === norm);
  if (u) return { email: norm, name: String(u.name || '').trim() || norm, role: String(u.role || '').trim().toLowerCase() };
  return { email: norm, name: norm, role: '' };
}
function getUserDisplayName(email, authUsers) {
  const p = getUserProfile(email, authUsers);
  return p.name || p.email;
}
function getUserRole(email, authUsers) {
  return getUserProfile(email, authUsers).role;
}
function isTherapistRole(email, authUsers) {
  return getUserRole(email, authUsers) === 'therapist';
}
if (typeof window !== 'undefined') {
  window.getUserProfile = getUserProfile;
  window.getUserDisplayName = getUserDisplayName;
  window.getUserRole = getUserRole;
  window.isTherapistRole = isTherapistRole;
}

// ── Minimal Markdown → HTML (bold/italic only) — safe for note fields ──
// Supports: **bold**, __bold__, *italic*, _italic_
// Escapes HTML first. No links, no images, no code blocks.
function renderMarkdownInline(text) {
  if (!text) return '';
  // HTML-escape first
  let s = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Bold: **x** or __x__ (non-greedy)
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
  // Italic: *x* or _x_  (avoid partial matches inside words like 2_week)
  s = s.replace(/(^|[^\w*])\*([^*\n]+?)\*(?=[^\w*]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w_])_([^_\n]+?)_(?=[^\w_]|$)/g, '$1<em>$2</em>');
  // Convert \n to <br>
  s = s.replace(/\n/g, '<br>');
  return s;
}
if (typeof window !== 'undefined') window.renderMarkdownInline = renderMarkdownInline;


// ── v2.5.2 paint-from-cache helpers ──
// Cache last-known registry data in localStorage so back-nav / repeat loads paint
// instantly. Cache is ONLY used as a first-paint fallback; fresh data always
// overwrites. Per-tab cache so bad writes can't corrupt others.
const REG_CACHE_KEY = REG_LS.CACHE + '.v2'; // bump version to invalidate legacy
function readCache() {
  try {
    const raw = localStorage.getItem(REG_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    // Expire cache after 24h to avoid stale schema
    if (!obj || !obj.ts || (Date.now() - obj.ts) > 86400000) return null;
    return obj.data || null;
  } catch (_) { return null; }
}
function writeCache(data) {
  try {
    localStorage.setItem(REG_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) { /* quota errors ignored */ }
}
if (typeof window !== 'undefined') { window.readCache = readCache; window.writeCache = writeCache; }

// ── Staggered fetch: resolve Pacientes + AuthorizedUsers FIRST (what the
// registry first-paint needs), then visitas/meds/config in a follow-up wave.
// Caller can await the first promise to paint, then the second to enrich.
function fetchAllStaggered() {
  const firstWave = Promise.all([
    fetchTab('Pacientes').catch(e => { console.warn('[fetchAllStaggered] Pacientes failed', e); return []; }),
    fetchTab('AuthorizedUsers').catch(() => []),
  ]);
  const secondWave = Promise.all([
    fetchTab('Visitas').catch(e => { console.warn('[fetchAllStaggered] Visitas failed', e); return []; }),
    fetchTab('Medicamentos').catch(e => { console.warn('[fetchAllStaggered] Medicamentos failed', e); return []; }),
    fetchTab('Config').catch(e => { console.warn('[fetchAllStaggered] Config failed', e); return []; }),
  ]);
  return { firstWave, secondWave };
}
if (typeof window !== 'undefined') window.fetchAllStaggered = fetchAllStaggered;


async function fetchAll() {
  // v1.1: parallelize reads now that fetchTab has timeouts + retries.
  // Falls back per-tab on individual failure so one bad tab doesn't nuke the page.
  const [pacientes, visitas, meds, config, authorizedUsers] = await Promise.all([
    fetchTab('Pacientes').catch(e => { console.warn('[fetchAll] Pacientes failed', e); return []; }),
    fetchTab('Visitas').catch(e => { console.warn('[fetchAll] Visitas failed', e); return []; }),
    fetchTab('Medicamentos').catch(e => { console.warn('[fetchAll] Medicamentos failed', e); return []; }),
    fetchTab('Config').catch(e => { console.warn('[fetchAll] Config failed', e); return []; }),
    fetchTab('AuthorizedUsers').catch(e => { console.warn('[fetchAll] AuthorizedUsers failed', e); return []; }),
  ]);
  return { pacientes, visitas, meds, config, authorizedUsers };
}

// ════════════════════════════════════════════════════════════════
// WRITE LAYER (Apps Script only; queues locally otherwise)
// ════════════════════════════════════════════════════════════════
async function writeRow(tab, row) {
  const resolved = resolveTab(tab);
  const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
  if (!url) {
    // Queue locally
    const q = JSON.parse(localStorage.getItem(REG_LS.PENDING_WRITES) || '[]');
    q.push({ ts: new Date().toISOString(), op: 'append', tab: resolved, row });
    localStorage.setItem(REG_LS.PENDING_WRITES, JSON.stringify(q));
    return { ok: false, queued: true };
  }
  // Retry POST up to 3 times on hang/abort
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ op: 'append', tab: resolved, row, email: getClientEmail() }),
      }, 12000);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr;
}

async function updateRow(tab, rowId, updates) {
  const resolved = resolveTab(tab);
  const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
  if (!url) {
    const q = JSON.parse(localStorage.getItem(REG_LS.PENDING_WRITES) || '[]');
    q.push({ ts: new Date().toISOString(), op: 'update', tab: resolved, rowId, updates });
    localStorage.setItem(REG_LS.PENDING_WRITES, JSON.stringify(q));
    return { ok: false, queued: true };
  }
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ op: 'update', tab: resolved, rowId, updates, email: getClientEmail() }),
      }, 12000);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr;
}

async function deleteRow(tab, rowId) {
  const resolved = resolveTab(tab);
  const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
  if (!url) {
    showToast && showToast('Cannot delete — no Apps Script URL configured', { variant: 'error' });
    return { ok: false };
  }
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ op: 'delete', tab: resolved, rowId, email: getClientEmail() }),
      }, 12000);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr;
}

// ════════════════════════════════════════════════════════════════
// AUTH PING — verifies signed-in Google account is in AuthorizedUsers
// ════════════════════════════════════════════════════════════════
// Returns one of:
//   { status: 'ok',           user: { email, name, role } }
//   { status: 'unauthorized', email }
//   { status: 'signin_required', signInUrl }
//   { status: 'no_relay' }                  // relay URL not configured
//   { status: 'error', message }
async function pingAuth() {
  const url = cfgGet(REG_LS.APPS_SCRIPT_URL);
  if (!url || url === 'PASTE_NEW_EXEC_URL_HERE') return { status: 'no_relay' };
  try {
    const email = getClientEmail({ promptIfMissing: true });
    if (!email) return { status: 'unauthorized', email: '' };
    // Retry ping up to 3 times with timeout
    let res, lastPingErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await fetchWithTimeout(`${url}?op=ping&email=${encodeURIComponent(email)}`, {}, 8000);
        lastPingErr = null;
        break;
      } catch (e) {
        lastPingErr = e;
        if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    if (lastPingErr) throw lastPingErr;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return { status: 'signin_required', signInUrl: url };
    }
    const json = await res.json();
    if (!json.ok) return { status: 'error', message: json.error || 'ping failed' };
    if (json.authorized) return { status: 'ok', user: json.user };
    return { status: 'unauthorized', email: (json.user && json.user.email) || '' };
  } catch (err) {
    return { status: 'error', message: String(err && err.message || err) };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS — tool cutoffs, tier calculation
// ════════════════════════════════════════════════════════════════
// Accept various truthy encodings for the Active column ("TRUE", "true", "1", true, etc.).
// Google Sheets via Apps Script often returns lowercase 'true'/'false' strings.
function isActiveRow(r) {
  const v = r && r.Active;
  if (v === true) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' || s === 'y';
  }
  if (typeof v === 'number') return v === 1;
  return false;
}

// Accept "TRUE", "true", "1", true, 1, "yes" — Apps Script returns lowercase.
function isTruthyFlag(v) {
  if (v === true) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' || s === 'y';
  }
  if (typeof v === 'number') return v === 1;
  return false;
}

function parseToolCutoffs(configRows) {
  const tools = {};
  for (const r of configRows) {
    if (r.Category !== 'tool' || !isActiveRow(r)) continue;
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

    // ── Primary condition resolution ────────────────────────────
    // 1. If Primary_Condition explicitly set, use it.
    // 2. Else, first key from Conditions field (auto-infer, needs verify).
    // 3. Else, fall back to first monitored tool.
    // 4. Else, 'mixed_other' with needs-verify flag.
    let primaryCondition = '';
    let primaryGroup = 'mixed_other';
    let needsVerify = false;
    const storedPrimary = normalizeConditionKey(p.Primary_Condition);
    const verifiedFlag = isTruthyFlag(p.Primary_Condition_Verified);
    if (storedPrimary) {
      primaryCondition = storedPrimary;
      primaryGroup = conditionKeyToGroup(storedPrimary);
      needsVerify = !verifiedFlag; // explicit but not yet verified
    } else {
      // Auto-infer from first Conditions entry
      const condsRaw = String(p.Conditions || '').split(',').map(s => s.trim()).filter(Boolean);
      if (condsRaw.length) {
        const firstKey = normalizeConditionKey(condsRaw[0]);
        if (firstKey) {
          primaryCondition = firstKey;
          primaryGroup = conditionKeyToGroup(firstKey);
          needsVerify = true;
        }
      }
      // Fallback: first tool
      if (!primaryCondition) {
        const toolsRaw = String(p.Tools || '').split(',').map(s => s.trim()).filter(Boolean);
        if (toolsRaw.length && TOOL_TO_GROUP[toolsRaw[0]]) {
          primaryGroup = TOOL_TO_GROUP[toolsRaw[0]];
          needsVerify = true;
        } else {
          needsVerify = true;
        }
      }
    }

    // Find latest score for the tool most relevant to primary group.
    // Strategy: among latestByTool, pick the most-recent visit whose tool
    // maps to primaryGroup; if none, any latest visit.
    let primaryScore = null, primaryScoreTool = null, primaryScoreDate = null;
    const candidates = Object.entries(latestByTool)
      .filter(([tool]) => TOOL_TO_GROUP[tool] === primaryGroup);
    const pickFrom = candidates.length ? candidates : Object.entries(latestByTool);
    pickFrom.sort((a,b) => String(b[1].Visit_Date).localeCompare(String(a[1].Visit_Date)));
    if (pickFrom.length) {
      const [tool, v] = pickFrom[0];
      primaryScoreTool = tool;
      primaryScoreDate = v.Visit_Date;
      const numScore = Number(v.Score);
      primaryScore = isNaN(numScore) ? null : numScore;
    }

    // ── Last psych review date ─────────────────────────────────
    // = max of: stored Last_Psych_Consult_Date, any visit logged by a psychiatrist
    // Brigade visits (any therapist entry during a brigade) are also counted
    // if the visit was logged by a team member with role=psychiatrist.
    const psychNames = new Set(
      (typeof STATE !== 'undefined' && STATE.team ? STATE.team : [])
        .filter(tm => tm.role === 'psychiatrist')
        .map(tm => tm.name.trim().toLowerCase())
    );
    const psychVisitDates = visits
      .filter(v => v.Therapist && psychNames.has(String(v.Therapist).trim().toLowerCase()))
      .map(v => v.Visit_Date)
      .filter(Boolean);
    const allPsychDates = [
      p.Last_Psych_Consult_Date,
      ...psychVisitDates,
    ].filter(Boolean).sort();
    const _lastPsychDate = allPsychDates.length ? allPsychDates[allPsychDates.length - 1] : '';

    return {
      ...p,
      _visits: visits,
      _latestByTool: latestByTool,
      _tier: worstTier,
      _tierTool: worstTool,
      _tierScore: worstScore,
      _toolScores: toolScores,
      _lastVisitDate: lastVisitDate,
      _lastPsychDate,
      _daysSinceLastVisit: lastVisitDate ? daysBetween(lastVisitDate, todayISO()) : 9999,
      _safetyActive: isTruthyFlag(p.Safety_Flag) && !p.Safety_Flag_Ack_At,
      _primaryCondition: primaryCondition,
      _primaryGroup: primaryGroup,
      _primaryNeedsVerify: needsVerify,
      _primaryScore: primaryScore,
      _primaryScoreTool: primaryScoreTool,
      _primaryScoreDate: primaryScoreDate,
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

// ════════════════════════════════════════════════════════════════
// DEMO TEST DATA  (used when dataset toggle set to 'test' and no sheet configured)
// 20 synthetic patients, 5 per condition (depression, anxiety, adhd, mdd_gad),
// 3-6 visits each, realistic trajectories, 3 safety-flagged, ≥3 not-improving.
// ════════════════════════════════════════════════════════════════
const DEMO_TEST_DATA = {"Pacientes":[{"Patient_ID":"CCM-0100","Patient_Name":"Camila Gómez Rivera","Initials":"CGR","DOB":"2016-10-09","Age":"9","Sex":"F","Therapist":"Eylin Ramos","Conditions":"depression","Tools":"SMFQ-C,PHQ-A","Enrollment_Date":"2025-08-08","Status":"Activo","Priority":"","Safety_Flag":"TRUE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic — ideación pasiva monitoreo","Created_By":"test-seed","Created_At":"2025-08-08","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0101","Patient_Name":"Camila Cruz Cartagena","Initials":"CCC","DOB":"2010-11-20","Age":"15","Sex":"F","Therapist":"Eylin Ramos","Conditions":"depression","Tools":"SMFQ-C,PHQ-A","Enrollment_Date":"2025-11-05","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-11-05","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0102","Patient_Name":"Bryan Martínez Maldonado","Initials":"BMM","DOB":"2014-11-09","Age":"12","Sex":"M","Therapist":"Karelia Marquez","Conditions":"depression","Tools":"SMFQ-C,PHQ-A","Enrollment_Date":"2026-01-02","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2026-01-02","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0103","Patient_Name":"Valentina Sánchez Maradiaga","Initials":"VSM","DOB":"2014-06-07","Age":"11","Sex":"F","Therapist":"Karelia Marquez","Conditions":"depression","Tools":"SMFQ-C,PHQ-A","Enrollment_Date":"2025-11-08","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-11-08","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0104","Patient_Name":"Diego Gómez Bonilla","Initials":"DGB","DOB":"2010-07-20","Age":"15","Sex":"M","Therapist":"Karelia Marquez","Conditions":"depression","Tools":"SMFQ-C,PHQ-A","Enrollment_Date":"2025-12-05","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-12-05","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0105","Patient_Name":"Carlos Reyes Rivera","Initials":"CRR","DOB":"2009-03-12","Age":"17","Sex":"M","Therapist":"Eylin Ramos","Conditions":"anxiety","Tools":"GAD-7,SCARED-N","Enrollment_Date":"2026-03-28","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2026-03-28","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0106","Patient_Name":"Alejandra Rodríguez Fuentes","Initials":"ARF","DOB":"2008-03-05","Age":"17","Sex":"F","Therapist":"Eylin Ramos","Conditions":"anxiety","Tools":"GAD-7,SCARED-N","Enrollment_Date":"2025-10-01","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-10-01","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0107","Patient_Name":"Yeison Flores Maradiaga","Initials":"YFM","DOB":"2008-10-18","Age":"17","Sex":"M","Therapist":"Eylin Ramos","Conditions":"anxiety","Tools":"GAD-7,SCARED-N","Enrollment_Date":"2025-11-17","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-11-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0108","Patient_Name":"Ana Mejía Bonilla","Initials":"AMB","DOB":"2014-04-04","Age":"12","Sex":"F","Therapist":"Eylin Ramos","Conditions":"anxiety","Tools":"GAD-7,SCARED-N","Enrollment_Date":"2026-01-23","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2026-01-23","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0109","Patient_Name":"Daniela Aguilar Rivera","Initials":"DAR","DOB":"2010-08-08","Age":"15","Sex":"F","Therapist":"Eylin Ramos","Conditions":"anxiety","Tools":"GAD-7,SCARED-N","Enrollment_Date":"2025-09-14","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-09-14","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0110","Patient_Name":"Ana Ramírez Paz","Initials":"ARP","DOB":"2009-01-13","Age":"16","Sex":"F","Therapist":"Eylin Ramos","Conditions":"adhd","Tools":"Vanderbilt-Parent,Vanderbilt-Teacher","Enrollment_Date":"2025-09-02","Status":"Activo","Priority":"","Safety_Flag":"TRUE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic — ideación pasiva monitoreo","Created_By":"test-seed","Created_At":"2025-09-02","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0111","Patient_Name":"Wilmer Ramírez Ortega","Initials":"WRO","DOB":"2013-03-03","Age":"13","Sex":"M","Therapist":"Karelia Marquez","Conditions":"adhd","Tools":"Vanderbilt-Parent,Vanderbilt-Teacher","Enrollment_Date":"2026-03-24","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2026-03-24","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0112","Patient_Name":"Camila Flores Vásquez","Initials":"CFV","DOB":"2013-11-21","Age":"12","Sex":"F","Therapist":"Eylin Ramos","Conditions":"adhd","Tools":"Vanderbilt-Parent,Vanderbilt-Teacher","Enrollment_Date":"2025-06-19","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-06-19","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0113","Patient_Name":"Ángel Flores Vásquez","Initials":"ÁFV","DOB":"2009-12-10","Age":"16","Sex":"M","Therapist":"Eylin Ramos","Conditions":"adhd","Tools":"Vanderbilt-Parent,Vanderbilt-Teacher","Enrollment_Date":"2025-09-01","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-09-01","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0114","Patient_Name":"Heidy Gómez Pineda","Initials":"HGP","DOB":"2009-11-14","Age":"17","Sex":"F","Therapist":"Eylin Ramos","Conditions":"adhd","Tools":"Vanderbilt-Parent,Vanderbilt-Teacher","Enrollment_Date":"2026-03-04","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2026-03-04","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0115","Patient_Name":"Luis Reyes Pineda","Initials":"LRP","DOB":"2016-06-07","Age":"9","Sex":"M","Therapist":"Eylin Ramos","Conditions":"mdd_gad","Tools":"PHQ-A,GAD-7","Enrollment_Date":"2025-08-25","Status":"Activo","Priority":"","Safety_Flag":"TRUE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic — ideación pasiva monitoreo","Created_By":"test-seed","Created_At":"2025-08-25","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0116","Patient_Name":"Elvin Gómez Velásquez","Initials":"EGV","DOB":"2008-01-28","Age":"17","Sex":"M","Therapist":"Eylin Ramos","Conditions":"mdd_gad","Tools":"PHQ-A,GAD-7","Enrollment_Date":"2025-12-20","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-12-20","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0117","Patient_Name":"Diego Aguilar Maldonado","Initials":"DAM","DOB":"2014-10-09","Age":"12","Sex":"M","Therapist":"Eylin Ramos","Conditions":"mdd_gad","Tools":"PHQ-A,GAD-7","Enrollment_Date":"2026-02-12","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2026-02-12","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0118","Patient_Name":"Keyla Cruz Cartagena","Initials":"KCC","DOB":"2015-06-20","Age":"10","Sex":"F","Therapist":"Karelia Marquez","Conditions":"mdd_gad","Tools":"PHQ-A,GAD-7","Enrollment_Date":"2025-09-12","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-09-12","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Patient_ID":"CCM-0119","Patient_Name":"Diego Reyes Maradiaga","Initials":"DRM","DOB":"2015-10-21","Age":"10","Sex":"M","Therapist":"Karelia Marquez","Conditions":"mdd_gad","Tools":"PHQ-A,GAD-7","Enrollment_Date":"2025-11-17","Status":"Activo","Priority":"","Safety_Flag":"FALSE","Safety_Flag_Ack_By":"","Safety_Flag_Ack_At":"","Notes":"Test data — synthetic","Created_By":"test-seed","Created_At":"2025-11-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"}],"Visitas":[{"Visit_ID":"VT-1001","Patient_ID":"CCM-0100","Visit_Date":"2025-08-08","Therapist":"Eylin Ramos","Tool":"SMFQ-C","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-08-08","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1002","Patient_ID":"CCM-0100","Visit_Date":"2025-09-30","Therapist":"Eylin Ramos","Tool":"SMFQ-C","Score":"13","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"TRUE","Not_Improving_Flag":"FALSE","Visit_Note":"Test — SI+","Created_By":"test-seed","Created_At":"2025-09-30","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1003","Patient_ID":"CCM-0100","Visit_Date":"2025-11-17","Therapist":"Eylin Ramos","Tool":"SMFQ-C","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-11-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1004","Patient_ID":"CCM-0101","Visit_Date":"2025-11-05","Therapist":"Eylin Ramos","Tool":"SMFQ-C","Score":"18","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-11-05","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1005","Patient_ID":"CCM-0101","Visit_Date":"2025-12-22","Therapist":"Eylin Ramos","Tool":"SMFQ-C","Score":"15","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-22","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1006","Patient_ID":"CCM-0101","Visit_Date":"2026-01-29","Therapist":"Eylin Ramos","Tool":"SMFQ-C","Score":"14","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-29","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1007","Patient_ID":"CCM-0102","Visit_Date":"2026-01-02","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-02","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1008","Patient_ID":"CCM-0102","Visit_Date":"2026-03-05","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-05","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1009","Patient_ID":"CCM-0102","Visit_Date":"2026-04-16","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"13","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-04-16","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1010","Patient_ID":"CCM-0103","Visit_Date":"2025-11-08","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-11-08","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1011","Patient_ID":"CCM-0103","Visit_Date":"2026-01-03","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"13","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-03","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1012","Patient_ID":"CCM-0103","Visit_Date":"2026-02-17","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"15","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-02-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1013","Patient_ID":"CCM-0103","Visit_Date":"2026-04-19","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"15","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-04-19","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1014","Patient_ID":"CCM-0104","Visit_Date":"2025-12-05","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-05","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1015","Patient_ID":"CCM-0104","Visit_Date":"2026-02-06","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"12","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-02-06","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1016","Patient_ID":"CCM-0104","Visit_Date":"2026-03-31","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"10","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-31","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1017","Patient_ID":"CCM-0104","Visit_Date":"2026-05-17","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"4","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1018","Patient_ID":"CCM-0104","Visit_Date":"2026-07-02","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"8","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-07-02","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1019","Patient_ID":"CCM-0104","Visit_Date":"2026-08-13","Therapist":"Karelia Marquez","Tool":"SMFQ-C","Score":"1","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-08-13","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1020","Patient_ID":"CCM-0105","Visit_Date":"2026-03-28","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-28","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1021","Patient_ID":"CCM-0105","Visit_Date":"2026-05-26","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"13","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-26","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1022","Patient_ID":"CCM-0105","Visit_Date":"2026-07-20","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"10","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-07-20","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1023","Patient_ID":"CCM-0105","Visit_Date":"2026-09-03","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"7","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-09-03","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1024","Patient_ID":"CCM-0105","Visit_Date":"2026-10-11","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"12","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-10-11","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1025","Patient_ID":"CCM-0106","Visit_Date":"2025-10-01","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-10-01","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1026","Patient_ID":"CCM-0106","Visit_Date":"2025-12-04","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"13","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-04","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1027","Patient_ID":"CCM-0106","Visit_Date":"2026-01-19","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"15","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-19","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1028","Patient_ID":"CCM-0107","Visit_Date":"2025-11-17","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"18","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-11-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1029","Patient_ID":"CCM-0107","Visit_Date":"2026-01-13","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"17","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-13","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1030","Patient_ID":"CCM-0107","Visit_Date":"2026-02-26","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"18","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-02-26","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1031","Patient_ID":"CCM-0107","Visit_Date":"2026-04-14","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"17","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-04-14","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1032","Patient_ID":"CCM-0108","Visit_Date":"2026-01-23","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-23","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1033","Patient_ID":"CCM-0108","Visit_Date":"2026-03-26","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"12","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-26","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1034","Patient_ID":"CCM-0108","Visit_Date":"2026-05-10","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"10","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-10","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1035","Patient_ID":"CCM-0109","Visit_Date":"2025-09-14","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-09-14","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1036","Patient_ID":"CCM-0109","Visit_Date":"2025-10-20","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"13","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-10-20","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1037","Patient_ID":"CCM-0109","Visit_Date":"2025-12-06","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-06","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1038","Patient_ID":"CCM-0110","Visit_Date":"2025-09-02","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"TRUE","Not_Improving_Flag":"FALSE","Visit_Note":"Test — SI+","Created_By":"test-seed","Created_At":"2025-09-02","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1039","Patient_ID":"CCM-0110","Visit_Date":"2025-11-05","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"15","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-11-05","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1040","Patient_ID":"CCM-0110","Visit_Date":"2026-01-03","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-03","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1041","Patient_ID":"CCM-0111","Visit_Date":"2026-03-24","Therapist":"Karelia Marquez","Tool":"Vanderbilt-Parent","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-24","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1042","Patient_ID":"CCM-0111","Visit_Date":"2026-05-04","Therapist":"Karelia Marquez","Tool":"Vanderbilt-Parent","Score":"14","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-04","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1043","Patient_ID":"CCM-0111","Visit_Date":"2026-06-17","Therapist":"Karelia Marquez","Tool":"Vanderbilt-Parent","Score":"8","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-06-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1044","Patient_ID":"CCM-0111","Visit_Date":"2026-07-28","Therapist":"Karelia Marquez","Tool":"Vanderbilt-Parent","Score":"10","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-07-28","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1045","Patient_ID":"CCM-0112","Visit_Date":"2025-06-19","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"12","Baseline_Score":"12","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-06-19","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1046","Patient_ID":"CCM-0112","Visit_Date":"2025-08-06","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"12","Baseline_Score":"12","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-08-06","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1047","Patient_ID":"CCM-0112","Visit_Date":"2025-10-01","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"11","Baseline_Score":"12","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-10-01","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1048","Patient_ID":"CCM-0113","Visit_Date":"2025-09-01","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-09-01","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1049","Patient_ID":"CCM-0113","Visit_Date":"2025-10-23","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"12","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-10-23","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1050","Patient_ID":"CCM-0113","Visit_Date":"2025-12-03","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"8","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-03","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1051","Patient_ID":"CCM-0114","Visit_Date":"2026-03-04","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-04","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1052","Patient_ID":"CCM-0114","Visit_Date":"2026-05-01","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"15","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-01","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1053","Patient_ID":"CCM-0114","Visit_Date":"2026-06-22","Therapist":"Eylin Ramos","Tool":"Vanderbilt-Parent","Score":"14","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-06-22","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1054","Patient_ID":"CCM-0115","Visit_Date":"2025-08-25","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"20","Baseline_Score":"20","Subscale_Scores":"","SI_Positive":"TRUE","Not_Improving_Flag":"FALSE","Visit_Note":"Test — SI+","Created_By":"test-seed","Created_At":"2025-08-25","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1055","Patient_ID":"CCM-0115","Visit_Date":"2025-10-16","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"19","Baseline_Score":"20","Subscale_Scores":"","SI_Positive":"TRUE","Not_Improving_Flag":"FALSE","Visit_Note":"Test — SI+","Created_By":"test-seed","Created_At":"2025-10-16","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1056","Patient_ID":"CCM-0115","Visit_Date":"2025-12-12","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"19","Baseline_Score":"20","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-12","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1057","Patient_ID":"CCM-0115","Visit_Date":"2026-01-29","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"20","Baseline_Score":"20","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-29","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1058","Patient_ID":"CCM-0115","Visit_Date":"2026-03-22","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"20","Baseline_Score":"20","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-22","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1059","Patient_ID":"CCM-0115","Visit_Date":"2026-04-26","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"19","Baseline_Score":"20","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-04-26","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1077","Patient_ID":"CCM-0115","Visit_Date":"2025-08-25","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"15","Baseline_Score":"15","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-08-25","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1078","Patient_ID":"CCM-0115","Visit_Date":"2025-10-16","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"14","Baseline_Score":"15","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-10-16","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1079","Patient_ID":"CCM-0115","Visit_Date":"2025-12-12","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"13","Baseline_Score":"15","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-12","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1080","Patient_ID":"CCM-0115","Visit_Date":"2026-01-29","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"15","Baseline_Score":"15","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-29","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1081","Patient_ID":"CCM-0115","Visit_Date":"2026-03-22","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"14","Baseline_Score":"15","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-22","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1082","Patient_ID":"CCM-0115","Visit_Date":"2026-04-26","Therapist":"Eylin Ramos","Tool":"GAD-7","Score":"13","Baseline_Score":"15","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-04-26","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1060","Patient_ID":"CCM-0116","Visit_Date":"2025-12-20","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-20","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1061","Patient_ID":"CCM-0116","Visit_Date":"2026-02-18","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"17","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-02-18","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1062","Patient_ID":"CCM-0116","Visit_Date":"2026-04-19","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"15","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-04-19","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1063","Patient_ID":"CCM-0116","Visit_Date":"2026-05-29","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"TRUE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-29","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1064","Patient_ID":"CCM-0117","Visit_Date":"2026-02-12","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"16","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-02-12","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1065","Patient_ID":"CCM-0117","Visit_Date":"2026-03-19","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"15","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-03-19","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1066","Patient_ID":"CCM-0117","Visit_Date":"2026-05-14","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"12","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-14","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1067","Patient_ID":"CCM-0117","Visit_Date":"2026-06-24","Therapist":"Eylin Ramos","Tool":"PHQ-A","Score":"13","Baseline_Score":"16","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-06-24","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1068","Patient_ID":"CCM-0118","Visit_Date":"2025-09-12","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"18","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-09-12","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1069","Patient_ID":"CCM-0118","Visit_Date":"2025-10-29","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"17","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-10-29","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1070","Patient_ID":"CCM-0118","Visit_Date":"2025-12-31","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"12","Baseline_Score":"18","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-12-31","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1071","Patient_ID":"CCM-0119","Visit_Date":"2025-11-17","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"14","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2025-11-17","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1072","Patient_ID":"CCM-0119","Visit_Date":"2026-01-13","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"11","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-01-13","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1073","Patient_ID":"CCM-0119","Visit_Date":"2026-02-26","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"8","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-02-26","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1074","Patient_ID":"CCM-0119","Visit_Date":"2026-04-19","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"8","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-04-19","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1075","Patient_ID":"CCM-0119","Visit_Date":"2026-05-28","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"2","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-05-28","Updated_By":"","Updated_At":"","Schema_Version":"1.0"},{"Visit_ID":"VT-1076","Patient_ID":"CCM-0119","Visit_Date":"2026-07-08","Therapist":"Karelia Marquez","Tool":"PHQ-A","Score":"1","Baseline_Score":"14","Subscale_Scores":"","SI_Positive":"FALSE","Not_Improving_Flag":"FALSE","Visit_Note":"Test","Created_By":"test-seed","Created_At":"2026-07-08","Updated_By":"","Updated_At":"","Schema_Version":"1.0"}],"Medicamentos":[{"Med_ID":"MT-0501","Patient_ID":"CCM-0100","Date":"2025-09-30","Medication":"Fluoxetina","Dose":"10 mg","Frequency":"1 vez al día","Action":"Inicio","Prescriber":"Troy Fowler, MD","Reason":"Depresión moderada-severa","Notes":"Test data","Created_By":"test-seed","Created_At":"2025-09-30","Schema_Version":"1.0"},{"Med_ID":"MT-0502","Patient_ID":"CCM-0110","Date":"2025-11-05","Medication":"Metilfenidato","Dose":"10 mg","Frequency":"2 veces al día","Action":"Inicio","Prescriber":"Troy Fowler, MD","Reason":"TDAH","Notes":"Test data","Created_By":"test-seed","Created_At":"2025-11-05","Schema_Version":"1.0"},{"Med_ID":"MT-0503","Patient_ID":"CCM-0111","Date":"2026-05-04","Medication":"Metilfenidato","Dose":"10 mg","Frequency":"2 veces al día","Action":"Inicio","Prescriber":"Troy Fowler, MD","Reason":"TDAH","Notes":"Test data","Created_By":"test-seed","Created_At":"2026-05-04","Schema_Version":"1.0"},{"Med_ID":"MT-0504","Patient_ID":"CCM-0115","Date":"2025-10-16","Medication":"Fluoxetina","Dose":"10 mg","Frequency":"1 vez al día","Action":"Inicio","Prescriber":"Troy Fowler, MD","Reason":"Depresión moderada-severa","Notes":"Test data","Created_By":"test-seed","Created_At":"2025-10-16","Schema_Version":"1.0"}]};
