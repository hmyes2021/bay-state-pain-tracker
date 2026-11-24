# Pain Tracker testing report

Run on 2026-11-20 against the production build (`npm run build && npm run preview`) in headless Chromium
via Playwright, with device emulation for **iPhone 13**, **Pixel 7**, **iPad (820×1180, touch)** and **desktop (1440×900)**.

**Result: 108/108 browser checks passed · 14/14 unit and component tests passed · `tsc --noEmit` clean · production build OK.**

## Hosted on the portfolio

The same build was checked as the portfolio serves it (`npm run build` at the repo root, then preview), on desktop and
iPhone 13. All passed:
- The case study at `/work/bay-state-pain-tracker-app` renders, every image loads, and nothing overflows.
- The Work page and the homepage picker list it as a Bay State study.
- `/pain-tracker` opens the app, and a `#/insights` deep link survives a reload.
- The service worker is scoped to `/pain-tracker/`; the app works offline there; portfolio pages are not controlled
  by it.
- There are no page errors.

One earlier full run flagged a single `aria-prohibited-attr` axe finding on the iPhone Settings screen. It didn't
reproduce in four later runs (three iPhone-only, one full), and axe on a fresh Settings screen is clean. It's recorded
here so a later screen-reader review can look for it.

## How to reproduce

```bash
cd bay-state-pain-tracker
npm install && npm test
npm run build && npm run preview &
npm run test:e2e        # writes e2e/output/results.json, screenshots and the exported PDFs
```

## Required journeys and extra checks

| Check | iPhone 13 | Pixel 7 | iPad | Desktop | Notes (iPhone run) |
|---|---|---|---|---|---|
| 0. Privacy & consent gate blocks until required statements are accepted | ✅ | ✅ | ✅ | ✅ |  |
| 1. Open the app and review today's dashboard | ✅ | ✅ | ✅ | ✅ | Log Pain action bottom at 503px of 664px viewport |
| 2a. One-tap pain log from Home (with undo available) | ✅ | ✅ | ✅ | ✅ | saved in 64 ms, 1 tap |
| 2b. Record pain with location + details in under 30 seconds | ✅ | ✅ | ✅ | ✅ | 6.2 s automated (6 interactions) |
| 2c. Save is blocked without intensity; unsaved-close dialog offers Save Draft | ✅ | ✅ | ✅ | ✅ |  |
| 3. Edit a pain entry, then delete one and undo | ✅ | ✅ | ✅ | ✅ |  |
| 4. Add a medication (with reminder) and record a dose | ✅ | ✅ | ✅ | ✅ |  |
| 5. Record a therapeutic injection | ✅ | ✅ | ✅ | ✅ |  |
| 6. Log an exercise session | ✅ | ✅ | ✅ | ✅ |  |
| 6b. Log a meal | ✅ | ✅ | ✅ | ✅ |  |
| 7. Review weekly pain insights and switch range filters | ✅ | ✅ | ✅ | ✅ |  |
| 8. Configure a reminder (selected days, toggles, preview) | ✅ | ✅ | ✅ | ✅ |  |
| 9. Export a patient report (valid PDF) | ✅ | ✅ | ✅ | ✅ | Pain-Tracker-report-2026-11-20.pdf · 157 KB |
| Data persistence across reload | ✅ | ✅ | ✅ | ✅ |  |
| Offline: reload with network off shows saved data | ✅ | ✅ | ✅ | ✅ |  |
| Keyboard: skip link + log pain without a pointer | ✅ | ✅ | ✅ | ✅ |  |
| Navigation: every nav destination renders without overflow | ✅ | ✅ | ✅ | ✅ |  |
| Settings: export JSON, then delete all data returns to welcome | ✅ | ✅ | ✅ | ✅ |  |
| axe WCAG 2.2 AA — consent | ✅ | ✅ | ✅ | ✅ | 0 violations |
| axe WCAG 2.2 AA — home | ✅ | ✅ | ✅ | ✅ | 0 violations |
| axe WCAG 2.2 AA — medications | ✅ | ✅ | ✅ | ✅ | 0 violations |
| axe WCAG 2.2 AA — insights | ✅ | ✅ | ✅ | ✅ | 0 violations |
| axe WCAG 2.2 AA — reminders | ✅ | ✅ | ✅ | ✅ | 0 violations |
| axe WCAG 2.2 AA — report | ✅ | ✅ | ✅ | ✅ | 0 violations |
| axe WCAG 2.2 AA — log | ✅ | ✅ | ✅ | ✅ | 0 violations |
| axe WCAG 2.2 AA — settings | ✅ | ✅ | ✅ | ✅ | 0 violations |
| No uncaught page errors | ✅ | ✅ | ✅ | ✅ |  |

