'use client';
import { ChevronRight } from 'lucide-react';
import type { SortedVow, CardState, DashboardVow } from '@/lib/dashboard-sort';
import { getCountdownText, getProgressInfo, getStakeLabel } from '@/lib/dashboard-sort';

interface DashboardCardProps {
  item: SortedVow;
  onTap: () => void;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
}

// --- Card visual styles (PRD Section 5.3) ---

const CARD_STYLES: Record<string, React.CSSProperties> = {
  'c-urgent': {
    backgroundColor: 'rgba(251,146,60,0.07)',
    border: '1.5px solid rgba(251,146,60,0.32)',
    boxShadow: '0 0 16px rgba(251,146,60,0.08)',
  },
  'c-action-blue': {
    backgroundColor: 'rgba(96,165,250,0.07)',
    border: '1.5px solid rgba(96,165,250,0.3)',
    boxShadow: '0 0 16px rgba(96,165,250,0.08)',
  },
  'c-waiting': {
    backgroundColor: 'rgba(251,146,60,0.04)',
    border: '1.5px solid rgba(251,146,60,0.2)',
    borderLeft: '3px solid rgba(251,146,60,0.4)',
  },
  'c-active': {
    backgroundColor: 'rgba(212,162,79,0.05)',
    border: '1.5px solid rgba(212,162,79,0.28)',
  },
  'c-witness': {
    backgroundColor: 'rgba(96,165,250,0.04)',
    border: '1.5px solid rgba(96,165,250,0.18)',
    borderLeft: '3px solid rgba(96,165,250,0.3)',
  },
  'c-pending': {
    backgroundColor: 'rgba(212,162,79,0.03)',
    border: '1.5px solid rgba(212,162,79,0.15)',
    opacity: 0.75,
  },
  'c-draft': {
    backgroundColor: '#12141a',
    border: '1.5px dashed #252320',
    opacity: 0.75,
  },
};

function getStyleClass(state: CardState): string {
  switch (state) {
    case 'M1': case 'M3': case 'T1': case 'M11': return 'c-urgent';
    case 'W1': return 'c-action-blue';
    case 'M2': case 'T3': return 'c-waiting';
    case 'M4': case 'M5': case 'M6': case 'M7': case 'M10': case 'T2': return 'c-active';
    case 'W2': return 'c-witness';
    case 'M9': return 'c-pending';
    case 'M8': return 'c-draft';
  }
}

// --- Status label ---

function getStatusLabel(state: CardState, vow: DashboardVow): { label: string; color: string } {
  switch (state) {
    case 'M1': return { label: 'Your call', color: '#FB923C' };
    case 'M2': return { label: 'Awaiting verdict', color: '#FB923C' };
    case 'M3': return { label: 'Unwitnessed', color: '#FB923C' };
    case 'M4': case 'M5': case 'M6': case 'M7': case 'M10':
      return { label: 'Active', color: '#52d69a' };
    case 'M8': return { label: 'Draft', color: '#5a5650' };
    case 'M9': return { label: 'Dare sent', color: '#8a8578' };
    case 'M11': return { label: 'Your call', color: '#FB923C' };
    case 'W1': return { label: 'You judge', color: '#60A5FA' };
    case 'W2': return { label: 'Witnessing', color: '#60A5FA' };
    case 'T1': return { label: `Dare from ${vow.witness_name}`, color: '#FB923C' };
    case 'T2': return { label: 'Your dare', color: '#52d69a' };
    case 'T3': return { label: "Time's up", color: '#FB923C' };
  }
}

// --- Dot config ---

function getDotConfig(state: CardState): { color: string; pulse: boolean } {
  switch (state) {
    case 'M1': case 'M2': case 'M3': case 'M11': case 'T3':
      return { color: '#FB923C', pulse: true };
    case 'T1':
      return { color: '#FB923C', pulse: false };
    case 'W1':
      return { color: '#60A5FA', pulse: true };
    case 'W2':
      return { color: '#60A5FA', pulse: false };
    case 'M4': case 'M5': case 'M6': case 'M7': case 'M10': case 'T2':
      return { color: '#52d69a', pulse: false };
    case 'M8':
      return { color: '#5a5650', pulse: false };
    case 'M9':
      return { color: '#8a8578', pulse: false };
  }
}

