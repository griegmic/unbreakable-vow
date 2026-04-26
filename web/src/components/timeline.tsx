'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FadeUp } from '@/components/ui';
import type { Database } from '@/lib/types';

type AuditEvent = Database['public']['Tables']['audit_events']['Row'];

interface TimelineProps {
  vowId: string;
  endsAt?: string | null;
  events?: AuditEvent[];
}

const eventDisplay: Record<string, { icon: string; label: (meta: Record<string, unknown>) => string }> = {
  vow_created:         { icon: '📝', label: () => 'Vow created' },
  vow_sealed:          { icon: '🔒', label: () => 'Vow sealed' },
  witness_invited:     { icon: '📩', label: () => 'Witness invited' },
  witness_accepted:    { icon: '✅', label: (m) => `${(m.witness_name as string) || 'Witness'} accepted` },
  witness_declined:    { icon: '❌', label: (m) => `${(m.witness_name as string) || 'Witness'} declined` },
  early_completion_requested: { icon: '✓', label: () => 'Early release requested' },
  challenge_sent:      { icon: '⚔️', label: () => 'Challenge sent' },
  challenge_accepted:  { icon: '✅', label: () => 'Challenge accepted' },
  challenge_declined:  { icon: '❌', label: () => 'Challenge declined' },
  check_in:            { icon: '📋', label: (m) => `Checked in: ${formatCheckInType(m.type as string)}` },
  verdict_submitted:   { icon: '⚖️', label: (m) => `Verdict: ${m.verdict as string}` },
  verdict_self_resolved: { icon: '⚖️', label: () => 'Self-resolved' },
  auto_resolved:       { icon: '⏰', label: () => 'Auto-resolved: Kept' },
  vow_voided:          { icon: '🚫', label: () => 'Vow withdrawn' },
  refund_issued:       { icon: '💰', label: () => 'Refund issued' },
  refund_failed:       { icon: '⚠️', label: () => 'Payment needs attention' },
  sms_failed:          { icon: '⚠️', label: () => 'SMS delivery failed' },
  sms_retried:         { icon: '📩', label: () => 'SMS retried' },
};

function formatCheckInType(type: string): string {
  switch (type) {
    case 'on_track': return 'On track';
    case 'struggling': return 'Struggling';
    case 'done_early': return 'Done early';
    default: return type || 'Update';
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Timeline({ vowId, endsAt, events: externalEvents }: TimelineProps) {
  const [events, setEvents] = useState<AuditEvent[]>(externalEvents || []);
  const [loading, setLoading] = useState(!externalEvents);

  useEffect(() => {
    if (externalEvents) return;

    const fetchEvents = async () => {
      const { data } = await supabase
        .from('audit_events')
        .select('*')
        .eq('vow_id', vowId)
        .order('created_at', { ascending: true });
      setEvents(data ?? []);
      setLoading(false);
    };
    fetchEvents();
  }, [vowId, externalEvents]);

  if (loading) {
    return (
      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Loading timeline...</p>
    );
  }

  const showFutureMarker = endsAt && new Date(endsAt) > new Date();

  return (
    <div className="flex flex-col gap-0 relative">
      {/* Vertical line */}
      <div
        className="absolute left-[11px] top-3 bottom-3 w-[2px]"
        style={{ backgroundColor: 'rgba(212,162,79,0.2)' }}
      />

      {events.map((event, i) => {
        const display = eventDisplay[event.event_type] || { icon: '•', label: () => event.event_type };
        const meta = (event.metadata || {}) as Record<string, unknown>;

        return (
          <FadeUp key={event.id} delay={i * 0.05}>
            <div className="flex items-start gap-3 py-2 relative">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[12px] z-10"
                style={{ backgroundColor: 'var(--surface)', border: '2px solid rgba(212,162,79,0.3)' }}
              >
                {display.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium block" style={{ color: 'var(--text)' }}>
                  {display.label(meta)}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {relativeTime(event.created_at)}
                </span>
              </div>
            </div>
          </FadeUp>
        );
      })}

      {/* Future verdict day marker */}
      {showFutureMarker && (
        <FadeUp delay={events.length * 0.05}>
          <div className="flex items-start gap-3 py-2 relative opacity-50">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[12px] z-10"
              style={{ backgroundColor: 'var(--surface)', border: '2px dashed rgba(212,162,79,0.3)' }}
            >
              ⏳
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-medium block" style={{ color: 'var(--text-secondary)' }}>
                Verdict day
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {new Date(endsAt!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </FadeUp>
      )}

      {events.length === 0 && !showFutureMarker && (
        <p className="text-[13px] py-2" style={{ color: 'var(--text-muted)' }}>No events yet.</p>
      )}
    </div>
  );
}
