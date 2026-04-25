// @version 495077a
/* ============================================================
   CoCM Camasca — shared i18n helper
   Exposes: t(key, vars) and getLang().
   Both registro-app.js and registro-paciente.js include this first.
   ============================================================ */

const REG_I18N = {
  // ── tier labels ────────────────────────────────────────────
  tier_severa:    { es: 'Severa',     en: 'Severe' },
  tier_moderada:  { es: 'Moderada',   en: 'Moderate' },
  tier_leve:      { es: 'Leve',       en: 'Mild' },
  tier_remision:  { es: 'Remisión',   en: 'Remission' },
  tier_sin_datos: { es: 'Sin datos',  en: 'No data' },

  // ── stat cards ─────────────────────────────────────────────
  stat_patients:      { es: 'Pacientes',             en: 'Patients' },
  stat_active:        { es: 'Pacientes activos',     en: 'Active patients' },
  stat_severa:        { es: 'En severa',             en: 'In severe' },
  stat_moderada:      { es: 'En moderada',           en: 'In moderate' },
  stat_sev_mod:       { es: 'Severa / Moderada',     en: 'Severe / Moderate' },
  stat_leve:          { es: 'En leve',               en: 'In mild' },
  stat_remision:      { es: 'En remisión',           en: 'In remission' },
  stat_sin_datos:     { es: 'Sin datos',             en: 'No data' },
  stat_safety:        { es: 'Banderas de seguridad', en: 'Safety flags' },
  stat_not_improving: { es: 'No mejorando',          en: 'Not improving' },
  stat_stale:         { es: 'Vencidos (visita)',     en: 'Lapsed visits' },
  stat_due_followup:  { es: 'Por seguimiento',       en: 'Due for follow-up' },

  // ── table headers ──────────────────────────────────────────
  th_paciente:      { es: 'Paciente',        en: 'Patient' },
  th_therapist:     { es: 'Terapeuta',       en: 'Therapist' },
  th_condition:     { es: 'Condición',       en: 'Condition' },
  th_conditions:    { es: 'Condiciones',     en: 'Conditions' },
  th_tool:          { es: 'Herramienta',     en: 'Tool' },
  th_latest_score:  { es: 'Última<br>medición',        en: 'Latest<br>score' },
  th_baseline:      { es: 'Base',            en: 'Baseline' },
  th_last_visit:    { es: 'Última<br>visita',           en: 'Last<br>visit' },
  th_status:        { es: 'Estado',          en: 'Status' },
  th_flags:         { es: 'Banderas',        en: 'Flags' },
  th_actions:       { es: 'Acciones',        en: 'Actions' },
  th_trend:         { es: 'Tendencia',       en: 'Trend' },
  th_delta:         { es: 'Δ vs.<br>base',             en: 'Δ vs.<br>baseline' },
  th_last_psych:    { es: 'Última revisión<br>psiq.', en: 'Last psych<br>review' },
  th_last_contact:  { es: 'Último contacto<br>terapeuta', en: 'Last therapist<br>contact' },
  th_review:        { es: 'Revisar',                en: 'Review' },
  th_enrolled:      { es: 'Ingresó',               en: 'Enrolled' },
  th_baseline_on_main: { es: 'Base',             en: 'Baseline' },

  // ── generic UI ─────────────────────────────────────────────
  empty_state:      { es: 'Sin pacientes que mostrar.',         en: 'No patients to show.' },
  empty_filters:    { es: 'No hay pacientes que coincidan con los filtros.', en: 'No patients match the current filters.' },
  no_visits:        { es: 'Sin visitas aún.',                    en: 'No visits yet.' },
  no_suggestions:   { es: 'Sin sugerencias aún.',                en: 'No suggestions yet.' },
  no_meds:          { es: 'Sin eventos de medicamentos.',        en: 'No medication events.' },
  loading:          { es: 'Cargando…',                           en: 'Loading…' },
  saving:           { es: 'Guardando…',                          en: 'Saving…' },
  visits:           { es: 'visitas',                              en: 'visits' },
  events:           { es: 'eventos',                              en: 'events' },
  event_singular:   { es: 'evento',                               en: 'event' },
  visit_singular:   { es: 'visita',                               en: 'visit' },
  baseline_short:   { es: 'base',                                 en: 'baseline' },
  baseline_long:    { es: 'basal',                                en: 'baseline' },
  years_suffix:     { es: 'a',                                    en: 'y' }, // "13a" / "13y"
  days_ago:         { es: 'hace {n} días',                        en: '{n} days ago' },
  days_short:       { es: '{n}d',                                 en: '{n}d' },
  days_future:      { es: 'en {n}d',                              en: 'in {n}d' },
  today:            { es: 'hoy',                                  en: 'today' },
  yesterday:        { es: 'ayer',                                 en: 'yesterday' },

  // ── flags / actions ────────────────────────────────────────
  flag_safety:      { es: 'SEGURIDAD',           en: 'SAFETY' },
  flag_brigade_short:  { es: 'BRIGADA',             en: 'BRIGADE' },
  flag_brigade_tip:    { es: 'A ver en la próxima brigada', en: 'To be seen by next brigade' },
  brigade_banner_title:{ es: 'Marcado para la próxima brigada', en: 'Flagged for next brigade' },
  safety_pinned:    { es: 'SEGURIDAD — FIJADOS', en: 'SAFETY — PINNED' },
  flag_not_improv:  { es: 'No mejora',           en: 'Not improving' },
  flag_stuck:       { es: 'Sin visita reciente', en: 'No recent visit' },
  flag_stale:       { es: 'Atrasado',            en: 'Stale' },
  flag_lapsed:      { es: 'VENCIDO',             en: 'LAPSED' },
  flag_lapsed_tooltip_active: { es: 'Sin visita > 8 semanas', en: 'No visit > 8 weeks' },
  flag_lapsed_tooltip_stable: { es: 'Sin visita > 16 semanas', en: 'No visit > 16 weeks' },
  flag_review:      { es: 'Marcado para revisión', en: 'Flagged for review' },
  flag_due_psych:   { es: 'Consulta psiq. hace > 8 semanas', en: 'Psych review > 8 weeks ago' },
  flag_due_psych_stable: { es: 'Consulta psiq. hace > 16 semanas', en: 'Psych review > 16 weeks ago' },
  flag_review_short: { es: 'REVISAR',            en: 'REVIEW' },
  flag_due_psych_short: { es: 'Ψ VENCIDO',       en: 'Ψ OVERDUE' },
  flag_suggest_stable:       { es: 'SUGERIR ESTABLE',       en: 'SUGGEST STABLE' },
  flag_suggest_stable_tooltip: { es: '3 visitas consecutivas con puntajes mínimos (≥8 sem entre sí). Considere promover a Estable.', en: '3 consecutive visits with minimal scores (≥8 wk apart). Consider promoting to Stable.' },
  flag_confirm_stable:       { es: '¿SIGUE ESTABLE?',       en: 'STILL STABLE?' },
  flag_confirm_stable_tooltip: { es: 'Paciente estable sin contacto > 16 semanas. Confirme que sigue estable o regrese a Activo.', en: 'Stable patient with no contact > 16 weeks. Confirm still stable or return to Active.' },
  flag_needs_baseline:       { es: 'FALTA BASAL',            en: 'NEEDS BASELINE' },
  flag_needs_baseline_tooltip: { es: 'Sin puntajes psicométricos registrados. Obtener medición basal.', en: 'No psychometric scores recorded. Collect a baseline measurement.' },
  flag_needs_baseline_banner: { es: 'Este paciente no tiene puntajes psicométricos registrados. Considere obtener una medición basal (PHQ-A, GAD-7, SMFQ-C, etc.) para establecer el punto de partida.', en: 'This patient has no psychometric scores recorded. Consider collecting a baseline measurement (PHQ-A, GAD-7, SMFQ-C, etc.) to establish a starting point.' },
  flag_needs_update:         { es: 'ACTUALIZAR PUNTAJE',    en: 'UPDATE SCORE' },
  flag_needs_update_tooltip: { es: 'Último puntaje > 4 semanas. Considere re-administrar una medición.', en: 'Last score > 4 weeks old. Consider re-administering a measurement.' },
  flag_needs_update_banner:  { es: 'El último puntaje psicométrico tiene más de 4 semanas. Considere re-administrar la herramienta de monitoreo para seguir la respuesta al tratamiento.', en: 'The last psychometric score is more than 4 weeks old. Consider re-administering the monitoring tool to track treatment response.' },
  action_view:      { es: 'Ver',                  en: 'View' },
  action_log_visit: { es: 'Registrar visita',    en: 'Log visit' },
  action_ack:       { es: 'Reconocer',            en: 'Acknowledge' },
  action_save:      { es: 'Guardar',              en: 'Save' },
  action_cancel:    { es: 'Cancelar',             en: 'Cancel' },
  action_add_med:   { es: 'Agregar medicamento', en: 'Add medication' },
  action_add_visit: { es: '+ Registrar visita',  en: '+ Log visit' },
  action_add_med2:  { es: '+ Medicamento',        en: '+ Medication' },
  action_raise_safety: { es: 'Marcar bandera de seguridad', en: 'Raise safety flag' },
  action_change_status: { es: 'Cambiar estado', en: 'Change status' },
  action_undo:      { es: 'Deshacer',             en: 'Undo' },
  action_retry:     { es: 'Reintentar',           en: 'Retry' },
  action_view_below: { es: 'Ver abajo',           en: 'View below' },
  action_move_low:  { es: 'Mover a Prioridad Baja', en: 'Move to Low Priority' },
  action_new_patient: { es: '+ Paciente nuevo',   en: '+ New patient' },
  action_quick_add: { es: 'Guardar rápido',       en: 'Quick save' },
  action_save_and_visit: { es: 'Guardar y registrar visita', en: 'Save and log visit' },

  // ── safety banner / modal ──────────────────────────────────
  safety_banner_title: { es: 'Pacientes con bandera de seguridad activa:', en: 'Patients with active safety flag:' },
  safety_active: { es: 'Bandera de seguridad activa', en: 'Active safety flag' },
  safety_reason_prompt: { es: '¿Motivo de la bandera?', en: 'Reason for safety flag?' },
  safety_confirm_ack:   { es: '¿Reconocer bandera de seguridad?', en: 'Acknowledge safety flag for this patient?' },
  safety_section_first: { es: 'Evaluación de seguridad', en: 'Safety screening' },
  safety_concern_title: { es: 'Preocupación de seguridad', en: 'Safety concern' },
  safety_si_prompt: { es: 'Evaluar ideación suicida/autolesión en esta visita', en: 'Assess suicidal ideation / self-harm this visit' },

  // ── messages in recommendation card ───────────────────────
  not_improving_msg: {
    es: '{tool}: {first}→{last} en {weeks} semanas (<50% reducción). Considere revisión de caso o intensificación de tratamiento.',
    en: '{tool}: {first}→{last} over {weeks} weeks (<50% reduction). Consider case review or treatment intensification.'
  },
  remission_msg: {
    es: 'Dos puntajes consecutivos de {tool} bajo umbral de remisión. Considere mover a Prioridad Baja.',
    en: 'Two consecutive {tool} scores below remission threshold. Consider moving to Low Priority.'
  },
  stuck_msg: {
    es: 'Sin visita hace {days} días. Considere contactar o reprogramar.',
    en: 'No visit for {days} days. Consider outreach or rescheduling.'
  },
  safety_prompt_body: {
    es: 'Preocupación de seguridad marcada. Revise evaluación de ideación suicida/autolesión y documente plan antes de reconocer.',
    en: 'Safety concern flagged. Review suicidal ideation / self-harm assessment and document plan before acknowledging.'
  },

  // ── data modes ─────────────────────────────────────────────
  mode_demo:       { es: 'Modo demo (sin datos reales)', en: 'Demo mode (no real data)' },
  mode_appsscript: { es: 'Apps Script',                  en: 'Apps Script' },
  mode_csv:        { es: 'CSV publicado',                en: 'Published CSV' },
  mode_configuring: { es: 'Configurando…',                en: 'Configuring…' },

  // ── dataset toggle ─────────────────────────────────────────
  dataset_real:  { es: 'Pacientes reales',  en: 'Real patients' },
  dataset_test:  { es: 'Datos de prueba',   en: 'Test data' },
  dataset_label: { es: 'Conjunto',          en: 'Dataset' },
  dataset_test_banner: {
    es: 'Viendo datos de prueba sintéticos. Los cambios se guardan en Pacientes_Test, no afectan pacientes reales.',
    en: 'Viewing synthetic test data. Changes save to Pacientes_Test and do not affect real patients.'
  },

  // ── queue / sync / errors ──────────────────────────────────
  queued_local:        { es: 'Guardado en cola local.',           en: 'Queued locally.' },
  queued_pending:      { es: 'En cola — se sincronizará al conectar Apps Script.', en: 'Queued — will sync when Apps Script is connected.' },
  saved_local_pending: { es: 'Guardado localmente — se sincronizará al conectar Apps Script.', en: 'Saved locally — will sync when Apps Script is connected.' },
  saved:               { es: 'Guardado.',                          en: 'Saved.' },
  saved_patient:       { es: 'Paciente guardado: {name}',          en: 'Patient saved: {name}' },
  saved_visit:         { es: 'Visita guardada.',                   en: 'Visit saved.' },
  saved_med:           { es: 'Medicamento guardado.',              en: 'Medication saved.' },
  conn_lost:           { es: 'Conexión perdida — sus datos están guardados localmente.', en: 'Connection lost — your data is saved locally.' },
  generic_error:       { es: 'Ocurrió un error: {msg}',            en: 'An error occurred: {msg}' },
  err_required_name:   { es: 'Ingrese un nombre.',                 en: 'Please enter a name.' },
  err_name_required:   { es: 'El nombre es obligatorio.',          en: 'Name is required.' },
  err_tool_score_req:  { es: 'Herramienta y puntaje son obligatorios.', en: 'Tool and score are required.' },
  err_med_required:    { es: 'Medicamento es obligatorio.',        en: 'Medication is required.' },
  err_score_range:     { es: 'Puntaje fuera de rango para {tool}.', en: 'Score out of range for {tool}.' },

  // ── duplicate warning ──────────────────────────────────────
  dup_warn_title: { es: 'Posible duplicado', en: 'Possible duplicate' },
  dup_warn_body:  { es: 'Ya existe un paciente con nombre similar:', en: 'A patient with a similar name already exists:' },
  dup_continue:   { es: 'Es un paciente diferente, continuar',  en: 'Different patient, continue' },
  dup_cancel:     { es: 'Cancelar y revisar',                    en: 'Cancel and review' },

  // ── form labels ────────────────────────────────────────────
  label_full_name:   { es: 'Nombre completo',       en: 'Full name' },
  label_initials:    { es: 'Iniciales',             en: 'Initials' },
  label_dob:         { es: 'Fecha de nacimiento',   en: 'Date of birth' },
  label_age:         { es: 'Edad',                  en: 'Age' },
  label_sex:         { es: 'Sexo',                  en: 'Sex' },
  label_therapist:   { es: 'Terapeuta',             en: 'Therapist' },
  label_enrollment:  { es: 'Fecha de ingreso',      en: 'Enrollment date' },
  label_conditions:  { es: 'Condiciones',           en: 'Conditions' },
  label_primary_cond: { es: 'Condición principal',  en: 'Primary condition' },
  label_tools:       { es: 'Herramientas de monitoreo', en: 'Monitoring tools' },
  label_score:       { es: 'Puntaje',               en: 'Score' },
  label_date:        { es: 'Fecha',                 en: 'Date' },
  label_tool:        { es: 'Herramienta',           en: 'Tool' },
  label_visit_note:  { es: 'Nota de visita',        en: 'Visit note' },
  label_note:        { es: 'Nota',                  en: 'Note' },
  label_si_positive: { es: '¿IS positiva?',         en: 'SI positive?' },
  label_not_improv:  { es: '¿No mejora?',           en: 'Not improving?' },
  label_medication:  { es: 'Medicamento',           en: 'Medication' },
  label_dose:        { es: 'Dosis',                 en: 'Dose' },
  label_frequency:   { es: 'Frecuencia',            en: 'Frequency' },
  label_action:      { es: 'Acción',                en: 'Action' },
  label_prescriber:  { es: 'Prescriptor',           en: 'Prescriber' },
  label_reason:      { es: 'Motivo',                en: 'Reason' },
  label_notes:       { es: 'Notas',                 en: 'Notes' },
  label_yes:         { es: 'Sí',                    en: 'Yes' },
  label_no:          { es: 'No',                    en: 'No' },
  label_other:       { es: 'Otro',                  en: 'Other' },
  label_full_name_ph: { es: 'Dr. Jane Doe',         en: 'Dr. Jane Doe' },
  label_subscales:   { es: 'Subescalas (JSON, opcional)', en: 'Subscales (JSON, optional)' },
  label_optional:    { es: 'opcional',              en: 'optional' },
  label_required:    { es: 'obligatorio',           en: 'required' },
  label_add_details: { es: 'Agregar más detalles',  en: 'Add more details' },

  // ── sex values ─────────────────────────────────────────────
  sex_f: { es: 'Femenino',  en: 'Female' },
  sex_m: { es: 'Masculino', en: 'Male' },
  sex_o: { es: 'Otro',      en: 'Other' },

  // ── med actions ────────────────────────────────────────────
  med_start:    { es: 'Iniciar',        en: 'Start' },
  med_titrate:  { es: 'Titular',        en: 'Titrate' },
  med_increase: { es: 'Aumentar',       en: 'Increase' },
  med_decrease: { es: 'Disminuir',      en: 'Decrease' },
  med_continue: { es: 'Continuar',      en: 'Continue' },
  med_hold:     { es: 'Suspender temp.', en: 'Hold' },
  med_stop:     { es: 'Descontinuar',   en: 'Stop' },

  // Historic med action values stored in sheet (Spanish). Translate on display.
  med_action_inicio:       { es: 'Inicio',             en: 'Start' },
  med_action_iniciar:      { es: 'Iniciar',            en: 'Start' },
  med_action_ajuste:       { es: 'Ajuste',             en: 'Adjust' },
  med_action_titular:      { es: 'Titular',            en: 'Titrate' },
  med_action_titulacion:   { es: 'Titulación',         en: 'Titration' },
  med_action_continuar:    { es: 'Continuar',          en: 'Continue' },
  med_action_continuacion: { es: 'Continuación',       en: 'Continue' },
  med_action_suspension:   { es: 'Suspensión',         en: 'Hold' },
  med_action_suspender:    { es: 'Suspender',          en: 'Hold' },
  med_action_hold:         { es: 'Suspender temp.',    en: 'Hold' },
  med_action_stop:         { es: 'Descontinuar',       en: 'Stop' },
  med_action_descontinuar: { es: 'Descontinuar',       en: 'Stop' },
  med_action_cambio:       { es: 'Cambio',             en: 'Change' },

  // ── patient detail page ────────────────────────────────────
  pat_missing_id:    { es: 'Falta el parámetro ?id=', en: 'Missing ?id= parameter' },
  pat_not_found:     { es: 'Paciente no encontrado.', en: 'Patient not found.' },
  pat_tools_help:    {
    es: 'Abre la herramienta en el portal CoCM. Al terminar, regrese aquí y use «+ Registrar visita» para ingresar el puntaje.',
    en: 'Opens the tool on the CoCM portal. When finished, return here and use «+ Log visit» to enter the score.'
  },
  pat_recent: { es: 'Visto hace {days} días', en: 'Seen {days} days ago' },
  pat_never: { es: 'Primera visita pendiente', en: 'First visit pending' },
  pat_last_used_tool: { es: 'Última herramienta usada: {tool}', en: 'Last tool used: {tool}' },
  pat_change_tool: { es: 'cambiar',            en: 'change' },
  pat_complete_tool: { es: 'Completar herramienta', en: 'Complete a tool' },
  pat_trends_by_tool: { es: 'Tendencias por herramienta', en: 'Trends by tool' },
  pat_visit_history: { es: 'Historial de visitas', en: 'Visit history' },
  visit_score_history: { es: 'Historial de visitas / puntajes', en: 'Visit / Score history' },
  score_col_label:     { es: 'Puntaje', en: 'Score' },
  pat_med_history: { es: 'Historial de medicamentos', en: 'Medication history' },
  pat_recommendations: { es: 'Recomendaciones', en: 'Recommendations' },
  pat_dob: { es: 'FdN',       en: 'DOB' },
  pat_enrolled: { es: 'Ingreso', en: 'Enrolled' },
  pat_back: { es: 'Registro',  en: 'Registry' },

  // ── filters / toolbar ──────────────────────────────────────
  filter_all_therapists: { es: 'Todos los terapeutas', en: 'All therapists' },
  filter_all_conditions: { es: 'Todas las condiciones', en: 'All conditions' },
  filter_all: { es: 'Todos', en: 'All' },
  filter_active: { es: 'Activos', en: 'Active' },
  filter_search_ph: { es: 'Buscar paciente…', en: 'Search patient…' },
  filter_sort: { es: 'Ordenar', en: 'Sort' },
  sort_last_visit_desc: { es: 'Más atrasados', en: 'Most overdue' },
  sort_severity: { es: 'Severidad', en: 'Severity' },
  sort_name: { es: 'Nombre', en: 'Name' },
  sort_recent: { es: 'Visita más reciente', en: 'Most recent visit' },

  // ── status ─────────────────────────────────────────────────
  status_activo:     { es: 'Terapia + CoCM',        en: 'Therapy + CoCM' },
  status_estable:    { es: 'Estable; ↓ frec. CoCM', en: 'Stable; ↓ CoCM frequency' },
  status_baja:       { es: 'Prioridad Baja',        en: 'Low Priority' },
  status_inactivo:   { es: 'Solo terapia',          en: 'Therapy only' },
  status_transfer:   { es: 'Transferido',           en: 'Transferred' },
  status_otro:       { es: 'Otro',                  en: 'Other' },
  status_safety:     { es: '⚠ Con bandera de seguridad', en: '⚠ Safety flag' },
  status_not_improving: { es: 'No mejora',          en: 'Not improving' },
  status_due_followup: { es: 'Por seguimiento',     en: 'Due for follow-up' },

  // ── how-to card ───────────────────────────────────────────
  howto_title: { es: '¿Cómo uso esta página?', en: 'How do I use this page?' },
  howto_registry_body: {
    es: '<details class="howto-sub" open><summary>👤 Identifícate primero <span class="howto-chevron">▾</span></summary><ul><li>Busca tu nombre en el menú desplegable <strong>arriba a la izquierda</strong>. Si no aparece, haz clic en <strong>«+ Agregarme»</strong>, escribe tu nombre, selecciona tu rol (Terapeuta / Psiquiatra) y guarda.</li><li>Tu nombre se usa como autor en visitas, notas y medicamentos. Siempre selecciónalo al inicio de cada sesión.</li></ul></details><details class="howto-sub"><summary>🗂 Leer el registro <span class="howto-chevron">▾</span></summary><ul><li>Cada fila es un paciente. Haz clic en cualquier fila para abrir su ficha completa.</li><li>Las columnas muestran: terapeuta, nombre, cambio de puntaje vs basal (Δ), última visita, último contacto del terapeuta, última revisión psiquiátrica y banderas.</li><li>Pacientes con <strong>⚠ bandera de seguridad activa</strong> aparecen fijados en la parte superior con borde rojo.</li><li>El encabezado de cada columna se puede hacer clic para ordenar — la flecha ▲/▼ indica el orden activo.</li><li>Usa la <strong>barra de búsqueda</strong> (izquierda) para encontrar por nombre o ID (ej: CCM-0001).</li><li>Filtra por terapeuta, condición primaria o estado con los menús desplegables.</li><li>Los chips de estado filtran rápido: <strong>Activo · Todos · ⚠ Seguridad · Por seguimiento · Estable · Inactivo · Transferido</strong>.</li><li>El botón <strong>«Por condición»</strong> agrupa la lista en secciones por condición primaria. Por defecto todos los pacientes están en una sola lista plana ordenada por nombre.</li></ul></details><details class="howto-sub"><summary>➕ Agregar paciente nuevo <span class="howto-chevron">▾</span></summary><ul><li>Haz clic en <strong>«+ Paciente nuevo»</strong> en la barra superior.</li><li>Solo el nombre es obligatorio. Llena fecha de nacimiento, sexo y terapeuta si los tienes.</li><li>Haz clic en <strong>«▾ Agregar detalles»</strong> para ver más campos: condiciones, herramientas de monitoreo, puntajes basales, medicamentos iniciales y teléfono del cuidador.</li><li>Para condiciones, marca las que apliquen. Si la condición no está en la lista, marca <strong>«Otro»</strong> y escribe el nombre.</li><li>Para herramientas de monitoreo, marca las escalas que usarás con este paciente. Los descriptores debajo de cada nombre indican el problema y el rango de edad.</li><li>Si ya tienes un puntaje basal, haz clic en <strong>«+ Agregar puntaje basal»</strong> — se guardará como visita basal automáticamente.</li><li>El ID (ej: CCM-0034) se asigna automáticamente al guardar.</li></ul></details><details class="howto-sub"><summary>📊 Cuestionarios y herramientas psicométricas <span class="howto-chevron">▾</span></summary><ul><li>Las herramientas de monitoreo se asignan a cada paciente en <strong>Editar paciente → Cuestionarios monitoreados</strong>. Cada herramienta muestra el problema clínico y el rango de edad para guiar la selección.</li><li>Para <strong>registrar un puntaje</strong>: abre la ficha del paciente → <strong>«+ Registrar visita»</strong> → selecciona la herramienta → ingresa fecha y puntaje → guarda. El resultado aparece en el gráfico de tendencias.</li><li>Para <strong>enviar un cuestionario al cuidador o maestro</strong>: en la sección <strong>«Completar herramienta»</strong> de la ficha del paciente, haz clic en el botón <strong>📤</strong> junto a la herramienta. Se copia al portapapeles un mensaje listo para pegar en WhatsApp o correo, con el nombre del paciente y el enlace directo.</li><li>Si el paciente tiene varios cuestionarios con versión para padres/maestros, aparece el botón <strong>«📤 Compartir todos los cuestionarios»</strong> — genera un solo mensaje con todos los enlaces, ideal para enviar de una vez.</li><li>Para <strong>abrir el cuestionario en pantalla</strong> (para llenar en consultorio), haz clic en el nombre de la herramienta. Se abre en una nueva pestaña la versión para clínico.</li></ul></details><details class="howto-sub"><summary>💬 Sugerencias y reportar problema <span class="howto-chevron">▾</span></summary><ul><li>El botón <strong>«💬 Sugerencias»</strong> en la barra superior abre el formulario.</li><li>Categorías: Error · Nueva función · Dato incorrecto · Flujo de trabajo · Contenido/Traducción.</li><li>Prioridad Normal para la mayoría. Alta solo si bloquea el trabajo clínico.</li><li>Puedes adjuntar una captura de pantalla — se guarda automáticamente en Drive.</li><li>Cada envío notifica al equipo técnico por correo.</li></ul></details>',
    en: '<details class="howto-sub" open><summary>👤 Identify yourself first <span class="howto-chevron">▾</span></summary><ul><li>Find your name in the dropdown <strong>at the top left</strong>. If you don\'t appear, click <strong>«+ Add me»</strong>, type your name, select your role (Therapist / Psychiatrist), and save.</li><li>Your name is used as the author on visits, notes, and medications. Always select it at the start of each session.</li></ul></details><details class="howto-sub"><summary>🗂 Reading the registry <span class="howto-chevron">▾</span></summary><ul><li>Each row is a patient. Click any row to open their full chart.</li><li>Columns show: therapist, patient name, score change vs baseline (Δ), last visit, last therapist contact, last psych review, and flags.</li><li>Patients with an active <strong>⚠ safety flag</strong> are pinned at the top with a red left border.</li><li>Click any column header to sort by that column — ▲/▼ indicates the active sort direction.</li><li>Use the <strong>search bar</strong> (left side) to find by name or ID (e.g. CCM-0001).</li><li>Filter by therapist, primary condition, or status using the dropdowns.</li><li>Status chips filter quickly: <strong>Active · All · ⚠ Safety · Due for follow-up · Stable · Inactive · Transferred</strong>.</li><li>The <strong>«By condition»</strong> button groups the list into sections by primary condition. By default all patients are in one flat list sorted by name.</li></ul></details><details class="howto-sub"><summary>➕ Adding a new patient <span class="howto-chevron">▾</span></summary><ul><li>Click <strong>«+ New patient»</strong> in the top toolbar.</li><li>Only the name is required. Fill in date of birth, sex, and therapist if you have them.</li><li>Click <strong>«▾ Add details»</strong> to reveal additional fields: conditions, monitoring tools, baseline scores, initial medications, and caregiver phone number.</li><li>For conditions, check all that apply. If the condition isn\'t listed, check <strong>«Other»</strong> and type the name.</li><li>For monitoring tools, check the scales you will use with this patient. The small descriptor under each name shows the clinical problem and age range.</li><li>If you already have a baseline score, click <strong>«+ Add baseline score»</strong> — it will be saved as a baseline visit automatically.</li><li>The ID (e.g. CCM-0034) is assigned automatically on save.</li></ul></details><details class="howto-sub"><summary>📊 Questionnaires &amp; psychometric tools <span class="howto-chevron">▾</span></summary><ul><li>Monitoring tools are assigned per patient in <strong>Edit patient → Monitored questionnaires</strong>. Each tool shows the clinical problem and age range to guide selection.</li><li>To <strong>record a score</strong>: open the patient chart → <strong>«+ Log visit»</strong> → select the tool → enter date and score → save. The result appears in the trend chart.</li><li>To <strong>send a questionnaire to a caregiver or teacher</strong>: in the <strong>«Complete tool»</strong> section on the patient page, click the <strong>📤 button</strong> next to the tool. A ready-to-paste message (with the patient\'s first name and a direct link) is copied to your clipboard — paste it into WhatsApp or email.</li><li>If the patient has multiple questionnaires with a parent/teacher version, a <strong>«📤 Share all questionnaires»</strong> button appears — it generates one combined message with all links, ideal for sending everything at once.</li><li>To <strong>open the questionnaire on screen</strong> (to complete in the office), click the tool name. The clinician version opens in a new tab.</li></ul></details><details class="howto-sub"><summary>💬 Suggestions &amp; reporting a problem <span class="howto-chevron">▾</span></summary><ul><li>The <strong>«💬 Suggestions»</strong> button in the top bar opens the form.</li><li>Categories: Bug · New feature · Data issue · Workflow · Content/Translation.</li><li>Priority Normal for most things. High only if it blocks clinical work.</li><li>You can attach a screenshot — it is saved automatically to Drive.</li><li>Each submission notifies the technical team by email.</li></ul></details>'
  },
  howto_patient_body: {
    es: '<details class="howto-sub" open><summary>👤 Tarjeta del paciente <span class="howto-chevron">▾</span></summary><ul><li>La tarjeta superior muestra nombre, ID, edad (calculada de FNP), sexo, terapeuta, estado y teléfono del cuidador (si se registró).</li><li>Haz clic en <strong>«✏️ Editar paciente»</strong> para cambiar nombre, fecha de nacimiento, sexo, terapeuta, condiciones, herramientas monitoreadas o teléfono del cuidador.</li><li>Haz clic en <strong>«Cambiar estado»</strong> para actualizar el estado: Activo · Estable · Inactivo · Transferido · Otro.</li><li>La bandera <strong>⚠ de seguridad</strong> se activa desde el modal de visita si hubo evaluación de ideación suicida o autolesión. Una vez activa, aparece fijada en el registro principal. Para desactivarla, haz clic en «Reconocer» en el banner rojo.</li><li>El chip de condición primaria con <strong>«⚠ Verificar»</strong> significa que la condición fue inferida automáticamente. Abre «Editar paciente», selecciona la condición primaria correcta en el menú y guarda — el aviso desaparece.</li></ul></details><details class="howto-sub"><summary>📝 Registrar una visita o puntaje <span class="howto-chevron">▾</span></summary><ul><li>Haz clic en <strong>«+ Registrar visita»</strong>.</li><li>Selecciona la herramienta (SMFQ, SCARED, SNAP-IV, etc.) en el menú desplegable. Las herramientas del paciente aparecen primero con una estrella.</li><li>Ingresa la <strong>fecha</strong> (hoy por defecto) y el <strong>puntaje</strong>. El puntaje se valida contra el rango de la herramienta.</li><li>Si la condición incluye depresión o ansiedad, aparece la sección <strong>«⚠ Inquietud de seguridad»</strong> — marca la casilla si evaluaste ideación suicida o autolesión en esta visita. Si la marcas, se activa la bandera de seguridad automáticamente.</li><li>Agrega una nota clínica en el campo de texto (opcional). Las notas largas se comprimen en la ficha con un botón «▼ Ver nota completa».</li><li>Si solo quieres dejar una nota sin puntaje, deja el campo de puntaje vacío — se guarda como visita de nota.</li><li>Haz clic en <strong>«Guardar visita»</strong>. El puntaje se agrega al gráfico de tendencias de inmediato.</li><li>Para <strong>eliminar</strong> una visita: busca la fila en el historial de visitas → botón 🗑 → confirma en el diálogo.</li></ul></details><details class="howto-sub"><summary>📊 Completar y compartir cuestionarios <span class="howto-chevron">▾</span></summary><ul><li>La sección <strong>«Completar herramienta»</strong> muestra todos los cuestionarios asignados al paciente.</li><li>Haz clic en el <strong>nombre del cuestionario</strong> (ej: SMFQ-P) para abrirlo en una nueva pestaña — versión para clínico, ideal para llenar en consultorio en tu teléfono o tableta.</li><li>Haz clic en el botón <strong>📤</strong> junto al nombre para copiar un mensaje listo para enviar al cuidador o maestro via WhatsApp o correo. El mensaje incluye el nombre del paciente, el enlace y la firma del terapeuta.</li><li>Si el paciente tiene varios cuestionarios con versión para padres/maestros, aparece el botón <strong>«📤 Compartir todos los cuestionarios»</strong> — copia un solo mensaje con todos los enlaces juntos.</li><li>El PSC-17 es una herramienta de <em>cribado inicial</em> de uso único. Aparece separado al final si el paciente aún no lo ha completado.</li></ul></details><details class="howto-sub"><summary>💊 Registrar un medicamento <span class="howto-chevron">▾</span></summary><ul><li>Haz clic en <strong>«+ Medicamento»</strong>.</li><li>Selecciona el medicamento del formulario. Si no está en la lista, selecciona <strong>«Otro (especificar)»</strong> y escribe el nombre.</li><li>Ingresa la dosis en mg, selecciona la frecuencia (QD-AM · QD-PM · QHS · BID · TID) y marca <strong>PRN</strong> si aplica.</li><li>Selecciona la acción: START · INCREASE · DECREASE · CONTINUE · HOLD · STOP.</li><li>Selecciona el prescriptor (lista de psiquiatras del equipo) e ingresa notas opcionales.</li><li>Para <strong>eliminar</strong> un medicamento: historial de medicamentos → botón 🗑 → confirma.</li></ul></details><details class="howto-sub"><summary>📋 Revisión psiquiátrica y seguimiento CoCM <span class="howto-chevron">▾</span></summary><ul><li>La sección <strong>«Seguimiento CoCM»</strong> registra tres métricas clave: última revisión psiquiátrica, último contacto del terapeuta y bandera de revisión pendiente.</li><li><strong>Última revisión psiquiátrica</strong>: se actualiza automáticamente si el psiquiatra registra una visita o nota para este paciente. También se puede ingresar manualmente la fecha de una consulta remota. En el registro principal aparece la etiqueta «(brigade)» si la revisión fue una visita de brigada.</li><li><strong>Último contacto del terapeuta</strong>: ingresa la fecha del último contacto y una nota breve. Útil para seguimiento entre visitas formales.</li><li><strong>Bandera de revisión</strong>: marca si este paciente necesita discusión en la próxima sesión de consultoría. Se puede ver en la columna de banderas del registro.</li></ul></details>',
    en: '<details class="howto-sub" open><summary>👤 Patient card <span class="howto-chevron">▾</span></summary><ul><li>The top card shows name, ID, age (computed from DOB), sex, therapist, status, and caregiver phone (if recorded).</li><li>Click <strong>«✏️ Edit patient»</strong> to change name, date of birth, sex, therapist, conditions, monitored tools, or caregiver phone.</li><li>Click <strong>«Change status»</strong> to update status: Active · Stable · Inactive · Transferred · Other.</li><li>The <strong>⚠ safety flag</strong> is activated from the visit modal when suicidal ideation or self-harm was assessed. Once active, it appears pinned in the main registry. To clear it, click «Acknowledge» on the red banner.</li><li>A <strong>«⚠ Verify»</strong> badge on the primary condition chip means the condition was auto-inferred. Open «Edit patient», select the correct primary condition from the dropdown, and save — the badge disappears.</li></ul></details><details class="howto-sub"><summary>📝 Logging a visit or score <span class="howto-chevron">▾</span></summary><ul><li>Click <strong>«+ Log visit»</strong>.</li><li>Select the tool (SMFQ, SCARED, SNAP-IV, etc.) from the dropdown. This patient\'s tools appear first with a star.</li><li>Enter the <strong>date</strong> (today by default) and the <strong>score</strong>. The score is validated against the tool\'s valid range.</li><li>If the condition includes depression or anxiety, a <strong>«⚠ Safety concern»</strong> section appears — check the box if you assessed suicidal ideation or self-harm this visit. Checking it activates the safety flag automatically.</li><li>Add a clinical note in the text field (optional). Long notes are collapsed in the chart with a «▼ Show full note» button.</li><li>If you only want to leave a note without a score, leave the score field blank — it saves as a note visit.</li><li>Click <strong>«Save visit»</strong>. The score is added to the trend chart immediately.</li><li>To <strong>delete</strong> a visit: find the row in the visit history → 🗑 button → confirm in the dialog.</li></ul></details><details class="howto-sub"><summary>📊 Completing and sharing questionnaires <span class="howto-chevron">▾</span></summary><ul><li>The <strong>«Complete tool»</strong> section shows all questionnaires assigned to this patient.</li><li>Click the <strong>tool name</strong> (e.g. SMFQ-P) to open it in a new tab — clinician version, ideal for completing on your phone or tablet in the office.</li><li>Click the <strong>📤 button</strong> next to a tool name to copy a ready-to-send message for the caregiver or teacher via WhatsApp or email. The message includes the patient\'s first name, the direct link, and the therapist\'s name as the signature.</li><li>If the patient has multiple questionnaires with a parent/teacher version, a <strong>«📤 Share all questionnaires»</strong> button appears — it copies one combined message with all links together, ideal for sending everything at once.</li><li>PSC-17 is a <em>one-time initial screening</em> tool. It appears separately at the bottom if the patient has not yet completed it.</li></ul></details><details class="howto-sub"><summary>💊 Logging a medication <span class="howto-chevron">▾</span></summary><ul><li>Click <strong>«+ Medication»</strong>.</li><li>Select the medication from the formulary. If it\'s not listed, select <strong>«Other (specify)»</strong> and type the name.</li><li>Enter the dose in mg, select the frequency (QD-AM · QD-PM · QHS · BID · TID), and check <strong>PRN</strong> if applicable.</li><li>Select the action: START · INCREASE · DECREASE · CONTINUE · HOLD · STOP.</li><li>Select the prescriber (list of team psychiatrists) and add optional notes.</li><li>To <strong>delete</strong> a medication: medication history → 🗑 button → confirm.</li></ul></details><details class="howto-sub"><summary>📋 Psychiatric review &amp; CoCM tracking <span class="howto-chevron">▾</span></summary><ul><li>The <strong>«CoCM Tracking»</strong> section records three key metrics: last psychiatric review, last therapist contact, and pending review flag.</li><li><strong>Last psychiatric review</strong>: updated automatically when the psychiatrist logs a visit or note for this patient. You can also manually enter a date for a remote consultation. The registry shows a «(brigade)» label when the review was an in-person brigade visit.</li><li><strong>Last therapist contact</strong>: enter the date of the last contact and a brief note. Useful for tracking between formal visits.</li><li><strong>Review flag</strong>: mark if this patient needs discussion at the next caseload consultation. Visible in the flags column on the registry.</li></ul></details>'
  },
  howto_suggestions_body: {
    es: '<ul><li><strong>Su nombre</strong>: escríbalo arriba (texto libre).</li><li><strong>Categoría</strong>: elija error, función nueva, dato incorrecto, flujo, o contenido/traducción.</li><li><strong>Prioridad</strong>: Normal para la mayoría. Alta solo si bloquea el trabajo clínico.</li><li><strong>Descripción</strong>: detalle qué pasó, qué esperaba, y cómo reproducirlo.</li><li><strong>Captura</strong> (opcional): adjunte una imagen — se sube a Google Drive al enviar.</li><li>Las sugerencias recientes aparecen abajo con su estado (abierta / cerrada).</li></ul>',
    en: '<ul><li><strong>Your name</strong>: type it at the top (free text).</li><li><strong>Category</strong>: pick bug, new feature, data issue, workflow, or content/translation.</li><li><strong>Priority</strong>: Normal for most things. High only if it blocks clinical work.</li><li><strong>Description</strong>: describe what happened, what you expected, and how to reproduce it.</li><li><strong>Screenshot</strong> (optional): attach an image — it uploads to Google Drive on submit.</li><li>Recent suggestions appear below with their status (open / closed).</li></ul>'
  },

  // ── topbar / general ───────────────────────────────────────
  title_registry: { es: 'CoCM Camasca — Registro', en: 'CoCM Camasca — Registry' },
  subtitle_registry: { es: 'Panel clínico · Monitoreo longitudinal', en: 'Clinical dashboard · Longitudinal monitoring' },
  data_source: { es: 'Fuente de datos:', en: 'Data source:' },
  configure: { es: 'Configurar', en: 'Configure' },
  reload: { es: 'Recargar', en: 'Reload' },
  suggestions: { es: 'Sugerencias', en: 'Suggestions' },
  notice: { es: 'Aviso:', en: 'Notice:' },
  notice_text: {
    es: 'Este registro es una herramienta clínica interna. Toda información es confidencial y debe manejarse según políticas locales de protección de datos.',
    en: 'This registry is an internal clinical tool. All information is confidential and must be handled per local data protection policies.'
  },

  // ── modals ─────────────────────────────────────────────────
  modal_config_title: { es: 'Configurar fuente de datos', en: 'Configure data source' },
  modal_config_body: { es: 'El panel necesita leer del Google Sheet. Elija uno de los dos métodos:', en: 'The dashboard needs to read from the Google Sheet. Choose one of two methods:' },
  modal_config_opt1: { es: 'Opción 1 — Apps Script (recomendado)', en: 'Option 1 — Apps Script (recommended)' },
  modal_config_opt1_desc: { es: 'Permite lecturas y escrituras. Pegue la URL del Web App desplegado:', en: 'Enables reads and writes. Paste the deployed Web App URL:' },
  modal_config_opt2: { es: 'Opción 2 — CSV publicado (solo lectura)', en: 'Option 2 — Published CSV (read-only)' },
  modal_config_opt2_desc: { es: 'En el Sheet, use Archivo › Compartir › Publicar en la web › CSV. Pegue la URL base (sin &gid):', en: 'In the Sheet, use File › Share › Publish to web › CSV. Paste the base URL (without &gid):' },
  modal_config_default: { es: 'Sin configurar, el panel usa datos de ejemplo (demo).', en: 'Without configuration, the dashboard uses demo data.' },

  // ── Display preferences (feature flags) ──
  display_prefs_title: { es: 'Preferencias de visualización', en: 'Display preferences' },
  display_prefs_hint:  { es: 'Active o desactive campos para simplificar el panel. Los datos siguen guardándose en el Sheet aunque estén ocultos aquí.', en: 'Toggle fields to simplify the dashboard. Data still saves to the Sheet even if hidden here.' },
  simplified_mode_label: { es: 'Modo simplificado', en: 'Simplified mode' },
  simplified_mode_desc:  { es: 'Oculta columnas avanzadas (tendencia, Δ, condiciones, fecha de ingreso, base). Útil para equipos que recién comienzan.', en: 'Hides advanced columns (trend, Δ, conditions, enrollment date, baseline). Useful for teams just starting out.' },
  feat_psych_consult:   { es: 'Fecha de última consulta psiquiátrica', en: 'Last psychiatric consult date' },
  feat_bhcm_contact:    { es: 'Fecha de último contacto del terapeuta', en: 'Last therapist contact date' },
  feat_review_flag:     { es: 'Marcar pacientes para revisión', en: 'Flag patients for review' },
  feat_enrollment:      { es: 'Fecha de ingreso al CoCM', en: 'CoCM enrollment date' },
  feat_baseline:        { es: 'Puntaje basal en tabla principal', en: 'Baseline score on main table' },
  feat_trend:           { es: 'Línea de tendencia (sparkline)', en: 'Trend line (sparkline)' },
  feat_delta:           { es: 'Columna Δ vs. basal', en: 'Δ vs. baseline column' },
  feat_conditions:      { es: 'Columna de condiciones', en: 'Conditions column' },
  feat_due_review:      { es: 'Alerta automática de consulta vencida', en: 'Auto “psych review overdue” alert' },

  // ── Patient detail edit prompts ──
  psych_consult_section: { es: 'Seguimiento CoCM', en: 'CoCM tracking' },
  psych_consult_label:   { es: 'Última consulta psiq.', en: 'Last psych review' },
  bhcm_contact_label:    { es: 'Último contacto de terapeuta', en: 'Last therapist contact' },
  last_contact_label:    { es: 'Último contacto del terapeuta', en: 'Last therapist contact' },
  last_contact_by:       { es: 'por', en: 'by' },
  bhcm_contact_note_label: { es: 'Nota de contacto', en: 'Contact note' },
  review_flag_label:     { es: 'Marcar para revisión en la próxima reunión', en: 'Flag for next case review' },
  edit:                  { es: 'Editar', en: 'Edit' },
  clear:                 { es: 'Limpiar', en: 'Clear' },
  today_btn:             { es: 'Hoy', en: 'Today' },
  psych_consult_prompt:  { es: 'Fecha de última consulta psiquiátrica (YYYY-MM-DD). Dejé vacío para limpiar:', en: 'Last psych consult date (YYYY-MM-DD). Leave blank to clear:' },
  bhcm_contact_prompt:   { es: 'Fecha del último contacto del terapeuta (YYYY-MM-DD):', en: 'Last therapist contact date (YYYY-MM-DD):' },
  bhcm_contact_note_prompt: { es: 'Nota breve del contacto (opcional):', en: 'Short contact note (optional):' },
  enrolled_on:           { es: 'Ingresó: {date}', en: 'Enrolled: {date}' },
  weeks_suffix:          { es: 'sem', en: 'wk' },
  modal_addme_title: { es: 'Agregarme al equipo', en: 'Add me to the team' },
  modal_addme_role: { es: 'Rol', en: 'Role' },
  role_therapist: { es: 'Terapeuta', en: 'Therapist' },
  role_psychiatrist: { es: 'Psiquiatra', en: 'Psychiatrist' },
  role_other: { es: 'Otro', en: 'Other' },
  modal_addme_add: { es: 'Agregar', en: 'Add' },
  modal_newpat_title: { es: 'Nuevo paciente', en: 'New patient' },
  modal_newpat_min_hint: { es: 'Solo el nombre es obligatorio. Puede completar el resto después.', en: 'Only the name is required. You can fill in the rest later.' },
  modal_visit_title: { es: 'Registrar visita', en: 'Log visit' },
  modal_med_title: { es: 'Registrar medicamento', en: 'Log medication' },
  modal_status_title: { es: 'Cambiar estado', en: 'Change status' },
  modal_status_prompt: { es: 'Seleccione el nuevo estado:', en: 'Select new status:' },
  modal_safety_title: { es: 'Marcar bandera de seguridad', en: 'Raise safety flag' },
  modal_safety_reason_ph: { es: 'Describa brevemente la preocupación…', en: 'Briefly describe the concern…' },
};

