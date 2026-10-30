document.addEventListener("DOMContentLoaded", () => {

    const themeBtn = document.getElementById("theme-toggle");
    const themeIcon = themeBtn ? themeBtn.querySelector("i") : null;
    const fadeOverlay = document.getElementById("fade-overlay");
    const body = document.documentElement;

    let isAnimating = false;
    try {
        if (localStorage.getItem("evac-theme") === "dark") {
            body.setAttribute("data-theme", "dark");
            if (themeIcon) { themeIcon.classList.remove("fa-moon"); themeIcon.classList.add("fa-sun"); }
        }
    } catch (e) {}

    if(themeBtn) {
        themeBtn.addEventListener("click", () => {
            if (isAnimating) return;
            isAnimating = true;
            const duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400;

            if (duration) fadeOverlay.classList.add("active");

            setTimeout(() => {
                if (body.getAttribute("data-theme") === "dark") {
                    body.setAttribute("data-theme", "light");
                    themeIcon.classList.remove("fa-sun");
                    themeIcon.classList.add("fa-moon");
                } else {
                    body.setAttribute("data-theme", "dark");
                    themeIcon.classList.remove("fa-moon");
                    themeIcon.classList.add("fa-sun");
                }

                try { localStorage.setItem("evac-theme", body.getAttribute("data-theme")); } catch (e) {}
                setTimeout(() => {
                    fadeOverlay.classList.remove("active");
                    setTimeout(() => { isAnimating = false; }, duration);
                }, duration ? 50 : 0);
            }, duration);
        });
    }

    const selectWrapper = document.querySelector('.custom-select-wrapper');
    const selectTrigger = document.querySelector('.custom-select-trigger');
    const selectTriggerText = selectTrigger ? selectTrigger.querySelector('span') : null;
    const options = document.querySelectorAll('.custom-option');
    const hiddenInput = document.getElementById('city-input');

    if(selectTrigger) {
        selectTrigger.setAttribute("role", "button");
        selectTrigger.setAttribute("tabindex", "0");
        selectTrigger.setAttribute("aria-haspopup", "listbox");

        const closeSelect = () => selectWrapper.classList.remove("open");
        const toggleSelect = () => {
            const open = selectWrapper.classList.toggle("open");
            selectTrigger.setAttribute("aria-expanded", String(open));
        };

        selectTrigger.setAttribute("aria-expanded", "false");
        selectTrigger.addEventListener("click", (e) => {
            toggleSelect();
            e.stopPropagation();
        });
        selectTrigger.addEventListener("keydown", (e) => {
            if (["Enter", " ", "ArrowDown"].includes(e.key)) {
                e.preventDefault();
                toggleSelect();
            } else if (e.key === "Escape") {
                closeSelect();
                selectTrigger.setAttribute("aria-expanded", "false");
            }
        });

        options.forEach((option, index) => {
            option.setAttribute("role", "option");
            option.setAttribute("tabindex", "-1");
            option.addEventListener("click", () => {
                selectTriggerText.textContent = option.textContent;
                hiddenInput.value = option.getAttribute("data-value");
                closeSelect();
                selectTrigger.setAttribute("aria-expanded", "false");
            });
            option.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") option.click();
                if (e.key === "Escape") { closeSelect(); selectTrigger.focus(); }
                if (e.key === "ArrowDown") options[(index + 1) % options.length].focus();
                if (e.key === "ArrowUp") options[(index - 1 + options.length) % options.length].focus();
            });
        });

        document.addEventListener('click', (e) => {
            if (!selectWrapper.contains(e.target)) {
                selectWrapper.classList.remove('open');
                selectTrigger.setAttribute("aria-expanded", "false");
            }
        });
    }

    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const cityValue = document.getElementById('city-input').value.toLowerCase();

            if (cityValue) {
                let fileName = cityValue.trim().replace(/\s+/g, "-");

                if (cityValue.includes("rodriguez")) fileName = "rodriguez";

                EvacNavigation.go(`areas/${fileName}/${fileName}.html`);
            } else {
                alert("Please select a municipality first.");
            }
        });
    }
});

function evacDecorateNav() {
    const path = window.location.pathname.replace(/\\/g, "/");
    const file = path.split("/").pop() || "evac.html";
    const section = path.includes("/areas/") ? "evac.html" : file;
    const icons = { home: "fa-house", hotlines: "fa-phone", safety: "fa-life-ring" };
    const targets = { home: "evac.html", hotlines: "hotlines.html", safety: "safety.html", admin: "admin.html", login: "login.html" };
    document.querySelectorAll(".navbar .nav-links a").forEach(a => {
        let key = a.getAttribute("data-nav");
        if (!key) {
            const label = a.textContent.trim().toLowerCase();
            key = label === "home" ? "home" : label === "hotlines" ? "hotlines" : label.startsWith("safety") ? "safety" : "";
            if (key) a.setAttribute("data-nav", key);
        }
        if (key && icons[key] && !a.querySelector("i")) {
            const icon = document.createElement("i");
            icon.className = "fas " + icons[key];
            a.prepend(icon);
        }
        const active = !!key && targets[key] === section;
        a.classList.toggle("active", active);
        if (active) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
    });
    if (window.EvacNavigation) EvacNavigation.positionCapsule();
}

