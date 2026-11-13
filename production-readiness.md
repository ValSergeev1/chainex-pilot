# Production readiness: 20–30 stop customer test

**Audience:** ChainEx, before a real 20–30 stop route with a real customer next week.  
**Scope:** The V06 pilot on GitHub Pages is for design and click-throughs. It is not a production system and must not hold real customer PII.

This note is a recommendation. Do not change the live chainexglobal.com system from this workstream. Humans approve any production change.

> **Update, Fri Nov 13, 2026 (PT), platform workstream.** The "minimum real backend" in section 2 now exists as code: private repo `ValSergeev1/chainex-platform` (Postgres schema, email-code + password + 2-step sign-in, hub-scoped roles, the order API from `v06/assets/openapi.yaml`, signed webhooks with retries, Web Push, realtime stream, photo storage, close-out, terms acceptance, audit log, Docker Compose for one server). 28 automated tests pass locally and in GitHub CI (24 API tests against real PostgreSQL 17, 3 AI-gateway, 1 website build). It is **not deployed** anywhere yet and the V06 screens are **not yet connected** to it. Section 8 is the cutover plan for next week. The live-system audit (`/workspace/chainex/live-system-audit.md`) found that chainexglobal.com is hosted on ChatGPT's site hosting, not in the GitHub repo, so section 6's "staging copy of the live system" is not available to us.

---

## 1. The public pilot cannot run the real test

The V06 pilot at `https://valsergeev1.github.io/chainex-pilot/v06/` is static HTML. Order data, scans, GPS, proof-of-delivery photos, webhook logs, and terms acceptances live in **each browser’s `localStorage`** (key `chainex.pilot.v03`). That has three hard limits:

1. **No shared state.** Dispatch on a laptop, a driver phone, a DSP, and a customer each have a different copy of the sample day. An order posted in the Developer portal only appears on the Dispatch map **in that same browser**. A scan in the driver app does not reach dispatch or the customer on another device.
2. **Storage caps.** iPhone Safari is roughly a 5 MB cap, shared with every older pilot version. Real photos and a 30-stop close-out will overflow it.
3. **No secrets, no PII.** A public GitHub Pages site is the wrong place for customer addresses, recipient names, or API keys. Do not upload a real customer’s file into the public pilot.

**Use the public pilot only with sample data** to walk the flow (import or API console → map and route → assign → driver close-out → tracking page and webhook log). For the real test, put a small backend on **ChainEx-controlled infrastructure**.

---

## 2. Minimum real backend (ChainEx-owned)

Run a small hosted API in **ChainEx’s own cloud account** (for example AWS, Azure, or GCP under a ChainEx org), with ChainEx owning the keys, the domain, and the data. Do not run production AI or data through a third-party consumer chatbot.

| Piece | Why it is required |
| --- | --- |
| Database | Shared orders, routes, events, assignments, users, hubs, terms acceptances |
| Auth | Staff, drivers, DSP, shipper logins; scoped API keys; session expiry |
| File storage | POD photos, signatures, close-out photos (not in the browser) |
| Webhook sender | Signed POSTs (`X-ChainEx-Signature: t=…,v1=…`) with retries and backoff, plus a delivery log and replay |
| Push server | Web Push / APNs / FCM with VAPID keys so closed driver apps still get “Continue your route,” inactivity, dispatch messages, and on-demand offers |
| Geocoding | A licensed or contracted geocoder (Photon/Nominatim is only suitable for low-volume trials with rate limits and caching). Flag low-confidence pins for Needs you |
| HTTPS + backups | TLS on a ChainEx hostname, daily backups, an audit log |

The V06 screens can stay as the client. Swap `localStorage` for this API. Keep the canonical event set: `created`, `received`, `loaded`, `out_for_delivery`, `arrived`, `delivered`, `attempted`, `exception`, `returned`, `closed_out`, plus `eta_updated`.

**Fastest safe path:** a small Node or Python service in ChainEx’s cloud (one app service, a managed Postgres, an object bucket, a queue for webhooks and push), fronted by the existing V06 pages or a staging hostname such as `app.chainexglobal.com`. Estimate, for an experienced contractor already familiar with the pilot: **about 1–2 weeks** to a thin shared backend that can carry 20–30 stops; **about 3–6 weeks** to harden API keys, retries, photo storage, push, and a customer webhook to a real endpoint. Cost for the test window is typically tens to low hundreds of dollars in cloud spend, plus the build time.

*Update Nov 13:* the thin backend is built (`chainex-platform`). What remains for the test is deployment, connecting the V06 screens to it, and real terms; see section 8.

---

## 3. What already works in the pilot vs what is simulated

**Works in the browser (same device, sample data):**

