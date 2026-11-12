# ChainEx Pilot: changes

## v6 · Automatic day / night appearance (Nov 12, 2026)

Every app now shares one appearance preference: **Auto** (the new default), **Day**, or **Night**. It is stored in `localStorage` as `cx.themePref` and carries across the dispatch board, driver app, Dashboards A and B, the DSP and shipper portals, the start page and classic dispatch.

- **Auto** follows Seattle sunrise and sunset (47.6°N, 122.3°W) in America/Los_Angeles (Pacific time), computed in JavaScript with no network. If that calculation cannot run, Auto uses 6:30 AM–7:00 PM Pacific. The OS `prefers-color-scheme` setting is not used, so Auto stays a clock-based mode and `?now=` tests stay predictable (1:00 PM and 10:00 PM are always Pacific). The resolved look is rechecked every minute and when the tab becomes visible, and it switches with a CSS transition — no reload.
- The top-bar control on every page is a three-way **Auto / Day / Night** selector. The current look is labeled (for example `Auto · Day`). **Shift+L** cycles the three settings. The driver app also has the same control in the phone frame header and in Profile / Settings.
- Older stored `cx.theme2=dark` (the previous default) is migrated to Auto so existing testers are not stuck in night mode. An explicit prior light choice becomes Day. `?theme=day|night|auto` (aliases `light` / `dark`) and `?now=13:00` or `?now=22:00` override for testers. Test tools on the desk include the same controls.
- Day mode was audited and retokened to the ChainEx brand (navy `#172b45`, top bar `#0f1b2d`, primary `#2563c9`, background `#f5f7fa`). MapLibre basemaps and the schematic fallback both have finished day and night palettes.

**Tests**: t1–t10 plus t11 (Auto is Day at 13:00 and Night at 22:00 on every page; the preference carries across apps) and the every-button sweep. 0 console errors.

---

## v5 · Field ops, contractor and shipper portals, mission-control design system (Nov 12, 2026)

**Driver app**
- Sign in with a **Driver ID** and land directly on your assigned work (direct, or assigned by your DSP). "Choose your work" is gone. With nothing assigned: a **No work assigned** state with on/off duty and offers only for lines you're approved for.
- **Route review/edit (P&D and Bulky only)**: whole route on the map with sequence numbers; drag rows, tap-to-sequence on the map, multi-select pins → move to start/end, group, skip; address notes; pin (geocode) correction; report a road issue; **Submit route changes**. Not offered for White glove, LTL or Shuttle.
- Modern map-first home: live HUD with progress ring, at-risk chip, stat tiles, sticky next-stop card, screen transitions, scan/haptic feedback, cleaner icons, dark mode.

**Dispatch desk**: driver-edited routes show a "✎ edited" chip with **Accept / Revert**, road issues with **Resolve**, driver field notes and pin fixes in the task drawer.

**DSP & carrier portal (`dsp.html`)**: owner/manager sign-in, accept/decline offers, assign/reassign own drivers, live progress, exceptions and POD, roster with add-driver → onboarding, vehicles, compliance uploads, pay statements (CSV). No access to other partners, shipper rates, global dispatch or the directory.

**Shipper portal (`shipper.html`)**: own shipments, tracking with ETA and events, exceptions, POD, submitted manifests, create order, CSV manifest upload, reports, invoices placeholder. Driver shown as first name + vehicle only; no DSP names, route IDs, pay or internal notes.

**Design system**: `theme.css` + `cx-ui.js` on every app. Mission-control night and day modes, glass panels over a full-bleed themed map, mono numbers, KPI sparklines, status pulses, command palette (Ctrl/Cmd+K), shortcuts, collapsible rails, first-run tours and tooltips, splash, reduced-motion support. Dashboard A uses it; Dashboard B is the "Aurora" treatment. `classic.html` keeps the pre-redesign desk.

**Tests**: t1–t10 plus an every-button sweep across every app, view and line: 0 console/page errors.

---

## v4 · Five service lines, partner directory, shipper view, partner dashboard A/B (Nov 12, 2026)

**Service lines**
- One desk and one driver app for **P&D, Bulky, White glove, LTL and Shuttle**, with the same design on every line. Per-line data fields, task form, CSV import/export columns, auto-assign and optimize rules, service levels, exception reasons and next actions, and driver steps live in `assets/lines/*.js`.
- Desk top bar **line switcher**, plus an **All lines** overview: progress, at-risk, exceptions, drivers on duty and eligibility per line, cross-line exceptions, blocked drivers, portal sync events and activity.
- The driver app's **Choose your work** picks the line, mapped to pilot drivers CX-PILOT-001…005. A generic step engine handles confirm, form, scan, POD, photo and sign (with rating) steps. Load scan is grouped per line (tote, job, PRO, none for Shuttle). Exceptions use each line's reasons.
- **Shuttle**: lanes with standing schedules, a lanes × time **trip board** in place of the map, Run lane again / Repeat last trip, standing driver and tractor with override, out-and-back loops, trailer pools, lane performance. Driver: **Start next trip** with trailer and seal prefilled.
- Kept: drag-drop with reordering, task drawer, manifests with SLA timers, contracts, bulk actions, CSV export, SOS, test tools, cross-tab sync, file:// support. The bid board stays out.

