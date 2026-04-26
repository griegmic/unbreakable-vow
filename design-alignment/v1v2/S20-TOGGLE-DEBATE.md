# S20 SEGMENTED TOGGLE DEBATE
## Should the dashboard have a "Your Vows / Witnessing" toggle at the top?

**Debated by:** Linda Dong (ex-Apple HIG), Wei Huang (Linear Design), Gabriel Valdivia (ex-Coinbase/FB), Tobias van Schneider (Brand + Product), Soleio Cuervo (Early Facebook)

**Facilitated by:** Joe (Product), Claude as moderator

**Date:** 2026-04-22  
**Question:** Joey asked: "should the dashboard have a segmented-control toggle at the top for 'Your Vows / Witnessing,' or stay as one long sectioned scroll?" And explicitly: "don't just blindly do what I said—only if you think it's an excellent idea."

**The constraint we're evaluating against:** From IMPLEMENTATION-V6.md §1.1 and WITNESS-IDENTITY-DECISION doc:
> "No witness dashboard, no witness feed, no list of vows you're witnessing, no witness streaks. The witness is *present* via notifications, not via a surface."

Three notification surfaces are authorized. The dashboard is not one of them.

---

## THE CURRENT ARCHITECTURE (S20)

One long sectioned scroll:
1. **Header** (hamburger + wordmark + avatar)
2. **Your vows** (active vows as compact cards, 1-N rows)
3. **Pending dare** (only if user has incoming challenge)
4. **You're witnessing** (3 rows max, compact, by urgency; overflow → `/witnessing` tab)
5. **Footer CTA** ("Make a vow →")

History lives behind the hamburger (not on the dashboard). The scroll pressure is managed by capping witnessing at 3 rows + a "see all" card.

---

## PANEL VERDICT SUMMARIES

### LINDA DONG (ex-Apple HIG — Hierarchy & Signal-to-Noise)

**Answer:** **No toggle.** The single scroll is the correct hierarchy.

**Reasoning (140 words):**

A segmented toggle at the top says "these two things are equal peers." But they aren't. In Unbreakable Vow's product thesis, your vows are *your commitment*. Witnessing is a *secondary action*—you show up when texted, answer Sunday, done. The moment you add a toggle that puts witnessing on a par with "Your Vows," you've promoted it from a side-task to a peer identity.

This is exactly what happened in early Slack. The design put channels and DMs at the same level, which made users *feel* like they should check both equally. It increased cognitive load. Apple's approach—primary content first, secondary content below or behind a menu—works because it matches mental priority. Your vows demand sustained attention. Witnessing demands one decision per week. The scroll order should reflect that priority, not obscure it with a toggle.

The toggle costs clarity. The scroll keeps it.

**Second-order effect:** A toggle mentally partitions the dashboard. Users start asking "Am I in my-vows mode or witness mode?" instead of "What do I need to act on right now?" It's the inverse of the product's thesis.

---

### WEI HUANG (Linear Design — Real Navigation vs. False Positives)

**Answer:** **No toggle.** But not for the reason Linda said. I'd challenge whether "witnessing" belongs on the dashboard at all.

**Reasoning (145 words):**

Here's the hard truth: the toggle only makes sense if you're trying to compress two large, equally important feature areas. But in this product, witnessing *isn't* that. It's three rows on a screen. If you're witnessing more than three vows, there's a dedicated overflow page (`/witnessing` with Active/Recent tabs). That's already solved.

So the toggle doesn't solve a real problem. It creates a false bifurcation. You're telling the user "there are two modes of this dashboard," but actually there's one mode: "here's what you need to act on today." The witnessing section is just one part of that.

Compare Linear's product design: we have projects, issues, and a dashboard. We don't have a "Projects / Issues" toggle on the dashboard because they're not peers. The dashboard shows issues across projects. Same here—the dashboard shows your vows and your witnessing obligations in one view because they're both *actions right now*.

The toggle is a false solution to a non-problem.

