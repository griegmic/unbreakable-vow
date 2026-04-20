# Unbreakable Vow — Copy Specification v1.0

**Scope:** Every user-facing string in the app. If you see copy in the build that isn't in this doc, it's either a bug or this doc needs updating — flag it.

**Rule:** Copy is content, not decoration. Every string below has been chosen. Do not paraphrase, "improve," or shorten unless this spec is updated first.

---

## 0. Voice & Tone Principles

The narrator is **a friend who calls you out gently.** Not a coach. Not a drill sergeant. Not a therapist. Not a hype-person. A friend who already knows you're going to flake and is charging you $50 anyway — with love.

**Do:**
- Short sentences. Fragments are fine.
- Direct address. "You said" / "You promised" / "You're on."
- Specifics over abstractions. "$50" not "your stake." "Tuesday 9pm" not "your deadline."
- Second person singular. "You", never "we" in user-facing copy (except footers).
- Lowercase-first where it reads better. "finish the draft" is fine; "Finish the draft" is also fine. Never ALL CAPS except status labels.
- Italic for emphasis on the one word that carries the feeling ("*your* vow", "*free*"). Gold for the promise itself.

**Don't:**
- No motivational-poster phrases. Ban list: "you got this", "believe in yourself", "crush it", "level up", "unlock your potential", "journey", "growth mindset", "manifest."
- No therapy-speak. Ban list: "hold space", "sit with it", "honor your truth", "lean in."
- No empty enthusiasm. Ban list: "awesome!", "amazing!", "great job!", "let's go!".
- No corporate softness. Ban list: "we're excited to...", "hope you enjoy", "feel free to", "at your convenience".
- No pity. Ban list: "it's okay", "no worries", "don't beat yourself up", "these things happen".
- No fake empathy for broken vows. We don't console the user — we collect the money.
- No exclamation points except in two places: (1) the ceremony "free." italic (which uses a period, not an exclamation), (2) SMS templates that are explicitly playful. Period.
- No emoji in UI strings. Gold dot is a rendered element, never a unicode bullet.
- No em-dashes in UI copy *(em-dashes are fine in docs and internal text; avoid in rendered strings because they read as AI-written).* Use commas or periods.

**Accusatory register (the house style):**
- "You said Tuesday." (not "Your deadline is Tuesday")
- "You swore on $50." (not "You staked $50")
- "They're watching." (not "Your witness has been notified")

