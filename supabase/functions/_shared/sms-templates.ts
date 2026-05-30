// ─── V6 SMS TEMPLATES ───
// Canonical source: IMPLEMENTATION-V6.md §4.3
// Rules:
// - No emoji in any template (§1.6.10)
// - No user-supplied vow text in SMS body (grammar bug prevention — §1.2)
// - Witness identity language: "witness" persistent, "judge" Sunday-verb only
// - All phone numbers must be E.164 before calling Twilio

// ─── WITNESS-FACING ───

const BRAND = 'Unbreakable Vow';
const OPT_OUT = ' Reply STOP to opt out.';

export function sealMessage(stake: number, witnessUrl: string, makerName = 'Someone'): string {
  if (stake === 0) {
    return `${BRAND}: ${makerName} picked you as witness. Review and accept in 5 sec: ${witnessUrl}${OPT_OUT}`;
  }
  return `${BRAND}: ${makerName} put $${stake} on a vow and picked you as witness. Review and accept: ${witnessUrl}${OPT_OUT}`;
}

export function witnessReminderMessage(makerName: string, witnessUrl: string): string {
  return `${BRAND}: ${makerName} is still waiting for a witness. Accept or pass here: ${witnessUrl}${OPT_OUT}`;
}

export function witnessAcceptConfirmMessage(makerName: string): string {
  return `${BRAND}: You're ${makerName}'s witness. We'll text only key checkpoints and verdict day.${OPT_OUT}`;
}

export function witness24hMessage(makerName: string): string {
  return `${BRAND}: ${makerName}'s vow ends tomorrow. Keep an eye out; verdict link comes when time is up.${OPT_OUT}`;
}

export function verdictRequestMessage(makerName: string, verdictUrl: string): string {
  return `${BRAND}: Verdict time. Did ${makerName} keep the vow? Make the call here: ${verdictUrl}${OPT_OUT}`;
}

export function earlyCompletionRequestMessage(makerName: string, verdictUrl: string): string {
  return `${BRAND}: ${makerName} says the vow is already done. If true, release them early: ${verdictUrl}${OPT_OUT}`;
}

export function outcomeMessage(makerName: string, verdict: 'kept' | 'broken', stake: number, destination: string): string {
  if (verdict === 'kept') {
    if (stake === 0) {
      return `${BRAND}: ${makerName} kept the vow. Word honored.${OPT_OUT}`;
    }
    return `${BRAND}: ${makerName} kept the vow. Word honored, wallet untouched.${OPT_OUT}`;
  }
  if (stake === 0) {
    return `${BRAND}: ${makerName} broke the vow. The record stands.${OPT_OUT}`;
  }
  return `${BRAND}: ${makerName} broke the vow. $${stake} is going to ${destination}.${OPT_OUT}`;
}

// ─── MAKER-FACING ───

export function makerSealConfirmMessage(stake: number): string {
  if (stake === 0) {
    return `${BRAND}: Your vow is sealed. We'll keep you posted.${OPT_OUT}`;
  }
  return `${BRAND}: Your vow is sealed. $${stake} on the line. We'll keep you posted.${OPT_OUT}`;
}

export function makerWitnessAcceptedMessage(witnessName: string): string {
  return `${BRAND}: ${witnessName} accepted. Your vow is live and waiting on your dashboard.${OPT_OUT}`;
}

export function makerWitnessNoResponseMessage(witnessName: string): string {
  return `${BRAND}: ${witnessName} has not accepted yet. Open your vow to resend, switch witnesses, or go solo.${OPT_OUT}`;
}

export function makerWitnessInviteFailedMessage(witnessName: string): string {
  return `${BRAND}: We couldn't text ${witnessName}. Open your vow to share the witness link yourself.${OPT_OUT}`;
}

export function makerSelfVerdictTimeMessage(witnessName: string): string {
  return `${BRAND}: Time's up. ${witnessName} never accepted, so you can make the call in your vow.${OPT_OUT}`;
}

export function maker24hMessage(stake: number): string {
  if (stake === 0) {
    return `${BRAND}: 24 hours left. Finish clean.${OPT_OUT}`;
  }
  return `${BRAND}: 24 hours left. $${stake} is still on the line. Finish clean.${OPT_OUT}`;
}

