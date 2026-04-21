# Spectator Pledge — Detailed Flow & Share Touchpoints

---

## Expo-Only vs. Web: The Right Call

**Start with Expo for the SHARE PROMPTS. Web for the PLEDGE PAGE. Here's why:**

The pledge page itself — where spectators land and pay — must be web. Spectators don't have the app. That's non-negotiable. But the question of "where do we add share prompts to create spectators" has a clear answer: Expo first.

**Why Expo-only for share prompts makes sense:**

1. **Your highest-engagement users are in the app.** Web users might be one-time visitors. App users are repeat makers and witnesses who've installed. They're more likely to share because they're more invested.

2. **The Expo app already has the best share infrastructure.** The certificate screen captures a gorgeous 1080×1920 PNG optimized for Instagram Stories. The native share sheet on iOS/Android is far superior to `navigator.share()` on mobile web. The share experience will be better out of the gate.

3. **Smaller surface area = faster ship.** You're modifying 3-4 Expo screens instead of 3-4 Expo screens AND 4-5 web pages. You can validate the mechanic, measure witness share rates and spectator conversion, and THEN roll it to web if numbers are good.

4. **The web witness page is a special case.** Witnesses who accepted via SMS and are on the web at `/w/[token]` — they DON'T have the app. But they're also the least likely to share because they're on a transient web page. The Expo witnesses (who have accounts and are logged in) are your best sharers. Start with them.

**What's Expo-only vs. what's web:**

| Component | Platform | Why |
|-----------|----------|-----|
| Share prompt after witness accepts | Expo only (V1) | Best share UX, highest-intent users |
| Share prompt on vow detail | Expo only (V1) | Already has share infra |
| Share prompt on vow-kept/vow-broken | Expo only (V1) | Auto-triggers, Instagram-optimized |
| Pledge page (/p/[share_token]) | Web (required) | Spectators don't have the app |
| Spectator re-share | Web (on pledge page) | Spectators are on web |
| Post-verdict spectator page | Web (required) | Spectators return via SMS link |
| Pledge count on vow detail | Expo only (V1) | Maker sees pledges in-app |

**V2 expansion:** Add share prompts to web witness page (`/w/[token]`), web vow detail (`/vow/[id]`), web outcome pages. But V1 is Expo share prompts + web pledge/spectator pages.

---

## Every Share Touchpoint — Who, Where, When

There are **4 people** who can share to create spectators. Here's every one, ranked by likelihood and impact:

### Share Source #1: THE WITNESS (Highest Priority)

**Who:** The person who just accepted as witness
**Where:** Expo app, immediately after tapping "I'm in" on a vow they're witnessing
**When:** Right after acceptance — peak engagement, peak social investment
**Why they share:** They just committed to judging their friend. They're invested. Sharing is gossip with stakes — "look what Joey just committed to."

**Current state:** After accepting, the witness sees a celebration screen with a reciprocal CTA ("make a vow and pick Joey to judge you"). No share prompt.

**New state:** The celebration screen gains a spectator share prompt BEFORE the reciprocal CTA. See detailed screen below.

### Share Source #2: THE SPECTATOR (Your New Insight — This Is Key)

**Who:** Someone who just pledged on the web pledge page
**Where:** Web pledge confirmation page (after successful payment)
**When:** Immediately after pledging — they're emotionally invested and the action is fresh
**Why they share:** They just did something generous and fun. Sharing it says "I'm a good friend" AND "look at this wild thing Joey's doing." It's social signaling with zero cost to them.

**This is the exponential multiplier.** If the witness shares once and gets 5 spectators, and each spectator shares to 2 more people, you go from 5 spectators to 15. The witness is the seed, but spectators are the branches.

**Current state:** Doesn't exist.

**New state:** Pledge confirmation page includes "Spread the pressure" share prompt.

### Share Source #3: THE MAKER (Lower Priority — Careful Here)

**Who:** The person who created the vow
**Where:** Expo app — on the certificate screen (post-seal), vow detail, and vow-kept/vow-broken
**When:** After sealing (certificate), during the vow (detail), and after verdict

**The overload question:** Should the maker be prompted to share for spectators specifically?

**Answer: No new prompts. Enhance existing shares.**

The maker already has share CTAs at three moments:
1. Certificate screen after seal (primary CTA, auto-triggers)
2. "Share vow" button on vow detail
3. "Share your vow" on vow-kept/vow-broken

