
(() => {
    "use strict";
    const root = document.documentElement;
    const base = new URL(".", document.currentScript.src);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 960px) and (hover: none) and (pointer: coarse)");
    const routes = { home: "evac.html", hotlines: "hotlines.html", safety: "safety.html", admin: "admin.html", login: "login.html" };
    const order = ["home", "hotlines", "safety", "admin", "login"];
    const transitKey = "evac-navigation";
    let pending = null;
    let signature = "";
    let resizeFrame = 0;
    let navigating = false;

    function route(url) {
        try {
            const target = new URL(url, base);
            if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) return null;
            const path = target.pathname.slice(base.pathname.length);
            if (/^areas\/[^/]+\/[^/]+\.html$/.test(path)) return { key: "home", rank: 0.5, area: true };
            const key = Object.keys(routes).find(k => routes[k] === path);
            return key ? { key, rank: order.indexOf(key), area: false } : null;
        } catch (_) { return null; }
    }

    function setDirection(from, to) {
        const a = route(from), b = route(to);
        const direction = a && b && a.rank !== b.rank ? (b.rank > a.rank ? "forward" : "backward") : "neutral";
        root.dataset.navDirection = direction;
        return direction;
    }

    function remember(to) {
        const target = new URL(to, location.href);
        if (!route(target.href)) return;
        pending = { from: location.href, to: target.href, time: Date.now() };
        setDirection(pending.from, pending.to);
        try { sessionStorage.setItem(transitKey, JSON.stringify(pending)); } catch (_) {}
    }

    function go(to) {
        const target = new URL(to, location.href);
        if (target.href === location.href || navigating) return;
        navigating = true;
        remember(target.href);
        location.assign(target.href);

        setTimeout(() => { navigating = false; }, 1800);
    }

    try {
        pending = JSON.parse(sessionStorage.getItem(transitKey));
        if (pending && pending.to === location.href && Date.now() - pending.time < 15000) {
            setDirection(pending.from, pending.to);
        }
    } catch (_) {}

    window.addEventListener("pageswap", event => {
        const to = event.activation?.entry?.url;
        if (to) remember(to);
        if (motion.matches) event.viewTransition?.skipTransition();

    });
    window.addEventListener("pagereveal", event => {
        const activation = window.navigation?.activation;
        if (activation?.from?.url) setDirection(activation.from.url, location.href);
        else {
            try {
                const stored = JSON.parse(sessionStorage.getItem(transitKey));
                if (stored?.to === location.href && Date.now() - stored.time < 15000) setDirection(stored.from, stored.to);
            } catch (_) {}
        }
        positionCapsule();
        if (motion.matches) event.viewTransition?.skipTransition();
        try { sessionStorage.removeItem(transitKey); } catch (_) {}
    });

    function positionCapsule() {
        const nav = document.querySelector(".nav-links");
        const active = nav?.querySelector('a[aria-current="page"]');
        const capsule = nav?.querySelector(".nav-indicator");
        if (!capsule) return;
        capsule.hidden = !active;
        if (!active) return;

        nav.classList.add("capsule-ready");
        const n = nav.getBoundingClientRect(), a = active.getBoundingClientRect();
        capsule.style.width = a.width + "px";
        capsule.style.height = a.height + "px";
        capsule.style.transform = `translate(${a.left - n.left - nav.clientLeft}px, ${a.top - n.top - nav.clientTop}px)`;
        nav.classList.add("capsule-ready");
    }

    function schedulePosition() {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(positionCapsule);
    }

    function closeProfile(focus = false) {
        const button = document.getElementById("profile-toggle");
        const card = document.getElementById("profile-card");
        const wasOpen = card && !card.hidden;
        if (card) card.hidden = true;
        if (button) {
            button.setAttribute("aria-expanded", "false");
            if (focus && wasOpen) button.focus();
        }
    }

    function fillProfile(user) {
        const shell = document.querySelector(".profile-shell");
        if (!shell || !user) return;
        const name = String(user.fullName || user.username);
        shell.querySelector(".profile-name-full").textContent = name;
        shell.querySelector(".profile-name-short").textContent = name.trim().split(/\s+/)[0];
        const button = shell.querySelector("#profile-toggle");
        button.setAttribute("aria-label", `Profile information for ${name}`);
        const record = EvacAuth.getCurrentUserRecord();
        const values = {
            name, username: user.username, role: EvacAuth.isAdmin() ? "Admin" : "Resident",
            municipality: user.municipality || "Not specified", family: String(user.familyMembers || 1),
            status: record ? `At ${record.facilityName}` : "Not evacuated"
        };
        Object.entries(values).forEach(([key, value]) => {
            shell.querySelector(`[data-profile="${key}"]`).textContent = value;
        });
        shell.querySelector('[data-profile="status"]').classList.toggle("is-evacuated", !!record);
    }

    function refresh() {
        if (typeof EvacAuth === "undefined") return;
        const navbar = document.querySelector(".navbar");
        const nav = navbar?.querySelector(".nav-links");
        if (!nav) return;
        const user = EvacAuth.currentUser();
        const nextSignature = user ? (EvacAuth.isAdmin() ? "admin" : "resident") : "guest";
        const current = route(location.href);
        if (signature !== nextSignature || !nav.querySelector(".nav-indicator")) {
            signature = nextSignature;
            const items = [["home", "Home", "fa-house"], ["hotlines", "Hotlines", "fa-phone"], ["safety", "Safety Tips", "fa-life-ring"]];
            if (user && EvacAuth.isAdmin()) items.push(["admin", "Admin", "fa-shield-halved"]);
            items.push(user ? ["logout", "Logout", "fa-arrow-right-from-bracket"] : ["login", "Login", "fa-right-to-bracket"]);
            nav.innerHTML = '<li class="nav-indicator" role="presentation" aria-hidden="true"><span></span></li>' + items.map(([key, label, icon]) =>
                `<li><a href="${new URL(routes[key] || routes.login, base).href}" data-nav="${key}" class="nav-${key}"${key === "logout" ? ' data-logout=""' : ""}><i class="fas ${icon}" aria-hidden="true"></i><span>${label}</span></a></li>`
            ).join("");
            navbar.querySelectorAll(".profile-shell, .nav-user-mobile").forEach(el => el.remove());
            const shell = document.createElement("div");
            shell.className = "profile-shell";
            if (user) {
                shell.innerHTML = `
                    <button type="button" class="nav-user profile-toggle" id="profile-toggle" aria-expanded="false" aria-controls="profile-card">
                        <i class="fas fa-user-circle" aria-hidden="true"></i><span class="user-name profile-name-full"></span><span class="user-name profile-name-short"></span><i class="fas fa-chevron-down profile-chevron" aria-hidden="true"></i>
                    </button>
                    <section class="profile-card" id="profile-card" role="region" aria-labelledby="profile-heading" hidden>
                        <div class="profile-card-heading"><h2 id="profile-heading">Profile information</h2><button type="button" class="icon-btn profile-close" aria-label="Close profile"><i class="fas fa-xmark" aria-hidden="true"></i></button></div>
                        <p class="profile-full-name" data-profile="name"></p>
                        <dl><div><dt>Username</dt><dd data-profile="username"></dd></div><div><dt>Role</dt><dd data-profile="role"></dd></div><div><dt>Municipality</dt><dd data-profile="municipality"></dd></div><div><dt>Family members</dt><dd data-profile="family"></dd></div><div class="profile-status"><dt>Evacuation status</dt><dd data-profile="status" aria-live="polite"></dd></div></dl>
                        <button type="button" class="profile-logout" data-logout><i class="fas fa-arrow-right-from-bracket" aria-hidden="true"></i> Logout</button>
                    </section>`;
                shell.querySelector("#profile-toggle").addEventListener("click", () => {
                    const button = shell.querySelector("#profile-toggle"), card = shell.querySelector("#profile-card");
                    const open = button.getAttribute("aria-expanded") !== "true";
                    card.hidden = !open;
                    button.setAttribute("aria-expanded", String(open));
                });
                shell.querySelector(".profile-close").addEventListener("click", () => closeProfile(true));
                shell.addEventListener("focusout", event => {
                    if (!shell.contains(event.relatedTarget)) closeProfile();
                });
            } else {
                const login = document.createElement("a");
                login.className = "nav-user profile-login";
                login.href = new URL(routes.login, base).href;
                login.innerHTML = '<i class="fas fa-right-to-bracket" aria-hidden="true"></i><span>Login</span>';
                shell.appendChild(login);
            }
            navbar.appendChild(shell);
        }
        nav.querySelectorAll("a[data-nav]").forEach(a => {
            a.style.viewTransitionName = "evac-link-" + a.dataset.nav;
            const active = a.dataset.nav === current?.key;
            a.classList.toggle("active", active);
            if (active) a.setAttribute("aria-current", "page");
            else a.removeAttribute("aria-current");
        });
        fillProfile(user);
        positionCapsule();
    }

    function hidePasswords() {
        document.querySelectorAll(".password-field").forEach(wrapper => {
            const input = wrapper.querySelector("input"), button = wrapper.querySelector(".password-toggle");
            if (input && button) setPasswordVisibility(input, button, false);
        });
    }
    function setPasswordVisibility(input, button, visible) {
        input.type = visible ? "text" : "password";
        button.setAttribute("aria-pressed", String(visible));
        button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
        button.title = visible ? "Hide password" : "Show password";
        button.querySelector("i").className = "fas " + (visible ? "fa-eye-slash" : "fa-eye");
    }
    function enhancePasswords(scope = document) {
        scope.querySelectorAll('input[type="password"]').forEach(input => {
            if (input.closest(".password-field")) return;
            const wrapper = document.createElement("div");
            wrapper.className = "password-field";
            input.before(wrapper);
            wrapper.appendChild(input);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "password-toggle";
            button.setAttribute("aria-controls", input.id);
            button.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i>';
            wrapper.appendChild(button);
            setPasswordVisibility(input, button, false);
            button.addEventListener("click", () => setPasswordVisibility(input, button, input.type === "password"));

            wrapper.addEventListener("focusout", event => {
                if (!wrapper.contains(event.relatedTarget)) setPasswordVisibility(input, button, false);
            });
            input.form?.addEventListener("reset", () => setPasswordVisibility(input, button, false));
            input.form?.addEventListener("submit", () => setPasswordVisibility(input, button, false));
        });
    }

    function ripple(link) {
        if (motion.matches) return;
        link.querySelector(".nav-ripple")?.remove();
        const ring = document.createElement("span");
        ring.className = "nav-ripple";
        ring.setAttribute("aria-hidden", "true");
        link.appendChild(ring);
        ring.addEventListener("animationend", () => ring.remove(), { once: true });
        setTimeout(() => ring.remove(), 800);
    }

    function closeLogoutConfirm(opener) {
        document.querySelector(".logout-overlay")?.remove();
        if (opener?.isConnected) opener.focus();
    }
    function confirmLogout(opener, onConfirm) {
        if (document.querySelector(".logout-overlay")) return;
        const overlay = document.createElement("div");
        overlay.className = "logout-overlay";
        overlay.innerHTML = `
            <div class="logout-blur" aria-hidden="true"></div>
            <section class="logout-card" role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-text">
                <div class="logout-icon" aria-hidden="true"><i class="fas fa-arrow-right-from-bracket"></i></div>
                <h2 id="logout-title">Log out?</h2>
                <p id="logout-text">Are you sure you want to log out of your account?</p>
                <div class="logout-actions">
                    <button type="button" class="logout-cancel">Cancel</button>
                    <button type="button" class="logout-confirm">Log out</button>
                </div>
            </section>`;
        document.body.appendChild(overlay);
        const cancel = overlay.querySelector(".logout-cancel");
        const confirmBtn = overlay.querySelector(".logout-confirm");
        cancel.addEventListener("click", () => closeLogoutConfirm(opener));
        confirmBtn.addEventListener("click", () => { closeLogoutConfirm(); onConfirm(); });
        overlay.addEventListener("click", event => { if (event.target === overlay || event.target.classList.contains("logout-blur")) closeLogoutConfirm(opener); });
        overlay.addEventListener("keydown", event => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeLogoutConfirm(opener); return; }
            if (event.key !== "Tab") return;
            const first = cancel, last = confirmBtn;
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        cancel.focus();
    }

    document.addEventListener("click", event => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        const logout = target.closest("[data-logout]");
        if (logout) {
            event.preventDefault();
            confirmLogout(logout, () => {
                closeProfile();
                EvacAuth.logout();
                go(new URL(routes.login, base).href);
            });
            return;
        }
        if (!target.closest(".profile-shell")) closeProfile();
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
        const link = target.closest("a[href]");
        if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self") || link.getAttribute("href").startsWith("#")) return;
        if (!route(link.href)) return;
        if (link.matches(".nav-links a")) ripple(link);
        if (link.href === location.href) { event.preventDefault(); return; }
        remember(link.href);

    });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeProfile(true); });

    function installSwipe() {
        let gesture = null;
        const blocked = "a, button, input, select, textarea, label, [contenteditable], [role=slider], [role=listbox], [role=combobox], .custom-select-wrapper, .muni-select, table, .table-container, .navbar, .profile-card, .account-dialog, [data-no-swipe]";
        function canStart(target) {
            if (!mobile.matches || !route(location.href) || route(location.href).key === "login") return false;
            if (document.querySelector('.account-modal:not([hidden]), #profile-card:not([hidden]), .logout-overlay')) return false;
            if (!(target instanceof Element) || target.closest(blocked)) return false;
            for (let el = target; el && el !== document.body; el = el.parentElement) {
                if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return false;
            }
            return true;
        }
        document.addEventListener("touchstart", event => {
            gesture = null;
            if (event.touches.length !== 1 || !canStart(event.target)) return;
            const t = event.touches[0];
            if (t.clientX < 24 || t.clientX > innerWidth - 24) return;
            gesture = { id: t.identifier, x: t.clientX, y: t.clientY, time: Date.now(), horizontal: false };
        }, { passive: true });
        document.addEventListener("touchmove", event => {
            if (!gesture) return;
            if (event.touches.length !== 1) { gesture = null; return; }
            const t = event.touches[0];
            const dx = Math.abs(t.clientX - gesture.x), dy = Math.abs(t.clientY - gesture.y);
            if (dy > 36 || (!gesture.horizontal && dy > 12 && dy > dx)) { gesture = null; return; }
            if (dx > 14 && dx > dy * 1.5) gesture.horizontal = true;
            if (gesture.horizontal && event.cancelable) event.preventDefault();
        }, { passive: false });
        document.addEventListener("touchend", event => {
            const g = gesture;
            gesture = null;
            if (!g || !mobile.matches || event.touches.length) return;
            const t = Array.from(event.changedTouches).find(touch => touch.identifier === g.id);
            if (!t) return;
            const dx = t.clientX - g.x, dy = t.clientY - g.y;
            if (Math.abs(dx) < Math.max(64, Math.min(96, innerWidth * 0.18)) || Math.abs(dx) < Math.abs(dy) * 1.8 || Math.abs(dy) > 36 || Date.now() - g.time > 1200) return;
            const current = route(location.href);
            const tabs = ["home", "hotlines", "safety"];
            if (EvacAuth.isAdmin()) tabs.push("admin");
            const index = tabs.indexOf(current.key);
            if (index === -1) return;
            const key = current.area && dx > 0 ? "home" : tabs[index + (dx < 0 ? 1 : -1)];
            if (key) go(new URL(routes[key], base).href);
        }, { passive: true });
        document.addEventListener("touchcancel", () => { gesture = null; }, { passive: true });
    }

    function visibility() {
        root.classList.toggle("page-hidden", document.hidden);
        if (document.hidden) { hidePasswords(); closeProfile(); }
    }
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", () => { hidePasswords(); closeProfile(); closeLogoutConfirm(); });
    window.addEventListener("pageshow", () => { navigating = false; refresh(); hidePasswords(); });
    window.addEventListener("resize", schedulePosition);
    window.addEventListener("evac:change", refresh);
    window.addEventListener("storage", event => {
        if (!event.key || ["evac-users", "evac-session", "evac-records"].includes(event.key)) refresh();
    });
    document.addEventListener("DOMContentLoaded", () => {
        refresh();
        enhancePasswords();
        installSwipe();
        visibility();
        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(schedulePosition);
            const navbar = document.querySelector(".navbar");
            if (navbar) observer.observe(navbar);
            const nav = document.querySelector(".nav-links");
            if (nav) observer.observe(nav);
        }
        if (document.fonts) document.fonts.ready.then(positionCapsule);
    });
    window.EvacNavigation = { go, route, refresh, positionCapsule };
    window.EvacUI = { refresh, enhancePasswords, hidePasswords, closeProfile };
})();
