# Expert Panel Sign-Off Document

## Final Ratings

| Expert | Step 2 (Design) | Step 3 (Architecture) | Overall | Notes |
|--------|-----------------|----------------------|---------|-------|
| **Product Expert** | 9/10 | 9/10 | **9/10** | "Tight scope, directly serves primary goal. Challenge flow is the key unlock." |
| **CTO / Build Expert** | 8/10 | 9/10 | **9/10** | "All changes additive. Shared queries across web + mobile. Clean phase boundaries." |
| **World-Class Designer** | 8/10 | 8/10 | **8/10** | "Single entry point confirmed. Dashboard layout clear. Mobile version native-feeling." |
| **Nikita Bier** | No blocking | No blocking | **Pass** | "Certificate + challenge-back CTA = the viral loop. Every verdict creates reciprocal invitation." |
| **QA Tester** | No blocking | No blocking | **Pass** | "Comprehensive test plan. Each phase testable. State machine covers all paths." |
| **Security / Payments** | No blocking | No blocking | **Pass** | "Separate tokens for challenges vs witnesses. Idempotent Stripe operations. $0 path clean." |
| **Behavioral Design** | No blocking | No blocking | **Pass** | "Accountability stack for $0 vows is sound. Oath ceremony anchors commitment. Check-ins fill the boring middle." |
| **Infrastructure Guardian** | No blocking | No blocking | **Pass** | "All schema additive. Protected file list explicit. No regression risk to mobile or existing flows." |

**All thresholds met across all phases.**

## Non-Blocking Feedback (Carried Forward as V2 Nice-to-Haves)

1. **Certificate as generated OG image** (Nikita) — serverless image generation for richer social previews. V1 uses page + OG meta tags.
2. **Redemption prompt on broken $0 vows** (Behavioral) — "Make it right. Try again?" prompt after broken verdict. Quick win for V2.
3. **Two entry points vs toggle** (Designer) — resolved as single button with toggle per Joey's "less is more" preference. Revisit if user testing shows confusion.
4. **Streak gamification** (Feature Analysis) — V1 has basic streak counter. V2 adds titles ("Committed", "Keeper", "Unbreakable"), badges, streak freeze.
5. **Witness reputation** (Feature Analysis) — track witness response rate and verdict history. V2 feature.
6. **AI proof verification** (Feature Analysis) — photo evidence + AI validation for check-ins. V2.
7. **Broken vow recovery flow** (Feature Analysis) — immediate re-attempt at lower stakes after breaking. V2.

## Assumptions the Plan Depends On

| # | Assumption | Status | Risk if Wrong |
|---|-----------|--------|---------------|
| 1 | Supabase project accessible, schema matches audit | Needs verification | Migration might conflict — run on dev first |
| 2 | Stripe test keys working | Needs verification | $0 vows still work; staked vows blocked |
| 3 | Twilio configured for SMS | Needs verification | Challenge/witness SMS won't send; link sharing works as fallback |
| 4 | Web app deployed on Vercel | Needs verification | Local dev works; deployment blocked |
| 5 | Mobile app creation flow untouched | Enforced | Protected file list prevents modification |
| 6 | Schema changes backwards-compatible with mobile | Verified | All additive, defaults set, mobile ignores new columns |
| 7 | No money transmitter licensing for V1 | Assumed | Low risk — test/friends-only, self-stake only |
| 8 | Google OAuth works on web | Confirmed in audit | Was incorrectly listed as missing in original prompt |
| 9 | witness_user_id can be backfilled on account creation | Design decision | If backfill fails, witnessing section may miss some vows |
| 10 | Rork can generate screens matching the spec | Assumed | Phase 11 integration phase absorbs any gaps |

## Known Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `seal-vow` modification introduces bug | Medium | High (breaks core flow) | Conditional wrapping preserves existing path. Phase 8 regression test. |
| Cron URL still hardcoded after fix | Low | Medium (background jobs fail) | Document manual dashboard setup as fallback. |
| Rork generates incompatible components | Medium | Low (Phase 11 fixes) | Data layer fully specified in Phase 9. Integration phase budgets time for fixes. |
| SMS delivery failures for challenges | Medium | Medium (target never sees challenge) | sms_failed flag + cron retry + manual link sharing fallback. |
| Stripe refund failure on void | Low | Medium (user doesn't get money back) | refund_failed flag + cron retry + push notification for manual resolution. |
| Mobile app crash after type changes | Low | High | Types are additive only. Existing screens don't reference new fields. Phase 11 regression test. |
| RLS subquery performance on audit_events | Low | Low | Indexes on vow_id cover the join. Audit table starts small. |

## Scope Summary

### V1 (This Build): 16 Features
1. Home dashboard (concurrent vows)
2. Power-user creation (single-page)
3. Self-vow + witness (existing, polished)
4. Challenge flow (send vow to someone)
5. Skip-Stripe ($0 vows)
6. Witness improvements (timeline, undo toast)
7. Audit trail + timeline
8. Check-ins (3 buttons)
9. Vow void/cancel
10. Certificate on web
11. SMS retry (cron)
12. Refund retry (cron)
13. Cron URL fix
14. Recent witnesses dropdown
15. Challenge-back CTA
16. Mobile dashboard + witnessing (Expo)

### V2 (Deferred): 10 Features
1. Bounty/incentive money model
2. Assigned stake (recipient pays)
3. Rich check-ins (photos, proof)
4. AI proof verification
5. Full streak gamification
6. Group vows
7. Keeper profiles/reputation
8. Vowkeeper AI bot
9. Premium subscription
10. Broken vow recovery flow

## Build Timeline

| Phase | Tool | Estimated Hours | Dependency |
|-------|------|----------------|------------|
| 1. Schema | Claude Code | 1h | — |
| 2. Edge Functions | Claude Code | 2-3h | Phase 1 |
| 3. Dashboard | Claude Code | 2-3h | Phase 2 |
| 4. Creation + $0 | Claude Code | 2-3h | Phase 2 |
| 5. Challenges | Claude Code | 2-3h | Phase 4 |
| 6. Timeline | Claude Code | 2h | Phase 3 |
| 7. Polish | Claude Code | 2-3h | Phase 5, 6 |
| 8. QA | Claude Code | 2h | Phase 7 |
| 9. Mobile Data | Claude Code | 1-2h | Phase 8 |
| 10. Mobile UI | Rork | 1 session | Phase 9 |
| 11. Integration | Claude Code | 2h | Phase 10 |
| **Total** | | **~20-25h** | |

After Phase 5 (~10h), Joey and David can use the web app for real vows with challenges, $0 stakes, and concurrent tracking. Phases 6-8 add polish. Phases 9-11 bring it to Expo.
