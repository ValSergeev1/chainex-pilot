# ChainEx V05 · "Graphite" design system

V05 is one design system for every ChainEx surface: dispatch, dashboard, the driver app (all five lines), DSP/carrier/driver/warehouse portals, shipper, staff workspaces (onboarding, compliance, payments, scorecards, admin, sales, bids, architecture) and the pilot start page. It aims for "super tech-advanced, minimal": near-black graphite and crisp white, one electric accent, hairlines instead of boxes, dense but calm data, keyboard-first on desktop, thumb-first on phones.

## 1. What we studied (public sources) and what we took

| Product | What we looked at | What V05 takes |
|---|---|---|
| **Onfleet** | Dispatcher dashboard: map + one sidebar (Unassigned → Teams → Drivers with ordered tasks), Table view with batch actions, "Z" zoom-to-fit, slide-out Command Center map ([BloomNation help, Oct 2026](https://help.bloomnation.com/articles/Your-Delivery-Tracking-Dashboard); [Onfleet Q4 2025 update](https://onfleet.com/blog/onfleet-product-update-q4-2025/)) | Map-first dispatch with ONE sidebar ordered Unassigned → Exceptions → Drivers; Map/Table toggle; Z = fit; unique color per driver route |
| **Jitsu** | Dispatch + Shipper "Client Control Tower" (searchable delivery DB, exceptions reports, batch upload), driver app with load-out label scan and driver-reorderable stops ([gojitsu.com/technology](https://gojitsu.com/technology); [Control Tower](https://gojitsu.com/news-insights/jitsu-client-control-tower-total-visibility-real-time-insights)) | Shipper portal = control tower (search first); driver app scan-to-load and own stop order |
| **Linear** | 2024 UI redesign: less chrome, quieter sidebar, LCH theme from 3 inputs (base, accent, contrast), Inter Display headings ([linear.app/now](https://linear.app/now/how-we-redesigned-the-linear-ui)) | 3-token theme (base / accent / contrast), neutral greys with almost no blue tint, quiet sidebar, display weight for page titles |
| **Vercel Geist** | Gray scale steps (100 bg … 400 border … 900 secondary text, 1000 primary), Geist Sans + Mono, "draw each border once", translucent shadows ([vercel.com/geist/colors](https://vercel.com/geist/colors), [typography](https://vercel.com/geist/typography)) | Token scale named by job (bg, hover, border, text-2, text-1), mono for IDs/numbers, label vs copy type sizes, single hairlines |
| **Stripe Dashboard** | Accessible color system: perceptually uniform space, contrast "levels" (4.5:1 small text, 3:1 icons) ([stripe.com/blog/accessible-color-systems](https://stripe.com/blog/accessible-color-systems)) | Every status color checked at 4.5:1 for text on both themes; status = tinted bg + strong text, never color alone |
| **Samsara** | Left vertical nav grouped by job, collapsible nav and list to give the map more room ([Samsara blog](https://www.samsara.com/blog/meet-the-new-samsara-platform-experience)) | Collapsible left rail grouped by job (Operate / People / Money / Growth / System) |
| **Motive** | Fleet view: list ⇄ real-time map partnership; "entity, status, location" list cards; bite/snack/meal progressive disclosure ([Motive fleet view case study](https://www.zainadeel.com/motive-fleet-view)) | Every row shows Entity · Status · Location/next; row → inspector panel → full page |
| **Uber Freight** | Carrier app: clear load cards with rate up front ([Uber Freight blog](https://www.uberfreight.com/en-US/blog/uber-freight-app-web-portal)) | Bids and DSP offers lead with the money and the lane |
| **Flexport** | Restrained color, high contrast, flat layered planes for dense logistics data ([design language case](https://www.carriehcurtin.com/project/flexport-design-language)) | Flat planes, no gradients on data surfaces |
| **Raycast / Arc** | Command palette: global summon, fuzzy match, arrows + Enter default action, inline shortcut hints, secondary actions in a side panel ([Raycast teardown](https://builtux.com/raycast-command-bar-ux-keyboard-first-navigation-2026/)) | ⌘K everywhere with groups, shortcuts shown inline, Enter = default action |
| **Tesla / Rivian** | In-car UI: glanceable, one tap for critical controls, map present but not cluttered ([NN/g on Tesla's touchscreen](https://www.nngroup.com/articles/tesla-big-touchscreen/); [Rivian FleetOS case](https://www.erikdesignedthat.com/rivian)) | Driver navigation: full-bleed monochrome map, one big next action, everything else in sheets |

## 2. Principles

1. **One screen, layered.** Map or data plane at the back; sheets, inspectors and palettes slide over it. No page jumps inside a workflow (the driver never leaves the map while delivering).
2. **Color means something.** Neutral graphite everywhere; the accent is only for the primary action, selection and the active route. Status colors only for status.
3. **Dense but calm.** 13–14 px data type with tabular numbers, 32–36 px rows, hairline separators, generous outer margins.
4. **Next action first.** Every surface opens on what needs a human (exceptions, tickets, expiring documents), then the rest.
5. **Keyboard-first desktop, thumb-first phone.** ⌘K + single-key shortcuts on desktop; bottom tabs, bottom sheets and 48 px targets in the thumb zone on phones.
6. **Original ChainEx.** Our own wordmark, "Volt" accent, icon set and copy. No competitor assets.

## 3. Tokens

Three inputs (Linear-style): **base** (graphite), **accent** (ChainEx Volt), **contrast**. All other tokens derive from them.

| Token | Night (default after sunset) | Day |
|---|---|---|
| `--bg` page | `#0B0C0E` | `#FAFAFB` |
| `--bg-2` sunken / sidebar | `#08090A` | `#F3F4F6` |
| `--s1` surface | `#111316` | `#FFFFFF` |
| `--s2` raised / hover | `#171A1E` | `#F5F6F8` |
| `--s3` active | `#1E2227` | `#ECEEF1` |
| `--line` hairline | `rgba(255,255,255,.08)` | `rgba(10,12,16,.09)` |
| `--line-2` strong hairline | `rgba(255,255,255,.14)` | `rgba(10,12,16,.16)` |
| `--t1` primary text | `#EDEEF0` | `#0B0C0E` |
| `--t2` secondary | `#A1A6AE` | `#565C66` |
| `--t3` tertiary | `#6C717A` | `#8A9099` |
| `--acc` ChainEx Volt | `#4C7DFF` | `#2A5BFF` |
| `--acc-2` accent glow/tint | `rgba(76,125,255,.16)` | `rgba(42,91,255,.10)` |
| `--ok` | `#3DD68C` | `#14965A` |
| `--warn` | `#F5B544` | `#B7700A` |
| `--bad` | `#FF5C64` | `#D9343D` |
| `--vio` (DSP / partner) | `#A48BFF` | `#6E4FE0` |
| `--cyan` (live / GPS) | `#3FD0E0` | `#0F8FA0` |

Status chips use a 12–16% tint of the status color as background with the full color as text (≥ 4.5:1 on both themes).

**Auto day/night** follows Seattle sunrise/sunset (Pacific time); Day and Night can be locked. Night is graphite (not pure black) to avoid halation; Day is crisp white with grey sidebar.

## 4. Typography

- Sans: `"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- Mono: `"Geist Mono", ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace` for IDs, route codes, tracking numbers, money and times.
- Scale (px / line-height / weight): Display 32/36/650 (-0.02em) · H1 24/30/650 · H2 18/24/600 · Label 14/20/500 · Body 14/22/400 · Small 13/18/450 · Micro 11/14/600 uppercase +0.06em (section labels) · Driver app base is 16 and its primary actions 18/600.
- `font-variant-numeric: tabular-nums` on every number.

## 5. Space, shape, elevation, motion

- **4/8 grid.** Spacing steps 4, 8, 12, 16, 24, 32, 48. Page gutters 24 (desktop) / 16 (phone).
- **Radius.** 6 (inputs, chips), 8 (buttons, rows), 12 (cards, sheets), 999 (pills, avatars). Phone sheets 20 on top corners.
- **Borders.** 1 px hairline (`--line`); draw each border once; dividers inside containers, never doubled.
- **Elevation.** Flat for data. Shadows only for floating layers (`0 16px 48px -12px rgba(0,0,0,.5)` night / `.18` day).
- **Glass (sparingly).** Only for overlays on the map: `background: color-mix(var(--s1) 72%, transparent); backdrop-filter: blur(18px) saturate(140%)`.
- **Motion.** 120 ms (hover/press), 200 ms (sheets, panels) with `cubic-bezier(.2,.8,.2,1)`; live dots pulse at 2 s; everything off under `prefers-reduced-motion`.

## 6. Layout systems

- **Desktop shell.** 56 px icon rail (expands to 220 px on hover/pin) grouped by job, 48 px top bar (breadcrumb · ⌘K search · live clock · theme · role), content, optional right **inspector** (380 px).
- **Phone shell.** 52 px top bar, content, bottom tab bar (4–5 tabs, 56 px + safe area), bottom sheets for detail, a "More" sheet for the rest of the rail.
- **Dispatch.** Onfleet-style map + one left sidebar (Needs you → Unassigned → Drivers), map/table toggle, inspector on the right; on phones a full-screen map with a 3-detent bottom sheet.
- **Driver app.** Phone-first single screen: full-bleed map, top status pill, one big primary action, bottom sheets for plan, load-out, stop, POD and end-of-day. Installable PWA scoped to `v05/`.

## 7. Map style

MapLibre vector tiles (OpenFreeMap) restyled at runtime into a **ChainEx monochrome** style: land, water, parks and buildings pushed to 3–4 greys of the current theme, roads as thin lighter/darker lines, labels in `--t3`, no POI icons. Only our data has color: active route in Volt, driver dots in per-driver hues, exceptions red, done green. Schematic (no-tile) fallback draws the same data on a dot grid.

## 8. Iconography

One original 24 px line set, 1.6 px stroke, round caps/joins, drawn on a 2 px grid; filled variants only for the selected tab. No emoji in UI chrome.

## 9. Components

App shell (rail, top bar, bottom tabs, More sheet) · Command palette (⌘K, groups, inline shortcuts, default action) · Inspector panel · Bottom sheet (3 detents) · Drawer/modal · Toast · Button (primary, secondary, ghost, danger; sm/md/lg; icon) · Segmented control · Tabs · Chip / status pill / live dot · KPI tile with sparkline · Mini charts (sparkline, bars, stacked bar, ring) · Data table (sticky header, hover row, row actions, mono columns) · List row (entity · status · location) · Avatar (per-driver hue) · Progress bar · Empty state · Form controls (input, select, check, toggle) · Scan field (camera/hand-scanner style) · Big stop number (load-out) · Map pins (stop number, driver dot, cluster) · Keyboard hint (`kbd`).

## 10. Accessibility

Text ≥ 4.5:1, icons/large ≥ 3:1 on both themes; focus ring 2 px Volt + 2 px offset; targets ≥ 44 px on touch; status never by color alone (label + icon); reduced motion respected.
