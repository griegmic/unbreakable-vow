// ─── WITNESS-FACING SMS ───

export function sealMessage(name: string, vowText: string, amount: number, endDate: string, acceptUrl?: string): string {
  const stakeText = amount > 0
    ? `with $${amount} on the line`
    : 'accountability only — no money, just their word';

  if (acceptUrl) {
    return `${name} just made an Unbreakable Vow: "${vowText}" — ${stakeText}. You're the witness. Accept here: ${acceptUrl}`;
  }
  return `${name} just made an Unbreakable Vow: "${vowText}" — ${stakeText}. You're the witness. You'll get a link to deliver your verdict on ${endDate}.`;
}

export function witnessReminderMessage(name: string, vowText: string, acceptUrl: string): string {
  return `Reminder: ${name} is counting on you to witness their vow: "${vowText}". Accept here: ${acceptUrl}`;
}

export function warmupMessage(name: string, vowText: string): string {
  return `Reminder: ${name}'s vow "${vowText}" ends tomorrow. You'll get a verdict link soon.`;
}

export function verdictRequestMessage(name: string, vowText: string, verdictUrl: string): string {
  return `It's verdict time! Did ${name} keep their vow: "${vowText}"? Tap here to decide: ${verdictUrl}`;
}

export function outcomeMessage(name: string, verdict: string, amount: number, destination: string): string {
  if (verdict === 'kept') {
    if (amount === 0) {
      return `Verdict recorded: Kept! ${name} kept their word. Word honored.`;
    }
    return `Verdict recorded: Kept! ${name} kept their word. $${amount} refunded.`;
  }
  if (amount === 0) {
    return `Verdict recorded: Broken. ${name} broke their vow. The record stands.`;
  }
  return `Verdict recorded: Broken. ${name} broke their vow. $${amount} goes to ${destination}.`;
}

export function challengeMessage(
  challengerName: string,
  vowText: string,
  amount: number,
  endDate: string,
  acceptUrl: string
): string {
  const stakeText = amount > 0
    ? ` with $${Math.round(amount / 100)} on the line.`
    : '.';
  const vowPreview = vowText.length > 80
    ? vowText.substring(0, 77) + '...'
    : vowText;
  return `${challengerName} challenged you: "${vowPreview}"${stakeText} Accept here: ${acceptUrl}`;
}

// ─── WITNESS LIFECYCLE SMS (new) ───

export function witnessAcceptConfirmMessage(makerName: string, endDate: string): string {
  return `Locked in. We'll text you when it's time to judge ${makerName}'s vow (${endDate}). 🔒`;
}

export function witnessMidpointMessage(makerName: string): string {
  return `Midway check: how's ${makerName} doing on their vow? Send them a nudge. 👀`;
}

export function witness24hMessage(makerName: string, verdictUrl: string): string {
  return `Tomorrow's the day. ${makerName}'s vow ends and you call it. Verdict link: ${verdictUrl}`;
}

// ─── MAKER-FACING SMS (new) ───

export function makerSealConfirmMessage(): string {
  return `It's done. Your vow is sealed. No turning back now. 🔥`;
}

export function makerWitnessAcceptedMessage(witnessName: string): string {
  return `${witnessName} just accepted your vow. They're watching. 👀`;
}

export function makerMidpointMessage(witnessName: string | null): string {
  if (witnessName) {
    return `Halfway. Still standing? ${witnessName} is paying attention.`;
  }
  return `Halfway through your vow. Still standing?`;
}

export function maker24hMessage(): string {
  return `24 hours left on your vow. The finish line's right there.`;
}

export function makerVerdictTimeMessage(witnessName: string | null): string {
  if (witnessName) {
    return `Time's up. ${witnessName} is delivering the verdict...`;
  }
  return `Time's up on your vow. The verdict is coming.`;
}

export function makerOutcomeMessage(verdict: string, amount: number, destination: string): string {
  if (verdict === 'kept') {
    if (amount === 0) {
      return `You kept your word. That's what we like to see. ✊`;
    }
    return `You kept your word. $${amount} refunded. That's what we like to see. ✊`;
  }
  if (amount === 0) {
    return `Vow broken. The record stands. Next time. 💀`;
  }
  return `Vow broken. $${amount} goes to ${destination}. Next time. 💀`;
}
