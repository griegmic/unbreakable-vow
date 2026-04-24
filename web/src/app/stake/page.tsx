'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Heart, Users, Flame } from 'lucide-react';
import { RitualScreen, FrauncesH1, FrauncesSub, GoldCTA, MutedSecondary, RitualCard, ChoicePill } from '@/components/primitives';
import { useVowFlow } from '@/providers/vow-flow';
import { stakeAmounts, charities, antiCauses, consequenceOptions, inferDeadline } from '@/lib/vow-logic';

/**
 * S3 · Stake — §3.5
 *
 * Stake amount selection, consequence type (charity/anti), destination,
 * and deadline picker. All state writes to useVowFlow provider.
 * Zero Stripe SDK calls — payment happens on /seal.
 */

const consequenceIcons = { charity: Heart, witness: Users, anti: Flame };

const amountHints: Record<number, string> = {
  10: 'A nudge',
  25: 'Enough to sting',
  50: 'You mean business',
  100: 'Dead serious',
};

const DEADLINE_PRESETS = [
  { label: 'This Friday', days: () => { const d = new Date(); const diff = 5 - d.getDay(); return diff <= 0 ? diff + 7 : diff; } },
  { label: 'End of week', days: () => { const d = new Date(); const diff = 7 - d.getDay(); return diff === 0 ? 7 : diff; } },
  { label: 'In 7 days', days: () => 7 },
  { label: 'Pick date', days: () => -1 },
];

// Screen-local section label
function SectionLabel({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.18em', textTransform: 'uppercase' as const,
      color: 'var(--uv-text-dim)',
    }}>
      {children}
    </span>
  );
}

