'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Heart, Users, Flame } from 'lucide-react';
import { RitualScreen, FrauncesH1, FrauncesSub, GoldCTA, RitualCard, ChoicePill } from '@/components/primitives';
import { useVowFlow } from '@/providers/vow-flow';
import { stakeAmounts, charities, antiCauses, consequenceOptions, inferDeadline } from '@/lib/vow-logic';

/**
 * S3 · Stake — §3.5, rebuilt to match 03-pitch.html mock layout.
 *
 * Layout: topbar → vow card → stake tiles → destination row → below-fold features → footer CTA
 * All state writes to useVowFlow provider. Zero Stripe SDK calls.
 */

const consequenceIcons = { charity: Heart, witness: Users, anti: Flame };

const DEADLINE_PRESETS = [
  { label: 'This Friday', days: () => { const d = new Date(); const diff = 5 - d.getDay(); return diff <= 0 ? diff + 7 : diff; } },
  { label: 'End of week', days: () => { const d = new Date(); const diff = 7 - d.getDay(); return diff === 0 ? 7 : diff; } },
  { label: 'In 7 days', days: () => 7 },
  { label: 'Pick date', days: () => -1 },
];

export default function StakePage() {
  const router = useRouter();
  const { vow, activeVowText, setStake, updateConsequence, setDeadline } = useVowFlow();

  const [deadlineLabel, setDeadlineLabel] = useState('In 7 days');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [customAmountValue, setCustomAmountValue] = useState('');

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

  // Redirect guard
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
    setShowCustomAmount(false);
    setCustomAmountValue('');
    setStake({ ...vow.stake, amount });
  };

  const destinations = vow.stake.consequence === 'charity' ? charities : vow.stake.consequence === 'anti' ? antiCauses : [];

  // Format deadline for vow card meta — matches mock: "Sun, Apr 26 · 9pm"
  const deadlineDisplay = useMemo(() => {
    const d = inferredDeadline || pickedEndDate;
    if (!d) return 'Not set';
    const datePart = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const hours = d.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const h12 = hours % 12 || 12;
    const minutes = d.getMinutes();
    const timePart = minutes === 0 ? `${h12}${ampm}` : `${h12}:${String(minutes).padStart(2, '0')}${ampm}`;
    return `${datePart} · ${timePart}`;
  }, [inferredDeadline, pickedEndDate]);

  return (
    <RitualScreen variant="utility">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', paddingBottom: 24 }}>

        {/* ── (a) Topbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14, padding: '0 6px',
        }}>
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, color: 'var(--uv-text-muted)', padding: 0,
              lineHeight: 1,
            }}
          >
            &larr;
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
            color: 'var(--uv-gold)', fontWeight: 500,
            fontFamily: 'var(--uv-font-sans)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--uv-gold-bright)',
              boxShadow: '0 0 8px var(--uv-gold)',
              display: 'inline-block', flexShrink: 0,
            }} />
            Set the weight
          </div>
        </div>

        {/* ── (b) Vow card ── */}
        <div style={{ marginBottom: 22 }}>
          <RitualCard variant="ceremony">
            {/* Head row: label + edit */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 0,
            }}>
              <span style={{
                fontSize: 9.5, letterSpacing: '0.3em', textTransform: 'uppercase' as const,
                color: 'var(--uv-text-dim)', fontWeight: 500,
                fontFamily: 'var(--uv-font-sans)',
              }}>
                The Vow
              </span>
              <button
                onClick={() => router.back()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic',
                  fontSize: 12, color: 'var(--uv-gold)',
                }}
              >
                edit
              </button>
            </div>

            {/* Vow text */}
            <div style={{ marginBottom: 2 }}>
              <FrauncesH1 size="card">
                <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>I&apos;ll</em>{' '}
                {activeVowText.replace(/^I('ll|'ll| will)\s*/i, '')}
              </FrauncesH1>
            </div>

            {/* Meta row */}
            <div style={{
              display: 'flex', alignItems: 'stretch',
              borderTop: '1px solid var(--uv-border-soft)', paddingTop: 12,
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, paddingRight: 14 }}>
                <span style={{
                  fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase' as const,
                  color: 'var(--uv-text-dim)', fontWeight: 500,
                  fontFamily: 'var(--uv-font-sans)',
                }}>
                  Verdict
                </span>
                <span style={{
                  fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 14,
                  color: 'var(--uv-text)', letterSpacing: '-0.005em',
                  fontFeatureSettings: '"tnum"',
                }}>
                  {deadlineDisplay}
                </span>
              </div>
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', gap: 3,
                borderLeft: '1px solid var(--uv-border-soft)', paddingLeft: 14,
              }}>
                <span style={{
                  fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase' as const,
                  color: 'var(--uv-text-dim)', fontWeight: 500,
                  fontFamily: 'var(--uv-font-sans)',
                }}>
                  Judge
                </span>
                <span style={{
                  fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 14,
                  color: 'var(--uv-text)', letterSpacing: '-0.005em',
                }}>
                  Pick next &rarr;
                </span>
              </div>
            </div>
          </RitualCard>
        </div>

        {/* ── (c) Stake section ── */}
        <div style={{ marginBottom: 18 }}>
          {/* Section header */}
          <div style={{
            textAlign: 'center' as const,
            fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase' as const,
            color: 'var(--uv-text-dim)', fontWeight: 500,
            fontFamily: 'var(--uv-font-sans)',
            marginBottom: 14,
          }}>
            &mdash; Put weight on it &mdash;
          </div>

          {/* 4-column tile grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8, marginBottom: 12,
          }}>
            {stakeAmounts.map((amount) => {
              const active = vow.stake.amount === amount;
              return (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  style={{
                    aspectRatio: '1.05',
                    background: active
                      ? 'linear-gradient(180deg, rgba(200,155,60,0.18), rgba(200,155,60,0.08))'
                      : 'var(--uv-bg-card)',
                    border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-soft)'}`,
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--uv-font-serif)', fontWeight: 500,
                    fontVariationSettings: '"opsz" 144',
                    fontSize: 22, letterSpacing: '-0.02em',
                    color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                    fontFeatureSettings: '"tnum"',
                    cursor: 'pointer',
                    boxShadow: active
                      ? '0 0 24px rgba(200,155,60,0.18), 0 1px 0 rgba(232,182,86,0.25) inset'
                      : 'none',
                    transition: 'all 150ms',
                    padding: 0,
                  }}
                >
                  ${amount}
                </button>
              );
            })}
          </div>

          {/* Destination row */}
          {vow.stake.amount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6,
              fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 13.5,
              color: 'var(--uv-text-muted)',
              marginBottom: 6,
            }}>
              If broken, goes to{' '}
              <b style={{
                color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500,
                borderBottom: '1px dotted var(--uv-gold-line)',
                paddingBottom: 1,
              }}>
                {vow.stake.destination}
              </b>
              <button
                onClick={() => setShowDestPicker(!showDestPicker)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--uv-font-sans)', fontStyle: 'normal',
                  fontSize: 10.5, color: 'var(--uv-text-dim)',
                  borderBottom: '1px dotted var(--uv-border-soft)',
                }}
              >
                change
              </button>
            </div>
          )}
        </div>

        {/* ── (d) Below-the-fold features ── */}

        {/* Consequence type selector — shown when "change" tapped or amount > 0 with picker open */}
        {vow.stake.amount > 0 && showDestPicker && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            {/* Consequence type cards */}
            <div style={{
              fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)', fontWeight: 600,
              fontFamily: 'var(--uv-font-sans)',
            }}>
              If you break it
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      borderRadius: 14, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' as const,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-card)',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-soft)'}`,
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-elevated)',
                    }}>
                      <Icon style={{ width: 18, height: 18, color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)' }} />
                    </div>
                    <div>
                      <span style={{
                        fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 600,
                        display: 'block', color: active ? 'var(--uv-text)' : 'var(--uv-text-muted)',
                      }}>
                        {option.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                        color: 'var(--uv-text-dim)',
                      }}>
                        {option.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Destination picker pills */}
            {destinations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{
                  fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                  color: 'var(--uv-text-dim)', fontWeight: 600,
                  fontFamily: 'var(--uv-font-sans)',
                }}>
                  Choose a cause
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                  {destinations.map((dest) => {
                    const active = vow.stake.destination === dest;
                    return (
                      <button
                        key={dest}
                        onClick={() => updateConsequence(vow.stake.consequence, dest)}
                        style={{
                          padding: '8px 14px', borderRadius: 9999,
                          background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-card)',
                          border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-soft)'}`,
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
          </div>
        )}

        {/* Deadline picker — only shown when vow text doesn't imply one */}
        {needsDeadlinePicker && (
          <div style={{ marginBottom: 18 }}>
            <RitualCard variant="ceremony">
              <span style={{
                fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                color: 'var(--uv-text-dim)', fontWeight: 600,
                fontFamily: 'var(--uv-font-sans)',
              }}>
                Deadline
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
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
                    boxSizing: 'border-box' as const,
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
          </div>
        )}

        {/* "Enter other amount" link + inline input */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {!showCustomAmount ? (
            <button
              onClick={() => {
                setShowCustomAmount(true);
                // Deselect tiles — custom amount is now active (0 won't match any tile)
                setStake({ ...vow.stake, amount: 0 });
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic',
                fontSize: 12, color: 'var(--uv-text-dim)',
              }}
            >
              Enter other amount
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 120 }}>
              <span style={{
                fontFamily: 'var(--uv-font-serif)', fontSize: 20, color: 'var(--uv-text-muted)',
                fontWeight: 500,
              }}>$</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="200"
                value={customAmountValue}
                autoFocus
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomAmountValue(val);
                  const num = parseInt(val, 10);
                  setStake({ ...vow.stake, amount: isNaN(num) ? 0 : num });
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--uv-gold-line)',
                  outline: 'none',
                  fontFamily: 'var(--uv-font-serif)', fontSize: 20, fontWeight: 500,
                  color: 'var(--uv-gold-bright)',
                  padding: '2px 0 4px',
                  letterSpacing: '-0.02em',
                  fontFeatureSettings: '"tnum"',
                }}
              />
            </div>
          )}
        </div>

        {/* ── (e) Footer — pushed to bottom ── */}
        <div style={{ marginTop: 'auto' }}>
          {/* Reassurance text */}
          <p style={{
            textAlign: 'center' as const,
            fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic',
            fontSize: 11.5, color: 'var(--uv-text-dim)',
            marginBottom: 12, margin: '0 0 12px 0',
          }}>
            Nothing charges unless you break it.
          </p>

          {/* CTA pill */}
          <GoldCTA
            variant="pill"
            label="Pick your judge"
            amount={vow.stake.amount > 0 ? `\u2014 $${vow.stake.amount}` : undefined}
            onPress={() => router.push('/witness')}
          />
        </div>
      </div>
    </RitualScreen>
  );
}
