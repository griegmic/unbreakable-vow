# Prompt 07: Web Verdict Page

## Context
Unbreakable Vow app. The witness receives an SMS with a link to deliver their verdict. This link opens a simple web page — the witness does NOT need the app. The page authenticates via a token in the URL, shows the vow details, and lets the witness tap "Kept" or "Broken".

## What to do

### 1. Create `supabase/functions/verdict-page/index.ts`
An Edge Function that serves HTML. This is both the page renderer AND the verdict submission handler.

**GET `/verdict-page?token={witness_invite_token}`**
Serves an HTML page showing:
- The vow text
- The vow maker's name
- The stake amount
- Two big buttons: "They kept it" and "They broke it"
- A confirmation step before final submission

**POST `/verdict-page`**
Receives `{ token, verdict }` (verdict is "kept" or "broken"):
1. Look up vow by `witness_invite_token`
2. Verify vow status is `active` or `awaiting_verdict`
3. Update vow: `verdict`, `verdict_at`, `status` → `kept` or `broken`
4. If `kept`: issue Stripe refund via Stripe API
5. If `broken`: payment already captured, no action needed
6. Send SMS #4 (outcome) to witness
7. Queue push notification to vow owner
8. Return success HTML

### 2. The HTML page design

Dark theme matching the app aesthetic. Mobile-optimized. No JavaScript framework — just vanilla HTML/CSS/JS.

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unbreakable Vow — Verdict</title>
  <style>
    /* Dark theme: bg #05070B, gold accents #D4A24F, text #F6F7FB */
    /* Mobile-first, centered layout */
    /* Two large verdict buttons */
    /* Confirmation modal before submission */
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">VERDICT TIME</div>
    <h1>Did they keep their vow?</h1>
    <div class="vow-card">
      <p class="vow-text">"{{vow_text}}"</p>
      <p class="vow-meta">{{maker_name}} · ${{amount}} on the line</p>
    </div>
    <button class="btn kept" onclick="submitVerdict('kept')">They kept it ✓</button>
    <button class="btn broken" onclick="submitVerdict('broken')">They broke it ✗</button>
  </div>

  <div id="confirm-modal" class="modal hidden">
    <div class="modal-content">
      <h2 id="confirm-title"></h2>
      <p id="confirm-text"></p>
      <button id="confirm-btn" class="btn">Confirm</button>
      <button class="btn-secondary" onclick="closeModal()">Go back</button>
    </div>
  </div>

  <script>
    const token = '{{token}}';

    function submitVerdict(verdict) {
      // Show confirmation modal
      // On confirm: POST to /verdict-page with { token, verdict }
      // On success: show "Verdict recorded" message
      // On error: show error message
    }
  </script>
</body>
</html>
```

### 3. Confirmation copy

**If witness taps "They kept it":**
- Title: "Confirm: Kept"
- Text: "You're confirming that {name} kept their vow. Their ${amount} will be refunded."

**If witness taps "They broke it":**
- Title: "Confirm: Broken"
- Text: "You're confirming that {name} broke their vow. Their ${amount} will go to {destination}. This can't be undone."

### 4. Post-verdict page
After submission, replace the page content with:
- "Verdict recorded" heading
- Outcome summary
- "Thanks for being a witness" message
- No further actions needed

### 5. Error states
- Invalid/expired token → "This verdict link is no longer valid."
- Vow already judged → "This vow has already been judged." Show the existing verdict.
- Vow in wrong status (draft, voided) → "This vow hasn't been sealed yet."

### 6. Create Edge Function: `supabase/functions/submit-verdict/index.ts`
Separate function for the POST handler (cleaner than combining with page serving):

```typescript
// POST { token, verdict }
// No auth required (token IS the auth)
//
// 1. Look up vow by witness_invite_token
// 2. Validate status
// 3. Update vow status + verdict
// 4. If kept: Stripe refund
// 5. Send SMS #4 to witness
// 6. Queue push notification to owner
// 7. Return { success, verdict }
```

### 7. Stripe refund logic (in submit-verdict)

```typescript
if (verdict === 'kept' && vow.stripe_payment_intent_id) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  await stripe.refunds.create({
    payment_intent: vow.stripe_payment_intent_id,
  });
}
```

## Do NOT modify
- Any React Native app code
- This prompt only creates Supabase Edge Functions

## Important notes
- The witness_invite_token is a UUID — effectively unguessable. This IS the authentication for the witness.
- The verdict page must work on mobile Safari (that's where SMS links open).
- Keep the HTML page small — no external CSS/JS dependencies.
- The verdict URL format: `https://xxxxx.supabase.co/functions/v1/verdict-page?token={token}`
- For v1, we don't need a custom domain. The Supabase function URL is fine.