// ── runtime helpers ───────────────────────────────────────────
function getLang() {
  return document.documentElement.getAttribute('data-lang') || 'es';
}

function t(key, vars) {
  const entry = REG_I18N[key];
  if (!entry) return key; // return key for quick-debug
  let s = entry[getLang()] || entry.es;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return s;
}

// Translate a status value coming from the sheet (ES canonical)
function translateStatus(v) {
  if (!v) return '';
  const map = {
    'Activo': 'status_activo',
    'Active': 'status_activo',
    'Estable': 'status_estable',
    'Stable': 'status_estable',
    'Prioridad Baja': 'status_baja',
    'Inactivo': 'status_inactivo',
    'Transferido': 'status_transfer',
    'Otro': 'status_otro',
    'Other': 'status_otro',
  };
  const key = map[v];
  return key ? t(key) : v;
}

// Translate a medication Action value coming from the sheet (mixed ES).
// Normalizes case/accents for lookup so 'Inicio'/'inicio'/'INICIO' all map correctly.
function translateMedAction(v) {
  if (!v) return '';
  const norm = String(v).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = {
    'inicio':       'med_action_inicio',
    'iniciar':      'med_action_iniciar',
    'start':        'med_action_inicio',
    'ajuste':       'med_action_ajuste',
    'adjust':       'med_action_ajuste',
    'titular':      'med_action_titular',
    'titulacion':   'med_action_titulacion',
    'titrate':      'med_action_titular',
    'increase':     'med_increase',
    'aumentar':     'med_increase',
    'decrease':     'med_decrease',
    'disminuir':    'med_decrease',
    'continuar':    'med_action_continuar',
    'continuacion': 'med_action_continuacion',
    'continue':    'med_action_continuar',
    'suspension':   'med_action_suspension',
    'suspender':    'med_action_suspender',
    'hold':         'med_action_hold',
    'descontinuar': 'med_action_descontinuar',
    'stop':         'med_action_stop',
    'cambio':       'med_action_cambio',
    'change':       'med_action_cambio',
  };
  const key = map[norm];
  return key ? t(key) : v;
}