These already work. The change: when the maker shares, the shared link should be the PLEDGE PAGE (`/p/[share_token]`) instead of the plain outcome page. The share text should mention pledging. The maker's existing share behavior now creates spectators without any new UI or additional cognitive load.

**Before (current share text):**
> I just made an Unbreakable Vow: "Do my taxes by Sunday" — $50 on the line. 🔒

**After (same button, updated text):**
> I just vowed to do my taxes by Sunday — $50 on the line. Pledge to charity if you think I'll do it 👀 → [pledge link]

Same button. Same position. Same flow. Different link and copy. Zero additional decisions for the maker.

### Share Source #4: THE WITNESS (Post-Verdict)

**Who:** The witness who just delivered the verdict
**Where:** Web verdict page (`/w/[token]/verdict`) — already has a share button
**When:** After submitting kept/broken verdict

**Current state:** Already has "Share this outcome" button. Currently shares to outcome page.

**New state:** If spectator pledges exist, the share text updates to include pledge info: "Joey kept his vow! 8 friends pledged $85 to St. Jude's because of it."

---

## Complete Flow — End to End (Every Screen)

### ACT 1: VOW CREATION (Maker — Expo App)

```
[No changes to creation flow]

Maker creates vow → refines → picks witness → stakes → seals

Everything identical to today.
```

**Screen: Certificate (Post-Seal) — ENHANCED**

```
┌─────────────────────────────────────┐
│                                     │
│           It's official.            │
│                                     │
│   Share your vow — let people       │
│   know you mean it.                 │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │      UNBREAKABLE VOW          │  │
│  │                               │  │
│  │   "Do my taxes by Sunday"     │  │
│  │                               │  │
│  │       $50 at stake            │  │
│  │     Sealed Apr 12, 2026       │  │
│  │                               │  │
│  │     unbreakablevow.app        │  │
│  └───────────────────────────────┘  │
│                                     │
│   Optimized for Instagram Stories   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │    ✦  Share your vow          │  │  ← EXISTING button
│  └───────────────────────────────┘  │     but now shares PLEDGE LINK
│                                     │     instead of plain outcome link
│          Continue →                 │
│                                     │
└─────────────────────────────────────┘
```

**What changed:** The share button's underlying link is now `/p/[share_token]` (the pledge page) instead of the plain certificate URL. The share text now includes "Pledge to charity if you think I'll do it." The button itself, its position, and the screen layout are IDENTICAL.

---

### ACT 2: WITNESS ACCEPTS (Expo App or Web)

The witness receives SMS → taps link → accepts on web `/w/[token]` OR accepts in-app if they have the Expo app.

**For Expo witnesses (have the app):**

After tapping "I'm in," they see the celebration → then a NEW interstitial before the accepted state:

**Screen: Witness Share Prompt (NEW — Expo Only)**

```
┌─────────────────────────────────────┐
│                                     │
│        👀 Make it count             │
│                                     │
│   You're Joey's witness. Share      │
│   this vow and let friends pledge   │
│   to charity if he pulls it off.    │
│                                     │
│   More pledges = more pressure      │
│   = more good if he succeeds.       │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │  Joey vowed to do his taxes   │  │
│  │  by Sunday — $50 on the line  │  │
│  │  → St. Jude's                 │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  ✦  Share Joey's vow          │  │  ← Primary gold button
│  └───────────────────────────────┘  │     opens native share sheet
│                                     │
│            Not now                  │  ← Text link, no guilt
│                                     │
└─────────────────────────────────────┘
```

**Native share sheet pre-loads:**
> Joey put $50 on the line — he's vowing to do his taxes by Sunday, or the money goes to St. Jude's. Pledge a few bucks to charity if you think he'll pull it off 👀
> [pledge link]

After sharing or dismissing → they land on the normal accepted state (existing screen, unchanged):

```
┌─────────────────────────────────────┐
│                                     │
│      ✓ You're locked in.           │
│                                     │
│   "Do my taxes by Sunday"           │
│   $50 at stake → St. Jude's        │
│                                     │
│   Day 1 of 5 · Verdict: Apr 17     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Check in on Joey              │  │  ← Existing time-based CTA
│  └───────────────────────────────┘  │
│                                     │
│   Your move — make a vow and pick   │
│   Joey to judge you                 │  ← Existing reciprocal CTA
│                                     │
│   ─── NEW (only if pledges exist)── │
│                                     │
│   🙌 3 friends pledged $25          │  ← NEW: passive pledge counter
│      because you shared             │     only appears if pledges > 0
│                                     │
└─────────────────────────────────────┘
```

