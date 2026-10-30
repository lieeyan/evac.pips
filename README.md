# evac.pips: Rizal Flood & Evacuation Tracker

A responsive web portal for flood and evacuation information in Rizal Province, Philippines. Residents can find evacuation centers in their municipality, register their family, and check emergency hotlines and flood-safety tips. Admins can view and manage evacuation records and user accounts.

**Live demo:** [Open the Rizal Flood & Evacuation Tracker](https://lieeyan.github.io/evac.pips/)

> This is a front-end prototype built with plain HTML, CSS, and JavaScript. It uses demo data only and is **not** for real emergency operations.

## Screenshots

<!-- Add 2-3 screenshots here. Upload them to the repo (for example in a "screenshots" folder) and link them like this: -->
<!-- ![Home page](screenshots/home.png) -->

## Features

- Municipality selector covering 14 Rizal municipalities/city pages
- Evacuation-center cards showing family and person occupancy
- Family registration and evacuate/leave workflow
- Login and signup, with separate resident and admin roles
- Admin dashboard for evacuation records, including editing user accounts
- Emergency hotlines and flood-safety pages
- Light/dark mode with a saved preference
- Responsive layout with a bottom capsule navigation bar on mobile
- Smooth page transitions and swipe navigation on touch devices
- Google Maps route links on evacuation centers
- Keyboard-accessible municipality selector
- Demo-data disclaimers so sample values are not presented as official live data

## Try it

Open the live demo and log in with the demo admin account:

- Username: `admin`
- Password: `admin123`

You can also sign up as a resident, pick a municipality, and register your family at an evacuation center.

## Built with

- HTML5, CSS3, and vanilla JavaScript (no framework)
- Font Awesome (bundled locally)
- Browser `localStorage` for accounts, sessions, and evacuation records
- Python scripts (in `tools/`) used to generate the municipality pages
- A Node-based test file (in `tests/`) for the auth logic

## Run it locally

Because the project is plain HTML, CSS, and JS, you can open `index.html` directly in a browser. For the most reliable routing, serve the folder with a local static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Project structure

```text
.
├── index.html / evac.html     # Main portal (home page)
├── evac.css / evac.js         # Main portal styles and logic
├── auth.js / app.js           # Demo auth and evacuation state
├── navigation.js / .css       # Shared navigation and page transitions
├── login.html                 # Login / registration
├── admin.html                 # Admin dashboard
├── hotlines.html / safety.html
├── areas/                     # One page per municipality
├── assets/                    # Font Awesome (local)
├── tests/                     # Auth tests
└── tools/                     # Area-page generators/updaters
```

## Limitations

This is a **static, browser-only prototype**. Users, sessions, and evacuation records are stored in the browser's `localStorage`, so data exists only on the same browser and device. Passwords are stored in plain text for demo purposes.

A real deployment would need a backend/API with secure password hashing, database storage, authenticated admin roles, audit logs, and verified data from local government units.

## Ideas for next steps

- Add a backend (Node.js and a database) with hashed passwords
- Connect to real LGU evacuation-center data
- Add real-time occupancy updates
