import glob, json, os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = {}
for path in sorted(glob.glob(os.path.join(root, "areas", "*", "*.html"))):
    slug = os.path.basename(os.path.dirname(path))
    with open(path, encoding="utf-8") as f:
        html = f.read()
    title = re.search(r"<h1>(.*?) Evacuation Status</h1>", html)
    alert = re.search(r'status-badge (?:safe|warning|critical)">Alert Level (\d)', html)
    rows = re.findall(
        r'<tr>\s*<td>\s*<a [^>]*class="brgy-link">(.*?)\s*<i [^>]*></i></a>\s*</td>\s*'
        r'<td>\s*<span class="badge (?:high|moderate|low)">(High|Moderate|Low)</span>\s*</td>\s*'
        r"<td>\s*(\d+)\s*</td>\s*<td>\s*(.*?)\s*</td>\s*</tr>",
        html,
        re.S,
    )
    data[slug] = {
        "name": title.group(1) if title else slug,
        "alert": int(alert.group(1)) if alert else 1,
        "barangays": [
            {"name": n.replace("&amp;", "&"), "level": lv, "families": int(fam), "status": st}
            for n, lv, fam, st in rows
        ],
    }

with open(os.path.join(root, "flood-data.js"), "w", encoding="utf-8", newline="\n") as f:
    f.write("window.EVAC_FLOOD_DEFAULTS = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n")
print({k: len(v["barangays"]) for k, v in data.items()})