**For web-only witnesses (V1 — no change):**
The web witness page at `/w/[token]` stays the same in V1. No share prompt added yet. These witnesses can still share manually if they want, but we're not building the interstitial for web in V1. This is a V2 expansion.

---

### ACT 3: SPECTATORS ARRIVE (Web — Pledge Page)

A spectator taps the shared link from iMessage, WhatsApp, Instagram DM, whatever.

**Screen: Pledge Page (/p/[share_token]) — NEW**

```
┌─────────────────────────────────────┐
│                                     │
│   [👁 Unbreakable Vow]             │
│                                     │
│   Joey vowed to                     │
│                                     │
│   "Do my taxes by Sunday"           │
│                                     │
│   $50 on the line → St. Jude's     │
│                                     │
│   ████████████░░░  Day 3 of 5       │
│                                     │
│   ── 6 friends have pledged $45 ──  │  ← Social proof (or hidden
│                                     │     if 0 pledges yet)
│   ─────────────────────────────────  │
│                                     │
│   Pledge to charity if Joey         │
│   succeeds                          │
│                                     │
│     [$5]    [$10]    [$20]          │  ← Amount chips
│              ↑ selected              │     $10 default
│                                     │
│  ┌───────────────────────────────┐  │
│  │      Apple Pay                │  │  ← One tap to pay
│  └───────────────────────────────┘  │
│                                     │
│       or pay with card ↓            │  ← Expandable fallback
│                                     │
│   This is a donation to St. Jude's. │
│   You're only charged if Joey       │
│   keeps his vow. Otherwise, you     │
│   pay nothing.                      │
│                                     │
└─────────────────────────────────────┘
```

**Design notes:**
- Zero chrome. No navigation. No app branding beyond the small eye icon.
- Social proof ("6 friends have pledged $45") appears only when pledges > 0. First spectators see no count.
- Default amount is $10 (middle option — anchoring). $5 for low friction, $20 for high intent.
- Apple Pay / Google Pay is the primary action. Card entry is hidden behind "or pay with card."
- Charity name appears THREE times: in the vow card, in the CTA, and in the disclaimer. Can't miss it.
- No account creation. No email capture. No friction.

---

### ACT 3B: SPECTATOR RE-SHARE (Your Key Insight)

After pledging, the spectator sees the confirmation screen. This is where spectator-to-spectator sharing happens.

**Screen: Pledge Confirmed + Re-Share (NEW)**

```
┌─────────────────────────────────────┐
│                                     │
│          ✓ You pledged $10          │
│                                     │
│   If Joey keeps his vow, your $10   │
│   goes to St. Jude's.              │
│                                     │
│   We'll text you when the           │
│   verdict is in.                    │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  📱  (  your phone number ) │   │  ← Phone capture for
│   └─────────────────────────────┘   │     verdict notification
│                                     │
│   ─────────────────────────────────  │
│                                     │
│   Pile on the pressure 👀           │  ← THIS IS THE RE-SHARE
│                                     │
│   Share Joey's vow and let more     │
│   friends pledge to charity.        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  ✦  Share with friends        │  │  ← Primary gold button
│  └───────────────────────────────┘  │     native share / clipboard
│                                     │
│   ─────────────────────────────────  │
│                                     │
│       Get the app to make           │
│       your own vow →                │  ← Soft conversion CTA
│                                     │
│     [App Store]  [Play Store]       │
│                                     │
└─────────────────────────────────────┘
```

**Why this works:**

The spectator just DID something (pledged). They're in action mode, not browsing mode. "Pile on the pressure" is playful — it frames sharing as helping their friend feel more accountable, not as marketing. And the re-share link is the SAME pledge page, so the next wave of spectators gets the same clean experience.

**The re-share text:**
> I just pledged $10 to St. Jude's if Joey does his taxes by Sunday. Pile on 👀 → [same pledge link]