**Partner directory (portal layer, `assets/partners.js`)**
- Partner types Driver / DSP / Carrier / Shipper / Customer / Warehouse; IDs `P-xxxxxxxx` and `CX-DRV-0000NN`; statuses Completing setup / Needs team review / Fully approved / Closed; setup steps for documents, agreements, payment (ACH/Zelle) and review; roles Owner / Operations / Recruiting / Finance / Viewer / Sales; customer-manager access scoped to stations.
- **Dispatch eligibility** is enforced on every assignment path. When blocked, the reason shows (e.g. "Auto insurance expired", "Not approved for White glove"). Expiring documents show a warning on the desk and in the driver app.
- **DSP view**: tender a route to a DSP, which assigns its own eligible driver or recalls the tender.
- **Shippers**: every contract, and so every task and manifest, links to a shipper record. New **Shipper view** (`shipper.html`) is read-only and scoped to the viewer's stations.
- **Settlement** per payee, fed by driver completions. Desk Partners → Settlement, and Dashboard → Payments.
- The desk nav has a **Partners** entry (tabs: Dispatch eligibility, DSP view, Settlement, Shippers).

**Partner Dashboard**
- `dashboard.html` (Design A, same light shell) and `dashboard-alt.html` (Design B, dark command center: kanban directory, SLA-lane queue, slide-over partner file). Same script and data, with a toggle in the top bar.
- Overview KPIs (time to activate median and p90, funnel by step, % docs current, expiring 30/60/90, capacity by line, security posture), owned work queue with owners, SLA timers, bulk actions and auto-routing, partner directory and partner file, partner-facing self-serve onboarding with simulated FMCSA / insurance / background checks and auto-approve, expiry monitor with 30/15/7/0 reminders and auto-suspend/reinstate, agreements, payments with payout batches, recruiting kanban, team access with an "Acting as" role switcher, activity/audit log with events outbox.
- `start.html` landing page with links, a test script and reset.

**Sample data**
- Sample contracts are neutral commercial shippers (e.g. Ridgeline Outfitters, Pacific Builders Supply). The recipient-tracking toggle and attempt policies stay as generic per-contract settings.

**Docs**: README covers per-line "how it works", the dashboard, and **Integration with ChainEx Global portal** (data contract, record ownership, sync events).

---

## Earlier pilot (single line) · original change log


Pilot build, sample data only. Static HTML/CSS/JS, no build step. Run `python3 -m http.server 8787` in this folder, then open `index.html` (Dispatch desk) and `driver.html` (driver app) in two tabs of the same browser. Driver actions sync to the desk through localStorage. **Reset** (desk top bar) or **Reset sample data** (driver page) restores the seed data.

The styling stays ChainEx's: navy top bar, the "Chain"+"Ex" wordmark, uppercase eyebrow labels, rounded white cards, pill buttons, side drawers, the ring chart, and the status colors. No third-party names or branding appear anywhere in the UI. The source column below is design lineage for the team only.

## Dispatch desk (`index.html`)

| What's new vs. current ChainEx dispatch | Source idea |
| --- | --- |
| One map plus one left sidebar (Unassigned → Teams → Drivers) replaces the three columns (Assignments / Shipments / Route map) | Onfleet |
| Five task-state colors on pins, sidebar dots, and the legend: Unassigned grey, Assigned navy, En route blue, Completed green, Exception orange. Red is reserved for unscanned packages and At risk | Onfleet colors, ChainEx palette |
| Drag a task onto a driver or team, or back to Unassigned. Drag within a driver's list to resequence. Assignment changes the map pins and route line right away | Onfleet (drag-drop), OnTrac (manual sequence) |
| **Auto-assign** (nearest on-duty driver, load-balanced, team-aware) and **Optimize routes** (per driver or all) | Onfleet |
| Team queues: tasks assigned to a team but not yet to a driver | Onfleet |
| Completed and exception tasks leave the driver's list ("N completed · shown on map") but stay as pins on the map | Onfleet |
| Sidebar search, sort (Complete before / Destination A–Z / Creation time / Manual), status filter chips, contract filter, Zoom to fit (button or **Z**) | Onfleet |
| Map / Table / Manifests switch. The table uses the same Task object as the map and the driver app | Onfleet |
| Task drawer with dimmed backdrop: reassign, window and ETA, On track / At risk, contract SLA, attempts, recipient-tracking state, Can't deliver details, POD, timeline | Onfleet drawer + Jitsu risk |
| Package-level scan events under every task (label created → accepted → sorted to tote → loaded → out for delivery → arrived → delivered / attempted / returned), with tote IDs | OnTrac |
| **On track / At risk** per task and per driver against the complete-before time. "At risk" count in the header KPIs | Jitsu |
| SOS banner from the driver app with Locate and Acknowledge & clear | Jitsu |
| Exception actions: **Redeliver on same route** (re-queued at the end of the route) and **Return to shipper** | Jitsu (same-route redelivery), OnTrac (RTS) |
| Per-contract **attempt policy** (max attempts, same-day vs. next business day, then Return to shipper), enforced when a driver records Can't deliver | OnTrac |
| **Import orders / manifest** (CSV-style paste in the pilot; production would take a file, EDI, or API) puts tasks in Unassigned with a manifest ID and tote IDs. An optional per-manifest **SLA / target time** starts an SLA clock and caps each task's complete-before time. **New task** covers one-off orders. The Manifests view lists imports with delivered counts, the SLA clock, and View on map | ChainEx + OnTrac (manifest-driven intake) |
| Contracts are **dispatch settings** (SLA, attempt policy, recipient tracking). Contract-level **Recipient tracking** toggle. Set per contract (on or off) | ChainEx requirement (tracking is an Onfleet strength, made optional) |
| Activity drawer (desk + driver events), a sample clock (+15 min) to make SLA and risk move, dark mode, New task form | ChainEx |
| Live driver dots (pulse), red when SOS | Onfleet |