export function makerVerdictTimeMessage(witnessName: string): string {
  return `${BRAND}: Time's up. ${witnessName} has the verdict link now.${OPT_OUT}`;
}

export function makerOutcomeMessage(verdict: 'kept' | 'broken', stake: number, destination: string): string {
  if (verdict === 'kept') {
    if (stake === 0) {
      return `${BRAND}: Your word is gold. Vow kept.${OPT_OUT}`;
    }
    return `${BRAND}: Your word is gold. Vow kept, wallet untouched.${OPT_OUT}`;
  }
  if (stake === 0) {
    return `${BRAND}: Verdict: broken. The record stands. Make a new one when you're ready.${OPT_OUT}`;
  }
  return `${BRAND}: Verdict: broken. $${stake} is going to ${destination}. Make a new one when you're ready.${OPT_OUT}`;
}

// ─── CAST / DARE — target-side ───

export function challengeMessage(challengerName: string, stake: number, acceptUrl: string): string {
  if (stake > 0) {
    return `${BRAND}: ${challengerName} dared you. Accept, stake $${stake}, and make them call the verdict: ${acceptUrl}${OPT_OUT}`;
  }
  return `${BRAND}: ${challengerName} dared you. Accept, stake your word, and make them call the verdict: ${acceptUrl}${OPT_OUT}`;
}

export function challengeReminderMessage(challengerName: string, acceptUrl: string): string {
  return `${BRAND}: ${challengerName} is still waiting on your dare. Accept or pass here: ${acceptUrl}${OPT_OUT}`;
}

// ─── CAST / DARE — maker-side (the darer) ───

export function castSentMessage(targetName: string): string {
  return `${BRAND}: Your dare to ${targetName} is sent. We'll tell you when they answer.${OPT_OUT}`;
}

export function castInviteFailedMessage(targetName: string): string {
  return `${BRAND}: We couldn't text ${targetName}. Open your dare to share the link yourself.${OPT_OUT}`;
}

export function castAcceptedMessage(targetName: string): string {
  return `${BRAND}: ${targetName} accepted your dare. You'll call the verdict when time is up.${OPT_OUT}`;
}

export function castDeclinedMessage(targetName: string): string {
  return `${BRAND}: ${targetName} passed on your dare. Closed cleanly.${OPT_OUT}`;
}

export function castAutoVoidedMessage(targetName: string): string {
  return `${BRAND}: ${targetName} didn't respond in 48h. Dare closed.${OPT_OUT}`;
}

export function castVerdictDayMessage(targetName: string, verdictUrl: string): string {
  return `${BRAND}: Time to rule on your dare to ${targetName}. Did they keep it? ${verdictUrl}${OPT_OUT}`;
}

// ─── CAST — verdict outcome to target ───

export function castOutcomeMessage(makerName: string, verdict: 'kept' | 'broken', stake: number, destination: string): string {
  if (verdict === 'kept') {
    return `${BRAND}: ${makerName} ruled kept. Dare closed. Nothing owed.${OPT_OUT}`;
  }
  return `${BRAND}: ${makerName} ruled broken. $${stake} went to ${destination}.${OPT_OUT}`;
}

// ─── REFUND RETRY OUTCOMES (maker-side) ───

export function refundSucceededMessage(stake: number): string {
  return `${BRAND}: Good news. Your $${stake} refund went through.${OPT_OUT}`;
}

export function refundFailedFinalMessage(stake: number): string {
  return `${BRAND}: We couldn't process your $${stake} refund after several tries. We're on it. Reply HELP for support.${OPT_OUT}`;
}

// ─── SELF-RESOLVE (witness notification) ───

export function makerSelfResolvedToWitnessMessage(makerName: string, verdict: 'kept' | 'broken'): string {
  return `${BRAND}: ${makerName} called their vow ${verdict} themselves. Nothing for you to rule.${OPT_OUT}`;
}

export function vowVoidedMessage(makerName: string): string {
  return `${BRAND}: ${makerName} withdrew their vow. Nothing for you to judge.${OPT_OUT}`;
}
