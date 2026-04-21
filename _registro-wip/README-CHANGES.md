# Registro — Overnight Update (Apr 18)

## What's new

### 1. Streamlining (Tier 1)
- **Quick-add patient form** — only name + age + sex + primary condition + therapist required. "More details" is collapsible.
- **Duplicate detection** — fuzzy name match warns before creating a possible duplicate (normalized, diacritic-stripped, ≥2 shared name parts).
- **Status chips + sort dropdown** on the main registry toolbar.
- **"Due for follow-up" filter** surfaces patients overdue for a visit.
- **Sticky tool per patient** — visit form defaults to the most recently used tool for that patient.
- **Safety-first SI checkbox** at top of visit form for dep/anx/mdd/gad conditions; auto-raises safety flag.
- **Last-visit nudge** on patient page when a visit is overdue.

### 2. Undo toast (10s)
- Destructive actions (delete/archive) show a toast with a 10-second **Undo** button.
- Failed saves show a toast with a **Retry** button.
- Variant colors: error / warn / success / info.

### 3. i18n
- Full dictionary in `registro-i18n.js` with `t()`, `getLang()`, `showToast()` helpers.
- Language label shows **English / Español** (not EN/ES).
- `translateStatus`, `translateTier`, `translateMode`, `translateSex` available site-wide.
- 0 mismatches in HTML `data-es` / `data-en` / placeholder pairs across all 3 HTML files.
- Remaining `lang==='en'?...:...` patterns in JS are legitimate data accessors for Config-sheet condition display names — not hardcoded UI strings.

### 4. Test dataset (separate from production)
- **Toggle:** append `?dataset=test` to the URL, or use the dataset toggle in the toolbar. Choice persists in localStorage.
- **Separate sheets:** `Pacientes_Test`, `Visitas_Test`, `Medicamentos_Test` — Config, Auditoria, Sugerencias are shared.
- **20 synthetic patients** (CCM-0100…CCM-0119): 5 per condition × 4 conditions (depression, anxiety, ADHD, mdd_gad).
- **76 visits** with realistic trajectories:
  - 3 safety-flagged: CCM-0100, CCM-0110, CCM-0115
  - 3 "not improving" (flat) trajectories
  - 2 remission trajectories: CCM-0104, CCM-0119
- **4 meds:** 2 fluoxetine starts (for safety pts), 2 methylphenidate starts (ADHD).
- Switch back to real data with the toggle or `?dataset=real`.

## Walkthrough (morning)
When you're up, open the zip locally and I'll walk through:
1. Creating a new patient (quick-add → more details flow)
2. Logging a visit with the safety-first checkbox
3. The sticky-tool behavior across consecutive visits
4. Triggering and undoing a destructive action
5. Flipping to the test dataset and back
6. Language toggle across the 3 pages

---

# Registro — AIMS-alignment sprint (Apr 18 afternoon)

## What's new

### 5. AIMS-aligned tracking fields
The registry now tracks the four minimum fields your attending asked for:
- **Date entered CoCM** — `Enrolled_On` (already in schema)
- **First + last measurement tool with date** — baseline fields + latest visit (already tracked)
- **Last psychiatric consultant review** — NEW: `Last_Psych_Consult_Date`
- **Last meaningful BHCM / therapist contact** — NEW: `Last_BHCM_Contact_Date` + optional `Last_BHCM_Contact_Note`

**Derived flags (computed automatically):**
- **Review Flag** (`Review_Flag` column) — manually checked on the patient page. Appears as blue `REVISAR` chip on registry.
- **Due for Psych Review** — automatic purple `PSIQ` chip. Triggers when an active patient has >28 days since last psych consult, or has been enrolled >14 days with no consult on file.

### 6. Patient-page CoCM Tracking card
New card between header and visit form:
- Last psych consult — date + "days ago" + **Editar** / **Hoy** buttons
- Last BHCM contact — date + age + optional free-text note + **Editar** / **Hoy** buttons
- Checkbox: "Mark for review at next huddle"

All writes go through the existing `updateRow('Pacientes', ...)` path with optimistic UI, undo toast, and rollback on error.

### 7. Simplified Mode + Display Preferences
**Problem:** Therapists new to CoCM can be overwhelmed by the full column set.

**Solution:** A new section in the **Configurar** modal lets the user hide advanced columns. Data is always saved — only the view changes.

**Master toggle:** `Modo simplificado` hides: Δ vs baseline, sparkline trend, conditions column, enrollment date, baseline score.

**Always visible (cannot be hidden):** therapist, patient, latest score, last visit, safety flags.

**Individual toggles (9 total):** psych consult column, BHCM contact column, review flag chips, enrollment date, baseline on main, sparkline, Δ column, conditions column, auto due-for-review flag.

All preferences persist in `localStorage`.

### 8. Missing-data rendering
Every new field renders `—` (em-dash) when missing — no `NaN`, no `undefined`, no blank cells. Tested with fully-empty patient and with partial data.

## ⚠️ ACTION REQUIRED — Add columns to your Google Sheet

Before using the AIMS tracking in production, add these **7 columns** to the `Pacientes` sheet (and `Pacientes_Test` if you use the test dataset):

| Column Header | Type | Notes |
|---|---|---|
| `Last_Psych_Consult_Date` | Date (YYYY-MM-DD) | When psych consultant last reviewed this case |
| `Last_BHCM_Contact_Date` | Date (YYYY-MM-DD) | Last meaningful therapist contact (any modality) |
| `Last_BHCM_Contact_Note` | Text | Optional one-line summary |
| `Review_Flag` | Boolean (`TRUE`/`FALSE` or blank) | Flag for next huddle |
| `Baseline_Tool` | Text (e.g. PHQ-A) | First measurement tool used |
| `Baseline_Score` | Number | First score |
| `Baseline_Date` | Date (YYYY-MM-DD) | Date of first measurement |

**How to add:** Open the Pacientes sheet → add headers in the next empty columns → save. Apps Script's `updateRow` reads headers dynamically, so no Apps Script changes are needed. The dashboard will leave cells blank until you populate them.

If you skip this step, writes from the new CoCM Tracking card will still attempt the update but may be silently dropped by Apps Script. Add the columns first.

## Walkthrough (AIMS sprint additions)
1. Open **Configurar** → scroll to "Preferencias de visualización" → flip **Modo simplificado** on and off to demo.
2. Open a patient → scroll to **Seguimiento CoCM** card → click **Hoy** next to psych consult → watch undo toast.
3. Back to registry → patient with stale consult now shows purple `PSIQ` chip.