- Order intake mock: OpenAPI at `v06/assets/openapi.yaml`, API console at `v06/developers.html`, CSV import with column mapping and validation
- Canonical scan events used by the driver app, dispatch, and portals
- Posted sandbox orders appear on the Dispatch map **in that browser**
- Webhook subscription records, HMAC signatures, retry / replay UI, and a delivery log (delivery itself is simulated; URLs containing `fail`, `down`, or `timeout` simulate a 500)
- EDI 214 / 210 sample files
- Public-style tracking page `v06/track.html?id=…` (reads this browser’s store only)
- Integration health card on the control tower and `v06/health.html`
- Address lookup via Photon with rate limits and a cache; sample-coordinate fallback; low-confidence pins go to Needs you
- Driver `navigator.geolocation` (permission prompt, battery-aware interval, offline buffer); dispatch shows the live pin when a fix exists, simulated otherwise
- In-app notifications, a notification center, Web Push *client* (service worker `push` / `notificationclick`). **Closed-app push needs the push server above.**
- Offline scan outbox with retry and a pending count; close-out stays locked until scans sync
- Versioned terms per partner type, acceptance audit, Admin publish and roster. Terms text is marked **PLACEHOLDER FOR LEGAL REVIEW**

**Not real until the backend exists:** cross-device data, customer webhook POST to a partner URL, EDI transmission, licensed geocoding at volume, closed-app push, stored POD binaries, live GPS when the driver denies permission, payouts, e-sign, and invitation emails.

---

## 4. On-demand: build it as its own system

Do not bolt same-day “run this in a few hours” onto the planned daily dispatch board. On-demand is a matching problem with different SLAs:

- A distinct order type (`urgent` / `on-demand`) with a customer-visible cutoff and price
- A pool of eligible, on-duty drivers and DSPs (documents current, right vehicle, right hub or a stated radius)
- A short accept window (minutes, not hours), fan-out to several eligible people, first accept wins, automatic decline on timeout
- Dispatch override: ChainEx can assign or cancel
- Separate metrics (time-to-accept, time-to-complete, drop rate)

The pilot only shows a sample offer in the driver notification center (accept / decline). The production service should be a separate matching worker that writes into the same event model and the same map, not a second source of truth.

---

## 5. Apps vs web

**Recommendation: keep Dispatch, the control tower, the DSP portal, and the shipper portal as installable web PWAs.** They are map-and-table workstations. One web app, role- and hub-scoped, is easier to update the week of the test than three native store apps.

**Keep the driver experience as its own PWA** (already installable). It is the one that needs GPS, camera, offline scans, and push. A native iOS/Android wrapper can come later if store distribution or background location becomes a hard requirement; it is not required for a 20–30 stop trial if drivers keep the PWA open or return to it when a notification arrives.

One “ChainEx” app for everyone is possible later, but it is not necessary now and would slow the test.

---

## 6. Live chainexglobal.com as an alternative

If the live production board can already ingest a customer file, build routes, assign a driver, and send scans back, **a short test on a staging copy of that live system can be faster than standing up a new backend**, provided:

- You do not point the test at the public GitHub Pages pilot
- Legal terms are the real terms, not the pilot placeholder
- A human admin can edit and update that staging system during the test
- Real PII stays on ChainEx infrastructure

This workstream must not change the live site. If live is chosen, treat it as a separate, approved change with a rollback plan.

*Update Nov 13:* the live system runs on ChatGPT's site hosting (`www` CNAME `custom-domains.chatgpt.site`); we have no access to its source, database or a staging copy, and its dispatch board was empty when captured. Running the test there would also keep ChainEx dependent on ChatGPT. Recommendation: run the test on `chainex-platform`.

---

## 7. Go-live checklist for a 20–30 stop test

**Before any real addresses are loaded**

- [ ] Staging hostname on ChainEx infrastructure (not public GitHub Pages)
- [ ] Auth for dispatcher, one driver (or one DSP + driver), and one customer viewer
- [ ] Counsel-reviewed terms published; partners accept; acceptances stored
- [ ] Customer file format agreed (CSV columns or API); a dry run with *anonymized* rows
- [ ] Geocoder key and rate limits; a person assigned to review low-confidence pins
- [ ] Route limits and a spare vehicle / driver
- [ ] Proof-of-delivery photo storage (not localStorage)
- [ ] If the customer wants auto-updates: one webhook endpoint, signature verification, and a retry test; or a documented manual status email as a fallback
- [ ] Driver PWA installed, location permission granted, a test scan while in airplane mode then back online
- [ ] Notifications: in-app confirmed; closed-app push only if the push server is live (otherwise brief the driver to keep the app open)
- [ ] Who can edit routes live during the test, and how to roll back a bad import
- [ ] No real PII in the public pilot, in screenshots, or in git

**Day of the test**

- [ ] Import or API-load the 20–30 stops; confirm every pin before auto-build
- [ ] Build or draw routes; assign ChainEx driver or send as a DSP offer
- [ ] Track in dispatch; confirm POD, exceptions, and close-out returns
- [ ] Confirm the customer saw each scan (webhook log or tracking page from the **server**, not from one phone’s browser)
- [ ] Capture a punch list the same day (missed geocodes, GPS gaps, photo failures, webhook delays)

