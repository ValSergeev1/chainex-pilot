# ChainEx Pilot · Dispatch, Driver app, DSP portal, Shipper portal, Partner Dashboard (sample data)

**Pilot · Sample data.** Static HTML/CSS/JS with no build step and no backend. It works straight from `file://` or from any static server. All state lives in the browser's localStorage (key `chainex.pilot.v5`) and is shared live between tabs of the same browser.

Start at **`start.html`**. It links every app and explains how to test.

| App | File | What it is |
|---|---|---|
| Start page | `start.html` | Links, sample sign-in IDs, test script, reset |
| Dispatch desk | `index.html` | Mission-control desk for five service lines: line switcher, All-lines overview, full-bleed map or trip board, table, manifests, settings, Partners. Shows driver route edits with Accept/Revert |
| Driver app | `driver.html` | 390×844 phone frame. Sign in with a Driver ID and land on your assigned work only. Map-first HUD; route review/edit for P&D and Bulky |
| DSP & carrier portal | `dsp.html` | Contractor access: offers, own routes and drivers, live progress, POD, roster/onboarding, vehicles, compliance, pay statements |
| Shipper portal | `shipper.html` | Own shipments, tracking/ETA, exceptions, POD, manifests, create order / upload manifest, reports, invoices placeholder |
| Dashboard · Design A | `dashboard.html` | Partner dashboard in the mission-control design system |
| Dashboard · Design B | `dashboard-alt.html` | Same data and features as A, "Aurora" premium treatment |
| Classic desk | `classic.html` | Snapshot of the pre-redesign desk, for comparison (same data) |

