/**
 * WitnessChip — witness name + status dot
 *
 * Used on dashboard vow cards (meta strip, right edge).
 * Green dot = accepted. Amber dot + amber bg + "Pending" text = not yet accepted.
 *
 * Canonical source: IMPLEMENTATION-V6.md §3.4 (locked Apr 22 second pass, item 5)
 */

interface WitnessChipProps {
  status: 'accepted' | 'pending';
  name: string;
}

export function WitnessChip({ status, name }: WitnessChipProps) {
  const isAccepted = status === 'accepted';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 9999,
        background: isAccepted ? 'transparent' : 'rgba(251, 146, 60, 0.10)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 11,
        fontWeight: 500,
        color: isAccepted ? 'var(--uv-text-muted)' : 'var(--uv-warn)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isAccepted ? 'var(--uv-success)' : 'var(--uv-warn)',
          flexShrink: 0,
        }}
      />
      {name}
      {!isAccepted && <span style={{ fontSize: 10 }}>Pending</span>}
    </span>
  );
}
