#!/usr/bin/env python3
"""Generate placeholder pages for CoCM tools."""

import os

pages = [
    {
        "file": "mfq.html",
        "name": "MFQ Short",
        "name_full": "Mood and Feelings Questionnaire — Short Form",
        "icon": "😔",
        "age_es": "Jóvenes ≤11 años",
        "age_en": "Youth ≤11 years",
        "desc_es": "Cuestionario breve de estado de ánimo. Versiones niño (corte ≥8) y padre (corte ≥12). Rango de edad: 7–17 años.",
        "desc_en": "Brief mood questionnaire. Child version (cutoff ≥8) and parent version (cutoff ≥12). Age range: 7–17 years.",
        "domain_es": "Depresión",
        "domain_en": "Depression",
        "active_nav": "mfq.html",
    },
    {
        "file": "phqa.html",
        "name": "PHQ-A",
        "name_full": "Patient Health Questionnaire — Adolescent Version",
        "icon": "😔",
        "age_es": "Adolescentes ≥12 años",
        "age_en": "Adolescents ≥12 years",
        "desc_es": "Cuestionario de salud del paciente — versión para adolescentes. Cribado de depresión. Rango de edad: 11–17 años.",
        "desc_en": "Patient health questionnaire — adolescent version. Depression screening. Age range: 11–17 years.",
        "domain_es": "Depresión",
        "domain_en": "Depression",
        "active_nav": "phqa.html",
    },
    {
        "file": "scared.html",
        "name": "SCARED",
        "name_full": "Screen for Child Anxiety Related Disorders",
        "icon": "😰",
        "age_es": "Jóvenes ≤11 años",
        "age_en": "Youth ≤11 years",
        "desc_es": "Instrumento de cribado de trastornos de ansiedad en niños. Versiones niño y padre. Rango de edad: 8–17 años.",
        "desc_en": "Anxiety disorder screening instrument for children. Child and parent versions. Age range: 8–17 years.",
        "domain_es": "Ansiedad",
        "domain_en": "Anxiety",
        "active_nav": "scared.html",
    },
    {
        "file": "gad7.html",
        "name": "GAD-7",
        "name_full": "Generalized Anxiety Disorder Scale — 7 items",
        "icon": "😰",
        "age_es": "Adolescentes ≥12 años",
        "age_en": "Adolescents ≥12 years",
        "desc_es": "Escala de trastorno de ansiedad generalizada de 7 ítems. Rango de edad: 13+ años.",
        "desc_en": "Generalized anxiety disorder scale, 7 items. Age range: 13+ years.",
        "domain_es": "Ansiedad",
        "domain_en": "Anxiety",
        "active_nav": "gad7.html",
    },
    {
        "file": "cap.html",
        "name": "CAP Scale",
        "name_full": "Child Attention Problems Scale",
        "icon": "⚡",
        "age_es": "Jóvenes ≤11 años (prioridad)",
        "age_en": "Youth ≤11 years (priority)",
        "desc_es": "Escala de problemas de atención en niños. Evaluación de TDAH para jóvenes. Herramienta prioritaria para ≤11 años.",
        "desc_en": "Child attention problems scale. ADHD evaluation for youth. Priority tool for ≤11 years.",
        "domain_es": "TDAH",
        "domain_en": "ADHD",
        "active_nav": "cap.html",
    },
    {
        "file": "snapiv.html",
        "name": "SNAP-IV + ASRS",
        "name_full": "Swanson, Nolan and Pelham IV + Adult ASRS",
        "icon": "⚡",
        "age_es": "Adolescentes ≥12 años",
        "age_en": "Adolescents ≥12 years",
        "desc_es": "SNAP-IV (26 ítems, 8–18 años) combinado con la escala ASRS para adolescentes. Evaluación de TDAH.",
        "desc_en": "SNAP-IV (26 items, 8–18 years) combined with ASRS scale for adolescents. ADHD evaluation.",
        "domain_es": "TDAH",
        "domain_en": "ADHD",
        "active_nav": "snapiv.html",
    },
    {
        "file": "crafft.html",
        "name": "CRAFFT 2.1",
        "name_full": "Car, Relax, Alone, Forget, Friends, Trouble",
        "icon": "🚦",
        "age_es": "Adolescentes ≥12 años",
        "age_en": "Adolescents ≥12 years",
        "desc_es": "Instrumento de cribado de uso de sustancias en adolescentes. Versión 2.1 autoadministrada en español.",
        "desc_en": "Adolescent substance use screening instrument. Version 2.1 Spanish self-administered.",
        "domain_es": "Riesgo / SUD",
        "domain_en": "Risk / SUD",
        "active_nav": "crafft.html",
    },
    {
        "file": "dast10.html",
        "name": "DAST-10",
        "name_full": "Drug Abuse Screening Test — 10 items",
        "icon": "🚦",
        "age_es": "Todas las edades (monitoreo)",
        "age_en": "All ages (monitoring)",
        "desc_es": "Prueba de detección de abuso de drogas de 10 ítems. Monitoreo para jóvenes y adolescentes.",
        "desc_en": "Drug abuse screening test, 10 items. Monitoring for youth and adolescents.",
        "domain_es": "Riesgo / SUD",
        "domain_en": "Risk / SUD",
        "active_nav": "dast10.html",
    },
]