// --- Time text ---

function getTimeText(state: CardState, vow: DashboardVow): { text: string; color: string } | null {
  if (state === 'M8' || state === 'M9' || state === 'T1') return null;
  const countdown = getCountdownText(vow.ends_at);
  if (!countdown) return null;
  const isUrgent = countdown === "Time's up";
  return { text: countdown, color: isUrgent ? '#FB923C' : '#8a8578' };
}

// --- Meta line ---

function getMetaLine(state: CardState, vow: DashboardVow): { text: string; color: string } | null {
  const stake = getStakeLabel(vow.stake_amount);
  const targetName = vow.target_display_name || (vow.target_phone ? vow.target_phone.slice(-4) : 'them');

  switch (state) {
    case 'M1': return null; // buttons replace meta
    case 'M2': return { text: `${vow.witness_name} deciding`, color: '#5a5650' };
    case 'M3': return { text: `${vow.witness_name} never accepted`, color: '#FB923C' };
    case 'M4': return { text: `${vow.witness_name} · watching`, color: '#5a5650' };
    case 'M5': return { text: `Just you · ${stake.text}`, color: '#5a5650' };
    case 'M6': return { text: `${vow.witness_name} · hasn't accepted`, color: '#FB923C' };
    case 'M7': {
      if (vow.witness_name === 'Just me') return { text: `Just you · ${stake.text}`, color: '#5a5650' };
      if (vow.witness_accepted_at) return { text: `${vow.witness_name} · watching`, color: '#5a5650' };
      return { text: `${vow.witness_name} · hasn't accepted`, color: '#FB923C' };
    }
    case 'M8': {
      const isSolo = vow.witness_name === 'Just me';
      if (isSolo || !vow.witness_name) return { text: 'Tap to seal →', color: '#d4a24f' };
      if (vow.witness_accepted_at) return { text: `${vow.witness_name} accepted · Seal it →`, color: '#52d69a' };
      if (vow.witness_declined) return { text: `${vow.witness_name} declined · Tap to seal →`, color: '#FB923C' };
      return { text: `${vow.witness_name} invited · Tap to seal →`, color: '#d4a24f' };
    }
    case 'M9': return { text: `Waiting on ${targetName}`, color: '#5a5650' };
    case 'M10': return { text: `Dared ${targetName} · watching`, color: '#5a5650' };
    case 'M11': return { text: `You're judging ${targetName}`, color: '#5a5650' };
    case 'W1': return { text: `By ${vow.maker_display_name || 'someone'} · ${stake.text}`, color: '#5a5650' };
    case 'W2': return { text: `By ${vow.maker_display_name || 'someone'} · ${stake.text}`, color: '#5a5650' };
    case 'T1': return null; // buttons replace meta
    case 'T2': return { text: `Dared by ${vow.witness_name} · ${stake.text}`, color: '#5a5650' };
    case 'T3': return { text: `Dared by ${vow.witness_name}`, color: '#5a5650' };
  }
}

// --- Has chevron ---

function hasChevron(state: CardState): boolean {
  switch (state) {
    case 'M2': case 'M4': case 'M5': case 'M6': case 'M7':
    case 'M9': case 'M10': case 'W2': case 'T2': case 'T3':
      return true;
    default:
      return false;
  }
}

// --- Has action buttons ---

function hasActionButtons(state: CardState): boolean {
  return state === 'M1' || state === 'M3' || state === 'M11' || state === 'W1' || state === 'T1';
}

// --- Show progress bar ---

function shouldShowProgress(state: CardState, vow: DashboardVow): boolean {
  if (state === 'M8' || state === 'M9' || state === 'T1') return false;
  return !!(vow.starts_at && vow.ends_at);
}

// --- Render ---