**Gentle register (for sensitive states — verdict, broken, witness declines):**
- "It's time." (not "Please submit your verdict")
- "You broke it." (not "Your vow was not kept" — own it; don't passive-voice the failure)
- "They said no." (not "Your witness declined the invitation")

---

## 1. Global rules

### 1.1 Token syntax

All dynamic values use curly-brace tokens. Unknown or missing tokens must fall back to safe defaults, never render "undefined" or "{maker_first}" literal.

| Token | Source | Fallback | Format |
|-------|--------|----------|--------|
| `{maker_first}` | `users.display_name` first word | "you" | Title case |
| `{maker_full}` | `users.display_name` | "the maker" | As stored |
| `{witness_first}` | `vows.witness_name` first word | "your judge" | Title case |
| `{witness_full}` | `vows.witness_name` | "your judge" | As stored |
| `{target_first}` | `vows.target_user.display_name` first word OR `vows.target_phone` last-4 ("••34") | "they" | Title case |
| `{amount}` | `vows.stake_amount` / 100 | — | `$50` (no cents unless non-zero) |
| `{amount_spelled}` | same | — | "$50" never "fifty dollars" |
| `{cause}` | `vows.destination` resolved to label | "charity" | Title case noun phrase |
| `{by_when}` | `vows.ends_at` | "soon" | See 1.3 below |
| `{by_when_short}` | same | "soon" | See 1.3 below |
| `{by_when_relative}` | same | "soon" | See 1.3 below |
| `{vow_text}` | `vows.refined_text` | "your vow" | Verbatim |
| `{link}` | deep link | — | HTTPS URL |
| `{ref_link}` | share link with `?ref=` | — | HTTPS URL |

### 1.2 Money formatting

- Always `$50`, `$100`. Never `$50.00`.
- Never `50 USD` or `USD 50`.
- In sentences: "swear on $50" — no word "dollars."
- In labels: "$50" alone.
- Refunds: "$50 back" never "refunded $50.00."
- Non-USD: not supported v1.0. If Stripe returns a non-USD currency, show "stake returned" without amount.

### 1.3 Date and time formatting

Three formats — pick based on context:

| Form | When | Example |
|------|------|---------|
| `{by_when_relative}` | < 24h away, OR in dashboard chips | "in 3h", "in 42min", "Tomorrow 9pm" |
| `{by_when_short}` | medium density (vow detail header, cert) | "Tue Apr 22, 9:00 PM" |
| `{by_when}` | full ceremonial moments (seal, share, SMS) | "Tuesday, April 22 at 9:00 PM" |

Rules:
- Times always include am/pm (lowercase). Never 24h clock in UI.
- "Tonight" for same-day < 6h.
- "Tomorrow" for next-day.
- Day names full on ceremonial forms, short (Tue) on dense forms.
- Past times: "2 hours ago", "yesterday", "Apr 15", "Apr 15, 2025" (year if not current year).

### 1.4 Names

- **In body copy:** first name only. "Sarah's watching."
- **In witness assignment UI:** full name as entered.
- **In SMS signatures:** first name of the other party when present, else "your friend."
- **Unknown name fallback:** "your judge" / "your friend" / "someone" — never render empty quotes or "(no name)".
- **Anti-harassment:** the public `/outcome` and `/certificate` pages show only first name + last initial of maker. Witness/target names never appear on public pages.

### 1.5 Status labels (global)

These strings are used anywhere a vow status appears. They must match exactly.

| DB status + sub-state | Display label | Color |
|-----------------------|---------------|-------|
| `draft` | "Draft" | muted |
| `sealed` (challenge pending) | "Challenge sent" | blue |
| `sealed` (witness pending) | "Waiting on {witness_first}" | amber |
| `active` (< 24h to end) | "Ends {by_when_relative}" | amber |
| `active` (≥ 24h to end) | "Active" | gold |
| `active` (> 48h past witness invite, not accepted) | "Still waiting on {witness_first}" | amber |
| `awaiting_verdict` (maker view) | "Awaiting verdict" | blue |
| `awaiting_verdict` (witness view) | "Your call" | gold |
| `kept` | "Kept" | green |
| `broken` | "Broken" | red |
| `voided` | "Voided" | muted |

---

## 2. Navigation & chrome

### 2.1 App name

- Full: "Unbreakable Vow"
- Short: "Vow" (in SMS sender, push sender)
- Never: "UV", "The Vow App", "Unbreakable".

### 2.2 Logo wordmark

- Rendered: "Unbreakable Vow" in `font-serif`, `display-sm`, `--gold`
- Alt text: "Unbreakable Vow"

### 2.3 Hamburger menu items (authenticated)

Order, top to bottom:

1. "Dashboard" → `/dashboard`
2. "New vow" → `/create`
3. "Past vows" → `/history`
4. — divider —
5. "Group Challenges" → disabled, trailing badge "COMING SOON" in `--text-faint`, `caption`
6. — divider —
7. "Settings" → `/settings`
8. "Sign out" → logout action

### 2.4 Footer (marketing pages only)

- Left: "© 2025 Unbreakable Vow"
- Right: "Privacy" / "Terms" — separated by `•`
- Never includes contact email in v1.

### 2.5 Page titles (document.title)

| Route | Title |
|-------|-------|
| `/` | "Unbreakable Vow" |
| `/create` | "New vow — Unbreakable Vow" |
| `/dashboard` | "Your vows — Unbreakable Vow" |
| `/vow/[id]` | "{vow_text short} — Unbreakable Vow" |
| `/seal` | "Seal your vow" |
| `/sent` | "Sealed" |
| `/vow-kept` | "You kept it" |
| `/vow-broken` | "You broke it" |
| `/history` | "Past vows" |
| `/settings` | "Settings" |
| `/w/[token]` | "{maker_first} needs a judge" |
| `/w/[token]/verdict` | "Cast your verdict" |
| `/c/[token]` | "{maker_first} dared you" |
| `/outcome/[vowId]` | "{maker_first}'s vow" |
| `/certificate/[vowId]` | "{maker_first}'s certificate" |

---

## 3. Ceremony (first-time only)

### 3.1 Screen 1

- Line 1: "Every promise"
- Line 2: "you've ever broken"
- Line 3: "had one thing in common."
- Skip button: "Skip →"

### 3.2 Screen 2

- Line 1: "It was"
- Line 2 (italic, gold): "*free.*"
- Subtitle: "An Unbreakable Vow — a vow to be better, sworn to a friend. Break it, and you'll pay."
- CTA: "Begin →"

---

## 4. Landing page (`/`)

Single scrollable unit: logo → hero → subhead → live feed → two CTAs. No desktop-only 3-card explainer. No footer CTA band. The live feed does the explaining.

### 4.1 Header

- Gold diamond mark icon + wordmark: "UNBREAKABLE VOW" (caption, `--gold`, uppercase, tracking)

### 4.2 Hero

- Headline line 1 (serif, `display-xl`, `--text`): "You say a lot."
- Headline line 2 (serif italic, `display-xl`, `--gold`): "*This time vow it.*"

The italic "*This time vow it.*" is the hero moment — carries the pun (swear + "do it" verb energy) and the gold emphasis. Word-wrap naturally; on narrow viewports lines break after "This time" / "vow it." as shown in the reference.

### 4.3 Subhead

- Sans, `body-lg`, `--text` (not muted):
  - "Put $$ on a goal. A friend decides if you pulled it off."

Renders `$$` as literal double-dollar glyphs — not a token substitution, not escaped.

### 4.4 Live feed

**Section header row (flex row, space-between):**
- Left (caption, uppercase, tracking, `--text-faint`): "THIS WEEK"
- Right: green dot + (caption, `--success`): "Live"
  - Green dot uses `--success` color, pulses via `goldDotPulse` keyframe recolored (or a new `liveDotPulse` keyframe with same timing).

**Five rows (seeded, static, never real user data):**

Each row format: vow text (left, `body`, `--text`) • amount (right, `body`, `--gold`, tabular numerals). Rows separated by 1px hairline divider in `--border-subtle`.

1. "Gym 3x this week" — "$50"
2. "Out of bed by 8am, 7 days" — "$10"
3. "No alcohol, 2 weeks" — "$25"
4. "No texting my ex, 30 days" — "$75"
5. "Delete TikTok for a week" — "$25"

These are aspirational templates, not fake social proof. No usernames. No timestamps. No outcomes. They exist to show the user what a vow looks like in this product.

If the content team wants to rotate these quarterly, they edit the constant in `web/src/app/landing-feed.ts`. v1 ships static.

### 4.5 CTAs (stacked, centered, below feed)

- Primary CTA (gold pill, full-width in content column): "Make your vow →" → routes to `/create`
- Secondary CTA (gold text link, centered below primary): "Dare a friend →" → routes to `/cast`

No tertiary "I'm here to judge someone" link. Witnesses arrive via SMS-embedded `/w/[token]` links and never need to land on `/`.

---

## 5. `/create` flow

### 5.1 Step 1 — Vow input

**Header eyebrow:** "Step 1 of 3"
**Header title:** "What are you swearing to?"
**Header subtitle:** "One vow. One sentence. Make it count."

**Input placeholder (empty state):** "I will…"

**Helper text (below input, default):** "Start with a verb. End with a deadline."

**Helper text (vague detector triggered — < 4 words or matches vague terms):**
- "Be specific. 'I will be productive' is a wish. 'I will finish the deck by Tuesday 9pm' is a vow."

**Vague suggestion chips (dashed border, gold, tap to populate):**
Shown when the detector flags vagueness. Pick 3 relevant to the user's input theme; if no theme, use the three generic:
- "I will finish the draft by Tuesday 9pm"
- "I will work out three times this week"
- "I will not check email before 10am"

**Primary CTA:**
- Disabled state label: "Continue →" (`--text-faint`)
- Enabled state label: "Continue →" (`--bg` on `--gold`)

**Validation errors (inline, below input):**
- Empty: "You have to actually say it."
- Too short (< 10 chars): "Too short. Add the details."
- Too long (> 280 chars): "Trim it. A vow should fit in a text message."
- Profanity (if filter triggers): "Keep it clean enough to text your mom."
- Forbidden topic (named public figures, hate speech, self-harm): "We can't seal this one. Pick a vow we can."

### 5.2 Step 1.5 — "By when?" bottom sheet

**Trigger:** Tapping the "by when" detector on the vow input, OR a dedicated "Set deadline →" chip under the input if no deadline is detected.

**Sheet title:** "By when?"
**Sheet subtitle:** "Pick a deadline. You can't undo this later."

**Option list (radio, single select):**

1. "Tonight (11:59pm)"
2. "Tomorrow (9pm)"
3. "This Friday (9pm)"
4. "One week from now"
5. "Pick a date…" — opens native date+time picker

**Custom date picker:**
- Title: "Pick your deadline"
- Minimum: 1 hour from now
- Maximum: 90 days from now
- Error (< 1h away): "Give yourself at least an hour."
- Error (> 90d away): "Vows this long lose their teeth. Pick something sooner."

**Sheet primary CTA:** "Set deadline"
**Sheet dismiss:** swipe down OR tap outside.

### 5.3 Step 2 — Witness

**Header eyebrow:** "Step 2 of 3"
**Header title:** "Who's your judge?"
**Header subtitle:** "One friend who'll hold you to it. Pick someone you respect — not someone you can talk out of it."

**Input label:** "Their first name"
**Input placeholder:** "e.g. Sarah"

**Recent witnesses (if returning user has prior vows):**
- Section label (small caps, muted): "Recent"
- Chips: first name of each distinct prior witness (most recent 3). Tap to prefill input.
- Chip style: pill, gold border, `--text` label.

**Phone disclosure (collapsed by default, link):**
- Collapsed link: "Add their phone (optional) →"
- Expanded label: "Their phone (optional)"
- Expanded input placeholder: "+1 555 123 4567"
- Expanded helper: "If you add their number we'll text them directly. Otherwise you'll share the link yourself in a sec."

**Footer helper (below all inputs):**
- "You'll send them the vow after you seal it."

**Primary CTA:**
- Disabled: "Continue →"
- Enabled: "Continue →"

**Validation:**
- Empty name: "They need a name."
- Name too short (< 2 chars): "Pick a real name."
- Phone added but invalid format: "That doesn't look like a phone number."
- Phone same as maker's own number: "You can't be your own judge."

### 5.4 Step 3 — Stakes

**Header eyebrow:** "Step 3 of 3"
**Header title:** "What's on the line?"
**Header subtitle:** "Real money. You get it back if you keep your word."

**Amount selector:**
- Four pills: `$10`, `$25`, `$50`, `$100`
- Default selected: `$50`
- Custom amount link (below pills): "Other amount →"
- Custom input label: "Custom amount (min $10)"
- Custom input placeholder: "50"
- Custom input prefix: "$"

**Validation:**
- Below $10: "Minimum is $10. Anything less won't sting."
- Above $500: "Max is $500. Breathe."

**"If you break this" panel (always visible, below stake selector):**

When collapsed (default):
- Label: "If you break this, your {amount} goes to…"
- Value: "{cause}"
- Chevron right icon, tappable row.

When expanded (tapping the row opens Step 3.5):
- See 5.5.

**Footer:**
- Small disclosure (body-sm, muted): "You keep the money if you keep the vow. We hold it in escrow until your judge calls it."
- Primary CTA: "Continue →"

### 5.5 Step 3.5 — "If broken" expanded

**Sheet title:** "If you break it"
**Sheet subtitle:** "Where does your money go? Pick the version that'll hurt most."

**Two-column layout (mobile: stacked):**

**Left column — "Give to something good"**
- Section title: "Give to something good"
- Section subtitle: "Your loss, someone's gain. Easier to stomach, less sharp."
- Cause list (radio cards, default the first):
  - "American Red Cross"
  - "Doctors Without Borders"
  - "Local food bank"
  - "Wikipedia"

**Right column — "Give to something you'll hate"**
- Section title: "Give to something you'll hate"
- Section subtitle: "Real consequences. This is what makes the vow unbreakable. Pick the one you'd hate to fund."
- Cause list (radio cards, two named options):
  - "The NRA" — subline (body-sm, muted): "National Rifle Association"
  - "PETA" — subline (body-sm, muted): "People for the Ethical Treatment of Animals"

*Note: these are the two named anti-causes in v1. Chosen to cover both ideological poles — users pick whichever would genuinely sting them. Routing: money goes to the org's public donation endpoint via Stripe. We are not affiliated with, endorsed by, or partnered with either org; we are simply routing a user-initiated donation on their behalf.*

**Warning row (below anti-cause selection, if chosen):**
- Icon: danger amber
- Text: "If you break this, $(amount) goes to {cause}. We can't un-send it. Sure?"

**Primary CTA:** "Lock it in →"
**Dismiss:** back chevron, preserves previous selection if exited without choosing.

### 5.6 `/create` error states (global)

**Network error:**
- Banner: "Lost connection. Your vow is safe — try again when you're back."

**Session expired:**
- Banner: "You got logged out. Sign back in to finish."
- CTA: "Sign in"

**Validation summary (top of step, if multiple errors):**
- "Fix these to continue:"
- Bulleted list of field errors.

---

## 6. `/seal` — Auth + Pay

### 6.1 Review block (top of seal)

- Eyebrow: "Almost sealed"
- Your vow (serif, `display-sm`, gold): "{vow_text}"
- Meta rows (label left, value right, body-sm):
  - "By when" → "{by_when}"
  - "Your judge" → "{witness_first}"
  - "Stake" → "{amount}"
  - "If broken" → "{cause}"
- Edit link (small, below block): "Edit → "

### 6.2 Auth section (if not signed in)

**Section title:** "First, who are you?"
**Section subtitle:** "We need a way to reach you and pay you back."

**Phone input:**
- Label: "Your phone"
- Placeholder: "+1 555 123 4567"
- Helper: "We'll text you a 6-digit code."

**Send code CTA:** "Send code"
**OTP input label:** "Enter the code"
**OTP helper:** "Didn't get it? Resend →"

**Errors:**
- Invalid phone: "Double-check that number."
- Twilio failed: "Couldn't text you. Try again in a sec."
- Bad code: "That code is wrong."
- Expired code: "Code expired. Get a new one."
- Too many tries: "Too many attempts. Try again in 10 minutes."

**Divider:** "or"

**OAuth fallback buttons:**
- "Continue with Google"
- "Continue with email"

### 6.3 Payment section (after auth)

**Section title:** "Stake your {amount}."
**Section subtitle:** "Held in escrow. You get it back if you keep your word."

**Apple Pay (if available):**
- Primary position, above card form.
- Button: native Apple Pay "Pay" button.

**Divider (between Apple Pay and card):** "or pay with card"

**Card form (Stripe Elements):**
- Label: "Card"
- Helper (below): "We use Stripe. We don't see your card number."

**Errors:**
- Card declined: "Your bank said no. Try another card."
- CVC failed: "Check the 3-digit code on the back."
- Expired card: "That card is expired."
- Processing error: "Payment failed. Try again."
- Generic Stripe error: "Something went sideways. Try again."

### 6.4 Seal button

- Disabled state (auth/payment not complete): "Seal your vow" in `--text-faint`
- Enabled state (ready to seal): "Seal your vow" in `--bg` on `--gold`, with small gold dot next to label
- Pending state (submitting): "Sealing…" with spinner

**Fine print (below button):**
- "By sealing, you agree to the Terms. Your {amount} is charged now and held until {by_when}."

---

## 7. `/sent` — Cliffhanger + share

### 7.1 Ceremony moment

- Eyebrow (caption, gold, uppercase): "SEALED"
- Headline (serif, display-xl): "Now send it."
- Sub (serif italic, display-sm, muted): "{witness_first} doesn't know yet."

### 7.2 Share block

**Primary CTA:** "Send to {witness_first} →"

- On tap: triggers Web Share API (mobile) with share text (see §19) OR copy-to-clipboard fallback (desktop) with toast.

**Secondary link row (below primary):**
- "Copy link" → copies `{link}`, shows toast "Link copied"
- "Text it myself" → opens `sms:?&body=...` with pre-filled body
- "Not now" → dismiss, go to `/vow/[id]`

**Fine print below share buttons:**
- "The vow isn't real until they see it."

### 7.3 Toast messages (this screen)

- "Link copied"
- "Sent" (after Web Share resolves)
- "Couldn't open share. Copy link instead?" (if Web Share fails)

---

## 8. `/dashboard`

### 8.1 Header

- Greeting (serif, display-md): "{maker_first}." (just the name with period — no "Hey" or "Hi")
- Subgreeting (body, muted): "You've got {n} {open/active} vow{s}."
  - 0 open: "You've got nothing on the line."
  - 1 open: "One on the line."
  - n open: "{n} on the line."

### 8.2 Primary CTA (floating or top-right on desktop)

- Label: "+ New vow"

### 8.3 Sections (ordered top to bottom by urgency)

**Verdict needed** (vows where user is witness AND status=awaiting_verdict):
- Section title: "They need you."
- Section subtitle: "You promised to judge. Don't leave them hanging."
- Empty state: hide section.

**Watching** (vows where user is witness AND status=active):
- Section title: "Watching."
- Section subtitle: "People who asked you to hold them to it."
- Empty state: hide section.

**Pending** (user is maker AND status=sealed AND challenge not accepted / witness not accepted):
- Section title: "Waiting on them."
- Section subtitle: "They haven't answered yet."
- Empty state: hide section.

**Active** (user is maker AND status=active):
- Section title: "On the line."
- Section subtitle: "Don't flake."
- Empty state: hide section.

**Challenge sent** (user is maker AND vow_type=challenge AND status=sealed):
- Section title: "Dares out."
- Section subtitle: "See who takes them."
- Empty state: hide section.

**Past** (user is maker OR witness AND status IN kept/broken/voided):
- Section title: "Past"
- Section subtitle: (none)
- CTA at end: "See all past vows →" → `/history`
- Max 3 rows shown. Empty: show "No history yet. Make your first vow." with CTA "+ New vow" → `/create`.

### 8.4 Vow card copy (repeated per row)

See §9 for detailed per-phase strings. In dashboard rows, compressed form:

- Primary line: `{vow_text}` (truncated to 80 chars, ellipsis)
- Meta line: `{status_label}` + " • " + `{by_when_relative}` + (" • " + `{amount}` if staked)

### 8.5 Dashboard empty state (zero vows, ever)

- Headline (serif, display-md): "No promises yet."
- Sub (body, muted): "Make one. Swear on it. See if you can keep it."
- CTA: "+ Make your first vow" → `/create`

### 8.6 Dashboard skeleton / loading

- Show 3 skeleton rows in the first section.
- No "Loading…" text.

---

## 9. `/vow/[id]` — by phase

### 9.1 Shared header (all phases)

- Back chevron (top-left, "←"), aria-label "Back to dashboard"
- Vow text (serif, display-md, `--gold`): "{vow_text}"
- Meta row (body-sm, muted): "{by_when_short}" • "{amount}" • "{witness_first}"
- Status pill (top-right): per §1.5 status labels

### 9.2 Phase: `witness_pending` (maker view)

**Section headline:** "{witness_first} hasn't answered yet."
**Section body:**
- "They'll get a text from us with the vow and a link. No app download, no signup."

**If < 48h since invite:**
- Helper (muted): "Give them a minute."

**If ≥ 48h since invite:**
- Helper (amber): "It's been {hours}h. Nudge them?"
- Primary CTA: "Send another text →"
- Secondary: "Pick a different judge →" → reopens witness step

**Secondary link (always):**
- "Continue on your honor →" (small, muted, bottom of section) — opens confirmation modal, "Are you sure? You'll judge yourself in the end." / "I'm sure" + "Nope" — switches to self-witness mode.

### 9.3 Phase: `active` (maker view)

**Primary moment (centered, large):**
- Countdown label (caption, muted): "TIME LEFT"
- Countdown value (serif, display-xl, gold if > 24h, amber if < 24h, red if < 6h): "{hours}:{minutes}:{seconds}"

**If > 24h:**
- Body (below countdown): "{witness_first}'s watching. Stay on it."

**If < 24h:**
- Body (below countdown): "{witness_first}'s waiting for the verdict. You've got this — or you don't."

**Secondary actions row:**
- Check-in button (gold outline): "Check in" → adds audit event, toast "Logged."
- "Void this vow" link (small, muted): opens confirmation modal (see §9.9)

### 9.4 Phase: `awaiting_verdict` (maker view)

**Primary headline:** "{witness_first}'s deciding."
**Body:**
- "Your deadline hit {by_when_relative_past}. They'll cast a verdict."
- "If they don't within 72 hours, we'll auto-resolve in your favor."

**Secondary actions:**
- "Resolve yourself →" (small link) — only shown after 48h waiting, opens `/self-resolve`.

### 9.5 Phase: `kept` (maker view)

- Primary moment: Kept badge (large gold seal, serif word): "KEPT"
- Headline (serif, display-md): "You kept your word."
- Sub (body, muted): "{amount} is back in your account. It'll show up in 5-10 business days."
- Primary CTA: "Share this" → opens share sheet
- Secondary link: "+ Make another vow" → `/create`

### 9.6 Phase: `broken` (maker view)

- Primary moment: Broken badge (large red slash, serif word): "BROKEN"
- Headline (serif, display-md): "You broke it."
- Body (body, `--text`): "Your {amount} is gone. It's going to {cause}."
- Sub (body-sm, muted): "No refund. That's the deal."
- Primary CTA: "+ Try again" → `/create`
- Secondary link (small, muted): "Read your vow" — scrolls to original vow text.

### 9.7 Phase: `voided` (maker view)

- Primary moment: Voided badge (muted gray, serif): "VOIDED"
- Headline (serif, display-md): "You called it off."
- Body (body, muted): "Your {amount} is being refunded. It'll show up in 5-10 business days."
- Primary CTA: "+ New vow" → `/create`

### 9.8 Phase: witness-side views

See §16 and §17 — these are the external `/w/` pages. Not `/vow/[id]`.

### 9.9 Void modal

**Title:** "Call it off?"
**Body:**
- "You can void this vow and get your {amount} back. But once you void, it's done — you can't un-void it."
- (For active vows only): "{witness_first} will see that you called it off."

**Primary CTA (danger styling):** "Void this vow"
**Secondary CTA:** "Never mind"

**Post-void toast:** "Voided. Your {amount} is coming back."

### 9.10 Timeline section (bottom of every phase)

**Section title:** "Timeline"

Event labels (one per `audit_events` row):

| event_type | Display label |
|-----------|---------------|
| `vow_created` | "You drafted this vow." |
| `vow_sealed` | "Sealed. {amount} staked." |
| `witness_invited` | "Texted {witness_first}." |
| `witness_accepted` | "{witness_first} said yes." |
| `witness_declined` | "{witness_first} said no." |
| `challenge_sent` | "Sent to {target_first}." |
| `challenge_accepted` | "{target_first} took it." |
| `challenge_declined` | "{target_first} passed." |
| `check_in` | "You checked in." |
| `verdict_submitted` | "{witness_first} called it {verdict}." |
| `verdict_self_resolved` | "You called it {verdict}." |
| `auto_resolved` | "Auto-resolved — kept." |
| `vow_voided` | "You voided it." |
| `refund_issued` | "Refund sent." |
| `refund_failed` | "Refund failed — we're retrying." |
| `sms_failed` | "Couldn't text {recipient}." |
| `sms_retried` | "Resent the text." |

Each row format:
- Left: event label
- Right: relative time ("2h ago", "yesterday", "Apr 15")

---

## 10. `/self-resolve`

### 10.1 Header

- Eyebrow (caption, muted): "SELF-RESOLVE"
- Headline (serif, display-md, `--gold`): "Only you know."
- Sub (body, muted): "{witness_first} didn't answer in time. You have to call it yourself — on your honor."

### 10.2 The oath

**Oath checkbox (required):**
- Label: "I swear I'm telling the truth about whether I kept this vow."
- Unchecked verdict buttons disabled.

### 10.3 Verdict buttons

Two large cards, side by side (mobile stacked):

**Kept card:**
- Label (serif, display-md): "I kept it."
- Sub (body-sm, muted): "Your {amount} comes back."

**Broken card:**
- Label (serif, display-md): "I broke it."
- Sub (body-sm, muted): "Your {amount} goes to {cause}."

**Post-tap confirmation modal (both):**

For "kept":
- Title: "You kept it?"
- Body: "This is final. If you're lying, you're only lying to yourself."
- CTA: "Yes, I kept it" / "Go back"

For "broken":
- Title: "You broke it."
- Body: "Your {amount} goes to {cause}. No refunds."
- CTA: "Confirm — I broke it" / "Go back"

---

## 11. `/vow-kept` and `/vow-broken`

### 11.1 `/vow-kept`

**Moment (full-viewport, gold light):**
- Large serif, `display-xl`, gold, italic: "*Kept.*"
- Sub (serif, display-sm, `--text`): "You said you would. You did."
- Body (body, muted, max 320px centered): "Your {amount} is coming back. {cause} is not getting a cent."

**CTAs (stacked, centered):**
- Primary: "Share this" → opens share sheet with kept template
- Secondary: "+ New vow" → `/create`
- Tertiary (small link): "See your certificate →" → `/certificate/[vowId]`

### 11.2 `/vow-broken` (charity variant)

- Large serif, red slash through word, `display-xl`: "Broken."
- Sub (serif, display-sm, `--text`): "You said you would. You didn't."
- Body (body, muted): "Your {amount} is on its way to {cause}. The next one doesn't have to go the same way."

**CTAs:**
- Primary: "+ Try again" → `/create`
- Secondary (small link): "Read your vow →" — scroll to text.

### 11.3 `/vow-broken` (anti-cause variant)

- Large serif, red slash, `display-xl`: "Broken."
- Sub (serif, display-sm, `--text`): "You said you would. You didn't."
- Body (body, muted, slightly heavier weight on cause name):
  - "Your {amount} is going to {cause}."
  - "You chose that. Remember why."

**CTAs:** same as 11.2.

---

## 12. `/history`

**Header:**
- Title (serif, display-md): "Past vows"
- Sub (body, muted): "Every one you ever made."

**Filter pills (top-right on desktop, top-center mobile):**
- "All" (default)
- "Kept"
- "Broken"
- "Voided"

**Counts row (below pills, body-sm, muted):**
- "{kept} kept • {broken} broken • {voided} voided"

**Row format (tappable, goes to `/vow/[id]`):**
- Left block: Vow text (truncated 60ch) + meta (by_when + amount)
- Right block: Status pill + outcome (e.g., "Kept • $50 back", "Broken • $50 to Red Cross")

**Empty state (filtered):**
- "{filter} — nothing here yet."

**Empty state (no history):**
- Headline: "No history yet."
- Sub: "Make one. See what you're made of."
- CTA: "+ New vow"

---

## 13. `/cast` — Dare a friend

### 13.1 Header

- Eyebrow (caption, gold): "DARE"
- Headline (serif, display-md): "Dare a friend."
- Sub (body, muted): "Pick the vow. Pick the friend. They decide if they accept."

### 13.2 Step 1 — The dare

**Input label:** "What do you dare them to do?"
**Placeholder:** "You will…"
**Helper:** "Write it in second person. They're the one promising."

Validation same as §5.1 but replace "Start with a verb" with "Start with 'you will…'".

### 13.3 Step 2 — Who

- Input label: "Who are you daring?"
- Placeholder: "Their first name"
- Phone disclosure (same as §5.3): "Add their phone to send directly →"

### 13.4 Step 3 — Stakes

Same as §5.4 but subtitle: "They'll pay this if they break it — and you'll judge."

### 13.5 Seal + send

Same flow as §6 and §7 but:
- Share message: "I dared you to {vow_text}. Prove me wrong → {link}"
- Status after seal: "Dare sent. See if they take it."

---

## 14. `/c/[token]` — Challenge accept page

### 14.1 Header

- Eyebrow (caption, gold): "A DARE FROM {maker_first}"
- Headline (serif, display-lg): "{maker_first} dared you to:"
- Vow (serif, display-md, gold): "*{vow_text}*"
- Meta (body-sm, muted): "By {by_when}. {amount} on the line."

### 14.2 Body

- "{maker_first} will judge. If you keep it, {amount} comes back. If you break it, it goes to {cause}."

### 14.3 Actions

**If unauthenticated:**
- Primary CTA: "I'm in — show me the stakes →"
  - Advances to signup/signin inline.

**Post-auth, pre-accept:**
- Primary CTA: "Accept — I'll swear on {amount}"
- Secondary: "Decline"

**Post-accept:**
- Redirect to `/vow/[id]` maker view (they are now the maker of this vow).

**Post-decline:**
- Screen headline: "Declined."
- Body: "We let {maker_first} know. No vow sealed."
- CTA: "Make your own vow →" → `/create`

### 14.4 Edge states

- Already accepted: "You already took this dare. Here's the vow." + link to `/vow/[id]`.
- Expired (> 7d after created): "This dare expired."
- Revoked (maker voided): "{maker_first} called it off."
- Invalid token: "This link doesn't work."

---

## 15. `/w/[token]` — Witness invite

### 15.1 Header

- Eyebrow (caption, gold): "{maker_first} SWORE AN OATH"
- Headline (serif, display-lg): "They want you to hold them to it."

### 15.2 Vow block

- Label (body-sm, muted): "The vow"
- Vow (serif, display-md, gold italic): "*{vow_text}*"
- Meta row:
  - "By when" → "{by_when}"
  - "Stake" → "{amount}"
  - "If broken" → "{cause}"

### 15.3 What it means to be a judge

**Section title:** "What it means"

**Three rows (icon + label + body):**

Row 1:
- Label: "You say yes."
- Body: "{maker_first} gets notified. The vow is live."

Row 2:
- Label: "They commit."
- Body: "You won't hear from us again until {by_when}."

Row 3:
- Label: "You call it."
- Body: "When the time's up, you say whether they kept it. One tap."

### 15.4 Actions

**Primary CTA:** "I'll judge →" (gold, full width)
**Secondary:** "I can't" — opens decline confirmation.

**Decline modal:**
- Title: "Step back?"
- Body: "{maker_first} will be told you can't. They'll pick someone else or call it off."
- CTA: "Yes, step back" / "Never mind"

### 15.5 Post-accept

- Screen headline (serif, display-md): "You're on it."
- Body: "We'll text you on {by_when} to cast your verdict."
- Secondary (small link): "Save this page →" — shows a tooltip "Bookmark it so you can find it later."

### 15.6 Post-decline

- Screen headline: "Stepped back."
- Body: "{maker_first} has been told."

### 15.7 Edge states

| State | Headline | Body |
|-------|----------|------|
| Vow voided | "This vow was called off." | "{maker_first} voided it. Nothing for you to do." |
| Already accepted | "You're already on it." | "We'll text you on {by_when}." |
| Already declined | "You said no to this one." | (no body) |
| Already resolved (kept) | "It's done. They kept it." | "{maker_first} kept their vow." |
| Already resolved (broken) | "It's done. They broke it." | "They broke it. {amount} went to {cause}." |
| Auto-resolved | "It auto-resolved." | "You didn't answer in 72 hours, so we called it kept in their favor." |
| Expired invite | "This invite expired." | "Ask {maker_first} to send a new one." |
| Invalid token | "This link doesn't work." | "Double-check the link {maker_first} sent you." |

---

## 16. `/w/[token]/verdict` — Witness verdict

### 16.1 Header

- Eyebrow (caption, gold): "VERDICT TIME"
- Headline (serif, display-lg): "Did {maker_first} keep it?"

### 16.2 Vow block

Same as §15.2 but with label "The vow they swore on".

### 16.3 The oath

**Oath checkbox (required):**
- Label: "I'll tell the truth."

### 16.4 Verdict buttons

**Kept:**
- Large card, gold border, serif display-md label: "Kept."
- Sub (body-sm, muted): "They did it. Their {amount} comes back."

**Broken:**
- Large card, red border, serif display-md label: "Broken."
- Sub (body-sm, muted): "They didn't. Their {amount} goes to {cause}."

**Confirmation modal (broken only):**
- Title: "You're sure?"
- Body: "Once you call it broken, their {amount} is gone. No undo."
- CTA: "Yes, broken" / "Wait"

### 16.5 Post-submit

**Kept submitted:**
- Headline: "You called it kept."
- Body: "{maker_first} just got the news. Their {amount} is coming back."

**Broken submitted:**
- Headline: "You called it broken."
- Body: "{maker_first} knows. {amount} is going to {cause}."

### 16.6 Edge states

| State | Headline | Body |
|-------|----------|------|
| Not yet due | "Not yet." | "You can cast your verdict starting {by_when}." |
| Already resolved | "Already called." | "This one's done." |
| Vow voided | "Called off." | "{maker_first} voided it. Nothing to judge." |
| Token invalid | "This link doesn't work." | "Double-check the link." |

---

## 17. `/certificate/[vowId]` and `/outcome/[vowId]`

### 17.1 Certificate (kept only)

**Layout:** portrait card, gold border + inner frame, serif-heavy.

**Lines (in order, centered):**

1. Small caps: "CERTIFICATE OF"
2. Large serif, gold italic display-xl: "*an unbroken vow*"
3. — divider —
4. Small caps muted: "SWORN BY"
5. Serif display-md: "{maker_first_last_initial}"
6. Small caps muted: "WITNESSED BY"
7. Serif display-md: "{witness_first}"
8. Small caps muted: "ON"
9. Body: "{seal_date}" (e.g., "April 15, 2025")
10. — divider —
11. Serif italic display-sm: "*{vow_text}*"
12. Small caps muted: "SEALED AND KEPT"
13. Gold seal icon
14. Body tiny muted: "Unbreakable Vow"

**Actions (below certificate, only for authenticated maker):**
- "Download as image" → generates PNG via `html-to-image`
- "Share" → Web Share API with certificate image + link

### 17.2 Outcome page (public share target)

**Kept:**
- Serif display-xl gold: "Kept."
- Body: "{maker_first_last_initial} swore they'd {vow_text}. On {seal_date}, {witness_first} called it kept."
- CTA: "Make your own vow →" → `/`

**Broken:**
- Serif display-xl red: "Broken."
- Body: "{maker_first_last_initial} swore they'd {vow_text}. On {verdict_date}, {witness_first} called it broken. Their {amount} went to {cause}."
- CTA: "Make your own vow →" → `/`

---

## 18. `/settings`

### 18.1 Sections

**Profile:**
- "Your name" — input, "Save" button inline when dirty
- "Your phone" — read-only, helper: "To change your phone, contact support."

**Notifications:**
- Toggle: "Text me reminders" — default on
- Toggle: "Push notifications" (mobile web only if registered) — default on

**Payment methods:**
- List of saved cards (last-4, brand)
- "Add a card →"
- Remove link per card

**Danger zone:**
- "Sign out" → log out
- "Delete account" — opens confirmation modal
  - Title: "Delete your account?"
  - Body: "All your past vows will be anonymized. Active vows must be resolved first."
  - CTA: "Delete" (danger) / "Cancel"
  - Blocked state (if active vows): "You have {n} open vow{s}. Resolve them first."

### 18.2 Toasts

- "Saved."
- "Card added."
- "Card removed."
- "Couldn't save. Try again."

---

## 19. SMS templates

All sent via `send-sms` Edge Function. Templates are static strings with tokens. 160-char soft max — Twilio will split, but we want to fit in one SMS when possible.

### 19.1 Witness invite (triggered on `vow_sealed` if witness has phone)

To: witness phone
From: Twilio number
Body:
```
{maker_first} swore a vow on Unbreakable Vow and picked you as judge.
They promised: {vow_text}
{amount} on the line by {by_when}.
Say yes or no: {link}
```

(Tokens count toward char budget. Use {by_when_short} for longer vow_text.)

### 19.2 Witness accepted (to maker)

```
{witness_first} said yes. They'll judge on {by_when_short}.
```

### 19.3 Witness declined (to maker)

```
{witness_first} stepped back. Pick a new judge: {link_to_vow}
```

### 19.4 Witness nudge (48h no response, to witness)

```
{maker_first} is still waiting. They vowed to {vow_text_short}. Will you judge? {link}
```

### 19.5 Maker reminder (24h before deadline)

```
{by_when_relative}: your vow hits. {witness_first} is watching. {amount} on the line.
```

### 19.6 Maker reminder (1h before deadline)

```
1 hour left on your vow. {witness_first}'s about to be asked.
```

### 19.7 Witness verdict request (at deadline)

```
{by_when}: {maker_first}'s vow hit. Did they keep it? One tap: {link}
```

### 19.8 Verdict submitted (to maker, kept)

```
{witness_first} called it kept. Your {amount} is coming back.
```

### 19.9 Verdict submitted (to maker, broken)

```
{witness_first} called it broken. {amount} went to {cause}.
```

### 19.10 Auto-resolve notice (to maker)

```
{witness_first} didn't answer in 72h. We called it kept. Your {amount} is coming back.
```

### 19.11 Auto-resolve notice (to witness)

```
Too late — we auto-resolved {maker_first}'s vow in their favor.
```

### 19.12 Challenge sent (to target)

```
{maker_first} dared you on Unbreakable Vow:
"{vow_text}"
{amount} by {by_when}. In or out? {link}
```

### 19.13 Challenge accepted (to maker)

```
{target_first} took your dare. It's on.
```

### 19.14 Challenge declined (to maker)

```
{target_first} passed. Your {amount} wasn't charged.
```

### 19.15 Vow voided (to witness, if ever accepted)

```
{maker_first} called off the vow you were judging. Nothing for you to do.
```

### 19.16 Refund failed (to maker, 3 retries)

```
We tried to refund your {amount} and it failed. Reply HELP and we'll fix it.
```

### 19.17 SMS system footer (sometimes appended by Twilio)

- "Reply STOP to opt out."
- We don't add this ourselves — Twilio appends automatically per regulation.

---

## 20. Share templates

### 20.1 Web Share API payload (witness invite at `/sent`)

```
title: "Unbreakable Vow"
text: "I swore a vow. You're my judge.\n\"{vow_text}\"\n{amount} on the line by {by_when}.\nSay yes: "
url: "{link}"
```

### 20.2 Clipboard fallback text (desktop, no Web Share)

```
I swore a vow on Unbreakable Vow. You're my judge.

"{vow_text}"

{amount} on the line by {by_when}.

Say yes or no: {link}
```

### 20.3 SMS URL scheme (mobile fallback)

```
sms:?&body={encoded_text}
```

Encoded text: same as 20.2, newlines preserved.

### 20.4 Share — kept (from `/vow-kept`)

Web Share API:
```
title: "Kept."
text: "I swore I would. I did. {amount} back.\n"
url: "{outcome_link}"
```

### 20.5 Share — broken (from `/vow-broken`)

Web Share API:
```
title: "Broken."
text: "I swore. I didn't. {amount} to {cause}.\n"
url: "{outcome_link}"
```

### 20.6 Share — certificate

Web Share API with generated PNG as file + text:
```
"An unbroken vow. {seal_date}."
```

### 20.7 Dare share (from dare `/sent` variant)

```
title: "A dare"
text: "I dared you to {vow_text}. {amount} on the line. In or out?\n"
url: "{link}"
```

---

## 21. Push notifications

Template format: title + body. Delivered via Expo push. Maker must have `push_token` registered (mobile web Chrome/Safari + app).

### 21.1 Witness accepted

- Title: "{witness_first} said yes."
- Body: "Your vow is live. By {by_when_short}."

### 21.2 Deadline in 1h

- Title: "1 hour left."
- Body: "Your vow on {vow_text_short} hits in an hour."

### 21.3 Deadline hit

- Title: "Time's up."
- Body: "{witness_first} will call it."

### 21.4 Verdict kept

- Title: "Kept."
- Body: "{witness_first} called it. Your {amount} is coming back."

### 21.5 Verdict broken

- Title: "Broken."
- Body: "{amount} is going to {cause}."

### 21.6 Auto-resolve

- Title: "Auto-resolved."
- Body: "{witness_first} didn't answer. We called it kept."

---

## 22. Empty states (systematic)

| Location | Headline | Body | CTA |
|----------|----------|------|-----|
| Dashboard (zero ever) | "No promises yet." | "Make one. Swear on it. See if you can keep it." | "+ Make your first vow" |
| Dashboard (all resolved) | "Nothing on the line." | "Your last vow is done. What's next?" | "+ New vow" |
| History (no vows) | "No history yet." | "Make one. See what you're made of." | "+ New vow" |
| History (filtered zero) | "Nothing in '{filter}.'" | (none) | (change filter) |
| Recent witnesses (no prior) | (section hidden) | — | — |
| Past section of dashboard (zero) | "Past vows show up here." | (none) | — |
| Saved cards (zero) | "No cards saved yet." | "You'll add one when you seal a vow." | — |

---

## 23. Loading states

- Use skeleton loaders, never spinners with text.
- Exception: button pending state uses spinner + label (e.g., "Sealing…", "Sending…").
- No "Please wait" copy anywhere.

Button pending labels:

| Button | Idle | Pending |
|--------|------|---------|
| Seal your vow | "Seal your vow" | "Sealing…" |
| Send code | "Send code" | "Sending…" |
| Verify | "Verify →" | "Verifying…" |
| Continue | "Continue →" | (no label change, just disable + spinner) |
| I'll judge | "I'll judge →" | "Accepting…" |
| Kept / Broken | "Kept." / "Broken." | "Submitting…" |
| + New vow | "+ New vow" | (instant nav, no pending) |
| Share | "Share" | (native, no pending) |
| Void this vow | "Void this vow" | "Voiding…" |

---

## 24. Toast & snackbar copy

Short, neutral, lowercase sentence case, no punctuation.

**Success toasts:**
- "Link copied"
- "Sent"
- "Saved"
- "Logged" (check-in)
- "Card added"
- "Card removed"
- "Phone updated"

**Error toasts:**
- "Couldn't copy"
- "Couldn't send"
- "Couldn't save"
- "Try again"
- "Lost connection"

**Neutral toasts:**
- "Undone"
- "Updated"

**Duration:** 3 seconds. 5 seconds if action button present (e.g., "Undo").

---

## 25. Error messages (system-level)

### 25.1 Network

- Inline banner (top of page): "You're offline. Changes will sync when you're back."
- Toast (transient): "Lost connection"

### 25.2 Session

- "You got logged out. Sign back in." (CTA: "Sign in")

### 25.3 Payment errors (Stripe)

- `card_declined` → "Your bank said no. Try another card."
- `expired_card` → "That card is expired."
- `incorrect_cvc` → "Check the 3-digit code on the back."
- `processing_error` → "Payment failed. Try again."
- `insufficient_funds` → "Not enough in the account. Try another card."
- Fallback → "Something went sideways. Try again."

### 25.4 SMS errors (Twilio)

- Invalid number → "That's not a valid number."
- Send failure → "Couldn't text them. Try again or pick a different judge."
- Unsubscribed recipient → "{witness_first} opted out of texts. They'll need to resubscribe."

### 25.5 Auth errors

- Wrong OTP → "That code is wrong."
- Expired OTP → "Code expired. Get a new one."
- Too many OTP tries → "Too many attempts. Try again in 10 minutes."
- OAuth failed → "Couldn't sign in. Try another way."

### 25.6 Server 500

- Full-page fallback (only for hard crashes, use error.tsx boundary):
  - Headline: "Something's off on our end."
  - Body: "It's not you. Try reloading."
  - CTA: "Reload"

### 25.7 404

- Headline: "Nothing here."
- Body: "This page doesn't exist — or you don't have access."
- CTA: "Back to your vows →" / "Go home →"

---

## 26. Legal / disclosures

### 26.1 Seal screen fine print

"By sealing, you agree to the Terms. Your {amount} is charged now and held until {by_when}."

### 26.2 Witness invite fine print

"Unbreakable Vow sent this. Reply STOP to opt out."

### 26.3 Broken-outcome fine print (if anti-cause)

"We route donations through a qualified payment processor. See Terms for details."

### 26.4 Footer legal

- "© 2025 Unbreakable Vow"
- "Privacy" / "Terms"

### 26.5 SMS opt-out

Twilio appends; we don't hand-write. Never mention STOP in our copy — it's an automatic footer.

---

## 27. Accessibility strings (sr-only, aria-labels)

### 27.1 Icons with no visible text

| Icon | aria-label |
|------|------------|
| Back chevron | "Go back" |
| Close (modal) | "Close" |
| Hamburger | "Open menu" |
| Gold dot (status) | "Status: {status_label}" |
| Share icon | "Share" |
| Copy icon | "Copy link" |
| Check (oath) | "Confirm: {oath_text}" |
| Chevron (collapsible section) | "Expand {section_name}" / "Collapse {section_name}" |

### 27.2 Decorative imagery

- Gold seal icon on certificate → `aria-hidden="true"`
- Broken slash on broken outcome → `aria-hidden="true"`
- Ceremony fade elements → `aria-hidden="true"`

### 27.3 Live regions

- Countdown on active vow detail → `aria-live="polite"` every minute update
- Toast container → `aria-live="assertive"` for errors, `"polite"` for success

### 27.4 Form field helper/errors

- Each input has associated `<label>` or `aria-labelledby`.
- Error text uses `aria-describedby` linking to the error message ID.
- Inline errors render in red AND have an icon, not color-only.

---

## 28. Forbidden words and anti-patterns

**Never render these strings anywhere in the product:**

- "Unleash"
- "Journey"
- "Empower"
- "Get started" (use "Begin" or specific CTA)
- "Thanks!" / "Thank you!" (we don't thank for signing up)
- "Welcome!" (ceremony is our welcome)
- "Oops!"
- "Whoops!"
- "Something went wrong" (be specific)
- "Please try again" (drop "please")
- "We're sorry, but…"
- "Unfortunately…"
- "Terms of Service" → use "Terms"
- "Privacy Policy" → use "Privacy"
- "Sign Up" / "Log In" → use "Sign in" / "Sign out" (one sign-in concept)

**Never use:**
- Second person plural ("y'all")
- "Kinda", "gonna", "wanna"
- Emojis (except in specific share templates, none in product chrome)
- Three-dot ellipses except in pending states ("Sealing…")
- Exclamation points (except "*free.*" italic moment which uses period; no rule violations in ceremony)

---

## 29. Open copy decisions (flag for Joey)

These need an explicit decision before launch. I've proposed defaults but they need confirmation:

1. **"Judge" vs "witness" consistency final pass** — Proposal: "witness" everywhere internal/chrome/data; "judge" only in action verbs ("I'll judge →", "Judge as kept/broken") and occasional ceremonial moments ("Pick a judge."). Status: **proposed default above.**

2. **Anti-cause copy escalation** — Proposal: keep it direct ("Give to something you'll hate") but never name specific political parties, named people, or identifiable orgs. Status: **locked per prompt.**

3. **"You broke it" vs "It broke"** — Proposal: always active voice, accusatory — "You broke it." Status: **proposed default above.**

4. **Group Challenges COMING SOON** — Proposal: keep menu item visible but disabled with label "COMING SOON" in muted caption. Rationale: seeds the expectation without shipping scope. Status: **proposed default above.**

5. **Solo option wording** — Proposal: no primary "go solo" CTA anywhere. Only `/self-resolve` + 48h+ "Continue on your honor →" small link as backstop. Status: **locked per prompt.**

6. **Refund ETA phrase** — Proposal: "5-10 business days" consistent everywhere. Status: **proposed.**

7. **Sender name in SMS** — Proposal: always "Unbreakable Vow" full name, not "Vow" short. Rationale: maker/witness may not recognize "Vow" on first text. Status: **proposed.**

---

*End of copy spec v1.0.*