Every page shares one design system (`assets/theme.css` + `assets/cx-ui.js`): **Auto / Day / Night** appearance (Auto, the default, follows Seattle sunrise and sunset), **Ctrl/Cmd+K** command palette, **?** shortcuts, **[** collapse side rail, **Shift+L** cycles appearance, **/** search, first-run tours and tooltips. Testers can use `?theme=day|night|auto` and `?now=13:00`. The bid board is not part of the pilot.

## Run it

- Double-click `start.html`, or
- `python3 -m http.server 8787` in this folder, then open <http://localhost:8787/start.html>.

Open Dispatch and the Driver app in two tabs of the **same browser**; changes sync within a second. Map tiles load from OpenFreeMap over the internet. Offline, the map falls back to a schematic with the same pins and routes.

## How to test (5 minutes)

1. **Dispatch → All lines**: counts, at-risk, exceptions, drivers on duty and blocked drivers for each line. Open a line from its card or from the top-bar switcher.
2. **Driver app**: sign in with a sample ID (CX-PILOT-001 P&D, -002 Bulky, -003 White glove, -004 LTL, -005 Shuttle; CX-1188 Nate = no work assigned; CX-1103 Jamal = blocked). Go on duty, check in, load-scan, start, and walk a stop through its steps. The desk updates live.
2b. **Route review/edit (P&D, Bulky)**: Route → Edit route. Select pins or rows, Move to start/end, Group, Skip, drag rows, Tap-to-sequence on the map, Fix a pin (nudge or tap the map), add an address note, report a road issue, then **Submit route changes**. On the desk the driver shows "✎ edited" with **Accept / Revert**; road issues show with **Resolve**.
2c. **DSP portal**: sign in as DSP-EEX-01 (Carla, Eastside Express owner). Offered routes → Accept → assign Nate. Nate (CX-1188) now sees 3 stops. Drivers → Add driver sends them to onboarding.
2d. **Shipper portal**: sign in as ONTRAC-SEA or JITSU-PNW. Track a shipment, view POD, create an order, upload a CSV manifest, export reports.
3. **Eligibility**: on the White glove desk, assign an appointment to *Ben Okoye*: "Blocked · Not approved for White glove". On P&D, *Jamal Price* is blocked with "Auto insurance expired". Drivers with expiring documents show an amber warning.
4. **Shuttle**: Trip board → **Run lane again**, change a lane's standing driver, open a trip. Driver app (Shuttle): **Start next trip** opens pre-trip with trailer and seal prefilled; **Repeat last trip** adds an extra round trip.
5. **DSP flow**: Dispatch → Partners → DSP view → tender stops to Eastside Express → assign its driver (Nate Silva is idle).
6. **Dashboard → Partner onboarding**: apply as a Carrier → Upload all → sign → payouts → Submit. All checks pass and the partner is auto-approved. Open "simulate verification outcomes" to make insurance fail or force a manual review.
7. **Dashboard → Automation & security → +7 days** twice: Valley Drayage's insurance expires. The partner is suspended, Sam is blocked on the Shuttle desk and in the driver app, and `document.expired` / `partner.suspended` events appear.
8. **Acting as** (dashboard top bar): switch to Owen (Finance) or Ari (Viewer) to see role gating. Toggle **Design A ⇄ Design B**.

**Test tools**: desk top bar (+15 min clock, scenarios, simulate a driver, +7 days, export/import JSON, reset a line or everything), driver frame (Restart app, Reset sample data), dashboard Automation & security (+1 / +7 days, run expiry monitor, reset). One reset resets every app.

## Service lines: how each one works

The desk and driver app look the same on every line. Each line is one config file in `assets/lines/*.js`. It defines data fields, the task form and CSV columns, the auto-assign and optimize rules, service levels, exception reasons and next actions, and the driver steps. The step engine supports `confirm`, `form`, `scan`, `pod`, `photo` and `sign` steps.

### Parcel pickup & delivery (P&D)

1. Inbound packages are sorted at the station into zones (sort code = station-zone-shelf) and into totes per zone.
2. Build routes assigns every unassigned package to the route that owns its zone, then balances against route capacity (packages per van).
3. Stops are grouped by address, so one stop can carry several packages (apartments, offices).
4. Drivers check in at the station, then scan every package (or whole totes) before the route can depart.
5. At each stop: On my way → Arrived → scan the stop's packages → photo POD (signature when flagged).
6. Can't deliver uses the 22 ChainEx reasons and 7 next actions; Reattempt goes back on the same route when the contract allows same-day, and Reattempt / New appointment count toward the attempt limit, then Return to shipper.
7. End of day: return to station, scan every undelivered package back in, close the route.

- **Driver steps:** On my way → Arrived → Scan packages → Deliver
- **Auto-assign button:** Build routes from sort codes · **Optimize button:** Sequence by sort code
- **Exception reasons:** Building access issue, No safe place, Business closed, Address info needed, Refused, Unable to deliver today, No answer, Signature/PIN unavailable, Customer reschedule, Package missing, Damage before handoff, Unsafe conditions, Road closure, Bad weather, Vehicle/route disruption, Wrong item, Shortage, Other, Placement declined, Item doesn't fit, Access restriction, Accepted with documented damage
- **Next actions:** Reattempt, New appointment, Escalate, Hold for instructions, Return to station, Return to shipper, Authorized redirect
- **Contracts:** PD-COM ChainEx Commercial Parcel (shipper: Jitsu; max 3 attempts; same-day reattempt; tracking on); PD-OT OnTrac zone injection · Seattle (shipper: OnTrac; max 2 attempts; same-day reattempt; tracking on); PD-RG Ridgeline Outfitters · Seattle e-commerce (shipper: Ridgeline; max 2 attempts; same-day reattempt; tracking off)

### Bulky delivery (threshold) (Bulky)

1. Same loop as P&D: hub staging by zone → route build → load-out scan-all → sequenced stops → attempts → return to hub.
2. Every piece has weight, dimensions and a 2-person flag; every truck has a payload limit and a crew (driver + helper or solo).
3. Build routes honors crew pairing (2-person pieces never go to a solo truck) and payload, not just stop count.
4. Load-out adds an equipment check (dolly, straps, blankets, liftgate).
5. At the stop: On my way → Arrived → scan each piece → threshold placement (first dry, secure space) with a 2-person carry confirmation → photo inside the threshold + signature.
6. Extra exception reasons: won't fit, stairs/unsafe lift, no helper, no indoor threshold, threshold refused. Room-of-choice or assembly belongs to White glove, not this line.

- **Driver steps:** On my way → Arrived → Scan pieces → Threshold placement → Deliver
- **Auto-assign button:** Build routes · crew & capacity · **Optimize button:** Sequence by zone
- **Exception reasons:** Building access issue, No safe place, Business closed, Address info needed, Refused, Unable to deliver today, No answer, Signature/PIN unavailable, Customer reschedule, Package missing, Damage before handoff, Unsafe conditions, Road closure, Bad weather, Vehicle/route disruption, Wrong item, Shortage, Other, Placement declined, Item doesn't fit, Access restriction, Accepted with documented damage, Won't fit through doorway, Stairs / unsafe lift, No helper available, No safe indoor threshold, Customer refused threshold placement
- **Next actions:** Reattempt, New appointment, Escalate, Hold for instructions, Return to station, Return to shipper, Authorized redirect
- **Contracts:** BK-RET Retail bulky · threshold (shipper: Northline Home; max 2 attempts; next-day reattempt; tracking on); BK-APP Appliance OEM · threshold (shipper: Kestrel Appliances; max 2 attempts; same-day reattempt; tracking on)

### White glove in-home delivery (White glove)

1. Orders are booked into 2-hour appointment windows before routing (no raw geographic dump).
2. Each job has a service tier (room of choice, unbox & assemble, appliance install, TV mount), haul-away flag, access flags (stairs) and a service time.
3. Schedule appointments assigns 2-person teams by skill, window capacity (2 jobs per window) and proximity; sequencing respects windows and service time.
4. Load-out: verify every item and the tool kit (blankets, dolly, install kit) by job.
5. At each job: call-ahead → On my way → Arrived (start job) → pre-entry inspection photos → room of choice → assembly / install checklist (if sold) → haul-away (if sold) → customer signature + survey.
6. Exceptions: not home, refused, damaged on inspection, won't fit, missing parts, install blocked, reschedule. Haul-away items and returns come back to the warehouse on the return scan.

- **Driver steps:** Call ahead → On my way → Arrived · start job → Inspection → Room of choice → Assembly → Haul-away → Customer sign-off
- **Auto-assign button:** Schedule appointments · **Optimize button:** Sequence by appointment window
- **Exception reasons:** Customer not home, Customer refused, Item damaged on inspection, Won't fit / access issue, Missing parts / hardware, Install not possible (site conditions), Customer requested reschedule, Wrong item delivered, Unsafe conditions, Other
- **Next actions:** Reschedule appointment, Return to warehouse, Leave item, schedule return visit, Replace item (reorder), Escalate to customer care
- **Contracts:** WG-FURN Furniture retailer · white glove (shipper: Alder & Oak Furniture; max 2 attempts; next-day reattempt; tracking on); WG-APPL Appliance retailer · install (shipper: Kestrel Appliances; max 2 attempts; next-day reattempt; tracking on)

### LTL freight · city P&D (LTL)

1. Inbound linehaul trailers are stripped at the KNT terminal; deliveries are staged by city route, pickup requests come in all day (some after dispatch).
2. Each shipment has a PRO, BOL, handling units (pallets), weight, freight class and accessorials (liftgate, residential, inside, appointment, limited access).
3. Plan terminal run assigns deliveries by area within each truck's pallet positions and liftgate capability, and slots pickups by ready/close window.
4. Sequencing honors dock appointments and pickup windows instead of pure distance.
5. Delivery: On my way → Arrived (dock / door) → scan each pallet → delivery receipt (pieces received, OS&D, accessorials used) → consignee signature.
6. Pickup: Arrived → verify BOL (count, weight, class, hazmat) → label & scan handling units → shipper signature. Picked-up freight is return-scanned at the terminal for cross-dock.

- **Driver steps:** On my way → Arrived · dock → Scan pallets off → Delivery receipt → Consignee signature
- **Auto-assign button:** Plan terminal run · **Optimize button:** Sequence by dock times
- **Exception reasons:** Shortage, Overage, Damage – visible, Damage – concealed, Refused by consignee, Consignee closed, Missed appointment, Liftgate needed – not on truck, Limited access – cannot reach dock, Wrong address, Hazmat paperwork missing, No freight at pickup, Freight not ready at pickup
- **Next actions:** Deliver with exception noted, Reattempt next business day, Set new appointment, Return to terminal (OS&D), Hold at terminal, Contact shipper, Return to shipper
- **Contracts:** LT-STD LTL shipper accounts · standard (shipper: LTL shipper accounts; max 2 attempts; next-day reattempt; tracking off); LT-KEY Pacific Builders Supply · key account (shipper: Pacific Builders Supply; max 2 attempts; next-day reattempt; tracking on)

### Shuttle · inter-warehouse lanes (Shuttle)

1. Work is defined once as lanes: a facility pair with default equipment, typical pallets/totes, dock slots, transit and dwell standards.
2. Each lane has a standing schedule (every N minutes, fixed times, daily or Mon–Fri) that generates today's trips automatically; round trips chain the return leg with empties or backhaul.
3. Each lane has a standing driver and tractor; dispatch can override per trip. Slotting replaces optimization: no re-routing.
4. The desk shows a trip board (one row per lane, time across), lane performance (on-time %, average dwell, trips done vs scheduled) and the trailer pool per facility.
5. Run lane again adds an extra round trip on demand; the driver can do the same with Repeat last trip.
6. Driver: My run shows the repeating timetable; Start next trip opens a pre-trip form already filled with trailer, seal and counts → depart → arrive → dock check-in → custody handoff scan → unload & seal check. Dwell is measured automatically.

- **Driver steps:** Pre-trip · trailer & seal → Depart · gate out → Arrived · gate in → Dock check-in → Custody handoff scan → Unload & seal check
- **Auto-assign button:** Slot trips to standing drivers · **Optimize button:** Order by schedule
- **Exception reasons:** Late departure – freight not ready, Late departure – driver / tractor, Dock not available (detention), Seal mismatch, Count discrepancy (OS&D), Trailer defect, Traffic / road delay, Facility closed, Trailer pool stockout
- **Next actions:** Wait at dock, Continue with exception noted, Swap trailer, Return to origin, Escalate to facility lead, Cancel trip (missed)
- **Contracts:** SH-INT ChainEx intercompany shuttle (shipper: ChainEx internal; max 1 attempts; same-day reattempt; tracking off); SH-3PL Customer DC transfer · dedicated (shipper: Northline Home; max 1 attempts; same-day reattempt; tracking off)

Shuttle also has: lanes with standing schedules (every N minutes or fixed times, weekdays), a standing driver and tractor per lane with per-trip override, out-and-back loops, **Run lane again** / **Repeat last trip**, trailer pools per facility, and lane performance (on-time %, dwell, 7-day history). Its main view is the lanes × time trip board instead of a map.

## Partner directory (portal layer)

`assets/partners.js` models the ChainEx Global portal Dashboard and is shared by every app.

- **Partner types**: Driver, DSP, Carrier, Shipper, Customer, Warehouse. IDs are `P-xxxxxxxx`; drivers also get `CX-DRV-0000NN`.
- **Setup status**: Completing setup → Needs team review → Fully approved (or Closed). Suspension is a separate flag set by the expiry monitor.
- **Setup steps**: profile, documents (per-type checklist with expiry), agreements (e-sign), payment (ACH or Zelle payouts; billing for shippers and customers), team review.
- **Verification** (simulated): FMCSA authority, insurer COI check, background/MVR. **Auto-approve** runs when every step is complete and every check passes.
- **Expiry monitor**: reminders at 30/15/7/0 days. An expired required document suspends dispatch eligibility; a verified renewal reinstates it.
- **Eligibility** (`CX.eligibility(driverId, line)`): status, documents, approved lines and vehicle types, plus the parent DSP or carrier. It returns `{ok, reasons, warnings}`. Dispatch checks it on manual assign, drag-drop, bulk assign, auto-assign, offers and DSP driver assignment, and shows the reason when blocked.
- **Roles**: Owner, Operations, Recruiting, Finance, Viewer, Sales. Customer-manager users are scoped to stations; that scope also drives the Shipper view.
- **DSP tenders**: Dispatch tenders a route to a DSP, and the DSP assigns one of its own eligible drivers.
- **Shippers**: every contract links to a shipper record, so every task and manifest links to a shipper.
- **Settlement**: completed work rolls up per payee (the DSP or carrier for its drivers, otherwise the independent driver) at pilot rates. Exceptions aren't paid.

## Partner Dashboard (Design A and Design B)

Both designs run the same script (`assets/dashboard.js`) on the same data. Only the layout changes.

- **Overview**: time to activate (median and p90), docs-current %, expiring 30/60/90, open/overdue/unowned work, onboarding funnel by step, expiring documents, capacity by line (eligible vs roster), security posture, recent sync events, earnings today.
- **Work queue**: every review, expiry and stalled application is an item with an owner and an SLA timer. Bulk assign, resolve and snooze; auto-route by rule (Driver/DSP → onboarding, Carrier/Warehouse → compliance, payments → finance, shippers → sales).
- **Partners**: filters (type, status, line, needs attention), CSV export. The **partner file** shows setup steps, documents with expiry (approve/reject/replace/remind), agreements, payment, verification checks, lines and vehicles, DSP/carrier drivers, live dispatch eligibility, settlement, notes and activity.
- **Partner onboarding** (partner-facing): apply → upload documents → e-sign → payment → submit, then a status tracker. You can resume any open application.
- **Agreements**, **Payments** (settlement from Dispatch, payout batches Draft → Approved → Paid, CSV), **Recruiting** (kanban, drag between stages, "Start onboarding"), **Team access** (roles, station scopes, invite, permission matrix), **Activity & audit** (audit log plus the events outbox), **Automation & security**.
- **Design A**: light ChainEx shell, left section nav, tables first, partner file as a page.
- **Design B**: dark command center with a KPI ticker in the top bar, an icon rail, a kanban directory by status, the queue in SLA lanes (Overdue / Due in 4h / Today / Later), and the partner file as a slide-over. The top bar toggle keeps your current section.

## Integration with ChainEx Global portal

The pilot keeps the portal and Dispatch as two systems with a narrow contract. In the pilot both run in one browser on shared state; in production they would talk through an API plus an event stream.

### Which system owns which record

| Record | Owner (system of record) | The other system |
|---|---|---|
| Partner identity, type, status, IDs (`P-…`, `CX-DRV-…`) | **Portal** | Dispatch reads a cached copy |
| Documents, expiry, verification checks | **Portal** | Dispatch reads only the eligibility result |
| Agreements / e-signature | **Portal** | — |
| Approved service lines, vehicle types | **Portal** | Dispatch enforces them |
| Payment / payout method, payout batches | **Portal** | — |
| Team users, roles, customer station scopes | **Portal** | Shipper view uses the scopes |
| Contracts (SLA, attempt policy, recipient tracking) and their shipper link | **Dispatch** (shipper reference from the portal) | Portal shows contracts on the shipper file |
| Orders, manifests, tasks, routes, assignments, tenders | **Dispatch** | Portal shows tender status on the DSP file |
| Scans, steps, POD, exceptions | **Dispatch** | Shipper view (read-only) |
| Settlement lines (earned per completed task) | **Dispatch** computes; **Portal** approves and pays | |

### Data contract (minimum fields)

- `Partner { id, type, name, status, suspended, suspendReason, parentId, driverId, lines[], vehicleTypes[], stations[], contracts[] }`
- `Eligibility { partnerId | driverId, line, ok, reasons[], warnings[] }`: computed by the portal and checked by Dispatch before every assignment or offer
- `Tender { routeId, line, dspId, taskIds[], status: tendered | accepted | recalled, driverId }`
- `TaskCompletion { taskId, line, driverId, payeeId, completedAt, units, pod { photo, signature, receivedBy }, exception? }`
- `SettlementLine { payeeId, line, stops, units, legs, amount, period }`

### Sync events

Portal → Dispatch: `partner.created`, `partner.approved`, `partner.updated` (lines, vehicles), `partner.suspended`, `partner.reinstated`, `partner.closed`, `document.uploaded`, `document.expiring`, `document.expired`, `agreement.signed`, `payment_method.updated`, `driver.rostered`, `payout.paid`.
Dispatch → Portal: `route.tendered`, `route.accepted`, `route.completed` (with earnings). Task completions and exceptions feed settlement directly in the pilot; production would send them as `task.completed` / `task.exception` events.

The dashboard's Activity page shows the events outbox, and the desk's All-lines overview shows "Portal sync · recent events".

## Files

- `assets/store.js`: shared state, operations, line and module registry, cross-tab sync
- `assets/lines/{pd,bulky,wg,ltl,shuttle}.js`: line configs and seed data
- `assets/partners.js`: partner directory, eligibility, verification, expiry, queue, roles, settlement, events
- `assets/fieldops.js`: driver route edits, road issues, contractor/shipper logins, DSP accept/decline/reassign/vehicles
- `assets/desk.js`, `assets/driver.js`, `assets/dsp.js`, `assets/shipper.js`, `assets/dashboard.js`: the apps; `assets/map.js` map wrapper; `assets/geo.js` sample geography
- `assets/theme.css` (design system tokens and components), `assets/cx-ui.js` (theme, palette, shortcuts, tours, sparklines), `portal.css`, `brand.css`, `desk.css`, `driver.css`, `dashboard.css`, `dashboard-alt.css`; `brand-classic.css`, `desk-classic.css` for classic.html
- `shots/`: screenshots from the headless verification run

## Known gaps

- No backend: state is per browser, and sync works only between tabs of the same browser.
- Verification providers, e-signature, micro-deposits, the camera, scanning, calls and navigation are simulated.
- Route lines are straight segments; ETAs use a simple distance model and the sample clock.
- No recipient tracking page or SMS. Contracts carry the tracking toggle only.
- Driver training/orientation and vehicle inspections are not modeled as setup steps.
- Payout batches don't move money. Shipper invoices are a placeholder.
- Sign-ins are sample IDs with no passwords; access scoping is enforced in the UI only, not by a server.
- Driver route edits are stored on the device until submitted; there is no real road-closure feed or geocoder.
- Job-offer timers and geofenced arrival are not implemented.