export default function DashboardCard({ item, onTap, onAcceptChallenge, onDeclineChallenge }: DashboardCardProps) {
  const { vow, state } = item;
  const styleClass = getStyleClass(state);
  const cardStyle = CARD_STYLES[styleClass];
  const status = getStatusLabel(state, vow);
  const dot = getDotConfig(state);
  const time = getTimeText(state, vow);
  const meta = getMetaLine(state, vow);
  const showChevron = hasChevron(state);
  const showButtons = hasActionButtons(state);
  const showProgress = shouldShowProgress(state, vow);
  const progress = showProgress ? getProgressInfo(vow.starts_at, vow.ends_at) : null;

  return (
    <div
      onClick={onTap}
      className="cursor-pointer transition-transform active:scale-[0.98]"
    >
      <div
        className="rounded-[16px] p-[14px] flex flex-col gap-[7px]"
        style={cardStyle}
      >
        {/* c-top: dot + label + time + chevron */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: dot.color,
              ...(dot.pulse ? { animation: 'dot-pulse 2s infinite' } : {}),
            }}
          />
          <span
            className="text-[11px] font-bold tracking-[0.7px] uppercase"
            style={{ color: status.color }}
          >
            {status.label}
          </span>
          {time && (
            <span className="ml-auto text-[12px] font-semibold shrink-0" style={{ color: time.color }}>
              {time.text}
            </span>
          )}
          {showChevron && !time && <span className="ml-auto" />}
          {showChevron && (
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#3a3530' }} />
          )}
        </div>

        {/* c-txt: vow text */}
        <p
          className="text-[15px] font-serif font-medium leading-[21px] line-clamp-2"
          style={{ color: 'var(--text)' }}
        >
          {vow.refined_text}
        </p>

        {/* c-bar: progress bar */}
        {progress && (
          <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progress.pct}%`, backgroundColor: progress.color }}
            />
          </div>
        )}

        {/* c-bot: meta line */}
        {meta && (
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: meta.color }}>
              {meta.text}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {state === 'M1' && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); window.location.href = `/self-resolve?id=${vow.id}&choice=kept`; }}
              className="flex-1 min-h-[44px] rounded-[12px] flex items-center justify-center transition-transform active:scale-[0.97]"
              style={{ backgroundColor: 'rgba(82,214,154,0.15)', border: '1px solid rgba(82,214,154,0.3)' }}
            >
              <span className="text-[13px] font-bold" style={{ color: '#52d69a' }}>Kept ✓</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); window.location.href = `/self-resolve?id=${vow.id}&choice=broken`; }}
              className="flex-1 min-h-[44px] rounded-[12px] flex items-center justify-center transition-transform active:scale-[0.97]"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <span className="text-[13px] font-bold" style={{ color: '#EF4444' }}>Broken ✗</span>
            </button>
          </div>
        )}

        {state === 'M3' && (
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `/self-resolve?id=${vow.id}`; }}
            className="w-full min-h-[44px] rounded-[12px] flex items-center justify-center mt-1 transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #FB923C, #F97316)' }}
          >
            <span className="text-[13px] font-bold text-white">Self-resolve →</span>
          </button>
        )}

        {state === 'M11' && (
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `/vow/${vow.id}`; }}
            className="w-full min-h-[44px] rounded-[12px] flex items-center justify-center mt-1 transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
          >
            <span className="text-[13px] font-bold" style={{ color: '#0B0D11' }}>Deliver verdict →</span>
          </button>
        )}

        {state === 'W1' && (
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `/w/${vow.witness_invite_token}/verdict`; }}
            className="w-full min-h-[44px] rounded-[12px] flex items-center justify-center mt-1 transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #60A5FA, #3B82F6)' }}
          >
            <span className="text-[13px] font-bold text-white">Deliver your verdict →</span>
          </button>
        )}

        {state === 'T1' && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onAcceptChallenge?.(); }}
              className="flex-1 min-h-[44px] rounded-[12px] flex items-center justify-center transition-transform active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
            >
              <span className="text-[13px] font-bold" style={{ color: '#0B0D11' }}>Accept</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeclineChallenge?.(); }}
              className="flex-1 min-h-[44px] rounded-[12px] flex items-center justify-center transition-transform active:scale-[0.97]"
              style={{ backgroundColor: '#14161c', border: '1px solid #3a3530' }}
            >
              <span className="text-[13px] font-semibold" style={{ color: '#8a8578' }}>Decline</span>
            </button>
          </div>
        )}
      </div>

      {/* Pulse animation keyframes */}
      <style jsx>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