export default function StakePage() {
  const router = useRouter();
  const { vow, activeVowText, setStake, updateConsequence, setDeadline } = useVowFlow();

  const [deadlineLabel, setDeadlineLabel] = useState('In 7 days');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Check if vow text already implies a deadline
  const inferredDeadline = useMemo(() => inferDeadline(activeVowText), [activeVowText]);
  const needsDeadlinePicker = !inferredDeadline;

  // Set inferred deadline on mount or when text changes
  useEffect(() => {
    if (inferredDeadline) {
      setDeadline(inferredDeadline.toISOString());
    }
  }, [inferredDeadline, setDeadline]);

  // Compute end date from picker selection
  const pickedEndDate = useMemo(() => {
    if (showCustomDate && customDate) {
      return new Date(customDate + 'T23:59:59');
    }
    const preset = DEADLINE_PRESETS.find((p) => p.label === deadlineLabel);
    if (!preset) return null;
    const days = preset.days();
    if (days === -1) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 0);
    return d;
  }, [deadlineLabel, customDate, showCustomDate]);

  // Persist picked deadline to flow state
  useEffect(() => {
    if (needsDeadlinePicker && pickedEndDate) {
      setDeadline(pickedEndDate.toISOString());
    }
  }, [needsDeadlinePicker, pickedEndDate, setDeadline]);

  const handleDeadlineSelect = (label: string) => {
    setDeadlineLabel(label);
    if (label === 'Pick date') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomDate('');
    }
  };

  useEffect(() => {
    if (!vow.rawInput) {
      try {
        const stored = localStorage.getItem('unbreakable-vow-flow');
        if (stored && JSON.parse(stored).rawInput) return;
      } catch {}
      router.replace('/');
    }
  }, [vow.rawInput, router]);

  const handleAmountSelect = (amount: number) => {
    setStake({ ...vow.stake, amount });
  };

  const destinations = vow.stake.consequence === 'charity' ? charities : vow.stake.consequence === 'anti' ? antiCauses : [];

  return (
    <RitualScreen variant="utility">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
        {/* Back */}
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            background: 'none', border: 'none',
            color: 'var(--uv-text-muted)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--uv-font-sans)',
            padding: '4px 0', alignSelf: 'flex-start',
          }}
        >
          &larr; Back
        </button>

        <FrauncesH1 italic size="page">Set the stakes.</FrauncesH1>
        <FrauncesSub>Pick an amount that&apos;ll keep you honest.</FrauncesSub>

        {/* Stake amount grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {stakeAmounts.map((amount) => {
            const active = vow.stake.amount === amount;
            return (
              <button
                key={amount}
                onClick={() => handleAmountSelect(amount)}
                style={{
                  borderRadius: 18, padding: '20px 0',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-card)',
                  border: `1.5px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                  boxShadow: active ? '0 0 20px var(--uv-gold-selected-shadow)' : 'none',
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                <span style={{
                  fontSize: 20, fontWeight: 700,
                  color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text)',
                }}>
                  ${amount}
                </span>
                <span style={{
                  fontSize: 10, marginTop: 2,
                  color: active ? 'var(--uv-gold)' : 'var(--uv-text-muted)',
                }}>
                  {amountHints[amount]}
                </span>
              </button>
            );
          })}
        </div>

        {/* $0 escape hatch */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -4 }}>
          <button
            onClick={() => handleAmountSelect(0)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500,
              padding: '4px 0',
              color: vow.stake.amount === 0 ? 'var(--uv-gold)' : 'var(--uv-text-muted)',
            }}
          >
            {vow.stake.amount === 0 ? '✓ Free vow — just my word' : 'or make a free vow'}
          </button>
        </div>

        {/* Consequence type selector */}
        {vow.stake.amount > 0 && (
          <>
            <SectionLabel>IF YOU BREAK IT</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {consequenceOptions.map((option) => {
                const Icon = consequenceIcons[option.id];
                const active = vow.stake.consequence === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      const dest = option.id === 'charity' ? charities[0] : option.id === 'anti' ? antiCauses[0] : '';
                      updateConsequence(option.id, dest);
                    }}
                    style={{
                      borderRadius: 18, padding: 16,
                      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-card)',
                      border: `1.5px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-elevated)',
                    }}>
                      <Icon style={{ width: 20, height: 20, color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)' }} />
                    </div>
                    <div>
                      <span style={{
                        fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 600,
                        display: 'block', color: active ? 'var(--uv-text)' : 'var(--uv-text-muted)',
                      }}>
                        {option.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                        color: 'var(--uv-text-muted)',
                      }}>
                        {option.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Destination picker */}
        {vow.stake.amount > 0 && destinations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>CHOOSE A CAUSE</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {destinations.map((dest) => {
                const active = vow.stake.destination === dest;
                return (
                  <button
                    key={dest}
                    onClick={() => updateConsequence(vow.stake.consequence, dest)}
                    style={{
                      padding: '11px 14px', borderRadius: 9999,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-card)',
                      border: `1px solid ${active ? 'var(--uv-border-strong)' : 'var(--uv-border)'}`,
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500,
                      color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                    }}>
                      {dest}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Deadline picker — only shown when vow text doesn't imply one */}
        {needsDeadlinePicker && (
          <RitualCard>
            <SectionLabel>Deadline</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DEADLINE_PRESETS.map((p) => (
                <ChoicePill
                  key={p.label}
                  label={p.label}
                  active={deadlineLabel === p.label}
                  onPress={() => handleDeadlineSelect(p.label)}
                />
              ))}
            </div>
            {showCustomDate && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 12,
                  fontFamily: 'var(--uv-font-sans)', fontSize: 15,
                  color: 'var(--uv-text)', background: 'transparent',
                  border: '1px solid var(--uv-border)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
            {pickedEndDate && (
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-text-muted)', margin: 0,
              }}>
                Ends {pickedEndDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            )}
          </RitualCard>
        )}

        {/* CTAs */}
        <GoldCTA
          label={vow.stake.amount > 0 ? `Confirm $${vow.stake.amount} stake` : 'Continue'}
          onPress={() => router.push('/witness')}
        />
        <MutedSecondary label="Back" onPress={() => router.back()} />
      </div>
    </RitualScreen>
  );
}
