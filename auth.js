
const EvacAuth = (() => {
    const USERS_KEY = "evac-users";
    const SESSION_KEY = "evac-session";
    const RECORDS_KEY = "evac-records";
    const MAX_FAMILY_MEMBERS = 50;

    const readJSON = (key, fallback) => {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value ?? fallback;
        } catch {
            return fallback;
        }
    };

    const getUsers = () => readJSON(USERS_KEY, []);
    const saveUsers = users => localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const getRecords = () => readJSON(RECORDS_KEY, []);
    const saveRecords = records => localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    const getSession = () => readJSON(SESSION_KEY, null);

    function notifyChange() {
        window.dispatchEvent(new CustomEvent("evac:change"));
    }

    function hasAdminRole(user) {
        return !!user && (user.role === "admin" || (!user.role && user.username === "admin"));
    }

    function ensureDemoAdmin() {
        const users = getUsers();
        const existing = users.find(hasAdminRole);
        if (existing) {
            if (!existing.role) {
                existing.role = "admin";
                saveUsers(users);
            }
            return;
        }

        if (users.some(u => u.username === "admin")) return;
        users.push({ username: "admin", password: "admin123", fullName: "System Administrator",
            familyMembers: 1, municipality: "", role: "admin" });
        saveUsers(users);
        notifyChange();
    }

    function normalizeUsername(value) {
        return String(value || "").trim().toLowerCase();
    }

    function signup(username, password, fullName, familyMembers, municipality) {
        username = normalizeUsername(username);
        fullName = String(fullName || "").trim();
        password = String(password || "");
        familyMembers = Number.parseInt(familyMembers, 10);

        if (!username || !password || !fullName || !familyMembers) {
            return { ok: false, error: "All required fields must be completed." };
        }
        if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
            return { ok: false, error: "Username must be 3–30 characters using letters, numbers, dot, dash, or underscore." };
        }
        if (username === "admin") return { ok: false, error: "This username is reserved for the administrator." };
        if (password.length < 6) {
            return { ok: false, error: "Password must be at least 6 characters." };
        }
        if (fullName.length < 2 || fullName.length > 80) {
            return { ok: false, error: "Please enter a valid full name." };
        }
        if (!Number.isInteger(familyMembers) || familyMembers < 1 || familyMembers > MAX_FAMILY_MEMBERS) {
            return { ok: false, error: `Family members must be between 1 and ${MAX_FAMILY_MEMBERS}.` };
        }

        const users = getUsers();
        if (users.some(u => u.username === username)) {
            return { ok: false, error: "Username already taken." };
        }

        users.push({
            username,

            password,
            fullName,
            familyMembers,
            role: "resident",
            municipality: String(municipality || "").trim()
        });
        saveUsers(users);
        notifyChange();
        return { ok: true };
    }

    function login(username, password) {
        username = normalizeUsername(username);
        password = String(password || "");
        const user = getUsers().find(u => u.username === username && u.password === password);
        if (!user) return { ok: false, error: "Invalid username or password." };

        localStorage.setItem(SESSION_KEY, JSON.stringify({
            username: user.username,
            loginTime: Date.now()
        }));
        notifyChange();
        return { ok: true };
    }

    function currentUser() {
        const session = getSession();
        if (!session?.username) return null;
        return getUsers().find(u => u.username === session.username) || null;
    }

    function getCurrentUserRecord() {
        const user = currentUser();
        if (!user) return null;
        return getRecords().find(r => r.username === user.username) || null;
    }

    function evacuate(facilityId, facilityName, areaSlug, maxCapacity) {
        const user = currentUser();
        if (!user) return { ok: false, error: "You must be logged in." };

        facilityId = String(facilityId || "").trim();
        facilityName = String(facilityName || facilityId).trim();
        areaSlug = String(areaSlug || "unknown").trim();
        const capacity = Number.parseInt(maxCapacity, 10);
        const records = getRecords();

        if (!facilityId) return { ok: false, error: "This evacuation center has no valid ID." };
        if (records.some(r => r.username === user.username)) {
            const elsewhere = records.find(r => r.username === user.username);
            if (elsewhere.facilityId === facilityId) {
                return { ok: false, error: "You are already registered at this facility." };
            }
            return { ok: false, error: `You are already evacuated at “${elsewhere.facilityName}”. Leave that facility first.` };
        }

        const membersHere = records
            .filter(r => r.facilityId === facilityId)
            .reduce((sum, r) => sum + Number(r.familyMembers || 0), 0);
        if (Number.isFinite(capacity) && capacity > 0) {
            if (membersHere >= capacity) {
                return { ok: false, error: "This evacuation center has reached its capacity." };
            }
            if (membersHere + Number(user.familyMembers) > capacity) {
                return { ok: false, error: `This evacuation center only has ${capacity - membersHere} slot(s) left, but your family has ${user.familyMembers} members.` };
            }
        }

        const record = {
            username: user.username,
            fullName: user.fullName,
            familyMembers: user.familyMembers,
            facilityId,
            facilityName,
            areaSlug,
            timestamp: new Date().toISOString()
        };
        records.push(record);
        saveRecords(records);
        notifyChange();
        return { ok: true, record };
    }

    function adminUpdateUser(originalUsername, username, newPassword) {
        if (!hasAdminRole(currentUser())) return { ok: false, error: "Administrator access is required." };
        username = normalizeUsername(username);
        newPassword = String(newPassword || "");
        if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
            return { ok: false, error: "Username must be 3–30 characters using letters, numbers, dot, dash, or underscore." };
        }
        if (newPassword && newPassword.length < 6) {
            return { ok: false, error: "Password must be at least 6 characters." };
        }
        const users = getUsers();
        const user = users.find(u => u.username === originalUsername);
        if (!user) return { ok: false, error: "This account has changed. Close the editor and try again." };
        if (users.some(u => u !== user && normalizeUsername(u.username) === username) ||
            (username === "admin" && !hasAdminRole(user))) {
            return { ok: false, error: "Username already taken or reserved." };
        }
        const records = getRecords();
        const session = getSession();

        user.role = hasAdminRole(user) ? "admin" : "resident";
        user.username = username;
        if (newPassword) user.password = newPassword;
        records.forEach(r => { if (r.username === originalUsername) r.username = username; });
        if (session?.username === originalUsername) session.username = username;

        const keys = [USERS_KEY, RECORDS_KEY, SESSION_KEY];
        let previous;
        try {
            previous = keys.map(key => localStorage.getItem(key));
            saveUsers(users);
            saveRecords(records);
            if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch (error) {

            if (previous) keys.forEach((key, i) => {
                try {
                    if (previous[i] === null) localStorage.removeItem(key);
                    else localStorage.setItem(key, previous[i]);
                } catch (_) {  }
            });
            return { ok: false, error: "Could not save in this browser. Check available storage and try again." };
        }
        notifyChange();
        return { ok: true };
    }

    return {
        signup,
        login,
        ensureDemoAdmin,
        adminUpdateUser,
        logout() { localStorage.removeItem(SESSION_KEY); notifyChange(); },
        currentUser,
        isLoggedIn() { return !!currentUser(); },
        isAdmin() { return hasAdminRole(currentUser()); },

        evacuate,
        unevacuate(facilityId) {
            const user = currentUser();
            if (!user) return { ok: false, error: "You must be logged in." };
            saveRecords(getRecords().filter(r => !(r.username === user.username && r.facilityId === facilityId)));
            notifyChange();
            return { ok: true };
        },

        getFacilityRecords(facilityId) {
            return getRecords().filter(r => r.facilityId === facilityId);
        },
        getFacilityTotals(facilityId) {
            const recs = this.getFacilityRecords(facilityId);
            return {
                families: recs.length,
                persons: recs.reduce((sum, r) => sum + Number(r.familyMembers || 0), 0)
            };
        },
        getAllRecords: getRecords,
        getAllUsers: getUsers,
        adminRemoveRecord(username, facilityId) {
            if (!hasAdminRole(currentUser())) return;
            saveRecords(getRecords().filter(r => !(r.username === username && r.facilityId === facilityId)));
            notifyChange();
        },
        adminClearFacility(facilityId) {
            if (!hasAdminRole(currentUser())) return;
            saveRecords(getRecords().filter(r => r.facilityId !== facilityId));
            notifyChange();
        },
        getCurrentUserRecord
    };
})();
