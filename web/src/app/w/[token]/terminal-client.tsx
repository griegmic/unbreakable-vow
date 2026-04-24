'use client';

import { WaxSeal, FrauncesH1, FrauncesSub, GoldCTA, OutlinedGoldCTA, EyebrowTag, VowDocCard, Stamp } from '@/components/primitives';

/**
 * S19 Terminal States — status-aware witness link pages
 *
 * Variants per §3.2:
 * - outcome-resolved: witness arrives after verdict recorded (most common)
 * - declined: witness who passed returns to the link
 * - voided: maker pulled the vow before verdict
 * - expired: edge case — vow ended without verdict (cron-runner missed auto-resolve)
 *
 * Canonical source: IMPLEMENTATION-V6.md §3.2 S19
 */

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  destination: string;
  verdict: string | null;
  verdict_at: string | null;
  witness_name: string;
  ends_at: string | null;
}

interface TerminalProps {
  variant: 'outcome-resolved' | 'declined' | 'voided' | 'expired';
  makerName: string;
  makerPhone: string | null;
  vow: Vow;
  stakeDollars: number;
}

export default function WitnessTerminalClient({ variant, makerName, makerPhone, vow, stakeDollars }: TerminalProps) {
  const isKept = vow.verdict === 'kept';
  const verdictDate = vow.verdict_at
    ? new Date(vow.verdict_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--uv-bg)',
        backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(200,155,60,0.06), var(--uv-bg) 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '120px 36px 40px',
        textAlign: 'center',
      }}
    >
      {/* Wax Seal — opacity varies by terminal state */}
      <div style={{
        marginBottom: 32,
        opacity: variant === 'expired' ? 0.45 : variant === 'declined' || variant === 'voided' ? 0.55 : 1,
      }}>
        <WaxSeal
          size="lg"
          showHalo={variant === 'outcome-resolved'}
          showCheck={variant === 'outcome-resolved'}
        />
      </div>

      {/* Eyebrow */}
      <div style={{ marginBottom: 20 }}>
        {variant === 'outcome-resolved' && <EyebrowTag tone="gold">Verdict sealed</EyebrowTag>}
        {variant === 'declined' && <EyebrowTag tone="muted">You passed on this one</EyebrowTag>}
        {variant === 'voided' && <EyebrowTag tone="muted">Vow voided</EyebrowTag>}
        {variant === 'expired' && <EyebrowTag tone="muted">No verdict on record</EyebrowTag>}
      </div>

      {/* H1 — per §3.2 S19 variants, neutral pronouns per ambiguity #5 */}
      <div style={{ marginBottom: 16 }}>
        {variant === 'outcome-resolved' && (
          <FrauncesH1 italic size="page">
            {isKept ? `${makerName}\u2019s word held.` : `${makerName} broke it.`}
          </FrauncesH1>
        )}
        {variant === 'declined' && <FrauncesH1 italic size="page">You sat this one out.</FrauncesH1>}
        {variant === 'voided' && <FrauncesH1 italic size="page">{makerName} called it off.</FrauncesH1>}
        {variant === 'expired' && <FrauncesH1 italic size="page">That vow ended quietly.</FrauncesH1>}
      </div>

      {/* Sub */}
      <div style={{ marginBottom: 32, maxWidth: 320 }}>
        {variant === 'outcome-resolved' && (
          <FrauncesSub>
            {isKept
              ? `${makerName} kept the vow. Witnessed by ${vow.witness_name} on ${verdictDate}.`
              : `Witnessed by ${vow.witness_name} on ${verdictDate}. $${stakeDollars} went to ${vow.destination}.`
            }
          </FrauncesSub>
        )}
        {variant === 'declined' && (
          <FrauncesSub>{makerName} knows you declined. They found someone else, or let the vow go.</FrauncesSub>
        )}
        {variant === 'voided' && (
          <FrauncesSub>The vow was pulled before the verdict. The stake was returned. Nothing left to judge.</FrauncesSub>
        )}
        {variant === 'expired' && (
          <FrauncesSub>The verdict window closed before a decision was recorded. No outcome was sealed.</FrauncesSub>
        )}
      </div>

      {/* Vow recap card (outcome-resolved only) */}
      {variant === 'outcome-resolved' && (
        <div style={{ width: '100%', maxWidth: 340, marginBottom: 32 }}>
          <VowDocCard
            vow={vow.refined_text}
            stake={stakeDollars}
            destination={isKept ? `Returned to ${makerName}` : vow.destination}
            verdictDate={new Date(vow.verdict_at || Date.now())}
            compact
          />
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* CTAs — per §3.2 S19 variant specs */}
      {variant === 'outcome-resolved' && (
        <div style={{ width: '100%', maxWidth: 340 }}>
          <GoldCTA
            label="See the full record →"
            onPress={() => {
              // Certificate for kept, outcome for broken (per ambiguity #10)
              const dest = isKept ? `/certificate/${vow.id}` : `/outcome/${vow.id}`;
              window.location.href = dest;
            }}
          />
        </div>
      )}

      {variant === 'declined' && makerPhone && (
        <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>
          <OutlinedGoldCTA
            label={`Change of heart? Text ${makerName} →`}
            onPress={() => {
              const body = encodeURIComponent(`Hey — about that vow you asked me to witness. Still need someone?`);
              window.location.href = `sms:${encodeURIComponent(makerPhone)}&body=${body}`;
            }}
          />
        </div>
      )}

      {/* Tertiary — present on all terminal states */}
      <button
        onClick={() => { window.location.href = '/'; }}
        style={{
          marginTop: 18,
          background: 'none',
          border: 'none',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 13,
          lineHeight: 1.2,
          color: 'var(--uv-text-dim)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Make one of your own? <span style={{ color: 'var(--uv-gold)' }}>Make a vow →</span>
      </button>
    </div>
  );
}