**Viral math with spectator re-sharing:**
- Witness shares → 5 spectators pledge
- 2 of those 5 re-share → 4 more spectators
- 1 of those 4 re-shares → 2 more spectators
- Total: 11 spectators from 1 witness share

Without re-sharing: 5. With re-sharing: 11. That's a 2.2x multiplier on the feature's entire value, and all it costs is one button on the confirmation page.

---

### ACT 4: DURING THE VOW (Maker — Expo App)

**Screen: Vow Detail — With Pledges (ENHANCED)**

```
┌─────────────────────────────────────┐
│  ← Back                             │
│                                     │
│   "Do my taxes by Sunday"           │
│                                     │
│   ● Active     $50 → St. Jude's    │
│                                     │
│   ████████████░░░  Day 3 of 5       │
│                                     │
│   ── People ──                      │
│   You (Maker)                       │
│   Mikey (Witness) ✓ Accepted        │
│                                     │
│   ── Friends pledging for you ──    │  ← NEW SECTION
│                                     │     only renders if pledges > 0
│   $85 pledged by 8 friends          │
│   → St. Jude's if you succeed       │
│                                     │
│   Sarah $10 · Alex $5 · Jordan $20  │
│   + 5 more                          │
│                                     │
│   Your success sends $85 to         │
│   charity. Keep going. 💪           │
│                                     │
│   ── Timeline ──                    │
│   🔒 Vow sealed — Apr 12           │
│   📨 Witness invited — Apr 12       │
│   ✅ Witness accepted — Apr 12      │
│   👀 8 friends pledged $85 — Apr 14 │  ← NEW event in timeline
│   📋 Checked in: On track — Apr 14  │
│                                     │
│   ── Actions ──                     │
│   [Text Mikey]                      │
│   [Share your vow]  ← now shares    │
│                        pledge link   │
│   [Withdraw vow]                    │
│                                     │
└─────────────────────────────────────┘
```

**If zero pledges exist:** The "Friends pledging for you" section simply doesn't render. The screen is byte-for-byte identical to today's vow detail. No empty state, no "0 friends pledged," no hint that the feature exists.

**Push notification to maker when pledges arrive:**
> 🙌 Sarah just pledged $10 to St. Jude's if you keep your vow. 8 friends are counting on you.

These arrive passively. The maker doesn't manage spectators or interact with them. The information arrives as motivation, not as a task.

---

### ACT 5: VERDICT (Witness Judges)

The existing verdict flow is unchanged. The witness goes to `/w/[token]/verdict`, picks kept or broken, 3-second undo, done.

**What changes AFTER verdict submission:**

The `submit-verdict` edge function now also calls `process-pledges`, which:
- On KEPT: captures all authorized pledge PaymentIntents (charges spectators)
- On BROKEN: cancels all authorized pledge PaymentIntents (releases holds)

Then sends SMS to every spectator who provided a phone number.

---

### ACT 6: VERDICT LANDS (All Users)

**Maker — Expo Vow Kept Screen (ENHANCED)**

```
┌─────────────────────────────────────┐
│                                     │
│        🏅                           │
│                                     │
│     Mikey confirmed it.             │
│                                     │
│   $50 protected. And your friends   │  ← NEW line mentioning
│   just sent $85 to St. Jude's      │     spectator pledges
│   because of you.                   │
│                                     │
│   ── Your impact ──                 │
│   $50 refunded to you               │
│   $85 donated by 8 friends          │  ← NEW stat
│   3 vows kept · 3 streak 🔥         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  ✦  Share your victory        │  │  ← Existing, enhanced text
│  └───────────────────────────────┘  │
│                                     │
│      Make another vow →             │
│                                     │
└─────────────────────────────────────┘
```

**Spectator — Verdict SMS:**
> Joey kept his vow! Your $10 → St. Jude's 🎉 See the result: [link]

**Spectator — Post-Verdict Web Page (/p/[share_token]/result)**

```
┌─────────────────────────────────────┐
│                                     │
│   [👁 Unbreakable Vow]             │
│                                     │
│          ✓ Joey kept it.            │
│                                     │
│   "Do my taxes by Sunday"           │
│                                     │
│   $50 refunded to Joey              │
│   $85 donated to St. Jude's        │
│   by 8 friends                      │
│                                     │
│   Your $10 → St. Jude's ✓          │  ← Personal confirmation
│                                     │
│   ─────────────────────────────────  │
│                                     │
│   Your turn.                        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  ✦  Make a vow                │  │  ← Conversion CTA #1
│  └───────────────────────────────┘  │
│                                     │
│     or Challenge a friend →         │  ← Conversion CTA #2
│                                     │
│   ─────────────────────────────────  │
│                                     │
│     Get the app →                   │
│   [App Store]  [Play Store]         │
│                                     │
└─────────────────────────────────────┘
```