Timings are for automated input. They show the flow takes a handful of interactions (a quick log is **1 tap**,
and a detailed log with location, characteristic and sleep impact is **6 interactions**). They don't measure human
speed, so the "under 30 seconds" claim still needs usability testing with patients.

## What the checks cover

- **Dashboard:** greeting, all six dashboard sections, and the Log Pain action sitting fully above the fold on each
  device (above the bottom nav on phones).
- **Pain logging:** one-tap log from Home, with Undo. Detailed log with body map (Back view), characteristic and
  sleep impact. Save is blocked without an intensity and shows a clear message. The unsaved-close dialog, Save Draft
  and Resume draft all work. Edit, delete, and Undo of a delete all work. Saved values are checked in storage.
- **Medications:** add with an "Every 12 hours" schedule, which auto-creates a linked reminder. Record a dose from
  today's schedule.
- **Injections, exercise, meals:** create records and see them listed.
- **Insights:** 7-day and 90-day ranges (daily vs weekly aggregation), plus the data-table alternative.
- **Reminders:** type, title, time, selected days, sound off, live preview; values checked in storage; pause toggle.
- **Report:** PDF downloads and starts with `%PDF-`. Pages 1–2 were checked visually: summary table, trend chart,
  entries table, and the patient-reported disclaimer.
- **Persistence:** data survives a reload.
- **Offline:** the service worker takes control. With the network off, a reload shows Home with saved data and the
  offline banner, and Insights still works.
- **Keyboard:** the skip link is the first tab stop; arrow keys work on the pain scale; Space toggles body-map
  regions; Enter saves.
- **Responsive:** 13 routes (including 404) at each size with **no horizontal overflow**. The mobile bottom nav,
  including the centre Add Log button, navigates correctly.
- **Data rights:** JSON export contains the records. Deleting all data clears storage and returns to Welcome.
- **Accessibility:** axe-core with the WCAG 2.0/2.1/2.2 A+AA rule sets on consent, home, medications, insights,
  reminders, report, log and settings, on every device. **0 violations.**

## Defects found and fixed during testing

1. Mobile cards overflowed the screen (grid items default to `min-width: auto`). Fixed globally.
2. After onboarding, Home opened scrolled down (both screens share `/`). Fixed.
3. The consent button had `aria-disabled` while still clickable, so assistive tech announced it as unavailable.
   Removed.
4. Pain-scale arrow keys started from "no selection" instead of the focused number. Fixed.
5. Paused reminders used opacity, which failed text contrast (axe). Replaced with a muted background.
6. On mobile, the body map sat at the bottom of the log. It now follows intensity, as in the prototype's one-screen log.
7. The 14-day medication history was too long on phones. It now uses "Show more days".

## Not verified here

- Real iOS Safari or Android hardware. This run used Chromium emulation, so WebKit-specific behaviour wasn't
  exercised: iOS install flow, date and time pickers, notifications on installed iOS PWAs.
- A real install prompt (`beforeinstallprompt` doesn't fire headless). The manifest, icons and service worker are
  served correctly.
- Voice dictation, which needs a microphone and permission.
- System notifications. The permission flow and in-app fallback are implemented; background delivery while the app
  is closed isn't (see below).
- Screen-reader walkthroughs with VoiceOver or TalkBack. Automated axe checks are not a substitute.
- Usability testing with people who live with chronic pain.

## Not production-ready yet: integrations still needed

| Area | What exists | What production needs |
|---|---|---|
| Authentication | `AuthProvider` interface, demo session | Supabase Auth (or the clinic's IdP) with MFA, session timeout, account recovery |
| Backend data | `SupabaseAdapter` (PostgREST, untested against a live project) + `supabase/schema.sql` with RLS | Provisioned project, migrations, sync and conflict handling, offline queue, encryption review |
| Roles and sharing | Permission matrix + RLS for caregiver and clinician grants | Invite and revoke UI, audit logging, clinician view |
| Reminders | In-app scheduler, Notification API, test reminder | Web Push (VAPID) server for delivery while the app is closed; iOS needs the installed PWA (16.4+) |
| Compliance | Consent screen, export, deletion, no third parties | HIPAA risk assessment, BAA with hosting, policies, breach process, legal review of consent copy |
| Clinic integration | PDF the patient shares themselves | EHR/portal integration (e.g. FHIR), only with clinic approval |
| Voice input | Browser speech API, opt-in | On-device or BAA-covered speech service if the clinic requires it |
| Brand assets | Tokens and patterns from the prototype; original app icon | Official clinic logo (SVG) and the prototype's original icon set |
| Localization | English only | Spanish and other languages the clinic's patients use |
