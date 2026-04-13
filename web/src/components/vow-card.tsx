'use client';
import { Check, X, Clock, AlertCircle, Eye, Ban } from 'lucide-react';
import { RitualCard } from '@/components/ui';
import type { Database } from '@/lib/types';

type VowRow = Database['public']['Tables']['vows']['Row'];

interface VowCardProps {
  vow: VowRow;
  role: 'maker' | 'witness' | 'target';
  onTap?: () => void;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
}

function getStatusDisplay(vow: VowRow, role: string) {
  if (role === 'target' && vow.challenge_status === 'pending') {
    return { label: 'Challenge received', color: '#F59E0B', icon: AlertCircle, pulse: false };
  }
  if (vow.vow_type === 'challenge' && vow.challenge_status === 'pending' && role === 'maker') {
    return { label: 'Waiting for response', color: '#F59E0B', icon: Clock, pulse: false };
  }
  if (vow.status === 'active' && !vow.witness_accepted_at && vow.witness_name !== 'Just me') {
    return { label: 'Witness pending', color: '#60A5FA', icon: Clock, pulse: false };
  }
  if (vow.status === 'active' || vow.status === 'sealed') {
    return { label: 'Active', color: 'var(--success)', icon: null, pulse: false };
  }
  if (vow.status === 'awaiting_verdict') {
    return { label: 'Verdict due', color: '#F59E0B', icon: AlertCircle, pulse: true };
  }
  if (vow.status === 'kept') {
    return { label: 'Kept', color: 'var(--success)', icon: Check, pulse: false };
  }
  if (vow.status === 'broken') {
    return { label: 'Broken', color: 'var(--danger)', icon: X, pulse: false };
  }
  if (vow.status === 'voided') {
    return { label: 'Withdrawn', color: 'var(--text-muted)', icon: Ban, pulse: false };
  }
  return { label: vow.status, color: 'var(--text-muted)', icon: null, pulse: false };
}

function getCountdownText(endsAt: string | null | undefined) {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    const ago = Math.abs(diff);
    const hoursAgo = Math.floor(ago / (1000 * 60 * 60));
    if (hoursAgo < 1) return `Ended ${Math.floor(ago / (1000 * 60))}m ago`;
    if (hoursAgo < 24) return `Ended ${hoursAgo}h ago`;
    return `Ended ${Math.floor(hoursAgo / 24)}d ago`;
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 7) return `${days} days left`;
  if (days >= 1) {
    const remainHours = hours - days * 24;
    return `${days} days, ${remainHours} hours left`;
  }
  if (hours >= 1) {
    const remainMin = minutes - hours * 60;
    return `${hours} hours, ${remainMin} minutes left`;
  }
  return `${minutes} minutes left`;
}

function getProgressInfo(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) return { pct: 0, color: '#D4A24F' };
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return { pct: 100, color: '#EF4444' };
  const pct = Math.min(100, Math.max(0, ((now - start) / total) * 100));
  const color = pct < 50 ? '#D4A24F' : pct < 80 ? '#F59E0B' : '#EF4444';
  return { pct, color };
}

export default function VowCard({ vow, role, onTap, onAcceptChallenge, onDeclineChallenge }: VowCardProps) {
  const status = getStatusDisplay(vow, role);
  const countdown = getCountdownText(vow.ends_at);
  const progress = getProgressInfo(vow.starts_at, vow.ends_at);
  const isTerminal = ['kept', 'broken', 'voided'].includes(vow.status);
  const isActive = vow.status === 'active' || vow.status === 'sealed' || vow.status === 'awaiting_verdict';
  const showProgress = !isTerminal && vow.starts_at && vow.ends_at;
  const showChallenge = role === 'target' && vow.challenge_status === 'pending';

  const stakeLabel = vow.stake_amount > 0 ? `$${Math.round(vow.stake_amount / 100)} stake` : 'no stake';
  const personLabel = role === 'maker'
    ? (vow.vow_type === 'challenge' ? 'Challenge sent' : `Witness: ${vow.witness_name}`)
    : role === 'witness'
    ? 'You\'re witnessing'
    : `By ${vow.witness_name || 'someone'}`;

  // State-driven visual weight
  const cardStyle: React.CSSProperties = isActive
    ? {
        backgroundColor: 'rgba(212,162,79,0.06)',
        border: '1.5px solid rgba(212,162,79,0.35)',
        boxShadow: '0 8px 24px rgba(212,162,79,0.12), 0 16px 28px rgba(0,0,0,0.26)',
      }
    : isTerminal
    ? {
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
        opacity: vow.status === 'voided' ? 0.6 : vow.status === 'broken' ? 0.7 : 0.85,
      }
    : {};

  return (
    <div onClick={onTap} className={onTap ? 'cursor-pointer transition-transform active:scale-[0.98]' : ''}>
      <RitualCard style={cardStyle}>
        {/* Status row */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${status.pulse ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: status.color }}
          />
          <span className="text-[11px] font-bold tracking-[1px] uppercase" style={{ color: status.color }}>
            {status.label}
          </span>
          {role !== 'maker' && (
            <div className="ml-auto flex items-center gap-1">
              <Eye className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {role === 'witness' ? 'Witnessing' : 'Target'}
              </span>
            </div>
          )}
        </div>

        {/* Vow text */}
        <p
          className="text-[15px] font-serif font-medium leading-[21px] line-clamp-2"
          style={{ color: 'var(--text)' }}
        >
          {vow.refined_text}
        </p>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%`, backgroundColor: progress.color }}
            />
          </div>
        )}

        {/* Countdown + meta */}
        <div className="flex items-center justify-between">
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {!isTerminal && countdown ? countdown : personLabel}
          </span>
          <span className="text-[12px] font-semibold" style={{ color: vow.stake_amount > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>
            {stakeLabel}
          </span>
        </div>

        {isTerminal && countdown && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{countdown}</span>
        )}

        {/* Challenge accept/decline buttons */}
        {showChallenge && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onAcceptChallenge?.(); }}
              className="flex-1 min-h-[40px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              }}
            >
              <span className="text-[13px] font-bold" style={{ color: '#0B0D11' }}>Accept</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeclineChallenge?.(); }}
              className="flex-1 min-h-[40px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
              style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            >
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Decline</span>
            </button>
          </div>
        )}
      </RitualCard>
    </div>
  );
}