---

## The Maker Share Question: Resolved

**Should we tell the maker to share with spectators? Is that overload?**

**Answer: Don't add new prompts. Upgrade existing shares.**

The maker already shares at 3 moments in the Expo app:
1. Certificate screen (after seal) — primary CTA, auto-triggers
2. Vow detail — "Share your vow" button
3. Vow-kept/vow-broken — primary CTA, auto-triggers

All three of these already exist and are well-positioned. The change is invisible: the shared LINK becomes the pledge page, and the shared TEXT mentions pledging. The maker doesn't make a new decision ("should I enable spectators?"). They make the same decision they already make ("should I share this?") — and now sharing automatically enables pledging.

**Why no explicit "invite spectators" flow for the maker:**

Julie's principle: "Can we remove a step instead of adding one?" The maker doesn't need to know that spectators exist as a concept. They share their vow — which they already do — and the pledge page handles the rest. If you add an "Invite friends to pledge" prompt, you're:
- Adding cognitive load to the creation flow
- Making the maker think about audience management
- Creating a decision point that doesn't need to exist
- Risk making this feel like fundraising (ick)

The maker's role is to share. The infrastructure converts that share into spectator pledges. The maker discovers pledges passively ("🙌 Sarah just pledged $10").

---

## All Share Touchpoints — Summary Map

```
SHARE TOUCHPOINT MAP
═══════════════════════════════════════════════════

1. WITNESS ACCEPTS (Expo)
   ├── NEW interstitial: "Share Joey's vow"
   ├── Native share sheet → pledge link
   ├── "Not now" to dismiss
   └── HIGHEST PRIORITY — build this first

2. SPECTATOR PLEDGES (Web)
   ├── NEW on confirmation: "Pile on the pressure"
   ├── Share button → same pledge link
   ├── Spectator → spectator viral chain
   └── EXPONENTIAL MULTIPLIER — build this second

3. MAKER SHARES (Expo — existing buttons, upgraded)
   ├── Certificate (post-seal) → pledge link
   ├── Vow detail "Share your vow" → pledge link
   ├── Vow-kept/broken "Share" → pledge link
   └── NO NEW UI — just change the link & copy

4. WITNESS POST-VERDICT (Web — existing button, upgraded)
   ├── "Share this outcome" → includes pledge stats
   └── NO NEW UI — just enhanced copy

═══════════════════════════════════════════════════

TOTAL NEW SCREENS: 2
   - Witness share interstitial (Expo)
   - Spectator re-share section on pledge confirmation (Web)

MODIFIED SCREENS: 4
   - Certificate (Expo) — share link & text
   - Vow detail (Expo) — pledge section + share link
   - Vow-kept/broken (Expo) — pledge stats + share link
   - Witness verdict done (Web) — share text enhanced

ENTIRELY NEW WEB PAGES: 2
   - /p/[share_token] — Pledge page
   - /p/[share_token]/result — Post-verdict spectator page
```

---

## V1 → V2 Roadmap

### V1 (This Build)
- Witness share prompt (Expo only)
- Spectator re-share on pledge confirmation (Web)
- Maker share upgrades (Expo — link/copy change only)
- Pledge page (Web)
- Post-verdict spectator page (Web)
- Pledge processing on verdict
- Pledge counter on vow detail (Expo)

### V2 (Based on V1 Data)
- **Spectator voting** — spectators vote on verdict alongside witness (advisory, non-binding, or weighted)
- **Web witness share prompt** — add the interstitial to `/w/[token]` for web-only witnesses
- **Pledge leaderboard** — "Top pledger" badge on the post-verdict page
- **Custom amounts** — let spectators enter any amount
- **Longer vows** — solve Stripe auth expiry for vows > 7 days (re-authorization flow)
- **Email notifications** — spectators who provide email instead of phone
- **Charity selection** — spectators pick from maker's charity options
- **Social feed** — see friends' active vows with pledge counts (app-only)