## Driver app (`driver.html`, 390×844 phone frame)

Kept as-is in look and flow: Welcome (Driver ID + terms) → Choose your work (P&D, Bulky delivery, White glove, LTL, Shuttle) → Choose service area → Review assignment → My route with Manifest / Map / Settings → Stop Details → Scan delivery packages → Deliver / Can't deliver. Also kept: the "Unable to deliver" panel (Reason, Next action for Dispatch, Delivery or placement photo, Driver notes, Submit outcome) and the Settings rows.

| What's new | Source idea |
| --- | --- |
| **Today** screen: On/Off duty toggle and compliance check line (license, insurance, registration) | Onfleet (duty), ChainEx (compliance gate) |
| **Job offers** with Claim (needs on duty). Claimed stops join the driver's route and the desk updates | Jitsu (tickets/offers) |
| Hub check-in: **On my way** → **I've arrived** before Review assignment | Jitsu |
| Review assignment lists totes and the first and last stop, with "load highest stop first" | Jitsu + OnTrac (totes) |
| **Scan every package before loading** at the hub. Start route stays locked until 100% are scanned; wrong barcodes are rejected | Jitsu |
| Per stop: **On my way** (desk sees En route, and the driver dot moves) → **Arrived** → Scan packages. Deliver stays locked until every package at the stop is scanned | Jitsu + Onfleet |
| **Proof of delivery**: photo placeholder, finger signature pad, location / received by, recipient name, notes. Photo and signature are required by tag or contract | Onfleet / Jitsu |
| Can't deliver keeps the current app's 22 reasons and 7 next actions, and adds a "try recipient / Dispatch first" prompt and a contract attempt-policy notice. Next-action logic: **Reattempt** re-queues the stop at the end of the same route when the contract allows same-day reattempts, otherwise it goes to the next business day. **Reattempt** and **New appointment** count toward the contract's attempt limit; at the limit the stop becomes **Return to shipper** (RTS). **Return to shipper** marks RTS right away. **Return to station** tags the package back to the hub. **Escalate**, **Hold for instructions**, and **Authorized redirect** leave the stop as an exception for Dispatch | Jitsu (SOS-before-fail, same-route redelivery), OnTrac (structured reasons, attempt policy) |
| **SOS** button in the route header: send / cancel, with Call 911 and Call Dispatch placeholders. It shows on the desk right away | Jitsu |
| **On track / At risk** chip and ETA on the current stop | Jitsu |
| **Reorder** stops manually (▲▼) | OnTrac |
| Manifest + Map tabs. The map has numbered status-colored pins, the route line, the driver dot, and a Navigate to stop card | OnTrac (Manifest+Map), current ChainEx map |
| **Return to hub**: final review (delivered, exceptions, packages to return), return-scan each undelivered package, then **Close route**. Closing takes the driver off duty and shows "Route closed" on the desk | Jitsu (return scan closes route), OnTrac (final review) |

## Known gaps (pilot)

- Sample data only. There is no backend: state lives in each browser's localStorage, so sync works only between tabs of the same browser.
- Route lines are straight segments between stops, not road geometry.
- ETAs and risk come from a simple distance model and the sample clock.
- The camera, barcode scanner, photo capture, calls, 911, and navigation are simulated.
- Job-offer timers, reservation holds, and geofenced arrival are not implemented. Public sources conflict on the claim-timer length.
- Recipient tracking page and SMS are not built; the pilot has only the contract toggle.
- Not built from the "add what none of the three provide" list: driver document vault, chain-of-custody transfers between drivers/docks, liquidated-damages views, auditor roles.
- Map tiles come from OpenFreeMap over the internet. MapLibre itself is bundled in `assets/vendor/`. If tiles fail, the map switches to a schematic view with the same pins and routes.