// Translate a tier label coming from the registry logic (ES canonical)
function translateTier(v) {
  if (!v) return '';
  const map = {
    'Severa': 'tier_severa',
    'Moderada': 'tier_moderada',
    'Leve': 'tier_leve',
    'Remisión': 'tier_remision',
    'Sin datos': 'tier_sin_datos',
  };
  const key = map[v];
  return key ? t(key) : v;
}

// Translate a data mode label
function translateMode(v) {
  const map = { demo: 'mode_demo', appsscript: 'mode_appsscript', csv: 'mode_csv' };
  return map[v] ? t(map[v]) : v;
}

// Translate sex short codes
function translateSex(v) {
  if (!v) return '—';
  const map = { F: 'sex_f', M: 'sex_m', O: 'sex_o' };
  return map[v] ? t(map[v]) : v;
}

// ── Toast / Undo helpers (shared across pages) ────────────────
// Usage: showToast('Saved', { undo: () => {...}, variant: 'success' })
function showToast(message, opts = {}) {
  let host = document.getElementById('regToastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'regToastHost';
    host.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:none;';
    document.body.appendChild(host);
  }
  const toast = document.createElement('div');
  const variant = opts.variant || 'info';
  const bg = variant === 'error'   ? 'var(--color-error)'
           : variant === 'warn'    ? 'var(--color-warning)'
           : variant === 'success' ? 'var(--color-success)'
           :                         'var(--color-text)';
  toast.style.cssText = `background:${bg};color:white;padding:10px 16px;border-radius:var(--radius-md);font-size:var(--text-sm);display:flex;gap:12px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,0.2);pointer-events:auto;max-width:90vw;`;
  toast.innerHTML = `<span>${message}</span>`;
  if (opts.undo) {
    const btn = document.createElement('button');
    btn.textContent = t('action_undo');
    btn.style.cssText = 'background:rgba(255,255,255,0.25);color:white;border:none;padding:4px 12px;border-radius:var(--radius-sm);font-weight:600;font-size:var(--text-xs);cursor:pointer;';
    btn.onclick = () => { opts.undo(); dismiss(); };
    toast.appendChild(btn);
  }
  if (opts.retry) {
    const btn = document.createElement('button');
    btn.textContent = t('action_retry');
    btn.style.cssText = 'background:rgba(255,255,255,0.25);color:white;border:none;padding:4px 12px;border-radius:var(--radius-sm);font-weight:600;font-size:var(--text-xs);cursor:pointer;';
    btn.onclick = () => { opts.retry(); dismiss(); };
    toast.appendChild(btn);
  }
  const x = document.createElement('button');
  x.textContent = '×';
  x.style.cssText = 'background:transparent;color:white;border:none;font-size:18px;line-height:1;cursor:pointer;padding:0 4px;';
  x.onclick = () => dismiss();
  toast.appendChild(x);
  host.appendChild(toast);
  let done = false;
  function dismiss() {
    if (done) return; done = true;
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s';
    setTimeout(() => toast.remove(), 250);
  }
  const duration = opts.duration != null ? opts.duration : (opts.undo || opts.retry ? 10000 : 4000);
  setTimeout(dismiss, duration);
  return dismiss;
}

