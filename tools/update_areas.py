import os
import re
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
AREAS_DIR = os.path.join(ROOT_DIR, "areas")

def make_facility_id(area_slug, facility_name):
    raw = f"{area_slug}-{facility_name}".lower()
    raw = re.sub(r'[^a-z0-9]+', '-', raw).strip('-')
    return raw

def process_html(filepath, area_slug):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []

    for i, line in enumerate(lines):

        if 'class="evac-card"' in line and 'data-facility-id' not in line:
            lookahead = '\n'.join(lines[i:i+15])
            h3_match = re.search(r'<h3>(.*?)</h3>', lookahead)
            cap_match = re.search(r'(\d+)\s*/\s*(\d+)\s*(?:Families|Members)', lookahead)

            fname = h3_match.group(1).strip() if h3_match else f"facility-{i}"
            max_cap = cap_match.group(2) if cap_match else "200"
            fid = make_facility_id(area_slug, fname)

            line = line.replace(
                'class="evac-card"',
                f'class="evac-card" data-facility-id="{fid}" data-max-capacity="{max_cap}"'
            )

        cap_match = re.search(r'(\d+)\s*/\s*(\d+)\s*(?:Families|Members)', line)
        if cap_match and int(cap_match.group(1)) > 0:
            line = line.replace(cap_match.group(0), f'0 / {cap_match.group(2)} Members')

        if 'progress-fill' in line:
            line = re.sub(r'style="width:\s*\d+%;"', 'style="width: 0%;"', line)
            line = line.replace('progress-fill full-bar', 'progress-fill')

        if 'badge full' in line:
            line = line.replace('badge full', 'badge open').replace('FULL', 'OPEN')

        if 'Capacity Reached' in line and 'disabled' in line:
            line = re.sub(
                r'<button class="action-btn disabled" disabled>Capacity Reached</button>',
                '<a class="action-btn" href="#">View Details</a>',
                line
            )

        new_lines.append(line)

    content = '\n'.join(new_lines)

    if 'auth.js' not in content:
        content = content.replace(
            '<script src="../../evac.js"></script>',
            '<script src="../../auth.js"></script>\n    <script src="../../evac.js"></script>\n    <script src="../../app.js"></script>'
        )

    if 'navigation.js' not in content:
        content = content.replace('</head>', '<link rel="stylesheet" href="../../navigation.css">\n    <script src="../../navigation.js"></script>\n</head>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  Updated: {filepath}", flush=True)

print("Updating area HTML files...", flush=True)
count = 0
for area_dir in sorted(os.listdir(AREAS_DIR)):
    area_path = os.path.join(AREAS_DIR, area_dir)
    if not os.path.isdir(area_path):
        continue

    html_file = os.path.join(area_path, f"{area_dir}.html")
    if os.path.exists(html_file):
        process_html(html_file, area_dir)
        count += 1

print(f"\nDone! Updated {count} files.", flush=True)
