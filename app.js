
document.addEventListener("DOMContentLoaded", () => {

    if (typeof EvacAuth === "undefined") return;

    injectUserBar();

    const cards = document.querySelectorAll(".evac-card[data-facility-id]");
    cards.forEach(card => refreshCard(card));

    window.addEventListener("pageshow", () => {
        document.querySelectorAll(".evac-card[data-facility-id]").forEach(card => refreshCard(card));
    });

    window.addEventListener("evac:change", () => {
        document.querySelectorAll(".evac-card[data-facility-id]").forEach(card => refreshCard(card));
    });

    window.addEventListener("storage", (e) => {
        if (e.key === null || e.key === "evac-records" || e.key === "evac-session" || e.key === "evac-users") {
            injectUserBar();
            document.querySelectorAll(".evac-card[data-facility-id]").forEach(card => refreshCard(card));
        }
    });
});

function injectUserBar() {
    if (window.EvacUI) EvacUI.refresh();
}

function getDepthToRoot() {
    const path = window.location.pathname.replace(/\\/g, "/");
    if (path.includes("/areas/")) return "../../";
    return "";
}

function refreshCard(card) {
    const facilityId = card.getAttribute("data-facility-id");
    const maxCap = parseInt(card.getAttribute("data-max-capacity"), 10) || 200;

    const totals = EvacAuth.getFacilityTotals(facilityId);
    const families = totals.families;
    const persons = totals.persons;
    const pct = maxCap > 0 ? Math.min(100, Math.round((persons / maxCap) * 100)) : 0;
    const isFull = persons >= maxCap;

    const labelSpans = card.querySelectorAll(".capacity-labels span");
    if (labelSpans.length >= 2) {
        labelSpans[0].textContent = "Occupancy";
        labelSpans[1].innerHTML = `<strong>${persons}</strong> / ${maxCap} Members &nbsp;·&nbsp; <strong>${families}</strong> Families`;
    }

    const fill = card.querySelector(".progress-fill");
    if (fill) {
        fill.style.width = pct + "%";
        if (isFull) {
            fill.classList.add("full-bar");
        } else {
            fill.classList.remove("full-bar");
        }
    }

    const badge = card.querySelector(".card-header .badge");
    if (badge) {
        if (isFull) {
            badge.className = "badge full";
            badge.textContent = "FULL";
        } else {
            badge.className = "badge open";
            badge.textContent = "OPEN";
        }
    }

    let actionGroup = card.querySelector(".card-action-group");
    if (!actionGroup) {
        actionGroup = document.createElement("div");
        actionGroup.className = "card-action-group";
        card.appendChild(actionGroup);
    }

    let mapsLink = actionGroup.querySelector(".map-route-btn");
    if (!mapsLink) {
        const existingBtn = card.querySelector(".action-btn:not(.evac-action-btn):not(.map-route-btn)");
        if (existingBtn && existingBtn.tagName === "A" && existingBtn.getAttribute("href") && existingBtn.getAttribute("href") !== "#") {
            mapsLink = existingBtn;
            mapsLink.classList.add("map-route-btn");
            actionGroup.appendChild(mapsLink);
        } else {
            if (existingBtn) existingBtn.remove();
            mapsLink = document.createElement("a");
            mapsLink.className = "action-btn map-route-btn";
            mapsLink.target = "_blank";
            mapsLink.rel = "noopener";
            actionGroup.appendChild(mapsLink);
        }
    }

    const facName = card.querySelector(".card-header h3")?.textContent.trim() || facilityId;
    const addressText = card.querySelector(".address")?.textContent.trim() || "";
    const cleanAddress = addressText.replace(/\s+/g, " ");
    const mapQuery = encodeURIComponent(`${facName}, ${cleanAddress}, Rizal, Philippines`);
    mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
    mapsLink.innerHTML = `<i class="fas fa-map-location-dot"></i> View Route &amp; Map`;

    let evacBtn = actionGroup.querySelector(".evac-action-btn");
    if (!evacBtn) {
        evacBtn = document.createElement("button");
        evacBtn.className = "action-btn evac-action-btn";
        actionGroup.appendChild(evacBtn);
    }

    const user = EvacAuth.currentUser();
    const userRecord = user ? EvacAuth.getCurrentUserRecord() : null;
    const isHere = userRecord && userRecord.facilityId === facilityId;

    if (!user) {
        evacBtn.innerHTML = `<i class="fas fa-right-to-bracket"></i> Login to Evacuate`;
        evacBtn.disabled = false;
        evacBtn.className = "action-btn evac-action-btn";
        evacBtn.onclick = () => {
            const depth = getDepthToRoot();
            EvacNavigation.go(depth + "login.html");
        };
    } else if (isHere) {
        evacBtn.innerHTML = `<i class="fas fa-check-circle"></i> Registered (${escapeHtml(String(user.familyMembers))} members) — Leave Shelter`;
        evacBtn.disabled = false;
        evacBtn.className = "action-btn evac-action-btn evacuated-here";
        evacBtn.onclick = () => {
            if (confirm(`Confirm departure from “${facName}”?`)) {
                EvacAuth.unevacuate(facilityId);
                document.querySelectorAll(".evac-card[data-facility-id]").forEach(c => refreshCard(c));
            }
        };
    } else if (userRecord) {
        evacBtn.innerHTML = `<i class="fas fa-lock"></i> Registered at: ${escapeHtml(userRecord.facilityName)}`;
        evacBtn.disabled = true;
        evacBtn.className = "action-btn evac-action-btn disabled";
        evacBtn.onclick = null;
    } else if (isFull) {
        evacBtn.innerHTML = `<i class="fas fa-ban"></i> Capacity Reached`;
        evacBtn.disabled = true;
        evacBtn.className = "action-btn evac-action-btn disabled";
        evacBtn.onclick = null;
    } else if (persons + Number(user.familyMembers || 0) > maxCap) {
        evacBtn.innerHTML = `<i class="fas fa-ban"></i> Not Enough Space (needs ${escapeHtml(String(user.familyMembers))} slots)`;
        evacBtn.disabled = true;
        evacBtn.className = "action-btn evac-action-btn disabled";
        evacBtn.onclick = null;
    } else {
        evacBtn.innerHTML = `<i class="fas fa-person-walking-arrow-right"></i> Evacuate Here (+${escapeHtml(String(user.familyMembers))} members)`;
        evacBtn.disabled = false;
        evacBtn.className = "action-btn evac-action-btn evacuate-btn";
        evacBtn.onclick = () => {
            const areaSlug = getAreaSlug();
            const result = EvacAuth.evacuate(facilityId, facName, areaSlug, maxCap);
            if (result.ok) {
                document.querySelectorAll(".evac-card[data-facility-id]").forEach(c => refreshCard(c));
            } else {
                alert(result.error);
            }
        };
    }
}

function getAreaSlug() {
    const path = window.location.pathname.replace(/\\/g, "/");
    const match = path.match(/areas\/([^/]+)\//);
    return match ? match[1] : "unknown";
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str || "");
    return div.innerHTML;
}
