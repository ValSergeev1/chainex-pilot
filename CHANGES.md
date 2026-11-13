# ChainEx Pilot · Changes

## V03 · Map-first driver app, installable apps, new dispatch board (Nov 12, 2026, in progress)

V02 is frozen in `../pilot-V02` and served at `/v02/`; V01 at `/v01/`. Every V03 page has a **V03 · switch to V02 · switch to V01** badge. Sample data only. V03 uses its own browser storage key, so V02 and V03 never share state.

**Driver app (P&D and Bulky), `driver.html`.** Map-first layout: search bar, sequence and filter buttons, a rail (stop numbers, sync, recenter, dispatch chat), a stop card, a green **Navigate in sequence** pill, Manifest / Map / Settings tabs and a scan button. NEW ROUTE sheet ("You have N packages and M pickups") offers **Auto-optimize & scan** or **Build route manually**. To build manually, tap each stop on the map. Tapping the last numbered stop undoes it, and **Calculate (k/N)** orders whatever is left. The order goes live right away and shows on the dispatch board as a *Driver-built sequence*, where dispatch can keep it or restore the auto plan. In navigation, arriving opens the scan step. After delivered or can't-deliver, a 3-second banner takes the driver to the next stop without leaving the map. There is a 2D/top-down map toggle. A poor-network state never blocks work: scans and actions queue and sync on reconnect. White glove, LTL and Shuttle keep their own flow. The classic view is still available in Settings.

**Installable apps (PWA).** `driver.html` installs as **ChainEx Driver** and `board.html` as **ChainEx Dispatch**:
- Web app manifests (`driver.webmanifest`, `board.webmanifest`) with standalone display and portrait orientation (driver), plus ChainEx icons at 192/512, maskable 192/512 and Apple 180.
- A service worker (`sw.js`, scoped to the folder it is in, so it works at `/chainex-pilot/`) caches the app shell. Map tiles are cache-first (last 1,500 kept). `offline.html` is the fallback page. `/v01/` and `/v02/` are left untouched.
- iOS meta tags (capable, black-translucent status bar, title) and `viewport-fit=cover`. On a phone, or once installed, the driver app fills the screen. Safe-area insets cover the notch and the home bar. Inputs are 16px, so iOS does not zoom.
- Install cards with a QR code on `driver.html` (desktop) and `start.html`. On Android the button opens the native install prompt. On iPhone it shows Share → Add to Home Screen. Phones also get a dismissible install banner.

**Dispatch board, `board.html` (new; the classic desk stays at `index.html`).** One map plus one sidebar: **Attention** (SOS, driver tickets, driver-built sequences, at-risk routes, exceptions), **Unassigned** (search, multi-select, assign with eligibility) and **Drivers** (filters; a driver panel with KPIs, Re-optimize (staff only), messages, driver view and ordered stops). Map / List / Timeline views. On a phone it becomes a full-screen map with a swipe-up sheet, a bottom tab bar and cards instead of tables. Every action is reachable there.

**DSP fleet app, `dsp-fleet.html` (installable as ChainEx DSP).** Live map of the DSP's drivers with simulated GPS pings (speed, breadcrumbs, at-stop / driving / idle), plus Availability (today's status and shift, weekly grid drivers set) and Time-off requests the DSP can approve or decline. Drivers can open a driver view of the same app to set weekly availability and request time off. Linked from the DSP portal and from `start.html`. The older routes board stays at `dsp.html`.