/* ============================================================
   Text-size adjustment (A− / A+) — shared across registry pages.
   Persists in localStorage under 'coCMCamasca.textScale'.
   Applied as `zoom: var(--reg-scale)` on .app-layout.no-sidebar.
   ============================================================ */
const REG_SCALE_KEY = 'coCMCamasca.textScale';
const REG_SCALE_STEPS = [0.85, 0.92, 1.0, 1.08, 1.17, 1.27, 1.38];

function getCurrentScale() {
  const raw = parseFloat(localStorage.getItem(REG_SCALE_KEY));
  return isFinite(raw) && raw > 0 ? raw : 1;
}
function applyCurrentScale() {
  const s = getCurrentScale();
  document.documentElement.style.setProperty('--reg-scale', s);
}
function adjustTextSize(delta) {
  const current = getCurrentScale();
  // find nearest step index
  let idx = 0;
  let best = Infinity;
  REG_SCALE_STEPS.forEach((v, i) => {
    const d = Math.abs(v - current);
    if (d < best) { best = d; idx = i; }
  });
  const nextIdx = Math.max(0, Math.min(REG_SCALE_STEPS.length - 1, idx + (delta > 0 ? 1 : -1)));
  const next = REG_SCALE_STEPS[nextIdx];
  localStorage.setItem(REG_SCALE_KEY, String(next));
  applyCurrentScale();
}
// Apply on load (before any rendering) so no flash of default size.
try { applyCurrentScale(); } catch (e) {}
document.addEventListener('DOMContentLoaded', applyCurrentScale);
