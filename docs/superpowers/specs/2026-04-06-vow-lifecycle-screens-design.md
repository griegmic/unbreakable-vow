# Vow Lifecycle Screens — Unified Phase System

## Summary

Redesign the vow-maker's live screen (Expo app) and the witness's web experience to reflect three clear phases — Pending, Active, and Verdict — with visual countdown, clear date display, and a witness messaging feature that degrades gracefully when the vow-maker's phone number isn't available.

## Surfaces

Two surfaces share the same phase model, driven by the same DB row:

| Phase | Trigger | Vow-Maker (Expo app) | Witness (Web) |
|-------|---------|---------------------|---------------|
| **Pending** | Vow sealed, witness not yet accepted | Amber "VOW PENDING" badge, share invite card, go solo option | Acceptance screen (existing) |
| **Active** | `witness_accepted_at` is set, or `isSelfWitness` | Green "VOW ACTIVE" badge, countdown card, witness-locked card | Active dashboard with countdown, vow text, message button |
| **Verdict** | Current time >= `ends_at` | Amber "VERDICT DUE" badge, deliver/nudge buttons | "Time's up" state with verdict button |

---

## 1. Vow-Maker Live Screen (expo/app/live.tsx)

### Phase Badges

**VOW PENDING** (new — replaces showing "VOW ACTIVE" pre-acceptance):
- Pulsing amber dot + "VOW PENDING" text in `palette.goldBright`
- Badge background: `rgba(212,162,79,0.08)` with gold border
- Shows when: `!isSelfWitness && !witnessAccepted && !isVerdictDue && witnessStatus !== 'declined' && witnessStatus !== 'expired'`

**VOW ACTIVE** (existing badge, now gated on acceptance):
- Pulsing green dot + "VOW ACTIVE" text in `palette.success`
- Badge background: `palette.successMuted` with green border
- Shows when: witness accepted OR self-witness, AND not past `ends_at`
- Transition from PENDING: haptic feedback when polling detects `witness_accepted_at`

**VERDICT DUE** (existing, no changes):
- Static amber dot + "VERDICT DUE" in `palette.goldBright`
- Shows when: current time >= `ends_at`

### Countdown Card (new, VOW ACTIVE phase only)

Appears between the TitleBlock and the witness status card.

**Content:**
- Large text: "{N} days left" — computed as `Math.ceil((ends_at - now) / 86400000)`
- When N === 1: "Last day"
- When N === 0 (day-of): "Today's the day"
- Below: "Verdict day: {endLabel}" in `palette.textSecondary`
- Uses `activeCard` styling (green-tinted bg/border)

**No countdown in other phases:**
- PENDING: no countdown shown (witness hasn't committed yet)
- VERDICT: countdown replaced by verdict card ("Time's up")

### Footer by Phase

- **PENDING**: "View history" only. No verdict or fast-forward buttons.
- **ACTIVE**: Fast-forward test button (Expo Go only) + "View history"
- **VERDICT**: "Deliver your verdict" / "Nudge {name}" + "View history" (existing)

### Existing Features (no changes)

- Witness pending card (share invite, go solo, declined/expired states)
- Witness-locked card ("{name} is watching")
- "View witness screen" link
- Fast-forward test button
- All polling logic (30s interval)

---

## 2. Witness Web — Active Dashboard (new state)

After the witness accepts, replace the static "You're the witness. Check back on {date}." confirmation with a living dashboard.

### Layout (top to bottom)

1. **Header**: Shield icon + "You're the witness" heading
2. **Vow card**: The refined vow text, displayed prominently in a bordered card
3. **Countdown block**: Large "{N} days left" + "Verdict day: {date}" below
   - Same day-count logic as the app
   - When past due: "Time's up" replaces countdown
4. **Stake pill**: "$50 on the line" — shows `stake_amount / 100` formatted
5. **Message button**: "Message {vow-maker display_name}"
   - Gold background, dark text, prominent placement
   - **If vow-maker phone available**: Opens `sms:{phone}?body={pre-fill}`
   - **If no phone**: Copies pre-fill text to clipboard, shows toast "Copied! Paste it in your chat with {name}"
6. **Coming soon teaser**: Muted card at bottom
   - Copy: "Group accountability is coming soon. You'll be able to hold them accountable right in your group chat."
   - Styled subtle: muted text, no border or very faint border, non-interactive

### Rotating Pre-fills (10 options, random per page load)

```
"Hey, how's the vow going? I'm watching..."
"Don't think I forgot about the ${amount}..."
"The clock is ticking on your vow..."
"Just doing my witness duties. How's it going?"
"I have the power to break you. No pressure."
"Checking in. The vow remembers even if you forget."
"Your ${amount} says you can do this. Can you?"
"Witness check-in. Still on track?"
"I will be fair but I will not be merciful."
"Tick tock. How's the vow holding up?"
```

The `${amount}` placeholders are interpolated with the actual stake (e.g., "$50").

### Verdict-Due State (on same page)

When past `ends_at`:
- Countdown changes to "Time's up"
- "Deliver your verdict" button appears, links to `/w/{token}/verdict`
- Message button stays visible (witness may want to discuss before deciding)

---

## 3. Witness Web — Acceptance Flow (minor change)

Current behavior: After accepting, shows static confirmation "Check back on {date}."

New behavior: After accepting, immediately render the active dashboard (section 2). No "check back" message — the witness sees the live state right away.

Implementation: The acceptance component already tracks an `accepted` state. When `accepted === true`, render the active dashboard instead of the confirmation text.

---

## 4. Data Flow

### Vow-maker app polling (existing, no changes)
```
Every 30s: SELECT witness_accepted_at, witness_declined, ends_at
FROM vows WHERE id = {vowId}
```

### Witness web polling (existing pattern, extended)
```
Every 30s: SELECT refined_text, witness_name, witness_accepted_at,
  ends_at, stake_amount, status, destination
FROM vows WHERE witness_invite_token = {token}

+ JOIN users ON vows.user_id = users.id
  SELECT display_name, phone
```

The `getVowByWitnessToken` function in `vow-api.ts` already fetches vow data and does a user lookup for `display_name`. Add `phone` to that lookup.

### Privacy

The vow-maker's phone is exposed to the witness only if it exists. The witness was invited by the vow-maker, so they likely already have each other's contact info. No new privacy surface — just surfacing existing relationship data.

---

## 5. No New Infrastructure

- No new DB tables or columns
- No new edge functions
- No new API routes
- Only change to `vow-api.ts`: add `phone` to the user lookup in `getVowByWitnessToken`

---

## 6. What's NOT in Scope

- In-app messaging or chat
- Push notification nudges from witness
- Check-in or proof posting by vow-maker
- Group chat bot (teased as "coming soon" only)
- Any changes to the vow creation flow (refine, stake, witness, seal screens)
- Any changes to verdict/resolution screens (witness-verdict, self-resolve, vow-kept, vow-broken)

---

## 7. Test Mode

- Existing fast-forward button (Expo Go only) already sets `ends_at` to past and `witness_accepted_at` to now
- This correctly triggers VERDICT DUE on both the app and witness web
- No additional test controls needed