**After**

- [ ] Delete or restrict the real test data per policy
- [ ] Decide whether the next step is hardening this backend or a later cutover from the live system

---

## 8. Cutover plan for the 20–30 stop test (added Nov 13)

### What runs where

| Piece | Where | Status |
|---|---|---|
| API, worker (webhooks, push, nudges), database, photo storage | One ChainEx-owned server, Docker Compose (`chainex-platform`) at `app.chainexglobal.com`; photos at `files.chainexglobal.com` | Built and tested; not deployed |
| Dispatch, control tower, DSP desk, shipper portal, driver app | Same server, served from `./web` on the same domain (cookies stay first-party) | V06 screens exist; need an API adapter that swaps `localStorage` for the API |
| Customer integration | Customer posts orders to `/v1/orders` or `/v1/orders/batch` (or ChainEx uploads their CSV); updates go back by signed webhook or `/v1/events` | Built |
| Public website | Unchanged during the test (Website V05 is a separate, optional step) | V05 release build ready on branch `website-v05` |
| Live portal (partners, Sales, Admin) | Stays on the current host; untouched | — |
| ChainEx AI | Not needed for the test | Gateway stub built, no model server yet |

### What ChainEx must provide (decisions and access)

1. **Server or cloud account in ChainEx's name.** Either a VM (4 vCPU, 8 GB RAM, 160 GB SSD, Ubuntu 24.04; Hetzner, DigitalOcean, AWS Lightsail, or Google Cloud since DNS is already there) with SSH access for setup, or a cloud project where we can create one.
2. **DNS access** in Google Cloud DNS to add `app.chainexglobal.com` and `files.chainexglobal.com` (new records only; nothing existing changes).
3. **Sending email** for sign-in codes: Google Workspace SMTP relay (simplest, you already use Workspace) or Amazon SES / Postmark, and a sending address such as `no-reply@chainexglobal.com`.
4. **SMS provider** (Twilio, Telnyx or Bandwidth): not required for the test; US texting needs 10DLC registration, which takes 1–3 weeks, so start it now if texts matter.
5. **Real terms** from counsel for drivers, DSPs and the customer (the platform shows them and records acceptance).
6. **The customer:** name, who their contact is, how they will send the stops (CSV columns or API), and whether they want webhooks (URL) or the tracking page and a daily email.
7. **People for the test:** one dispatcher, one or two drivers (say which phones: iPhone or Android), optionally one DSP owner; their emails and hub.
8. **Hub address** for the test and the service date.

### Timeline (proposed, all PT)

| Day | Work |
|---|---|
| Mon Nov 16 | Server and DNS ready → deploy staging, create admin, set up email. Publish counsel's terms if ready. |
| Mon–Wed Nov 16–18 | Connect V06 Dispatch, driver app, DSP desk and shipper portal to the API (sign-in, orders, routes, assign/offer, scans, POD photos, close-out, messages, push). CSV import posts to `/v1/orders/batch`. |
| Wed Nov 18 | Dry run with 25 **anonymized** stops: import, map, build and split routes, assign, two phones, airplane-mode scan, photos, close-out, webhook to a ChainEx test receiver. Fix the punch list. |
| Thu Nov 19 | Customer sends a test file or a test API call with the sandbox key; they verify webhook signatures. Brief the drivers. |
| Fri Nov 20 or Mon Nov 23 | Real 20–30 stop route. Avoid Thanksgiving week traffic after Tue Nov 24. |

If the server is not available by Tue Nov 17, move the real run to the week after Thanksgiving rather than compressing the dry run.

### Checklist (in addition to section 7)

- [ ] Server in ChainEx's account; `.env` filled; `APP_ENCRYPTION_KEY` copy stored offline
- [ ] `https://app.chainexglobal.com/health` returns ok; backups appear every 6 hours and are copied off the server
- [ ] Admin signed in with email code and 2-step turned on; dispatcher, driver(s), DSP and customer accounts created with the right hub
- [ ] Live API key for the customer created in Admin and sent through a secure channel; sandbox key used first
- [ ] Customer webhook registered and a signed test event verified by them
- [ ] Counsel's terms published per audience; every test user accepted
- [ ] V06 screens on `app.chainexglobal.com` read and write the API (no `localStorage` business data)
- [ ] Driver phones: app installed from `app.chainexglobal.com`, location and notifications allowed, push received with the app closed (Android), iPhone drivers keep the app open
- [ ] Every stop has a confirmed pin (customer lat/lng, or dispatcher checked)
- [ ] Rollback plan: if the platform fails mid-route, drivers finish on paper/photos and dispatch emails the customer a status sheet; nothing on the live portal depends on the test
- [ ] After the test: export the run (events, POD, close-out) for review; delete or retain real data per policy

