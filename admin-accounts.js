
(() => {
    "use strict";
    let modal, form, originalUsername, returnFocus;

    function closeEditor() {
        if (!modal) return;
        EvacUI.hidePasswords();
        form.reset();
        modal.hidden = true;
        document.body.classList.remove("account-edit-open");
        if (returnFocus?.isConnected) returnFocus.focus();
        else document.querySelector(".edit-user-btn")?.focus();
        originalUsername = null;
    }

    function buildEditor() {
        modal = document.createElement("div");
        modal.className = "account-modal";
        modal.hidden = true;
        modal.innerHTML = `
            <section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" aria-describedby="account-description" tabindex="-1">
                <header><h2 id="account-title">Edit account</h2><button type="button" class="icon-btn account-close" aria-label="Close account editor"><i class="fas fa-xmark" aria-hidden="true"></i></button></header>
                <p id="account-description" class="account-description"></p>
                <form id="account-edit-form">
                    <label for="account-username">Username</label>
                    <input id="account-username" name="username" required minlength="3" maxlength="30" pattern="[a-zA-Z0-9._\\-]{3,30}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="account-username-hint">
                    <p id="account-username-hint" class="account-hint">3–30 letters, numbers, dots, dashes or underscores.</p>
                    <label for="account-password">New password</label>
                    <input id="account-password" name="new-password" type="password" minlength="6" autocomplete="new-password" aria-describedby="account-password-hint">
                    <p id="account-password-hint" class="account-hint">Saved password: ••••••••. Leave blank to keep it. A new password needs at least 6 characters.</p>
                    <p id="account-error" class="account-error" role="alert" hidden></p>
                    <div class="account-actions"><button type="button" class="account-secondary account-cancel">Cancel</button><button type="submit" class="account-primary">Save changes</button></div>
                </form>
            </section>`;
        document.body.appendChild(modal);
        form = modal.querySelector("form");
        EvacUI.enhancePasswords(modal);
        modal.querySelector(".account-close").addEventListener("click", closeEditor);
        modal.querySelector(".account-cancel").addEventListener("click", closeEditor);
        modal.addEventListener("click", event => { if (event.target === modal) closeEditor(); });
        modal.addEventListener("keydown", event => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeEditor(); }
            if (event.key !== "Tab") return;
            const focusable = Array.from(modal.querySelectorAll("button, input, [tabindex='0']")).filter(el => !el.disabled && el.getClientRects().length);
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        form.addEventListener("submit", event => {
            event.preventDefault();
            const username = form.querySelector("#account-username").value;
            const password = form.querySelector("#account-password").value;
            const result = EvacAuth.adminUpdateUser(originalUsername, username, password);
            if (!result.ok) {
                const error = form.querySelector("#account-error");
                error.textContent = result.error;
                error.hidden = false;
                return;
            }
            closeEditor();

            if (typeof renderAdmin === "function") renderAdmin();
            EvacUI.refresh();
            const notice = document.getElementById("account-notice");
            if (notice) {
                notice.textContent = `Account updated: ${username.trim().toLowerCase()}.`;
                notice.hidden = false;
            }
        });
    }

    document.addEventListener("click", event => {
        const button = event.target.closest(".edit-user-btn");
        if (!button || !EvacAuth.isAdmin()) return;
        const user = EvacAuth.getAllUsers().find(u => u.username === button.dataset.username);
        if (!user) return;
        if (!modal) buildEditor();
        returnFocus = button;
        originalUsername = user.username;
        form.reset();
        modal.querySelector("#account-description").textContent = `Update the login details for ${user.fullName || user.username}. Evacuation records stay linked to this account.`;
        form.querySelector("#account-username").value = user.username;

        form.querySelector("#account-password").value = "";
        form.querySelector("#account-error").hidden = true;
        modal.hidden = false;
        document.body.classList.add("account-edit-open");
        EvacUI.closeProfile();
        form.querySelector("#account-username").focus();
    });

    function checkAccess() { if (modal && !modal.hidden && !EvacAuth.isAdmin()) closeEditor(); }
    window.addEventListener("evac:change", checkAccess);
    window.addEventListener("storage", event => {
        checkAccess();
        if (modal && !modal.hidden && (!event.key || event.key === "evac-users")) {
            const error = form.querySelector("#account-error");
            error.textContent = "Accounts changed in another tab. Close and reopen this editor before saving.";
            error.hidden = false;
            form.querySelector('[type="submit"]').disabled = true;
        }
    });
    document.addEventListener("click", event => {
        if (event.target.closest(".edit-user-btn") && modal) form.querySelector('[type="submit"]').disabled = false;
    });
    window.addEventListener("pagehide", () => { if (modal && !modal.hidden) closeEditor(); });
})();
