# evac.pips — Rizal Flood & Evacuation Tracker

A responsive front-end prototype for a Rizal Province flood and evacuation information portal.

## Included

- Municipality selector for 14 Rizal municipalities/city pages
- Evacuation-center cards with family/person occupancy
- Family registration and evacuation/leave workflow
- Login and signup UI
- Admin dashboard for evacuation records
- Emergency hotlines and flood-safety pages
- Light/dark mode with saved preference
- Responsive mobile layout
- Google Maps route links on evacuation centers
- Keyboard-accessible municipality selector
- Demo data disclaimers so sample values are not presented as official live data

## Demo login

- Username: `admin`
- Password: `admin123`

The demo admin account is created in the browser when `login.html` is opened for the first time.

## Important limitation

This is a **static browser-only prototype**. Users, sessions, and evacuation records are stored in `localStorage`, so data is only available in the same browser/device. It is not appropriate for real emergency operations.

For a real deployment, replace `auth.js` with a backend/API using secure password hashing, database storage, authenticated admin roles, audit logs, and verified LGU data feeds.

## Running locally

Because the project is plain HTML/CSS/JS, it can be opened directly in a browser. For the most reliable routing behavior, serve the folder with any local static server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/evac.html`.

## Project structure

```text
.
├── evac.html / evac.css / evac.js     # Main portal
├── auth.js / app.js                    # Demo auth + evacuation state
├── login.html                           # Login / registration
├── admin.html                           # Admin dashboard
├── hotlines.html / safety.html          # Information pages
├── areas/                               # Municipality dashboards
└── tools/                               # Area-page generators/updaters
```

## Navigation and account update

- The original navigation layout is preserved: top links on desktop and a bottom capsule on screens up to 960px. All pages share Home, Hotlines, Safety Tips, and Login/Logout; administrators also have Admin.
- The current tab has a glossy glass capsule, a periodic shine, and a tap ripple. Native cross-document view transitions glide the capsule and wipe content in the direction of the tab order in about 0.4 seconds. Area pages belong to Home; returning from an area to Main Menu moves left.
- Swipes run only in the mobile layout on devices with a coarse touch pointer and no hover. Swipe left for the next page and right for the previous page. The ends do not wrap. Login/Logout are never swipe destinations; Admin is available only to admins. On a municipality page, swipe right returns to Main Menu and swipe left opens Hotlines.
- Swipe recognition ignores form controls, links/buttons, tables, horizontal scrollers, open profile/account dialogs, multi-touch, vertical gestures, and the outer 24px screen edges. Navigation occurs on release rather than dragging the page with the finger.
- The top-right name opens a read-only profile card with full name, username, role, municipality, family count, evacuation status, and Logout. Guests see Login.
- Registered Users in Admin has an Edit action. Admins can change usernames and set new passwords. An empty new-password field keeps the existing password. Usernames remain unique, records follow renames, and renaming the administrator preserves the administrator role and session.
- Password eyes use the bundled Font Awesome files, with no external icon request. Tap to show/hide; leaving the password control, switching forms, submitting, or hiding the page hides the password again. Stored passwords are never placed in the edit form or revealed by its eye.
- Profile and evacuation updates refresh in the current page and other tabs on the same browser origin. Flood edits/reset update open area pages without reloading them. This is browser-local synchronization, not synchronization between different devices.

### Compatibility

Use an HTTP(S) static host (including Vercel) or the local server above for page transitions. Both pages must be on the same origin. This is still a multi-page application: native browser transitions conceal normal document navigation; it has not been converted to a single-page application. Direct `file://` opening and browsers without cross-document View Transition support retain ordinary navigation. Browser handling of storage for `file://` pages can differ, so the local server is recommended for shared account data as well.

Reduced-motion settings disable the new animations. The shine pauses in hidden tabs. A failed or unsupported animation does not prevent the normal link from opening.

Technical reference: [Cross-document view transitions — Chrome for Developers](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).

### Verification

Run the dependency-free authentication regression tests from the project directory:

```bash
node tests/auth.test.cjs
```

These cover login, roles, duplicate usernames, password validation, linked record/session renames, storage-write rollback, and migration of the original demo admin account. Browser checks were performed in Chromium with desktop and emulated touch viewports; physical iOS/Android devices and other browser engines were not tested.

## Latest updates

- Signup has a Generate random password button (12 characters, shown and copied for you).
- Logout asks for confirmation from the navigation bar, profile card, and admin page.
- San Mateo centers: Guinayang National High School Covered Court and Maly Elementary School, with matching map links.
- `seed.js` adds 422 sample accounts on first load (some with lowercase names, some not evacuated; the rest are evacuated to random centers). Usernames and passwords are listed in `seeded-accounts.csv`.

- Evacuation center capacity is now counted in members (people), not families. A family only fits if all of its members fit in the remaining slots.
