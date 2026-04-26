# Full Audit Fix Log

Date: 2026-04-25

## Implemented During Audit

### 1. Legacy token alias patch

Files:

- `web/src/app/globals.css`

Problem:

Older screens and shared components still referenced legacy CSS variables like `--surface`, `--text`, `--gold`, `--border`, `--danger`, and `--success`. The active design system now uses `--uv-*`. On auth and dare screens, this caused surfaces and text to collapse into near-invisible states.

Change:

- Added legacy aliases that map old variables to the V6 token system.

Why this was above the clear-as-day threshold:

- It was a visual/functional bug, not a subjective redesign.
- It fixes multiple product surfaces at once.
- It preserves existing component intent.

Confidence: 100

### 2. Auth sheet containment

Files:

- `web/src/components/auth-modal.tsx`

Problem:

The generic auth modal could visually merge with the page behind it and had no max-height/scroll containment.

Change:

- Raised modal z-index.
- Added max-height, vertical scroll, border, and shadow to the sheet.

Why this was above the clear-as-day threshold:

- Auth is a conversion-critical path.
- The screenshot showed a concrete readability failure.
- The change is isolated and does not alter auth logic.

Confidence: 100

### 3. Witness invite framing

Files:

- `web/src/app/w/[token]/client.tsx`
- `web/src/app/w/[token]/og/route.tsx`
- `supabase/functions/_shared/sms-templates.ts`
- `design-alignment/v1v2/full-audit/mocks/01-witness-acceptance-focus.html`

Problem:

The witness-facing framing leaned too much on product/meta language and "judge" language before the witness understood the human job.

Change:

- Reframed the first page around "hold the line."
- Made the witness job explicit: nudge if needed, then call it kept or broken.
- Updated witness SMS invite copy so the text feels like it came from the maker, not an app onboarding funnel.

Confidence: 92

### 4. Dashboard scan cleanup

Files:

- `web/src/app/dashboard/page.tsx`
- `design-alignment/v1v2/full-audit/mocks/02-dashboard-clean-scan.html`

Problem:

The non-empty dashboard still had a large gold CTA competing with the vow list, and the mock used too much dark-on-gold treatment for a scan surface.

Change:

- Demoted "Make a vow" to a compact `New vow` action in the greeting row.
- Removed the large mid-list gold CTA that could visually sit between vow cards while scrolling.
- Tuned the dashboard mock so cards and controls stay cream/gold on dark, with no heavy black text treatment.

Confidence: 92

### 5. Dare accepter flow and copy

Files:

- `web/src/app/c/[token]/client.tsx`
- `web/src/app/c/[token]/og/route.tsx`
- `web/src/app/cast/page.tsx`
- `supabase/functions/_shared/sms-templates.ts`
- `design-alignment/v1v2/full-audit/mocks/04-dare-acceptance-focus.html`

Problem:

The dare screen looked strong as a mock, but the live flow undercut the premise by defaulting to no stake in some cases and staying on the invite page after acceptance.

Change:

- Reframed dare accepter copy around "accept it, stake your word, follow through or pay."
- Defaulted the accepter stake to `$50` when no supported suggested amount exists.
- After a challenge is accepted/sealed, route to `/vow/[id]?sealed=1` so the live vow detail becomes the next screen.
- Hid optional taunt behind an `Add a taunt` control in the dare creator.
- Updated share/SMS copy to explain the dare loop directly.

Confidence: 90

### 6. Premium share artifacts

Files:

- `web/src/app/certificate/[vowId]/og/route.tsx`
- `web/src/app/outcome/[vowId]/og/route.tsx`
- `web/src/app/w/[token]/og/route.tsx`
- `web/src/app/c/[token]/og/route.tsx`

Problem:

The public invite thumbnails were directionally strong, but resolved certificate/outcome images still felt like generic centered receipt cards.

Change:

- Upgraded certificate/outcome OG cards with larger vow/result hierarchy, brand mark, stronger stamp treatment, and a clearer CTA area.
- Tightened witness/dare OG language to match the updated first-page framing.

Confidence: 68

## Verified Artifacts

Before:

- `screenshots/mobile-cast-unauth.png`

After:

- `screenshots/mobile-cast-auth-fixed.png`

## Not Implemented Yet

### Dashboard tabs / filters

Confidence: 78  
Reason held: likely useful once vow counts are consistently high, but premature for the current scan surface.

Mock:

- `mocks/02-dashboard-clean-scan.html`

### Live vow redesign

Confidence: 90  
Reason held: high confidence direction, but touches many vow phases and should share language with dashboard cleanup.

Mock:

- `mocks/03-vow-live-focus.html`

### Post-seal celebration

Confidence: 92  
Reason held: strong direction, but exact emotional copy should be approved before replacing the current working sealed flow.

Mock:

- `mocks/05-post-seal-solemn.html`

### Witness acceptance v2

Confidence: 90  
Reason held: current page is usable after prior improvements. Mock is likely better, but not an emergency.

Mock:

- `mocks/01-witness-acceptance-focus.html`

### Frequent final-hour SMS reminders

Confidence: 60  
Reason held: could create urgency, but likely feels spammy for short vows. Keep 24h/deadline messages first.
