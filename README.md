# ChainEx Pilot V03 (sample data)

A clickable copy of the whole ChainEx system: public website → unified sign-in and applications → staff workspaces → driver, warehouse, DSP/carrier and shipper apps. Static HTML/CSS/JS with no build step and no backend. It runs from `file://` or any static server. State lives in the browser's localStorage (`chainex.pilot.v03`) and is shared live between tabs.

**Start at `start.html`.** It is the sitemap with sample sign-ins for every role. V02 is frozen at `v02/` and V01 at `v01/`. What changed in V03: `CHANGES.md`. Screenshots of every screen are in `shots/v03/catalog/INDEX.md`, with contact sheets in `shots/v03/catalog/sheets/`.

| Area | Pages |
|---|---|
| Website (rebuilt from chainexglobal.com wording) | `site/index.html`, `site/how-it-works.html` (new), services + 12 `services-*.html`, coverage, about, shippers, carriers, drivers, careers, technology, contact, delivery-help, privacy, track, `site/recommendations.html` |
| Sign-in & applications | `auth/signin.html`, `auth/apply.html?type=driver|dsp|carrier|warehouse`, `auth/status.html` |
| Staff | `workspaces.html`, `board.html` (V03 dispatch board), `index.html` (classic desk), `wh-supervisor.html`, `dashboard.html`, `onboarding.html`, `compliance.html`, `scorecards.html`, `payments.html`, `admin.html`, `sales.html`, `bids.html`, `architecture.html` |
| Partner portals (self-service) | `portal-driver.html`, `portal-dsp.html`, `portal-carrier.html` (sign-in routes here; `?pid=` opens an applicant's portal) |
| Field & partners | `driver.html` (V03 map-first app), `portal-warehouse.html` (warehouse worker portal), `warehouse.html` (scanner), `dsp-fleet.html` (DSP live map + availability), `dsp.html` (DSP/carrier routes board), `shipper.html` |
| Installable apps (PWA) | driver, board, warehouse, dashboard, DSP. Open the page on a phone: on Android use Install, on iPhone use Share → Add to Home Screen. `start.html` has install cards with QR codes |
| Kept from V01 | `classic.html`, `dashboard-alt.html` |

Sample sign-ins: staff `admin@`, `ops.manager@`, `pd.dispatch@`, `bulky.dispatch@`, `wg.dispatch@`, `ltl.dispatch@`, `shuttle.dispatch@`, `onboarding@`, `finance@`, `sales@`, `viewer@chainex.example`. Drivers `CX-PILOT-001`…`005` (→ driver portal), DSP `DSP-EEX-01` (→ DSP portal), carrier `CAR-CFR-01` (→ carrier portal), warehouse `WH-KNT-014`, shippers `SPN-PNW`, `HPL-SEA`, `SHP-NORTHLINE`. The sign-in page shows the pilot one-time code (and the MFA code for staff).

Tests: `test/t1.js` … `test/t24.js` (Playwright, file:// URLs; t21 uses a local http server at `/chainex-pilot/`). t16 = partner portals, t17 = responsive, t18 = V03 driver flow, t19 = warehouse portal, t20 = board/dashboard on a phone, t21 = PWA, t22 = DSP fleet and partner homes, t23 = driver app end to end (all five lines), t24 = website mobile menu + footer. Driver checklist: `driver-checklist.html`. Screenshots: `shots/v03/` (catalog in `shots/v03/catalog/`), V02 in `shots/v02/`.

Responsive: every page adapts to phone (~390px), tablet (~768px) and desktop (1280px+) through `assets/rwd.css` + `assets/rwd.js`.

Data rule: everything is sample data. No real partner or person names, phones, emails, addresses or documents. Money and messages are simulated.


### Website build
`python3 build/site2.py` renders `live/content/*.txt` (text crawled from chainexglobal.com by `live/ext.py`) into `site/`; `build/site.py` writes only track.html and recommendations.html. Screenshots 47–53 and m15–m18 cover the website on desktop and phone/tablet.

V03 illustrations: `python3 build/v03art.py` (run after site2.py) gives each site page and the sign-in page its own scene.