NAV_ITEMS = [
    ("index.html", "🏠", "Panel Principal", "Dashboard", ""),
    ("---UNIVERSAL---", None, "Tamizaje Universal", "Universal Screening", ""),
    ("psc17.html", "📋", "PSC-17", "PSC-17", "Activo"),
    ("---DEP---", None, "Depresión", "Depression", ""),
    ("mfq.html", "😔", "MFQ", "MFQ", "placeholder"),
    ("phqa.html", "😔", "PHQ-A", "PHQ-A", "placeholder"),
    ("---ANX---", None, "Ansiedad", "Anxiety", ""),
    ("scared.html", "😰", "SCARED", "SCARED", "placeholder"),
    ("gad7.html", "😰", "GAD-7", "GAD-7", "placeholder"),
    ("---TDAH---", None, "TDAH", "ADHD", ""),
    ("cap.html", "⚡", "CAP Scale", "CAP Scale", "placeholder"),
    ("snapiv.html", "⚡", "SNAP-IV + ASRS", "SNAP-IV + ASRS", "placeholder"),
    ("---SUD---", None, "Riesgo / SUD", "Risk / SUD", ""),
    ("crafft.html", "🚦", "CRAFFT", "CRAFFT", "placeholder"),
    ("dast10.html", "🚦", "DAST-10", "DAST-10", "placeholder"),
]

def render_nav(active_file):
    parts = []
    for item in NAV_ITEMS:
        href, icon, label_es, label_en, badge = item
        if href.startswith("---"):
            parts.append(f'<div class="sidebar-section-label" data-es="{label_es}" data-en="{label_en}">{label_es}</div>')
            continue
        active_cls = " active" if href == active_file else ""
        badge_html = ""
        if badge == "Activo":
            badge_html = '<span class="nav-badge">Activo</span>'
        elif badge == "placeholder":
            badge_html = '<span class="nav-badge placeholder" data-es="Próximamente" data-en="Coming Soon">Próximamente</span>'
        parts.append(f'''      <a href="{href}" class="nav-item{active_cls}">
        <span class="nav-icon">{icon}</span>
        <span data-es="{label_es}" data-en="{label_en}">{label_es}</span>
        {badge_html}
      </a>''')
    return "\n".join(parts)


