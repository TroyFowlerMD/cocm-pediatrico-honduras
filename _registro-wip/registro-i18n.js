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
    es: '<details class="howto-sub" open><summary>🗂 Navegando el registro <span class="howto-chevron">▾</span></summary><ul><li>Seleccione su nombre arriba a la izquierda para identificarse. Si no aparece, use «+ Agregarme».</li><li>Filtre por terapeuta, condición o estado con los menús desplegables.</li><li>Use la barra de búsqueda para encontrar un paciente por nombre o ID (ej: CCM-0001).</li><li>Los chips de estado filtran rápido: Activo · Todos · ⚠ Seguridad · Por seguimiento · Estable · Inactivo · Transferido.</li><li>Haga clic en cualquier fila para abrir la ficha completa del paciente.</li><li>Pacientes con bandera de seguridad activa aparecen fijados arriba, con borde rojo.</li><li>«Datos: Prueba» cambia a 20 pacientes sintéticos para entrenamiento — no afecta datos reales.</li></ul></details><details class="howto-sub"><summary>➕ Agregar un paciente nuevo <span class="howto-chevron">▾</span></summary><ul><li>Haga clic en «+ Paciente nuevo» en la barra superior.</li><li>Solo el nombre es obligatorio. Se pide fecha de nacimiento, no edad.</li><li>Puede agregar condición, terapeuta y estado inicial ahora, o completarlos después.</li><li>El ID (ej: CCM-0034) se asigna automáticamente.</li></ul></details><details class="howto-sub"><summary>📊 Herramientas psicométricas <span class="howto-chevron">▾</span></summary><ul><li>El registro usa escalas validadas para monitorear síntomas a lo largo del tiempo.</li><li>SMFQ (Short Mood and Feelings Questionnaire): depresión, 13 ítems, 0–26 pts. Punto de corte clínico: ≥11.</li><li>SCARED (Screen for Child Anxiety-Related Disorders): ansiedad, 41 ítems, 0–82 pts. Punto de corte: ≥25 (total); subescalas disponibles.</li><li>SNAP-IV: TDAH (inatención y/o hiperactividad/impulsividad), 26 ítems, escala 0–3 por ítem.</li><li>Cada herramienta se registra como visita — fecha + puntaje + nota opcional.</li><li>El gráfico de tendencias en la ficha del paciente muestra la evolución a lo largo del tiempo.</li><li>«No mejora» se calcula automáticamente: ≥3 visitas, ≥8 semanas, reducción &lt;50% desde el basal.</li></ul></details><details class="howto-sub"><summary>💬 Sugerencias y reportar problema <span class="howto-chevron">▾</span></summary><ul><li>El botón «💬 Sugerencias» en la barra superior abre el formulario de sugerencias.</li><li>Use este formulario para reportar errores, pedir funciones nuevas, o señalar datos incorrectos.</li><li>Seleccione una categoría: Error · Nueva función · Dato incorrecto · Flujo de trabajo · Contenido/Traducción.</li><li>Prioridad Normal para la mayoría de cosas. Alta solo si bloquea el trabajo clínico.</li><li>Puede adjuntar una captura de pantalla — se guarda automáticamente en Google Drive.</li><li>Las sugerencias enviadas aparecen en la parte inferior de la página de sugerencias con su estado (Abierta / Cerrada).</li><li>El equipo técnico recibe una notificación por correo con cada envío.</li></ul></details>',
    en: '<details class="howto-sub" open><summary>🗂 Navigating the Registry <span class="howto-chevron">▾</span></summary><ul><li>Select your name in the top-left to identify yourself. If you don\'t appear, use «+ Add me».</li><li>Filter by therapist, condition, or status using the dropdown menus.</li><li>Use the search bar to find a patient by name or ID (e.g. CCM-0001).</li><li>Status chips filter quickly: Active · All · ⚠ Safety · Due for follow-up · Stable · Inactive · Transferred.</li><li>Click any row to open that patient\'s full chart.</li><li>Patients with an active safety flag are pinned at the top with a red left border.</li><li>«Dataset: Test» switches to 20 synthetic patients for training — does not affect real data.</li></ul></details><details class="howto-sub"><summary>➕ Adding a New Patient <span class="howto-chevron">▾</span></summary><ul><li>Click «+ New patient» in the top toolbar.</li><li>Only the name is required. Date of birth is collected, not age.</li><li>You can add condition, therapist, and initial status now or fill them in later.</li><li>The ID (e.g. CCM-0034) is assigned automatically.</li></ul></details><details class="howto-sub"><summary>📊 Psychometric Tools <span class="howto-chevron">▾</span></summary><ul><li>The registry uses validated scales to monitor symptoms over time.</li><li>SMFQ (Short Mood and Feelings Questionnaire): depression, 13 items, 0–26 pts. Clinical cutoff: ≥11.</li><li>SCARED (Screen for Child Anxiety-Related Disorders): anxiety, 41 items, 0–82 pts. Cutoff: ≥25 (total); subscales available.</li><li>SNAP-IV: ADHD (inattention and/or hyperactivity/impulsivity), 26 items, 0–3 per item.</li><li>Each tool is logged as a visit — date + score + optional note.</li><li>The trend chart on the patient chart shows symptom trajectory over time.</li><li>«Not improving» is auto-computed: ≥3 visits, ≥8 weeks, &lt;50% reduction from baseline.</li></ul></details><details class="howto-sub"><summary>💬 Suggestions &amp; Report a Problem <span class="howto-chevron">▾</span></summary><ul><li>The «💬 Suggestions» button in the top bar opens the suggestion form.</li><li>Use this form to report bugs, request new features, or flag incorrect data.</li><li>Select a category: Bug · New feature · Data issue · Workflow · Content/Translation.</li><li>Priority Normal for most things. High only if it blocks clinical work.</li><li>You can attach a screenshot — it is saved automatically to Google Drive.</li><li>Submitted suggestions appear at the bottom of the suggestions page with their status (Open / Closed).</li><li>The technical team receives an email notification with each submission.</li></ul></details>'
  },
  howto_patient_body: {
    es: '<details class="howto-sub" open><summary>👤 Panel del paciente <span class="howto-chevron">▾</span></summary><ul><li>El panel superior muestra nombre, ID, edad (calculada de FNP), sexo, terapeuta, estado y banderas activas.</li><li>«Cambiar estado» abre un modal: Activo · Estable (cadencia 16 sem) · Inactivo · Transferido · Otro.</li><li>La bandera ⚠ de seguridad se activa si hay preocupación de ideación suicida o autolesión. Aparece fijada en la vista principal.</li><li>Las recomendaciones automáticas aparecen arriba: no mejora · necesita basal · actualizar puntaje · sin visita reciente.</li></ul></details><details class="howto-sub"><summary>📝 Registrar visita <span class="howto-chevron">▾</span></summary><ul><li>Haga clic en «+ Registrar visita».</li><li>Seleccione la herramienta (SMFQ, SCARED, SNAP-IV u otra), ingrese la fecha y el puntaje.</li><li>Si la condición incluye depresión o ansiedad, aparece una sección ⚠ Inquietud de seguridad — marque la casilla si evaluó ideación suicida o autolesión en esta visita.</li><li>Agregue una nota clínica breve (opcional).</li><li>El puntaje se agrega al gráfico de tendencias automáticamente.</li></ul></details><details class="howto-sub"><summary>💊 Registrar medicamento <span class="howto-chevron">▾</span></summary><ul><li>Haga clic en «+ Medicamento».</li><li>Seleccione el medicamento del formulario (8 opciones + Otro) e ingrese la dosis en mg.</li><li>Frecuencia: presets QD-AM · QD-PM · QHS · BID · TID + casilla PRN.</li><li>Acción: START · INCREASE · DECREASE · CONTINUE · HOLD · STOP.</li><li>Motivo: marque las condiciones aplicables y agregue texto libre si es necesario.</li></ul></details><details class="howto-sub"><summary>📊 Herramientas psicométricas <span class="howto-chevron">▾</span></summary><ul><li>SMFQ: depresión, 0–26 pts, punto de corte clínico ≥11. Administrado por el terapeuta.</li><li>SCARED: ansiedad, 0–82 pts (total), punto de corte ≥25. Subescalas disponibles (pánico, ansiedad generalizada, ansiedad de separación, ansiedad social, escolar).</li><li>SNAP-IV: TDAH, 26 ítems en escala 0–3. Subescalas: inatención (ítems 1–9) e hiperactividad/impulsividad (ítems 10–18).</li><li>El gráfico muestra la tendencia de cada herramienta a lo largo del tiempo.</li><li>«No mejora» se calcula automáticamente con ≥3 visitas, ≥8 semanas, y reducción &lt;50% desde el basal.</li><li>Si necesita orientación sobre interpretación de puntajes, contacte al psiquiatra de CoCM.</li></ul></details>',
    en: '<details class="howto-sub" open><summary>👤 Patient Panel <span class="howto-chevron">▾</span></summary><ul><li>The top panel shows name, ID, age (computed from DOB), sex, therapist, status, and active flags.</li><li>«Change status» opens a modal: Active · Stable (16-week cadence) · Inactive · Transferred · Other.</li><li>The ⚠ safety flag is raised if there is concern about suicidal ideation or self-harm. It appears pinned at the top of the main registry.</li><li>Automatic recommendations appear at top: not improving · needs baseline · update score · no recent visit.</li></ul></details><details class="howto-sub"><summary>📝 Log a Visit <span class="howto-chevron">▾</span></summary><ul><li>Click «+ Log visit».</li><li>Select the tool (SMFQ, SCARED, SNAP-IV, or other), enter the date and score.</li><li>If the condition includes depression or anxiety, a ⚠ Safety concern section appears — check the box if you assessed suicidal ideation or self-harm this visit.</li><li>Add a brief clinical note (optional).</li><li>The score is added to the trend chart automatically.</li></ul></details><details class="howto-sub"><summary>💊 Log a Medication <span class="howto-chevron">▾</span></summary><ul><li>Click «+ Medication».</li><li>Select the formulary medication (8 options + Other) and enter the dose in mg.</li><li>Frequency presets: QD-AM · QD-PM · QHS · BID · TID + PRN checkbox.</li><li>Action: START · INCREASE · DECREASE · CONTINUE · HOLD · STOP.</li><li>Reason: check applicable conditions and add freetext if needed.</li></ul></details><details class="howto-sub"><summary>📊 Psychometric Tools <span class="howto-chevron">▾</span></summary><ul><li>SMFQ: depression, 0–26 pts, clinical cutoff ≥11. Administered by therapist.</li><li>SCARED: anxiety, 0–82 pts (total), cutoff ≥25. Subscales available (panic, generalized anxiety, separation anxiety, social anxiety, school avoidance).</li><li>SNAP-IV: ADHD, 26 items on 0–3 scale. Subscales: inattention (items 1–9) and hyperactivity/impulsivity (items 10–18).</li><li>The chart shows each tool\'s trajectory over time.</li><li>«Not improving» is auto-computed with ≥3 visits, ≥8 weeks, and &lt;50% reduction from baseline.</li><li>For guidance on score interpretation, contact the CoCM psychiatrist.</li></ul></details>'
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
