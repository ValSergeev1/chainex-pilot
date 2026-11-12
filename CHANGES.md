# ChainEx Pilot · Changes

## V02 · Connected system: website → sign-in → every portal (Nov 12, 2026)

V01 is frozen in `../pilot-V01` (git tag `V01`) and served at `/v01/`. Every V02 page has a **V02 · switch to V01** badge. V02 keeps every V01 feature. All data is **sample data**: no real partner or person names, phones, emails, addresses or documents. Money, sign-in codes, uploads, e-signatures and outgoing messages are simulated.

**Website (`site/`).** Redesigned public site with ChainEx branding and day/night auto: home, services, shippers, carriers, drivers & DSPs, careers, coverage, technology, about, contact (simulated quote form) and track (lookup against pilot data). `site/recommendations.html` lists the prioritized design changes and why.

**Unified sign-in and applications (`auth/`).** One sign-in for staff, drivers, warehouse workers, DSPs, carriers and shippers. Code step, MFA for staff, then routing by role. Multi-step applications for Driver, DSP, Carrier and Warehouse worker: contact/company, service lines and areas, vehicles/equipment, USDOT/MC for carriers, document uploads with expiry, background-check consent, e-signed agreements, review & submit. Submissions land in the onboarding queue with an owner and due date. `status.html` tracks Application received → Documents review → Approved.

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

## V01 (frozen)
Dispatch desk for five service lines, driver app, DSP & carrier portal, shipper portal, partner dashboard (two designs), route planner, claim toggle, automatic day/night. See `v01/` for the frozen build.
