'use client';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { SortedVow, CardState, DashboardVow } from '@/lib/dashboard-sort';
import { getCountdownText, getProgressInfo, getStakeLabel, getDayProgress } from '@/lib/dashboard-sort';
import { FadeUp } from '@/components/ui';

interface DashboardHeroProps {
  item: SortedVow;
  keptCount: number;
  streak: number;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
}

// --- Progress bar (hero = 6px, gradient) ---

function getHeroProgressBar(startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return { pct: 100, gradient: 'linear-gradient(90deg, #FB923C, #EF4444)' };
  const pct = Math.min(100, Math.max(0, ((now - start) / total) * 100));
  const gradient = pct >= 100
    ? 'linear-gradient(90deg, #FB923C, #EF4444)'
    : 'linear-gradient(90deg, #d4a24f, #e8c36a)';
  return { pct, gradient };
}

// --- Countdown line helpers ---

function getLeftCountdown(state: CardState, vow: DashboardVow): string {
  const countdown = getCountdownText(vow.ends_at);
  const isTimesUp = countdown === "Time's up";
  if (isTimesUp && state === 'M1') return "Time's up — your call";
  if (isTimesUp) return "Time's up";
  const dayProgress = getDayProgress(vow.starts_at, vow.ends_at);
  return dayProgress || '';
}

function getRightCountdown(state: CardState, vow: DashboardVow): string {
  const stake = getStakeLabel(vow.stake_amount);
  const countdown = getCountdownText(vow.ends_at);
  const targetName = vow.target_display_name || (vow.target_phone ? vow.target_phone.slice(-4) : 'them');

  switch (state) {
    case 'M1': return `Just you · ${stake.text}`;
    case 'M2': return `Waiting for ${vow.witness_name}'s verdict`;
    case 'M3': return `${vow.witness_name} never accepted`;
    case 'M4': case 'M6': case 'M7': return countdown !== "Time's up" ? countdown || '' : '';
    case 'M5': return `Just you · ${stake.text}`;
    case 'M8': return '';
    case 'M9': return `Waiting on ${targetName}`;
    case 'M10': return countdown || '';
    case 'M11': return `You're judging ${targetName}`;
    case 'W1': return `By ${vow.maker_display_name || 'someone'} · ${stake.text}`;
    case 'W2': return `By ${vow.maker_display_name || 'someone'} · ${stake.text}`;
    case 'T1': return '';
    case 'T2': return `Dared by ${vow.witness_name} · ${stake.text}`;
    case 'T3': return `Dared by ${vow.witness_name}`;
  }
}

// --- Witness block ---

