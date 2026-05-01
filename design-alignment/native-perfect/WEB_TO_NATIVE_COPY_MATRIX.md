# Web To Native Copy Matrix

Project Native Perfect rule: approved mobile web copy is the source of truth. Native copy may differ only when the native experience is materially different: contacts, push permission, native share sheet, Apple Pay/payment sheet, Expo Go/TestFlight test states, and native error handling.

## Quick Vow

Source: `web/src/app/quick-vow/page.tsx`

- Kicker: `Seal a vow`
- H1: `One promise.` / `Real consequence.`
- Vow label: `I vow to`
- Placeholder: `skip takeout all week`
- Deadline row: `Verdict` + selected label
- Stake label: `On the line`
- Stake options: `$10`, `$50`, `$100`, `Other`
- Stake notes:
  - `$10`: `Light enough to start. Real enough to count.`
  - `$25`: `Enough to notice. Easy enough to choose.`
  - `$50`: `Small enough to choose today. Real enough to remember tomorrow.`
  - `>$50`: `Large enough to make the promise louder.`
- Judge empty title: `Share judge link`
- Judge empty subtitle: `Optional before sealing.`
- Judge chosen subtitle: `They can accept before you seal.`
- Receipt: `If broken, $X goes to DESTINATION.`
- Primary CTA: `Continue`
- Secondary CTA: `Need help? Guided setup`
- Footer: `Nothing charges unless you break it.`

Native allowed differences:
- Contact picker may appear when choosing a judge.
- Custom stake entry may use an iOS native prompt in the lab route.

## Seal

Source: `web/src/app/seal/page.tsx`

- Auth title, input: `What’s your number?`
- Auth title, OTP: `Enter the code.`
- Auth title, name: `What should we call you?`
- Phone CTA: `Text me the code`
- Name CTA: `Continue`
- Review title: `Last look.`
- Review subtitle: `Once you seal, there's no going back.`
- Review card label: `I VOW TO`
- Review meta: `STAKE`, `JUDGE`, `BY`
- Primary CTA: `Seal this vow`
- Secondary CTA: `Back`
- Fine print: `No charge unless you break your vow`

Native allowed differences:
- Apple Pay/card sheet copy may explain the native payment surface.
- Expo Go may show a test bypass; TestFlight should not.

## Post-Seal Celebration

Sources: `web/src/app/seal/page.tsx`, `web/src/app/vow/[id]/page.tsx`

- Status: `Sealed`
- Headline: `Your vow is` / `bound.`
- Next line: `Next: send the witness link.`
- Share headline: `Now tell NAME.`
- Share subtext: `They accept, then the vow starts.`
- Primary CTA: `Text NAME →` or `Share with NAME →`
- Secondary CTA: `I'll do it later`
- Link action: `Copy` / `Copied`

Native allowed differences:
- Native share sheet may replace direct SMS if no phone is available.

## Dashboard

Source: `web/src/app/dashboard/page.tsx`

- Empty title: `No vows on the line.`
- Empty subtitle: `Sealed commitments will show up here.`
- Empty CTA: `Make your first vow →`
- Greeting: `Hey, FIRSTNAME.` or `Your vows.`
- Top CTA: `New vow`
- Section label: `Your vows`
- Card status:
  - `Awaiting NAME`
  - `Awaiting verdict`
  - `Active · Day X of Y`
  - `Active`
- Card time:
  - `Sealed X hrs ago`
  - `NAME replies in X hrs`
  - `X days left`
  - `Time's up`
- Meta labels:
  - `On hold`
  - `Starts when`
  - `If broken`
  - `Until`

Native allowed differences:
- Native pull-to-refresh and haptic feedback.

## Vow Detail

Source: `web/src/app/vow/[id]/page.tsx`

Pending witness:
- Status: `One tap away`
- Title: `Send the invite.` or `Get NAME in.`
- Subtext: `Your vow is sealed. Your witness needs to accept before it goes live.`
- Vow label: `The vow`
- Job title: `Next move`
- Job body: `Share the witness link. They accept, then they call it.`
- Primary CTA: `Text NAME the invite` or `Share witness invite`
- Secondary CTAs: `Copy invite link`, `Judge it myself instead`

Active:
- Status: `Vow live`
- Vow label: `The vow`
- Time label: `Time left`
- Time line: `Verdict by DATE.`
- Job title: `Keep going` or `Next move`
- Job body:
  - `You call this one when it is done.`
  - `NAME decides if you kept your word.`
  - `Send NAME the invite so they can accept.`
- Primary CTA:
  - `Mark kept early`
  - `Share vow`
  - `Text NAME a check-in`
  - `Send the invite`
- Secondary CTAs: `Ask NAME to release me early`, `Share vow`

Verdict due:
- Status: `Verdict due`
- Title: `Time's up.` / `You decide.` or `NAME decides.`
- Primary CTAs: `Deliver your verdict`, `Nudge NAME to decide`

Outcomes:
- Kept: `KEPT`, `You actually did it.`, `Crisis averted.`
- Broken: `BROKEN`, `You broke it.`, `Brutal. You broke it.`

Native allowed differences:
- Native share sheet and clipboard confirmations.
- Native notification permission prompts after value moments.
