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
  th_latest_score:  { es: 'Última medición', en: 'Latest score' },
  th_baseline:      { es: 'Base',            en: 'Baseline' },
  th_last_visit:    { es: 'Última visita',   en: 'Last visit' },
  th_status:        { es: 'Estado',          en: 'Status' },
  th_flags:         { es: 'Banderas',        en: 'Flags' },
  th_actions:       { es: 'Acciones',        en: 'Actions' },
  th_trend:         { es: 'Tendencia',       en: 'Trend' },
  th_delta:         { es: 'Δ vs. base',      en: 'Δ vs. baseline' },
  th_last_psych:    { es: 'Última consulta psiq.', en: 'Last psych review' },
  th_last_contact:  { es: 'Último contacto',       en: 'Last contact' },
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
  status_activo:     { es: 'Activo',                en: 'Active' },
  status_estable:    { es: 'Estable',               en: 'Stable' },
  status_baja:       { es: 'Prioridad Baja',        en: 'Low Priority' },
  status_inactivo:   { es: 'Inactivo',              en: 'Inactive' },
  status_transfer:   { es: 'Transferido',           en: 'Transferred' },
  status_otro:       { es: 'Otro',                  en: 'Other' },
  status_safety:     { es: '⚠ Con bandera de seguridad', en: '⚠ Safety flag' },
  status_not_improving: { es: 'No mejora',          en: 'Not improving' },
  status_due_followup: { es: 'Por seguimiento',     en: 'Due for follow-up' },

  // ── how-to card ───────────────────────────────────────────
  howto_title: { es: '¿Cómo uso esta página?', en: 'How do I use this page?' },
  howto_registry_body: {
    es: '<ul><li><strong>Seleccione su nombre</strong> arriba a la izquierda (o use el botón «+» para agregarse).</li><li><strong>Filtre</strong> por terapeuta, condición, o estado. Use la barra de búsqueda para encontrar un paciente por nombre o ID.</li><li><strong>Clic en una fila</strong> para abrir la ficha del paciente y ver su historial.</li><li><strong>+ Paciente nuevo</strong> abre un formulario corto — solo el nombre es obligatorio (se pide fecha de nacimiento, no edad).</li><li><strong>Chips de estado</strong> debajo de la barra filtran rápido: Activo, Todos, ⚠ Seguridad, Por seguimiento, Estable, Inactivo, Transferido, Otro.</li><li><strong>Pacientes con bandera de seguridad</strong> aparecen fijados arriba, con borde rojo y fondo rosado.</li><li><strong>«No mejora»</strong> ahora se calcula automáticamente del historial de puntajes (≥3 visitas, ≥8 semanas, reducción &lt;50% desde el basal).</li><li><strong>Datos: Prueba</strong> cambia a un conjunto sintético de 20 pacientes para entrenamiento — los cambios no afectan pacientes reales.</li><li><strong>💬 Sugerencias / Reportar problema</strong> (arriba en la barra) abre el formulario para reportar errores o pedir funciones nuevas.</li></ul>',
    en: '<ul><li><strong>Select your name</strong> in the top left (or use the «+» button to add yourself).</li><li><strong>Filter</strong> by therapist, condition, or status. Use the search bar to find a patient by name or ID.</li><li><strong>Click any row</strong> to open that patient\'s chart and full history.</li><li><strong>+ New patient</strong> opens a short form — only the name is required (date of birth is collected, not age).</li><li><strong>Status chips</strong> below the toolbar filter quickly: Active, All, ⚠ Safety, Due for follow-up, Stable, Inactive, Transferred, Other.</li><li><strong>Patients with an active safety flag</strong> are pinned at the top with a red left border and pink row tint.</li><li><strong>«Not improving»</strong> is now auto-computed from the score trend (≥3 visits, ≥8 weeks, &lt;50% reduction from baseline).</li><li><strong>Dataset: Test</strong> switches to 20 synthetic patients for training — changes do not affect real patients.</li><li><strong>💬 Suggestions / Report a problem</strong> (top banner) opens the form to report bugs or request new features.</li></ul>'
  },
  howto_patient_body: {
    es: '<ul><li><strong>Panel superior</strong> muestra nombre, ID, edad (calculada de la FNP), sexo, terapeuta, estado y banderas activas.</li><li><strong>Tendencias por herramienta</strong> grafica cada escala (SMFQ, SCARED, SNAP-IV, etc.) a lo largo del tiempo.</li><li><strong>+ Registrar visita</strong> abre el formulario con fecha, herramienta, puntaje y nota. Si la condición incluye depresión o ansiedad, aparece arriba una sección <strong>⚠ Inquietud de seguridad</strong> con casilla para evaluar ideación suicida / autolesión en esta visita.</li><li><strong>+ Medicamento</strong> usa un formulario estructurado: medicamento del formulario (8 opciones + Otro), dosis numérica (mg), frecuencia con presets (QD-AM, QD-PM, QHS, BID, TID) + casilla PRN, acción (START / INCREASE / DECREASE / CONTINUE / HOLD / STOP), y motivo con casillas de condición + texto libre.</li><li><strong>Recomendaciones</strong> aparecen automáticamente: no mejora (basado en tendencia de puntajes), necesita basal, actualizar puntaje, o sin visita reciente.</li><li><strong>Cambiar estado</strong> abre un modal con 5 opciones: Activo (monitoreo completo), Estable (cadencia de 16 semanas), Inactivo (terapeuta continúa, CoCM pausado), Transferido (ya no es alumno de Camasca), u Otro (texto libre).</li></ul>',
    en: '<ul><li><strong>Top panel</strong> shows name, ID, age (computed from DOB), sex, therapist, status, and active flags.</li><li><strong>Trends by tool</strong> plots each scale (SMFQ, SCARED, SNAP-IV, etc.) over time.</li><li><strong>+ Log visit</strong> opens the form with date, tool, score, and note. If the condition includes depression or anxiety, a <strong>⚠ Safety concern</strong> section appears at the top with a checkbox to assess suicidal ideation / self-harm this visit.</li><li><strong>+ Medication</strong> uses a structured form: formulary medication (8 options + Other), numeric dose (mg), frequency presets (QD-AM, QD-PM, QHS, BID, TID) + PRN checkbox, action (START / INCREASE / DECREASE / CONTINUE / HOLD / STOP), and reason with condition checkboxes + freetext.</li><li><strong>Recommendations</strong> appear automatically: not improving (from score trend), needs baseline, update score, or no recent visit.</li><li><strong>Change status</strong> opens a modal with 5 options: Active (full CoCM monitoring), Stable (16-week cadence), Inactive (therapist continues, CoCM paused), Transferred (no longer a Camasca student), or Other (freetext).</li></ul>'
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