function WitnessBlock({ vow, state }: { vow: DashboardVow; state: CardState }) {
  const router = useRouter();
  if (vow.witness_name === 'Just me') return null;
  // Don't show witness block when user IS the witness
  if (state === 'W1' || state === 'W2') return null;
  // Don't show for target role
  if (state === 'T1' || state === 'T2' || state === 'T3') return null;

  const isAwaitingVerdict = vow.status === 'awaiting_verdict' && vow.witness_accepted_at;
  const isPending = !vow.witness_accepted_at && vow.witness_name !== 'Just me';

  return (
    <button
      onClick={() => router.push(`/vow/${vow.id}`)}
      className="w-full rounded-[14px] p-4 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
      style={{
        backgroundColor: isAwaitingVerdict ? 'rgba(251,146,60,0.06)' : 'rgba(255,255,255,0.03)',
        border: isAwaitingVerdict
          ? '1px solid rgba(251,146,60,0.25)'
          : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{
          backgroundColor: isAwaitingVerdict ? '#FB923C' : '#52d69a',
          ...(isAwaitingVerdict ? { animation: 'dot-pulse 2s infinite' } : {}),
        }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-[14px] font-semibold block" style={{ color: 'var(--text)' }}>
          {isAwaitingVerdict
            ? `${vow.witness_name} has the call`
            : isPending
              ? `${vow.witness_name} · hasn't accepted`
              : `${vow.witness_name} is watching`}
        </span>
        {!isPending && (
          <span className="text-[12px]" style={{ color: '#5a5650' }}>
            {getStakeLabel(vow.stake_amount).text} · {vow.destination || 'charity'}
          </span>
        )}
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#3a3530' }} />
    </button>
  );
}

// --- Main Hero Component ---

export default function DashboardHero({ item, keptCount, streak, onAcceptChallenge, onDeclineChallenge }: DashboardHeroProps) {
  const router = useRouter();
  const { vow, state } = item;
  const progressBar = getHeroProgressBar(vow.starts_at, vow.ends_at);
  const leftText = getLeftCountdown(state, vow);
  const rightText = getRightCountdown(state, vow);

  return (
    <>
      {/* Vow text */}
      <FadeUp delay={0.05}>
        <button
          onClick={() => router.push(`/vow/${vow.id}`)}
          className="w-full text-left transition-opacity active:opacity-80"
        >
          <p
            className="text-[24px] font-serif font-normal leading-[32px]"
            style={{ color: 'var(--text)' }}
          >
            &ldquo;{vow.refined_text}&rdquo;
          </p>
        </button>
      </FadeUp>

      {/* Progress bar (6px, gradient) */}
      {progressBar && (
        <FadeUp delay={0.08}>
          <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progressBar.pct}%`, background: progressBar.gradient }}
            />
          </div>
        </FadeUp>
      )}

      {/* Countdown line */}
      {(leftText || rightText) && (
        <FadeUp delay={0.1}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: leftText.includes("Time's up") ? '#FB923C' : '#8a8578' }}>
              {leftText}
            </span>
            <span className="text-[12px]" style={{ color: '#5a5650' }}>
              {rightText}
            </span>
          </div>
        </FadeUp>
      )}

      {/* Witness block */}
      <FadeUp delay={0.12}>
        <WitnessBlock vow={vow} state={state} />
      </FadeUp>

      {/* Spacer */}
      <div className="flex-1 min-h-[40px]" />

      {/* Primary CTA */}
      <FadeUp delay={0.15}>
        <HeroCTA
          state={state}
          vow={vow}
          onAcceptChallenge={onAcceptChallenge}
          onDeclineChallenge={onDeclineChallenge}
        />
      </FadeUp>

      {/* Secondary link */}
      {state !== 'T1' && (
        <FadeUp delay={0.18}>
          <button
            onClick={() => router.push('/create')}
            className="w-full flex items-center justify-center py-2 transition-opacity active:opacity-70"
          >
            <span className="text-[13px] font-semibold" style={{ color: '#5a5650' }}>
              Make a vow →
            </span>
          </button>
        </FadeUp>
      )}

      <style jsx>{`
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

// --- Hero CTA by state (PRD Section 4.2) ---

function HeroCTA({
  state,
  vow,
  onAcceptChallenge,
  onDeclineChallenge,
}: {
  state: CardState;
  vow: DashboardVow;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
}) {
  const router = useRouter();
  const targetName = vow.target_display_name || (vow.target_phone ? vow.target_phone.slice(-4) : 'them');

  switch (state) {
    case 'M1':
      return (
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/self-resolve?id=${vow.id}&choice=kept`)}
            className="flex-1 min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
            style={{ backgroundColor: 'rgba(82,214,154,0.15)', border: '1px solid rgba(82,214,154,0.3)' }}
          >
            <span className="text-[14px] font-extrabold" style={{ color: '#52d69a' }}>I kept it</span>
          </button>
          <button
            onClick={() => router.push(`/self-resolve?id=${vow.id}&choice=broken`)}
            className="flex-1 min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <span className="text-[14px] font-extrabold" style={{ color: '#EF4444' }}>I broke it</span>
          </button>
        </div>
      );

    case 'M2':
      return (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/create')}
            className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
          >
            <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>Make a new vow →</span>
          </button>
          <button
            onClick={() => {
              if (vow.witness_phone) window.open(`sms:${vow.witness_phone}`, '_self');
            }}
            className="w-full flex items-center justify-center py-2 transition-opacity active:opacity-70"
          >
            <span className="text-[13px] font-semibold" style={{ color: '#5a5650' }}>
              Nudge {vow.witness_name}
            </span>
          </button>
        </div>
      );

    case 'M3':
      return (
        <button
          onClick={() => router.push(`/self-resolve?id=${vow.id}`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #FB923C, #F97316)' }}
        >
          <span className="text-[14px] font-extrabold text-white">Self-resolve →</span>
        </button>
      );

    case 'M4': case 'M6': case 'M7':
      return (
        <button
          onClick={() => {
            if (vow.witness_phone) window.open(`sms:${vow.witness_phone}`, '_self');
          }}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>
            Send {vow.witness_name} a message
          </span>
        </button>
      );

    case 'M5':
      return (
        <button
          onClick={() => router.push(`/vow/${vow.id}`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>View vow</span>
        </button>
      );

    case 'M8':
      return (
        <button
          onClick={() => router.push(`/seal?id=${vow.id}`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>Seal this vow</span>
        </button>
      );

    case 'M9':
      return (
        <button
          onClick={() => {
            if (vow.target_phone) window.open(`sms:${vow.target_phone}`, '_self');
          }}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>
            Nudge {targetName}
          </span>
        </button>
      );

    case 'M10':
      return (
        <button
          onClick={() => router.push(`/vow/${vow.id}`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>View dare</span>
        </button>
      );

    case 'M11':
      return (
        <button
          onClick={() => router.push(`/vow/${vow.id}`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>Deliver verdict →</span>
        </button>
      );

    case 'W1':
      return (
        <button
          onClick={() => router.push(`/w/${vow.witness_invite_token}/verdict`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #60A5FA, #3B82F6)' }}
        >
          <span className="text-[14px] font-extrabold text-white">Deliver your verdict →</span>
        </button>
      );

    case 'W2':
      return (
        <button
          onClick={() => {
            // We need the maker's phone — not available on the vow row directly
            // Navigate to vow detail instead
            router.push(`/vow/${vow.id}`);
          }}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>
            Send {vow.maker_display_name || 'them'} a message
          </span>
        </button>
      );

    case 'T1':
      return (
        <div className="flex gap-3">
          <button
            onClick={() => onAcceptChallenge?.()}
            className="flex-1 min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
          >
            <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>Accept</span>
          </button>
          <button
            onClick={() => onDeclineChallenge?.()}
            className="flex-1 min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
            style={{ backgroundColor: '#14161c', border: '1px solid #3a3530' }}
          >
            <span className="text-[14px] font-extrabold" style={{ color: '#8a8578' }}>Decline</span>
          </button>
        </div>
      );

    case 'T2':
      return (
        <button
          onClick={() => router.push(`/vow/${vow.id}`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>View vow</span>
        </button>
      );

    case 'T3':
      return (
        <button
          onClick={() => router.push(`/vow/${vow.id}`)}
          className="w-full min-h-[52px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)' }}
        >
          <span className="text-[14px] font-extrabold" style={{ color: '#0B0D11' }}>View status</span>
        </button>
      );
  }
}