**Colors.** The new V03 palette (ink #14213d, indigo #5a6be0, periwinkle #7b8cf0, green #18a957, amber, red) is applied to the board, classic desk and dashboards A/B (`assets/v03.css`). Status is never shown by color alone.

**Tests.** t18 (driver app V03), t20 (board on a 390px phone: approve a ticket, assign, view a driver, re-optimize, message), t21 (PWA: manifest validity, Chrome installability, service worker under the subpath, offline shell, phone app mode, install cards).

## V02 · Connected system: website → sign-in → every portal (Nov 12, 2026)

V01 is frozen in `../pilot-V01` (git tag `V01`) and served at `/v01/`. Every V02 page has a **V02 · switch to V01** badge. V02 keeps every V01 feature. All data is **sample data**: no real partner or person names, phones, emails, addresses or documents. Money, sign-in codes, uploads, e-signatures and outgoing messages are simulated.

**Website (`site/`).** Redesigned public site with ChainEx branding and day/night auto: home, services, shippers, carriers, drivers & DSPs, careers, coverage, technology, about, contact (simulated quote form) and track (lookup against pilot data). `site/recommendations.html` lists the prioritized design changes and why.

**Unified sign-in and applications (`auth/`).** One sign-in for staff, drivers, warehouse workers, DSPs, carriers and shippers. Code step, MFA for staff, then routing by role. Multi-step applications for Driver, DSP, Carrier and Warehouse worker: contact/company, service lines and areas, vehicles/equipment, USDOT/MC for carriers, document uploads with expiry, background-check consent, e-signed agreements, review & submit. Submissions land in the onboarding queue with an owner and due date. `status.html` tracks Application received → Documents review → Approved.

**Self-service partner portals (`portal-driver.html`, `portal-dsp.html`, `portal-carrier.html`).** Modeled on the layout of the ChainEx portal survey (left section nav, cards, copilot) and redesigned in the V02 look with day/night auto. Sections: Overview, Onboarding (5-step checklist with progress, automatic checks, line training), Profile / company info edit, Documents (simulated upload, expiry, status, replace), Agreements (simulated e-sign + signed copy), Compliance (drivers: license, DOT medical card for LTL/Shuttle, background + MVR; carriers: USDOT/MC, authority check, auto liability + cargo COI; DSPs: insurance, business license and a driver roster with each driver's document status and dispatch eligibility), Drivers (DSP: add/invite a driver → ChainEx onboarding queue, remind blocked drivers), Pay & settlements (pay lines from the ledger, pay runs, statements, 1099 summary, payout method, disputes → Payments), Notifications (expiry, agreements, pay runs, disputes, ticket answers; mark read) and Support chat with the matching ChainEx bot (Driver Support / Partner Support / Carrier Compliance). The bot answers from the partner's own records; anything else becomes a ticket in Onboarding → Partner support, and the staff reply flows back to the portal. Rule-based in the pilot; ChainEx's own AI in production.
Integration: sign-in now routes drivers, DSPs and carriers to their portal (the driver app and DSP board are one click away); application status links into portal onboarding (`?pid=`); portal uploads and e-signatures update the same partner record staff see in Dashboard, Onboarding and Compliance; document expiry feeds the eligibility gate on the desk and DSP board immediately (cross-tab); the payments ledger feeds pay history. Linked from the start page, workspaces, the website (Drivers & DSPs, Carriers, footer) and the onboarding drawer.

**Application flow restyled into the website.** Sign-in, apply and status keep the V02 flow and steps but now use the website's utility bar, header and footer with wording from the live ChainEx site ("Apply to deliver with ChainEx", Independent Driver / Delivery Service Partner cards, "What happens next" 01–03, common questions, "Welcome to ChainEx.", "Email me a code", "Codes expire in 10 minutes…") and ChainEx's own network-trucks illustration.

**Responsive everywhere except the driver app.** New `assets/rwd.css` + `assets/rwd.js` (loaded by `cx-ui.js`): hamburger + off-canvas drawer on staff/partner shells, classic top bars and the website; side rails become scrollable tab strips; panels stack; tables scroll; 40px+ touch targets; 16px inputs on phones. Tested at 390px and 768px with no horizontal overflow (t17). The driver app stays mobile-first as before.

**Workspaces (`workspaces.html`).** Tiles by permission for Dashboard, Onboarding, Compliance, Dispatch, Scorecards, Payments, Admin, Sales, Bids and Architecture. The role switcher in the top bar lets you try each staff role.

**Items 1–7.**
1. Security: MFA policy, owner review, staff MFA, session list and revoke (Admin).
2. Backups and audit: scheduled backups, back up now, restore, full audit log with filter and CSV.
3. Onboarding: queue views (mine, unassigned, overdue, by type), bulk assign, reminders, auto-routing owners, auto-sent agreements.
4. Compliance: company record, biennial filing checklist, expiry reminders.
5. Eligibility gate: expired or missing documents block assignment everywhere (desk, DSP, offers).
6. Stop-to-ledger: each completed stop writes a shipper charge, a partner pay line and a scorecard entry.
7. Scorecards: per line, five weeks, weekly review sign-off.

**Connected payments (`payments.html`).** Rate cards, weekly invoices, AR aging, pay runs (Ops review → Finance approval → Approved → ACH batch → Paid), adjustments, disputes that block a run, reconciliation and ledger CSV. DSPs see their pay runs and can dispute. Shippers see their own invoices and can pay (simulated).

**Dispatch by team.** Teams follow service lines (P&D, Bulky, White glove, LTL, Shuttle). Each team sees only its line; Ops manager and Admin see all. Non-staff sessions are blocked from the desk.

**Re-optimize routes (staff only).** Desk Settings: selected routes or all routes of a line (Ops manager/Admin: all lines); keep or reset first/last and locked stops; respect time windows; preview before/after km and minutes; Apply or Cancel. Apply pushes the new order to the driver app with a "Route re-optimized by dispatch" notice and writes the audit log. Not available in the DSP portal, shipper portal or driver app (tested).

**Driver ⇄ dispatch, real time.** Driver app and desk share state across tabs (storage events + BroadcastChannel): assignment, on duty, route details, stop status, exceptions, photos/POD, messages, reorder/optimize and reassign show up on the other side within about a second.

**ChainEx Dispatch bot (driver app chat).** Tap 💬 Dispatch (or Message Dispatch). The driver picks or types an issue: running late, wrong address, can't access, damaged item, vehicle problem, customer not home, too many stops, need a break, or anything else. The bot proposes a fix. Fixes inside the driver's own route (ETA update, reorder, move to end, exception code, break) apply at once. Anything affecting customers or other drivers (contact customer, reschedule, return to station, reassign stops) becomes a ticket on the desk (**Driver tickets**: queue, approve/decline, messages, log). The result flows back to the driver. Rule-based in the pilot; in production it runs on ChainEx's own AI layer.

**DSP dispatch board.** Live map of the DSP's own drivers, progress, selected-driver stops with playback, reassignment between own drivers (eligibility checked) and exceptions.

**In-app navigation and map styles.** Tapping navigate on a stop opens a navigation screen inside the driver app: turn banner, road route (public OSRM router, straight-line fallback), ETA, follow mode and Arrive (completes the on-my-way / arrived steps). Map styles in driver Settings: Standard, Streets, Night, High contrast, Schematic.

**Warehouse worker app (`warehouse.html`).** Clock in/out and breaks, staging tasks by route with scans that mark packages loaded for dispatch and the driver, and damage reports.

**Sales (`sales.html`).** Simulated 24/7 AI sales rep. 1,339 accounts as counts, sample leads across four networks (shippers, carriers, DSPs & drivers, warehouse space by market), lead scoring, next best action, outreach sequences that need human approval (sending simulated), meeting briefs, outcomes and win/loss, network coverage map with gaps, growth dashboard. Sales & Recruiting bot panel.

**Bids (`bids.html`).** Separate staff workspace, not linked from dispatch or the driver app. Sample USPS-style HCR/CDS solicitations and commercial RFPs, all labeled sample. The AI bid assistant extracts requirements, deadlines, routes and equipment. It gives a go/no-go with reasons, builds a cost model (miles, hours, equipment, fuel, labor, insurance, overhead, margin) with a sensitivity table, recommended price and floor, and drafts the response package (prefilled fields, attachment checklist, compliance matrix). It also lists risks and writes post-award/loss reviews. Human review and Ops manager/Admin approval come before a simulated submit. Includes an answer library of approved wording.

**Architecture (`architecture.html`).** ChainEx on its own infrastructure and its own AI layer (self-hosted open-weight models, own data and vector store, swappable model gateway). Covers components, data flows, security, cost tiers and the Bot layer: scoped service accounts, live reads, drafts only, human approval, full audit log.

**ChainEx bots in every staff workspace.** Side panel with simulated recommendations, Approve/Dismiss and an action log: Onboarding, Dispatch Assistant, Settlement, Compliance, Sales & Recruiting, Security & admin and Bid assistant.

**Tests.** t1–t12 (V01 suites, updated for renamed sample shippers), t13 (driver ⇄ desk real-time sync + dispatch bot tickets, 30 checks), t14 (every-button sweep over all V02 pages + local link check), t15 (V02 features, 50+ checks). 0 console errors.

---

### Website rebuilt from chainexglobal.com
- 27 site pages. They keep the live site's page set, nav, and wording, page titles and meta descriptions: home, services plus 12 service pages, coverage, about, shippers, carriers (live /partners), Driver / DSP portal (live /contractors), careers, technology, contact, delivery help and privacy.
- New **How it works** page (`site/how-it-works.html`). Its copy is taken from the live site: the delivery flow with an animated handoff diagram, the shipper, carrier, driver/DSP and careers paths, and the growth steps.
- The pages are generated from the crawled text (`build/site2.py` reads `live/content/*.txt`) in the V02 look. They use our own SVG graphics: icons, hero scenes and an interactive dot-grid US market map with city chips (`build/gfx.py`, `assets/site2.css`, `assets/site2.js`).
- The header and footer follow the live site (`build/chrome.py`). How it works is added to the nav, and partner portal links are in the footer and on the carriers and drivers pages.
- The contact form uses the live labels and service options, with `?service=` preselect. It is simulated and saved to localStorage.
- Live links are mapped into the pilot: register/apply → `auth/apply.html?type=…`, status → `auth/status.html`, portal → `auth/signin.html`, admin → `workspaces.html`.
- Sign-in, apply and status use the same header and footer, so the site and the account flow look like one site.
- Track (`site/track.html`) and the V02 design notes are kept.

## V01 (frozen)
Dispatch desk for five service lines, driver app, DSP & carrier portal, shipper portal, partner dashboard (two designs), route planner, claim toggle, automatic day/night. See `v01/` for the frozen build.