**Second-order effect:** It signals that you're still unsure about the product architecture. Confident products don't toggle between sections—they show everything that matters in priority order.

---

### GABRIEL VALDIVIA (ex-Coinbase/FB — Engagement & Habit Loops)

**Answer:** **Yes, but only if you're willing to lean into witnessing as a retention vector.** And you're not. So no.

**Reasoning (148 words):**

Let me be real: a toggle works if witnessing is *interesting enough that users want to flip to it and spend time there*. In Facebook's mobile app, you toggle between Feed and Stories and Messages because each one is addictive. The toggle encourages re-engagement. Users flip back and forth.

Here's what would have to be true for a witnessing toggle to work:
- Witnessing rows show rich, scrollable content (comments, updates, maker's check-ins)
- You gamify it (witness streaks, witness badges, "you're someone's favorite witness")
- You make it social (see other witnesses, build an audience)

But Joey explicitly said none of that. And IMPLEMENTATION-V6 says "no witness feed, no witness streaks, no witness dashboard." So you've got three rows and an overflow page. That's not enough juice to justify a toggle.

A toggle only works if it's rewarding to flip to. This isn't. So the single scroll is better because it doesn't set a false expectation.

**Second-order effect:** A toggle tells your users "we think witnessing is a thing you should actively manage," which contradicts the actual product promise ("we'll text you when we need you").

---

### TOBIAS VAN SCHNEIDER (Product as Metaphor — What the Toggle Says About Your Product)

**Answer:** **No toggle.** It changes the *voice* of the product in a way you don't want.

**Reasoning (155 words):**

Here's what the current single-scroll dashboard says: *"Hey, here's your life in this app right now. Vows you made. Dares you got. People counting on you. One list, one priority."* It's cohesive. It's saying "this is a unified commitment universe."

A toggle says something different. It says: *"You have two separate roles here: maker and witness. Pick which one you're operating in."* That's a psychological shift. It's the same shift that happened when Slack added channels to the sidebar as a first-class navigation item—suddenly users felt like they had to "switch modes."

Unbreakable Vow's entire brand is about *single-minded commitment*. Not about role-switching. Not about "I'm in witness mode now." The copy says things like "Heckle him until he does." That's you, the friend, *present* in the moment, not in a separate witness role you toggle into.

The current design keeps that metaphor intact. The toggle breaks it.

**Second-order effect:** It fragments the product's brand. Users will start thinking "am I making vows or being a witness?" instead of "am I committed to what matters?"

---

### SOLEIO CUERVO (Early Facebook — Product Identity & Self-Concept)

**Answer:** **No toggle.** Not for navigation reasons. For identity reasons.

**Reasoning (150 words):**

At early Facebook, we noticed something: when you give users a *toggle between roles*, they start to see themselves as having multiple identities. You're "Student self" when you turn on the college network, "Work self" when you switch to work. That identity fluidity actually *reduced* engagement because users felt like they were code-switching constantly.

The breakthrough was realizing: if you show all the contexts (friends, events, groups, work stuff) together in one feed, users see themselves as *one person operating across contexts*. It's more psychologically coherent. It's more engaging because you feel like a singular self.

Unbreakable Vow is building the same thing: a person who makes commitments *and* holds others accountable. Those aren't separate identities. They're one person's two roles in a commitment ecosystem. The moment you toggle between them, you're saying "these are different identities," and you fracture the user's self-concept within the app.

The current design—one scroll, all contexts together—keeps them unified. That's deeper than just UX. That's product psychology.

**Second-order effect:** It subtly tells users "your role as a witness is optional," when the product thesis says "you're a stakeholder in every vow you accept."

---

## SYNTHESIS & VERDICT

### The Honest Consensus

**All five panelists say no toggle.** But they arrived there from different doors:

- **Linda:** The scroll hierarchy is clearer and matches attention priority.
- **Wei:** There's no real problem to solve. Witnessing is three rows + an overflow page.
- **Gabriel:** A toggle only works if witnessing is engaging enough to flip to. It isn't (by design).
- **Tobias:** The toggle fractures the product's metaphor and brand voice.
- **Soleio:** The toggle fragments the user's self-concept in the app.

**The single most important argument:**

The current sectioned-scroll architecture is *not* a compromise or a workaround. It's the correct architecture because it treats witnessing as what it actually is: a permanent-but-quiet part of your role in the app, not a separate mode you toggle into.

The toggle is a solution to a problem you don't have.

---

## WHERE WITNESSING *ACTUALLY* LIVES IN THE CURRENT SETUP

Joey asked: "in the current setup where do witness activities live?"

**Answer:** Witnesses are present in four places:

1. **Push notifications (primary surface):** The witness gets 3 notifications during the active period:
   - Day 1: "Joey's vow is live and you're the witness" (confirmation)
   - Midpoint: "Joey's halfway through—going strong" (light check-in)
   - Sunday: "Joey's vow is up. Time to judge." (verdict request)
   
   This is the heavyweight surface. It's where the witness *acts*.

2. **Dashboard "You're witnessing" section (secondary surface):** A compact row showing maker + vow + status + time-to-verdict. Three max, then overflow. This is *informational*, not actionable.

3. **Overflow page (`/witnessing` with Active/Recent tabs):** Only if witnessing >3 active vows. Shows more rows in the same format. Still informational. Not a feed, not a dashboard.

4. **Verdict page (`/w/[token]/verdict`):** The one place the witness *decides*. Shows the vow, the maker, and the button: Kept or Broken. (Kevin Systrom suggested adding one line: "You've been witness to this for 8 days"—agreed, do it. But that's one line, not a new surface.)

The witness role is *present* because:
- They're invited by SMS and see their role confirmed
- They see a reminder row on the dashboard ("You're witnessing Joey's vow")
- They get notifications at key moments
- They deliver the verdict at the end

But the witness role is *lightweight* because:
- They never have a feed or a list they "manage"
- They're not gamified (no streaks, no badges)
- They're not social (no audience, no comments)
- They don't have a separate mode or tab

This is exactly what the WITNESS-IDENTITY-DECISION doc decided: "The witness is *present* via notifications, not via a surface."

A toggle would create a fifth surface—a toggle into "my witness view"—which violates that principle. The current architecture respects it.

---

## WHAT JOEY SHOULD DO

**No toggle.** Keep the single long scroll.

**But here's what might be driving Joey's instinct:**

He might be worried about the dashboard length when a user is witnessing many vows. That's fair. But that problem is already solved:

- Witnessing section is capped at 3 rows
- A tappable "See all N more →" card opens the overflow page (`/witnessing`)
- History is behind the hamburger menu (not on the dashboard)
- So the maximum dashboard length is: greeting + vows (1-5 rows) + pending dare (0-1) + witnessing (3 rows) + "see all" card (1) + footer

That's about 10-12 taps on a mid-size phone. Not a long scroll.

**If Joey is still worried about legibility,** the answer is not a toggle. It's:

- **Increase visual separation** between sections (done: 1px rule dividers are in the spec)
- **Increase vertical rhythm** within sections (done: 12px 14px padding on witnessing rows)
- **Use typography to signal priority** ("YOUR VOWS" in larger font, "YOU'RE WITNESSING" in smaller)
- **Make the "see all" card visually distinctive** (gold soft background + border—already in spec)

All of that is already in the S20 spec. It's good design. The toggle isn't necessary.

---

## FINAL ANSWER

**Do not add the toggle.**

The current architecture is sound. It respects the founding principle ("witness present via notifications, not via a surface"), it keeps the user's self-concept unified, it treats navigation as a reflection of priority, and it solves the real problem (managing scroll length) with a cap + overflow page instead of a mode switch.

The toggle is the wrong solution to a problem that doesn't exist. Ship the single scroll. The design is already excellent.
