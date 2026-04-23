/**
 * NeedsNowCard — amber-tinged action card for urgent witnessing + pending dares
 *
 * Lives in the "NEEDS YOU NOW" dashboard promotion zone.
 * Two kinds: witness verdict due <24h, or pending dare to accept/decline.
 *
 * Canonical source: IMPLEMENTATION-V6.md §3.4 (Section 2, locked Apr 22)
 */

'use client';

interface NeedsNowCardProps {
  kind: 'witness' | 'dare';
  makerName: string;
  vowText: string;
  stake: number;
  hoursLeft?: number;
  onPress: () => void;
}

export function NeedsNowCard({ kind, makerName, vowText, stake, hoursLeft, onPress }: NeedsNowCardProps) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%',
        padding: '14px 16px',
        borderRadius: 14,
        borderLeft: '2px solid var(--uv-warn)',
        border: '1px solid rgba(251, 146, 60, 0.15)',
        borderLeftWidth: 2,
        borderLeftColor: 'var(--uv-warn)',
        background: 'linear-gradient(180deg, rgba(241,169,60,0.08), rgba(241,169,60,0.03))',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* Maker avatar placeholder */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid var(--uv-warn)',
          background: 'var(--uv-bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--uv-warn)',
          flexShrink: 0,
        }}
      >
        {makerName.charAt(0).toUpperCase()}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 600, color: 'var(--uv-warn)' }}>
          {kind === 'witness'
            ? `${makerName}'s verdict · ${hoursLeft ?? '?'}h left`
            : `${makerName} dared you`
          }
        </div>
        <div style={{
          fontFamily: 'var(--uv-font-serif)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--uv-text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {vowText} {stake > 0 && `· $${stake}`}
        </div>
      </div>

      {/* CTA pill */}
      <div
        style={{
          padding: '6px 12px',
          borderRadius: 9999,
          background: 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold))',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--uv-text-on-gold)',
          flexShrink: 0,
        }}
      >
        {kind === 'witness' ? 'Verify →' : 'Decide →'}
      </div>
    </button>
  );
}
