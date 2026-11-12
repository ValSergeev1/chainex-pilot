# ChainEx Pilot V02 (sample data)

A clickable copy of the whole ChainEx system: public website → unified sign-in and applications → staff workspaces → driver, warehouse, DSP/carrier and shipper apps. Static HTML/CSS/JS with no build step and no backend. It runs from `file://` or any static server. State lives in the browser's localStorage (`chainex.pilot.v02`) and is shared live between tabs.

**Start at `start.html`.** It is the sitemap with sample sign-ins for every role. V01 lives at `v01/`.

| Area | Pages |
|---|---|
| Website | `site/index.html`, services, shippers, carriers, drivers, careers, coverage, technology, about, contact, track, `site/recommendations.html` |
| Sign-in & applications | `auth/signin.html`, `auth/apply.html?type=driver|dsp|carrier|warehouse`, `auth/status.html` |
| Staff | `workspaces.html`, `index.html` (dispatch), `dashboard.html`, `onboarding.html`, `compliance.html`, `scorecards.html`, `payments.html`, `admin.html`, `sales.html`, `bids.html`, `architecture.html` |
| Field & partners | `driver.html`, `warehouse.html`, `dsp.html`, `shipper.html` |
| Kept from V01 | `classic.html`, `dashboard-alt.html` |

Sample sign-ins: staff `admin@`, `ops.manager@`, `pd.dispatch@`, `bulky.dispatch@`, `wg.dispatch@`, `ltl.dispatch@`, `shuttle.dispatch@`, `onboarding@`, `finance@`, `sales@`, `viewer@chainex.example`. Drivers `CX-PILOT-001`…`005`, DSP `DSP-EEX-01`, carrier `CAR-CFR-01`, warehouse `WH-KNT-014`, shippers `SPN-PNW`, `HPL-SEA`, `SHP-NORTHLINE`. The sign-in page shows the pilot one-time code (and the MFA code for staff).

Tests: `test/t1.js` … `test/t15.js` (Playwright, file:// URLs). Screenshots: `shots/v02/`.

Data rule: everything is sample data. No real partner or person names, phones, emails, addresses or documents. Money and messages are simulated.