document.addEventListener("DOMContentLoaded", evacDecorateNav);

const EvacFlood = (function () {
    const KEY = "evac-flood";
    const LEVELS = ["Low", "Moderate", "High"];
    const STATUSES = ["Normal", "Monitoring", "Pre-emptive Evacuation", "Forced Evacuation"];
    const ALERTS = { 1: "safe", 2: "warning", 3: "critical" };

    function readAll() {
        try {
            const value = JSON.parse(localStorage.getItem(KEY));
            return value && typeof value === "object" ? value : {};
        } catch (e) {
            return {};
        }
    }

    function writeAll(all) {
        try {
            localStorage.setItem(KEY, JSON.stringify(all));
            return true;
        } catch (e) {
            return false;
        }
    }

    function canEdit() {
        return typeof EvacAuth === "undefined" || EvacAuth.isAdmin();
    }

    function get(slug) {
        return readAll()[slug] || null;
    }

    function set(slug, value) {
        if (!canEdit()) return false;
        const all = readAll();
        all[slug] = value;
        return writeAll(all);
    }

    function reset(slug) {
        if (!canEdit()) return false;
        const all = readAll();
        delete all[slug];
        return writeAll(all);
    }

    function currentSlug() {
        const match = window.location.pathname.replace(/\\/g, "/").match(/\/areas\/([^/]+)\//);
        return match ? match[1] : null;
    }

    let initialRows = null;
    let initialAlert = null;
    function apply() {
        const slug = currentSlug();
        if (!slug) return;
        const data = get(slug) || {};
        const alertBadge = document.querySelector(".dashboard-header .status-badge");
        if (!initialRows) {
            initialRows = Array.from(document.querySelectorAll(".evac-table tbody tr")).map(row => {
                const cells = row.querySelectorAll("td"), badge = cells[1]?.querySelector(".badge");
                return { cells, badge, badgeClass: badge?.className, badgeText: badge?.textContent,
                    families: cells[2]?.textContent, status: cells[3]?.textContent };
            });
            if (alertBadge) initialAlert = { className: alertBadge.className, text: alertBadge.textContent };
        }

        initialRows.forEach(({ cells, badge, badgeClass, badgeText, families, status }) => {
            if (badge) { badge.className = badgeClass; badge.textContent = badgeText; }
            if (cells[2]) cells[2].textContent = families;
            if (cells[3]) cells[3].textContent = status;
        });
        if (alertBadge && initialAlert) {
            alertBadge.className = initialAlert.className;
            alertBadge.textContent = initialAlert.text;
        }

        document.querySelectorAll(".evac-table tbody tr").forEach(row => {
            const link = row.querySelector(".brgy-link");
            if (!link) return;
            const name = link.textContent.replace(/\s+/g, " ").trim();
            const item = data.brgys && data.brgys[name];
            const cells = row.querySelectorAll("td");
            if (!item || cells.length < 4) return;
            const badge = cells[1].querySelector(".badge");
            if (badge && LEVELS.includes(item.level)) {
                badge.className = "badge " + item.level.toLowerCase();
                badge.textContent = item.level;
            }
            const families = Number(item.families);
            if (Number.isFinite(families)) cells[2].textContent = String(Math.max(0, Math.round(families)));
            if (STATUSES.includes(item.status)) cells[3].textContent = item.status;
        });

        if (alertBadge && ALERTS[data.alert]) {
            alertBadge.className = "status-badge " + ALERTS[data.alert];
            alertBadge.textContent = "Alert Level " + data.alert;
        }

        const container = document.querySelector(".table-container");
        if (container && data.updated) {
            const note = container.querySelector(".flood-updated") || document.createElement("p");
            note.className = "flood-updated";
            note.style.cssText = "margin-top:14px;font-size:0.85rem;opacity:0.7;";
            note.textContent = "Flood levels updated by the administrator on " +
                new Date(data.updated).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
            container.appendChild(note);
        } else if (container) {
            container.querySelector(".flood-updated")?.remove();
        }
    }

    document.addEventListener("DOMContentLoaded", apply);
    window.addEventListener("storage", (e) => {
        if (!e.key || e.key === KEY) apply();
    });
    window.addEventListener("pageshow", apply);

    return { KEY, LEVELS, STATUSES, ALERTS, get, set, reset, apply };
})();