TEMPLATE = '''<!DOCTYPE html>
<html lang="es" data-lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{name} — CoCM Pediátrico</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
<div class="app-layout">

  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">C+</div>
        <div class="sidebar-logo-text">
          <span class="title">CoCM Pediátrico</span>
          <span class="subtitle">Herramientas de Evaluación</span>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">
{nav}
    </nav>
    <div class="sidebar-footer">
      <span style="font-size:var(--text-xs); color:var(--color-text-muted);">Honduras · CoCM</span>
    </div>
  </aside>

  <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

  <main class="main-content">
    <div class="topbar">
      <div style="display:flex; align-items:center; gap:var(--space-3);">
        <button class="hamburger" onclick="toggleSidebar()" aria-label="Menú">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <div>
          <div class="topbar-title">{name}</div>
          <div class="topbar-subtitle" data-es="{domain_es}" data-en="{domain_en}">{domain_es}</div>
        </div>
      </div>
      <div class="topbar-actions">
        <div class="lang-toggle">
          <button class="lang-btn active" id="btnES" onclick="setLang(\'es\')">ES</button>
          <button class="lang-btn" id="btnEN" onclick="setLang(\'en\')">EN</button>
        </div>
        <button class="theme-toggle" data-theme-toggle aria-label="Cambiar tema">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="page-content">
      <div class="breadcrumb">
        <a href="index.html" data-es="Panel Principal" data-en="Dashboard">Panel Principal</a>
        <span class="breadcrumb-sep">›</span>
        <span>{name}</span>
      </div>

      <div class="placeholder-hero">
        <div class="placeholder-icon">{icon}</div>
        <h2>{name}</h2>
        <p style="font-style:italic; margin-bottom:var(--space-4);">{name_full}</p>
        <p data-es="{desc_es}" data-en="{desc_en}">{desc_es}</p>
        <div style="display:flex; justify-content:center; gap:var(--space-3); margin-top:var(--space-6); flex-wrap:wrap;">
          <span class="meta-tag age" style="font-size:var(--text-sm);" data-es="{age_es}" data-en="{age_en}">{age_es}</span>
          <span class="meta-tag" style="font-size:var(--text-sm);" data-es="{domain_es}" data-en="{domain_en}">{domain_es}</span>
        </div>
      </div>

      <div style="background:var(--color-primary-bg); border:1px solid var(--color-primary-highlight); border-radius:var(--radius-xl); padding:var(--space-8); text-align:center;">
        <div style="font-size:2rem; margin-bottom:var(--space-4);">🔧</div>
        <h3 style="font-size:var(--text-lg); font-weight:700; color:var(--color-primary); margin-bottom:var(--space-3); font-family:var(--font-display);" data-es="En construcción" data-en="Under Construction">En construcción</h3>
        <p style="color:var(--color-text-muted); margin-bottom:var(--space-5);" data-es="Esta herramienta interactiva estará disponible próximamente. Por ahora, utilice el formulario físico correspondiente." data-en="This interactive tool will be available soon. For now, please use the corresponding physical form.">Esta herramienta interactiva estará disponible próximamente. Por ahora, utilice el formulario físico correspondiente.</p>
        <a href="index.html" class="btn-primary" style="display:inline-flex; margin:0 auto;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span data-es="Volver al Panel" data-en="Back to Dashboard">Volver al Panel</span>
        </a>
      </div>

    </div>
  </main>
</div>

<script>
(function () {{
  const t = document.querySelector(\'[data-theme-toggle]\'), r = document.documentElement;
  let d = matchMedia(\'(prefers-color-scheme:dark)\').matches ? \'dark\' : \'light\';
  r.setAttribute(\'data-theme\', d);
  const moonSVG = \'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\';
  const sunSVG  = \'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>\';
  if (t) {{
    t.innerHTML = d === \'dark\' ? sunSVG : moonSVG;
    t.addEventListener(\'click\', () => {{
      d = d === \'dark\' ? \'light\' : \'dark\';
      r.setAttribute(\'data-theme\', d);
      t.innerHTML = d === \'dark\' ? sunSVG : moonSVG;
    }});
  }}
}})();

let currentLang = \'es\';
function setLang(lang) {{
  currentLang = lang;
  document.documentElement.setAttribute(\'data-lang\', lang);
  document.querySelectorAll(\'[data-es][data-en]\').forEach(el => {{
    el.textContent = el.getAttribute(\'data-\' + lang);
  }});
  document.getElementById(\'btnES\').classList.toggle(\'active\', lang === \'es\');
  document.getElementById(\'btnEN\').classList.toggle(\'active\', lang === \'en\');
}}

function toggleSidebar() {{
  document.getElementById(\'sidebar\').classList.toggle(\'open\');
  document.getElementById(\'sidebarOverlay\').classList.toggle(\'open\');
}}
function closeSidebar() {{
  document.getElementById(\'sidebar\').classList.remove(\'open\');
  document.getElementById(\'sidebarOverlay\').classList.remove(\'open\');
}}
</script>
</body>
</html>
'''

outdir = '/home/user/workspace/cocm-app'
for p in pages:
    nav_html = render_nav(p['active_nav'])
    html = TEMPLATE.format(
        name=p['name'],
        name_full=p['name_full'],
        icon=p['icon'],
        age_es=p['age_es'],
        age_en=p['age_en'],
        desc_es=p['desc_es'],
        desc_en=p['desc_en'],
        domain_es=p['domain_es'],
        domain_en=p['domain_en'],
        nav=nav_html,
    )
    path = os.path.join(outdir, p['file'])
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Created: {p['file']}")

print("Done!")
