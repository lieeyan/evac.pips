"""Generates areas/<slug>/<slug>.html + .css for every municipality except Angono
(hand-made), plus hotlines.html and safety.html. Run from project root: python3 tools/build_areas.py
All occupancy / susceptibility numbers are SAMPLE DATA -- replace with official LGU figures."""
import os, random, shutil, re
from urllib.parse import quote

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

AREAS = {
 "Antipolo": ["San Roque","Mambugan","Dalig","Cupang"],
 "Baras": ["Concepcion","San Jose","Pinugay","Evangelista"],
 "Binangonan": ["Calumpang","Libid","Layunan","Tagpos"],
 "Cainta": ["San Andres","San Isidro","Santo Domingo","Santo Niño"],
 "Cardona": ["Boor","Calahan","Dalig","Looc"],
 "Jalajala": ["Bayugo","Special District","Sipsipin","Punta"],
 "Morong": ["Lagundi","Maybancal","San Pedro","Sampad"],
 "Pililla": ["Wawa","Malaya","Halayhayin","Quisao"],
 "Rodriguez": ["San Jose","San Isidro","Burgos","Manggahan"],
 "San Mateo": ["Banaba","Guinayang","Maly","Silangan"],
 "Tanay": ["Plaza Aldea","Sampaloc","Cayabu","Laiban"],
 "Taytay": ["Dolores","Muzon","San Juan","Santa Ana"],
 "Teresa": ["Poblacion","Dalig","Prinza","May-Iba"],
}
CENTER_OVERRIDES = {
 "San Mateo": [("San Mateo Municipal Gymnasium", "Banaba", 200),
               ("Guinayang National High School Covered Court", "Guinayang", 120),
               ("Maly Elementary School", "Maly", 80)],
}
SLUG = lambda n: n.lower().replace(" ", "-")

def make_fid(slug, fname):
    raw = f"{slug}-{fname}".lower()
    return re.sub(r'[^a-z0-9]+', '-', raw).strip('-')

def shell(title, pre, body, extra=""):
    return f'''<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | evac.pips</title>
    <script>
        (function() {{
            try {{
                var theme = localStorage.getItem("evac-theme");
                if (theme) document.documentElement.setAttribute("data-theme", theme);
            }} catch(e) {{}}
        }})();
    </script>
    <link rel="icon" type="image/png" sizes="32x32" href="{pre}favicon-32.png">
    <link rel="icon" type="image/png" sizes="512x512" href="{pre}favicon.png">
    <link rel="shortcut icon" href="{pre}favicon.ico">
    <link rel="apple-touch-icon" href="{pre}apple-touch-icon.png">
    <link rel="stylesheet" href="{extra or pre + 'evac.css'}">
    <link rel="stylesheet" href="{pre}assets/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="{pre}navigation.css">
    <script src="{pre}navigation.js"></script>
</head>
<body>
    <div class="mesh-bg"></div>
    <nav class="navbar">
        <div class="logo-container">
            <div class="logo">evac.pips</div>
            <button id="theme-toggle" class="icon-btn" aria-label="Toggle Dark Mode"><i class="fas fa-moon"></i></button>
        </div>
        <ul class="nav-links">
            <li><a href="{pre}evac.html">Home</a></li>
            <li><a href="{pre}hotlines.html">Hotlines</a></li>
            <li><a href="{pre}safety.html">Safety Tips</a></li>
        </ul>
    </nav>
{body}
    <div class="fixed-waves">
        <svg viewBox="0 0 120 28" preserveAspectRatio="none">
            <defs><path id="wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" /></defs>
            <g class="wave-group">
                <use href="#wave" x="48" y="0" fill="rgba(2, 132, 199, 0.3)" />
                <use href="#wave" x="48" y="3" fill="rgba(2, 132, 199, 0.5)" />
                <use href="#wave" x="48" y="5" fill="rgba(2, 132, 199, 0.7)" />
                <use href="#wave" x="48" y="7" fill="var(--wave-solid)" />
            </g>
        </svg>
    </div>
    <div id="fade-overlay" class="fade-overlay"></div>
    <script src="{pre}auth.js"></script>
    <script src="{pre}evac.js"></script>
    <script src="{pre}app.js"></script>
</body>
</html>
'''

