const EvacFloodAdmin = (function () {
    const DEFAULTS = window.EVAC_FLOOD_DEFAULTS || {};
    const SLUGS = Object.keys(DEFAULTS);
    const ALERT_LABELS = { 1: "Safe", 2: "Warning", 3: "Critical" };
    let selected = SLUGS[0];
    let root = null;
    let savedTimer = null;
    let inputTimer = null;
    let focusKey = null;

    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function effective(slug) {
        const base = DEFAULTS[slug];
        const override = EvacFlood.get(slug);
        return {
            slug,
            name: base.name,
            alert: override && override.alert ? Number(override.alert) : base.alert,
            updated: override && override.updated ? override.updated : null,
            edited: !!override,
            rows: base.barangays.map(b => {
                const o = override && override.brgys && override.brgys[b.name];
                return {
                    name: b.name,
                    level: o && o.level ? o.level : b.level,
                    families: o && o.families != null ? Number(o.families) : b.families,
                    status: o && o.status ? o.status : b.status
                };
            })
        };
    }

    function persist(data) {
        const brgys = {};
        data.rows.forEach(r => {
            brgys[r.name] = { level: r.level, families: r.families, status: r.status };
        });
        const ok = EvacFlood.set(data.slug, { alert: data.alert, updated: Date.now(), brgys });
        flashSaved(ok);
        return ok;
    }

    function flashSaved(ok) {
        const el = root && root.querySelector("#fl-saved");
        if (!el) return;
        el.className = "fl-saved " + (ok ? "ok" : "bad");
        el.innerHTML = ok
            ? '<i class="fas fa-check"></i> Saved'
            : '<i class="fas fa-triangle-exclamation"></i> Could not save in this browser';
        clearTimeout(savedTimer);
        savedTimer = setTimeout(() => {
            el.className = "fl-saved";
            el.textContent = "Changes save automatically";
        }, 1800);
    }

    function worst(rows) {
        if (rows.some(r => r.level === "High")) return "high";
        if (rows.some(r => r.level === "Moderate")) return "moderate";
        return "low";
    }

    function seg(kind, options, current, label, extra) {
        const buttons = options.map(o => {
            const on = String(o.v) === String(current);
            return `<button type="button" class="${o.cls || ""}${on ? " on" : ""}" data-kind="${kind}" data-v="${esc(o.v)}" aria-pressed="${on}"${extra || ""}>${esc(o.t)}</button>`;
        }).join("");
        return `<div class="fl-seg" role="group" aria-label="${esc(label)}">${buttons}</div>`;
    }

    function chipsHtml() {
        return SLUGS.map(slug => {
            const data = effective(slug);
            const on = slug === selected;
            return `<button type="button" class="fl-chip${on ? " on" : ""}" data-slug="${slug}" aria-pressed="${on}">${esc(data.name)}<span class="fl-dot ${worst(data.rows)}"></span></button>`;
        }).join("");
    }

    function summaryHtml(data) {
        const count = lv => data.rows.filter(r => r.level === lv).length;
        const families = data.rows.reduce((s, r) => s + r.families, 0);
        return `<span class="badge high">${count("High")} High</span>
            <span class="badge moderate">${count("Moderate")} Moderate</span>
            <span class="badge low">${count("Low")} Low</span>
            <span class="fl-families"><i class="fas fa-house-flood-water"></i> ${families} families affected</span>`;
    }

    function metaText(data) {
        if (!data.edited) return "Showing default values";
        const when = new Date(data.updated).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
        return "Manually updated " + when;
    }

    function rowHtml(r, i) {
        const levels = [
            { v: "Low", t: "Low", cls: "low" },
            { v: "Moderate", t: "Moderate", cls: "moderate" },
            { v: "High", t: "High", cls: "high" }
        ];
        const statuses = EvacFlood.STATUSES.map(s => `<option value="${esc(s)}"${s === r.status ? " selected" : ""}>${esc(s)}</option>`).join("");
        return `<div class="fl-row" data-row="${i}">
            <div class="fl-name">${esc(r.name)}</div>
            <div class="fl-cell fl-level"><span class="fl-cap">Susceptibility</span>${seg("level", levels, r.level, r.name + " susceptibility", ` data-row="${i}"`)}</div>
            <label class="fl-cell fl-fam"><span class="fl-cap">Affected families</span><input type="number" min="0" max="99999" step="1" inputmode="numeric" value="${r.families}" data-row="${i}" aria-label="${esc(r.name)} affected families"></label>
            <label class="fl-cell fl-stat"><span class="fl-cap">Status</span><select data-row="${i}" aria-label="${esc(r.name)} status">${statuses}</select></label>
        </div>`;
    }

    function panelHtml(data) {
        const alerts = [1, 2, 3].map(n => ({ v: n, t: n + " " + ALERT_LABELS[n], cls: "a" + n }));
        const bulk = [
            { v: "Low", t: "Low", cls: "low" },
            { v: "Moderate", t: "Moderate", cls: "moderate" },
            { v: "High", t: "High", cls: "high" }
        ].map(o => `<button type="button" class="fl-bulk-btn ${o.cls}" data-kind="bulk" data-v="${o.v}">${o.t}</button>`).join("");
        return `<div class="fl-top">
                <div class="fl-title">
                    <h3>${esc(data.name)}</h3>
                    <div class="fl-summary">${summaryHtml(data)}</div>
                    <div class="fl-meta">${esc(metaText(data))}</div>
                </div>
                <div class="fl-alert"><span class="fl-cap">Alert level</span>${seg("alert", alerts, data.alert, "Alert level")}</div>
            </div>
            <div class="fl-bulkrow"><span class="fl-cap">Set every barangay to</span><div class="fl-bulk">${bulk}</div></div>
            <div class="fl-head"><span>Barangay</span><span>Susceptibility</span><span>Affected families</span><span>Status</span></div>
            <div class="fl-rows">${data.rows.map(rowHtml).join("")}</div>
            <div class="fl-actions">
                <button type="button" class="fl-reset" data-kind="reset"><i class="fas fa-rotate-left"></i> Reset to default</button>
                <span id="fl-saved" class="fl-saved">Changes save automatically</span>
            </div>`;
    }

    function render() {
        if (!root) return;
        const data = effective(selected);
        root.querySelector(".fl-chips").innerHTML = chipsHtml();
        const savedEl = root.querySelector("#fl-saved");
        const savedClass = savedEl ? savedEl.className : "fl-saved";
        const savedHtml = savedEl ? savedEl.innerHTML : "Changes save automatically";
        root.querySelector(".fl-panel").innerHTML = panelHtml(data);
        const again = root.querySelector("#fl-saved");
        again.className = savedClass;
        again.innerHTML = savedHtml;
        if (focusKey) {
            const target = root.querySelector(focusKey);
            if (target) target.focus();
            focusKey = null;
        }
    }

    function refreshLight() {
        const data = effective(selected);
        root.querySelector(".fl-chips").innerHTML = chipsHtml();
        root.querySelector(".fl-summary").innerHTML = summaryHtml(data);
        root.querySelector(".fl-meta").textContent = metaText(data);
    }

    function onClick(e) {
        const chip = e.target.closest(".fl-chip");
        if (chip) {
            selected = chip.getAttribute("data-slug");
            render();
            return;
        }
        const btn = e.target.closest("button[data-kind]");
        if (!btn) return;
        const kind = btn.getAttribute("data-kind");
        const data = effective(selected);

        if (kind === "level") {
            const i = Number(btn.getAttribute("data-row"));
            data.rows[i].level = btn.getAttribute("data-v");
            focusKey = `.fl-row[data-row="${i}"] button[data-kind="level"][data-v="${btn.getAttribute("data-v")}"]`;
        } else if (kind === "alert") {
            data.alert = Number(btn.getAttribute("data-v"));
            focusKey = `button[data-kind="alert"][data-v="${data.alert}"]`;
        } else if (kind === "bulk") {
            const level = btn.getAttribute("data-v");
            data.rows.forEach(r => { r.level = level; });
            focusKey = `button[data-kind="bulk"][data-v="${level}"]`;
        } else if (kind === "reset") {
            if (!confirm("Reset " + data.name + " to its default flood values?")) return;
            const ok = EvacFlood.reset(selected);
            render();
            flashSaved(ok);
            return;
        } else {
            return;
        }
        persist(data);
        render();
    }

    function onChange(e) {
        const i = e.target.getAttribute("data-row");
        if (i == null) return;
        const data = effective(selected);
        if (e.target.tagName === "SELECT") {
            data.rows[Number(i)].status = e.target.value;
        } else if (e.target.tagName === "INPUT") {
            clearTimeout(inputTimer);
            data.rows[Number(i)].families = clampFamilies(e.target.value);
            e.target.value = data.rows[Number(i)].families;
        } else {
            return;
        }
        persist(data);
        refreshLight();
    }

    function clampFamilies(value) {
        const n = Math.round(Number(value));
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(99999, n));
    }

    function onInput(e) {
        if (e.target.tagName !== "INPUT" || e.target.getAttribute("data-row") == null) return;
        const i = Number(e.target.getAttribute("data-row"));
        const value = e.target.value;
        clearTimeout(inputTimer);
        inputTimer = setTimeout(() => {
            const data = effective(selected);
            data.rows[i].families = clampFamilies(value);
            persist(data);
            refreshLight();
        }, 400);
    }

    function build() {
        root = document.createElement("div");
        root.className = "admin-card fl-card";
        root.innerHTML = `<h2><i class="fas fa-water"></i> Flood Intensity Control</h2>
            <p class="fl-hint">Set how severe flooding is in each barangay. Pick a municipality, then adjust the susceptibility level, affected families and status. Changes appear on the public area pages.</p>
            <div class="fl-chips" role="group" aria-label="Municipality"></div>
            <div class="fl-panel"></div>`;
        root.addEventListener("click", onClick);
        root.addEventListener("change", onChange);
        root.addEventListener("input", onInput);
        window.addEventListener("storage", (e) => {
            if (e.key === EvacFlood.KEY) render();
        });
        render();
    }

    function mount() {
        if (!SLUGS.length) return;
        if (!root) build();
        const slot = document.getElementById("flood-slot");
        if (slot) slot.appendChild(root);
    }

    return { mount };
})();

function mountFloodControl() {
    EvacFloodAdmin.mount();
}
