'use client';

import React from 'react';
import { RitualScreen, GoldCTA } from '@/components/primitives';
import { ChevronLeft } from 'lucide-react';

interface StakesStepProps {
  stakeAmount: number;
  setStakeAmount: (amount: number) => void;
  destination: string;
  destinationKind: 'charity' | 'anti';
  onIfBroken: () => void;
  onNext: () => void;
  onBack: () => void;
  vowText: string;
  witnessName: string;
  endsAt: Date | null;
  judgeLinkState?: 'idle' | 'working' | 'shared' | 'copied' | 'error';
  judgeLinkTermsChanged?: boolean;
  judgeLinkMessage?: string;
  onSendJudgeLink?: () => void;
  onSkipJudgeLink?: () => void;
}

const AMOUNTS = [10, 25, 50, 100];

function getTag(amount: number): string {
  if (amount <= 5) return 'just testing the waters.';
  if (amount <= 10) return 'a nudge.';
  if (amount <= 25) return 'a real stake.';
  if (amount <= 50) return 'a real stake.';
  return 'all in.';
}

export function StakesStep({
  stakeAmount,
  setStakeAmount,
  destination,
  onIfBroken,
  onNext,
  onBack,
  vowText,
  witnessName,
  endsAt,
  judgeLinkState = 'idle',
  judgeLinkTermsChanged = false,
  judgeLinkMessage,
  onSendJudgeLink,
  onSkipJudgeLink,
}: StakesStepProps) {
  const deadlineLabel = endsAt
    ? `Ends ${endsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
    : '';
  const witnessLabel = witnessName && witnessName !== 'TBD'
    ? `${witnessName} judging`
    : '';
  const metaParts = [deadlineLabel, witnessLabel].filter(Boolean).join(' · ');

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '50%',
              background: 'transparent', border: 'none',
              cursor: 'pointer', marginLeft: -6,
            }}
          >
            <ChevronLeft size={18} color="var(--uv-text-dim)" />
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 6, marginLeft: 12, marginRight: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < 2 ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
              }} />
            ))}
          </div>
        </div>

        {/* Your vow recap — left gold bar */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 28,
          paddingLeft: 12,
          borderLeft: '3px solid var(--uv-gold-deep)',
        }}>
          <div>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500,
              letterSpacing: '2px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)',
              display: 'block', marginBottom: 4,
            }}>
              YOUR VOW
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 16, fontWeight: 500,
              color: 'var(--uv-text)', display: 'block', lineHeight: 1.3,
            }}>
              {vowText}
            </span>
            {metaParts && (
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                color: 'var(--uv-text-faint)', display: 'block', marginTop: 3,
              }}>
                {metaParts}
              </span>
            )}
          </div>
        </div>

        {/* Hero */}
        <h1 style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 26, fontWeight: 600,
          color: 'var(--uv-text)', margin: '0 0 4px', lineHeight: 1.15,
        }}>
          Put money on it.
        </h1>
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 14,
          color: 'var(--uv-text-dim)', margin: '0 0 24px',
        }}>
          You get it back if you keep your word.
        </p>

        {/* Big amount + tag */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 28,
        }}>
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 64, fontWeight: 600,
            color: 'var(--uv-gold)', lineHeight: 1, letterSpacing: '-2px',
          }}>
            ${stakeAmount}
          </span>
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 16,
            fontStyle: 'italic', color: 'var(--uv-text-dim)',
            lineHeight: 1.2,
          }}>
            {getTag(stakeAmount)}
          </span>
        </div>

        {/* Amount pills — big, tappable */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {AMOUNTS.map(amt => {
            const active = stakeAmount === amt;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setStakeAmount(amt)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '14px 0', minHeight: 48,
                  background: active ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                  border: `1.5px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                  borderRadius: 12, cursor: 'pointer',
                  transition: 'all 150ms',
                  boxShadow: active ? '0 0 12px var(--uv-gold-selected-shadow)' : 'none',
                }}
              >
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 16, fontWeight: 600,
                  color: active ? 'var(--uv-gold)' : 'var(--uv-text-muted)',
                }}>
                  ${amt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Trust + destination block */}
        <div style={{ marginBottom: 0 }}>
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 14,
            fontStyle: 'italic', color: 'var(--uv-success)',
            margin: '0 0 8px', lineHeight: 1.4,
          }}>
            Keep it and every cent stays yours.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: 'var(--uv-text-muted)',
            }}>
              Break it and ${stakeAmount} goes to
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: 'var(--uv-text)', fontWeight: 500,
            }}>
              {destination}.
            </span>
          </div>
          <button
            type="button"
            onClick={onIfBroken}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
              fontFamily: 'var(--uv-font-sans)', fontSize: 13,
              color: 'var(--uv-gold)', marginTop: 2,
            }}
          >
            change
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        {onSendJudgeLink && (
          <section style={{
            marginBottom: 16,
            borderRadius: 18,
            border: '1px solid var(--uv-gold-line)',
            background: 'linear-gradient(180deg, rgba(215,169,70,0.12), rgba(238,231,215,0.035))',
            padding: 16,
          }}>
            <div style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 10, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'var(--uv-gold)', fontWeight: 750,
              marginBottom: 7,
            }}>
              Optional judge
            </div>
            <h2 style={{
              margin: '0 0 6px', fontFamily: 'var(--uv-font-sans)', fontSize: 18,
              color: 'var(--uv-text)', fontWeight: 750, lineHeight: 1.15,
            }}>
              Send the judge link now.
            </h2>
            <p style={{
              margin: '0 0 13px', fontFamily: 'var(--uv-font-sans)', fontSize: 13.5,
              color: judgeLinkTermsChanged ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
              lineHeight: 1.35,
            }}>
              {judgeLinkTermsChanged
                ? 'Changing this creates a new judge link.'
                : 'They see the promise, stake, destination, and verdict date. It starts once you seal it.'}
            </p>
            {judgeLinkMessage && (
              <p style={{
                margin: '0 0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 12.5,
                color: judgeLinkState === 'error' ? 'var(--uv-danger)' : 'var(--uv-success)',
                lineHeight: 1.3,
              }}>
                {judgeLinkMessage}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 9 }}>
              <button
                type="button"
                onClick={onSendJudgeLink}
                disabled={judgeLinkState === 'working'}
                style={{
                  minHeight: 48,
                  borderRadius: 999,
                  border: '1px solid var(--uv-gold)',
                  background: 'rgba(215,169,70,0.16)',
                  color: 'var(--uv-gold-bright)',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: judgeLinkState === 'working' ? 'wait' : 'pointer',
                }}
              >
                {judgeLinkState === 'working'
                  ? 'Preparing...'
                  : judgeLinkTermsChanged
                    ? 'Create new judge link'
                    : 'Send judge link'}
              </button>
              <button
                type="button"
                onClick={onSkipJudgeLink}
                style={{
                  minHeight: 38,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--uv-text-dim)',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 13,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Seal first, send after
              </button>
            </div>
          </section>
        )}

        {/* Fine print */}
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 12,
          fontStyle: 'italic', color: 'var(--uv-text-faint)',
          textAlign: 'center', margin: '0 0 12px',
        }}>
          No charge now. Only if you break it.
        </p>

        {/* CTA */}
        <GoldCTA label={`Seal my vow — $${stakeAmount} →`} onPress={onNext} />
      </div>
    </RitualScreen>
  );
}
