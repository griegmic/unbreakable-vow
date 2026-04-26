import { createAuditEvent } from './audit.ts';

type SupabaseClient = {
  from: (table: string) => {
    select: (columns?: string) => any;
    insert: (values: Record<string, unknown>) => any;
    upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => any;
    update: (values: Record<string, unknown>) => any;
  };
};

export const PLATFORM_RESERVE_BPS = 1000;

export function destinationType(destination: string, consequence?: string | null) {
  if (consequence === 'anti') return 'anti_cause';
  const lower = destination.toLowerCase();
  if (lower.includes('nra') || lower.includes('peta')) return 'anti_cause';
  return destination ? 'charity' : 'manual';
}

export function settlementAmounts(grossAmount: number) {
  const platformReserveAmount = Math.round(grossAmount * PLATFORM_RESERVE_BPS / 10000);
  return {
    platformReserveAmount,
    destinationNetAmount: Math.max(0, grossAmount - platformReserveAmount),
  };
}

export async function upsertSettlement(
  supabase: SupabaseClient,
  vow: {
    id: string;
    user_id: string;
    stake_amount: number;
    currency?: string | null;
    destination: string;
    consequence?: string | null;
  },
  patch: Record<string, unknown>,
) {
  const { platformReserveAmount, destinationNetAmount } = settlementAmounts(vow.stake_amount || 0);
  const row = {
    vow_id: vow.id,
    user_id: vow.user_id,
    gross_amount: vow.stake_amount || 0,
    currency: vow.currency || 'USD',
    destination: vow.destination || 'Manual settlement',
    destination_type: destinationType(vow.destination || '', vow.consequence),
    platform_reserve_bps: PLATFORM_RESERVE_BPS,
    platform_reserve_amount: platformReserveAmount,
    destination_net_amount: destinationNetAmount,
    ...patch,
  };

  const { error } = await supabase
    .from('settlements')
    .upsert(row, { onConflict: 'vow_id' });

  if (error) throw error;
  return row;
}

export async function recordSettlementEvent(
  supabase: SupabaseClient,
  vow: { id: string },
  event: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await createAuditEvent(supabase as any, vow.id, event, 'system', null, metadata);
  } catch (err) {
    console.error(`[settlements] audit failed for ${event}:`, err);
  }
}
