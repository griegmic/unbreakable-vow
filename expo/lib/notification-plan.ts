import type { VowRow } from './vow-api';

export type NotificationPlanItem = {
  label: string;
  body: string;
  channel: 'app' | 'sms' | 'app_or_sms';
};

export function getNotificationPlan(vow: VowRow): NotificationPlanItem[] {
  const witnessName = vow.witness_name || 'Your witness';
  const stake = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)}` : 'your word';
  const isDare = vow.vow_type === 'challenge';
  const judgeName = isDare ? 'the challenger' : witnessName;

  if (vow.status === 'draft' && isDare) {
    return [
      { label: 'Now', body: 'They get the dare link by text.', channel: 'sms' },
      { label: 'Reply', body: 'You hear back when they accept, pass, or run out the clock.', channel: 'app_or_sms' },
      { label: '48 hours', body: 'No answer closes the dare cleanly.', channel: 'app_or_sms' },
    ];
  }

  if (vow.status === 'active' && !vow.witness_accepted_at && vow.witness_name !== 'Just me') {
    return [
      { label: 'Now', body: `${witnessName} has the invite. The link stays here until they answer.`, channel: 'sms' },
      { label: '24 hours', body: `If ${witnessName} has not accepted, you get one clean recovery nudge.`, channel: 'app_or_sms' },
      { label: 'Accepted', body: `${witnessName} is locked in as witness and your dashboard switches to active.`, channel: 'app_or_sms' },
      { label: 'Deadline', body: `If ${witnessName} never accepts, you can self-resolve instead of waiting forever.`, channel: 'app_or_sms' },
    ];
  }

  if (vow.status === 'active') {
    const witnessLine = vow.witness_name === 'Just me'
      ? 'You will decide this one yourself at the deadline.'
      : `${witnessName} gets a 24-hour heads-up and the verdict link at the deadline.`;
    return [
      { label: 'Day 1', body: 'Longer vows get one early pulse while motivation is still fresh.', channel: 'app_or_sms' },
      { label: '24 hours left', body: `${stake} is still on the line. Finish clean.`, channel: 'app_or_sms' },
      { label: 'Verdict time', body: witnessLine, channel: vow.witness_name === 'Just me' ? 'app' : 'sms' },
    ];
  }

  if (vow.status === 'awaiting_verdict') {
    const witnessAccepted = Boolean(vow.witness_accepted_at) || vow.witness_name === 'Just me' || isDare;
    return [
      { label: 'Now', body: witnessAccepted ? `${judgeName} has the verdict link. Your dashboard keeps this vow open.` : `${witnessName} never accepted. Open this vow and make the call yourself.`, channel: 'app_or_sms' },
      { label: 'Open loop', body: 'The verdict stays visible until someone makes the call.', channel: 'app' },
      { label: '72 hours after deadline', body: 'No verdict means the vow auto-resolves as kept.', channel: 'app_or_sms' },
    ];
  }

  if (vow.status === 'kept' || vow.status === 'broken') {
    const audience = isDare ? 'You and the challenger' : vow.witness_name === 'Just me' ? 'You' : `You and ${witnessName}`;
    return [
      { label: 'Outcome', body: vow.status === 'kept' ? `${audience} get the kept receipt.` : `${stake} moves to ${vow.destination}. The same record stays visible.`, channel: 'app_or_sms' },
      { label: 'Archive', body: 'The vow stays in history as proof.', channel: 'app' },
    ];
  }

  return [
    { label: 'Receipt', body: 'Your dashboard is the home base for this vow.', channel: 'app' },
    { label: 'Recovery', body: 'If someone stalls, the open loop stays visible.', channel: 'app_or_sms' },
  ];
}

export function channelLabel(channel: NotificationPlanItem['channel']) {
  if (channel === 'sms') return 'Text';
  if (channel === 'app_or_sms') return 'App or text';
  return 'App';
}
