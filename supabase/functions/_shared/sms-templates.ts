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
