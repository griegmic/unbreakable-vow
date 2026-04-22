// ─── V6 SMS TEMPLATES ───
// Canonical source: IMPLEMENTATION-V6.md §4.3
// Rules:
// - No emoji in any template (§1.6.10)
// - No user-supplied vow text in SMS body (grammar bug prevention — §1.2)
// - Witness identity language: "witness" persistent, "judge" Sunday-verb only
// - All phone numbers must be E.164 before calling Twilio

// ─── WITNESS-FACING ───

export function sealMessage(stake: number, witnessUrl: string): string {
  if (stake === 0) {
    return `I just made a vow — hold me to it! ${witnessUrl}`;
  }
  return `I just made a vow and put $${stake} on it — hold me to it!  ${witnessUrl}`;
}

export function witnessReminderMessage(makerName: string, witnessUrl: string): string {
  return `Heads up — ${makerName} is waiting on you to confirm. Takes 5 sec: ${witnessUrl}`;
}

export function witnessAcceptConfirmMessage(makerName: string): string {
  return `You're now the witness for ${makerName}'s vow. We'll text you 2-3 times this week, then once on verdict day. That's it.`;
}

export function witness24hMessage(makerName: string): string {
  return `Heads up: ${makerName}'s vow ends tomorrow. You'll get the verdict link.`;
}

export function verdictRequestMessage(makerName: string, verdictUrl: string): string {
  return `Time to judge: did ${makerName} keep his word? One tap: ${verdictUrl}`;
}

export function outcomeMessage(makerName: string, verdict: 'kept' | 'broken', stake: number, destination: string): string {
  if (verdict === 'kept') {
    if (stake === 0) {
      return `${makerName} kept his vow. Word honored.`;
    }
    return `${makerName} kept his vow. Your $${stake} is being refunded.`;
  }
  if (stake === 0) {
    return `${makerName} broke his vow. The record stands.`;
  }
  return `${makerName} broke his vow. $${stake} is going to ${destination}.`;
}

// ─── MAKER-FACING ───

export function makerSealConfirmMessage(stake: number): string {
  if (stake === 0) {
    return `Your vow is sealed. We'll keep you posted.`;
  }
  return `Your vow is sealed. $${stake} on the line. We'll keep you posted.`;
}

export function makerWitnessAcceptedMessage(witnessName: string): string {
  return `${witnessName} just accepted. Your vow is live. Don't break it.`;
}

export function maker24hMessage(stake: number): string {
  if (stake === 0) {
    return `24 hours left on your vow.`;
  }
  return `24 hours left on your vow. $${stake} is still on the line.`;
}

export function makerVerdictTimeMessage(witnessName: string): string {
  return `Your vow ends now. ${witnessName} is delivering the verdict.`;
}

export function makerOutcomeMessage(verdict: 'kept' | 'broken', stake: number, destination: string): string {
  if (verdict === 'kept') {
    if (stake === 0) {
      return `Your word is gold. Vow kept.`;
    }
    return `Your word is gold. $${stake} is being refunded.`;
  }
  if (stake === 0) {
    return `Verdict: broken. The record stands. Make a new one when you're ready.`;
  }
  return `Verdict: broken. $${stake} is going to ${destination}. Make a new one when you're ready.`;
}

// ─── CAST / DARE — target-side ───

export function challengeMessage(challengerName: string, stake: number, acceptUrl: string): string {
  return `${challengerName} dared you to keep an oath. $${stake} is on you doing it. See: ${acceptUrl}`;
}

// ─── CAST / DARE — maker-side (the darer) ───

export function castAcceptedMessage(targetName: string): string {
  return `${targetName} accepted your dare. The clock is ticking.`;
}

export function castDeclinedMessage(targetName: string): string {
  return `${targetName} declined your dare.`;
}

export function castAutoVoidedMessage(targetName: string): string {
  return `${targetName} didn't respond in 24h. Your dare voided.`;
}

export function castVerdictDayMessage(targetName: string, verdictUrl: string): string {
  return `Time to rule on your dare to ${targetName}. Did they keep it? ${verdictUrl}`;
}

// ─── CAST — verdict outcome to target ───

export function castOutcomeMessage(makerName: string, verdict: 'kept' | 'broken', stake: number, destination: string): string {
  if (verdict === 'kept') {
    return `${makerName} ruled: kept. The dare is closed. Nothing owed.`;
  }
  return `${makerName} ruled: broken. $${stake} went to ${destination}.`;
}

// ─── REFUND RETRY OUTCOMES (maker-side) ───

export function refundSucceededMessage(stake: number): string {
  return `Good news — your $${stake} refund went through.`;
}

export function refundFailedFinalMessage(stake: number): string {
  return `Heads up: we couldn't process your $${stake} refund after several tries. We're on it — reply HELP if you need us.`;
}

// ─── SELF-RESOLVE (witness notification) ───

export function makerSelfResolvedToWitnessMessage(makerName: string, verdict: 'kept' | 'broken'): string {
  return `${makerName} called their vow ${verdict} themselves. Nothing for you to rule.`;
}