def area_page(name, brgys):
    r = random.Random(name); slug = SLUG(name)
    centers = [(f"{name} Municipal Gymnasium", brgys[0], 200),
               (f"{brgys[1]} Elementary School", brgys[1], 120),
               (f"{brgys[2]} Barangay Covered Court", brgys[2], 80)]
    if name in CENTER_OVERRIDES:
        centers = CENTER_OVERRIDES[name]
    cards = ""
    for cn, br, cap in centers:
        fid = make_fid(slug, cn)
        q = quote(f"{cn}, {br}, {name}, Rizal, Philippines")
        cards += f'''            <div class="evac-card" data-facility-id="{fid}" data-max-capacity="{cap}">
                <div class="card-header"><h3>{cn}</h3><span class="badge open">OPEN</span></div>
                <div class="address"><i class="fas fa-map-marker-alt"></i> Brgy. {br}, {name}</div>
                <div class="capacity-block">
                    <div class="capacity-labels"><span>Occupancy</span><span>0 / {cap} Members</span></div>
                    <div class="progress-bar"><div class="progress-fill" style="width: 0%;"></div></div>
                </div>
                <a class="action-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;query={q}">View Details &amp; Route</a>
            </div>
'''
    levels = [("high","High","Pre-emptive Evacuation",(30,90)),("moderate","Moderate","Monitoring",(5,25)),("low","Low","Normal",(0,0))]
    rows = ""
    for b in brgys:
        k, lbl, st, (a, z) = r.choice(levels)
        bq = quote(f"Barangay {b}, {name}, Rizal, Philippines")
        rows += f'''                    <tr><td><a href="https://www.google.com/maps/search/?api=1&amp;query={bq}" target="_blank" rel="noopener" class="brgy-link">{b} <i class="fas fa-arrow-right"></i></a></td><td><span class="badge {k}">{lbl}</span></td><td>{r.randint(a,z)}</td><td>{st}</td></tr>
'''
    badge = ("safe", "Alert Level 1")
    body = f'''
    <a href="../../evac.html" class="floating-back-btn" title="Back to Main Menu">
        <i class="fas fa-arrow-left"></i>
        <div class="back-btn-text"><span class="btn-title">Main Menu</span><span class="btn-subtitle">Rizal Portal</span></div>
    </a>
    <section class="dashboard-section">
        <div class="dashboard-header">
            <div><h1>{name} Evacuation Status</h1><p style="opacity: 0.8; margin-top: 5px;">Evacuation status for {name}, Rizal</p></div>
            <span class="status-badge {badge[0]}">{badge[1]}</span>
        </div>
        <p class="sample-note"><i class="fas fa-circle-info"></i> Demo data for presentation. Replace with verified official figures from the {name} MDRRMO before publishing.</p>
        <div class="dashboard-grid" style="margin-bottom: 40px;">
{cards}        </div>
        <div class="table-container">
            <h2 style="margin-bottom: 20px; color: var(--primary-accent);">Barangay Flood Susceptibility</h2>
            <table class="evac-table">
                <thead><tr><th>Barangay</th><th>Susceptibility Level</th><th>Est. Affected Families</th><th>Status</th></tr></thead>
                <tbody>
{rows}                </tbody>
            </table>
        </div>
    </section>'''
    d = os.path.join(ROOT_DIR, "areas", slug); os.makedirs(d, exist_ok=True)
    open(f"{d}/{slug}.html", "w", encoding="utf-8").write(shell(f"{name} Dashboard", "../../", body, extra=f"{slug}.css"))
    shutil.copy(os.path.join(ROOT_DIR, "areas", "angono", "angono.css"), f"{d}/{slug}.css")

HOT = [("National Emergency Hotline","911","Police, fire, medical and disaster response."),
       ("Philippine Red Cross","143","Rescue, first aid and relief."),
       ("NDRRMC Operations Center","(02) 8911-1406 / 8912-2665","National disaster monitoring and reporting."),
       ("Your Municipal DRRMO","Add number","Contact your MDRRMO for local evacuation orders.")]
TIPS = [("Before the flood",["Pack a go-bag: water, food, flashlight, power bank, medicines, copies of IDs.","Know your barangay's evacuation center and two routes to it.","Move appliances and documents to higher ground when a warning is raised."]),
        ("During the flood",["Evacuate early when your LGU orders it; do not wait for water to rise.","Never walk or drive through floodwater; 15 cm can knock a person down.","Turn off the main power switch and gas before leaving."]),
        ("After the flood",["Return only when authorities say it is safe.","Avoid floodwater: it can carry leptospirosis and electrical hazards.","Boil drinking water and report damaged lines to your barangay."])]

def info_page(fn, title, sub, cards):
    body = f'''
    <section class="dashboard-section">
        <div class="dashboard-header"><div><h1>{title}</h1><p style="opacity: 0.8; margin-top: 5px;">{sub}</p></div></div>
        <div class="dashboard-grid">
{cards}        </div>
    </section>'''
    open(os.path.join(ROOT_DIR, fn), "w", encoding="utf-8").write(shell(title, "", body))

for n, b in AREAS.items(): area_page(n, b)
info_page("hotlines.html", "Emergency Hotlines", "Save these numbers. Verify them with your LGU before publishing.",
    "".join(f'            <div class="evac-card"><div class="card-header"><h3>{a}</h3></div><div class="hotline-num">{b}</div><p style="opacity:.8">{c}</p></div>\n' for a,b,c in HOT))
info_page("safety.html", "Flood Safety Tips", "Simple steps that protect your family.",
    "".join(f'            <div class="evac-card"><div class="card-header"><h3>{t}</h3></div><ul class="tip-list">{"".join(f"<li>{i}</li>" for i in items)}</ul></div>\n' for t,items in TIPS))
