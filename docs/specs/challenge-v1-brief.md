# Challenge/Dare V1 — Strategic Brief

## One-Liner
Let users dare their friends into vows, turning Unbreakable Vow from a self-serve commitment tool into a push-based viral product.

## Strategic Context
The current growth model is pull: a user makes a vow and invites a witness. K-factor caps around 0.3–0.5. Challenges flip this to push: a dare lands in someone's phone uninvited, carrying social pressure to accept. Every dare is an involuntary acquisition event.

The challenge is the only mechanic on the table that creates involuntary user acquisition. The recipient didn't choose to engage with the product. They got dragged in by social pressure. That's how every breakout consumer app grows.

## The SMS Constraint
Twilio SMS approval is ~2–3 weeks out. Rather than wait, V1 launches with a share-based delivery model: the challenger shares a dare link through whatever channel they already use to talk to that person — iMessage, WhatsApp, Instagram DM, Slack, etc. This is actually a strategic advantage in disguise: the dare arrives in the same thread where the challenger and vow-maker already have a relationship, which makes it feel personal rather than transactional.

When Twilio is approved, SMS becomes an additional delivery option — not a replacement for the share flow, which should remain the primary path.

## Core Flow

### Step 1: Challenger Creates a Dare
The challenger opens the app, taps "Dare a friend," and enters the goal in free text. Oathkeeper sharpens it into an airtight commitment. The challenger suggests a stake amount as an anchor. No payment info is required from the challenger. Sending a dare is free.

### Step 2: The Share Moment
After the dare is created, the challenger sees a share screen. This screen matters enormously — it's the moment where the dare either gets sent or dies.

The share sheet is the primary CTA, not copy link. The pre-composed share text:

> I don't think you can hit the gym 3x this week. Prove me wrong → [link]

First person. Casual. No app branding in the message body. The link preview (Open Graph tags) does the branding work separately.

### Step 3: The Dare Lands
The vow-maker receives the dare in whatever channel their friend chose. They see their friend's message and the link preview. They tap the link. The link must open a mobile web page, not deep-link to the App Store.

### Step 4: The Accept Screen
Full-screen, dark, almost-black landing page. The vow is the only thing on the page. "Accept the vow" is a big, bright, primary button. "Back down" is small, dimmed. No app install required.

### Step 5: The Stakes Screen
Amounts are tappable chips, pre-selected on the challenger's suggestion. "Or keep it to just your word" is the escape valve.

### Step 6: Charity Selection
Short curated list, one tap.

### Step 7: Payment + Account Creation
Apple Pay / Google Pay as primary. Account creation: email and phone number. No password. Push notification permission prompted here.

### Step 8: Vow Sealed
The app download prompt comes AFTER the vow is sealed. The challenger gets a push notification.

## Back Down Mechanics

### If They Tap "Back Down"
Gut-check screen: "Are you sure? Joey will know you backed down." Challenger receives push notification.

### If They Don't Respond
Dares expire after 48 hours. Challenger gets push notification.

## Payment Mechanics
No changes to existing Stripe architecture. Auth-capture on acceptance (recipient's card). Charge on failed verdict. Release on success. One payer, one direction.

## Viral Loop
Challenger creates dare → shares via native channel → recipient accepts on mobile web → stakes → downloads app → later dares someone else → cycle repeats.

## Key Design Principles
1. The link preview is the product
2. Web first, app second
3. The share text must feel human
4. Never explain the product
5. Make "no" feel like losing
6. Stakes are optional but anchored
7. Under 60 seconds from link tap to live vow
8. Protect the 1:1
9. Ask for push permission at peak motivation

## Success Metrics
- Dare send rate (per active user per week)
- Share completion rate (% who actually share after creating)
- Acceptance rate (target: 40%+)
- Link-to-accept conversion
- Challenge-originated DAU
- K-factor improvement
- Stakes opt-in rate
- Push notification opt-in rate
- App install rate (web → native)
