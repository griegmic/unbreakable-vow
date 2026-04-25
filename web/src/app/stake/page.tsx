'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Heart, Users, Flame } from 'lucide-react';
import { useVowFlow } from '@/providers/vow-flow';
import { charities, antiCauses, consequenceOptions, inferDeadline } from '@/lib/vow-logic';

/**
 * S3 · Stake — rebuilt to match Joey's new HTML design.
 *
 * Layout: topbar → page header → vow card → stake card → deadline card → sticky CTA
 * All state writes to useVowFlow provider. Zero Stripe SDK calls.
 */

const consequenceIcons = { charity: Heart, witness: Users, anti: Flame };

const STAKE_AMOUNTS = [20, 50, 100]; // "Other" is 4th tile

const AMOUNT_HINTS: Record<number, string> = {
  20: 'a coffee a day for a week',
  50: 'a nice dinner you won\'t have',
  100: 'real consequences',
};

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
      } catch { /* empty */ }
      router.replace('/');
    }
  }, [vow.rawInput, router]);

  const handleAmountSelect = (amount: number) => {
    setShowCustomAmount(false);
    setCustomAmountValue('');
    setStake({ ...vow.stake, amount });
  };

  const handleOtherTap = () => {
    setShowCustomAmount(true);
    setStake({ ...vow.stake, amount: 0 });
  };

  const destinations = vow.stake.consequence === 'charity' ? charities : vow.stake.consequence === 'anti' ? antiCauses : [];

  // Days until deadline
  const daysUntilDeadline = useMemo(() => {
    const d = inferredDeadline || pickedEndDate;
    if (!d) return null;
    const now = new Date();
    return Math.max(1, Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [inferredDeadline, pickedEndDate]);

  // Format deadline for resolve text — "Fri, May 1 · 11:59pm"
  const deadlineResolveDisplay = useMemo(() => {
    const d = inferredDeadline || pickedEndDate;
    if (!d) return null;
    const datePart = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const hours = d.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const h12 = hours % 12 || 12;
    const minutes = d.getMinutes();
    const timePart = minutes === 0 ? `${h12}${ampm}` : `${h12}:${String(minutes).padStart(2, '0')}${ampm}`;
    return `${datePart} · ${timePart}`;
  }, [inferredDeadline, pickedEndDate]);

  // Current display amount (for caption and ledger)
  const displayAmount = vow.stake.amount;
  const amountHint = AMOUNT_HINTS[displayAmount] || (displayAmount > 0 ? `$${displayAmount} on the line` : '');

  // Strip "I'll" prefix from vow text for display
  const vowBody = activeVowText.replace(/^I('ll|'ll| will)\s*/i, '');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100dvh',
      background: 'var(--uv-bg)',
      maxWidth: 440, margin: '0 auto',
      padding: '16px 20px 0',
      position: 'relative',
    }}>

      {/* ── 1. Topbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        {/* Back button */}
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '1px solid var(--uv-border)',
            background: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'var(--uv-text-muted)',
            padding: 0, lineHeight: 1,
          }}
        >
          &larr;
        </button>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.16em', textTransform: 'uppercase' as const,
            color: 'var(--uv-gold)',
          }}>
            Step 2 of 3
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--uv-gold)',
              display: 'inline-block',
            }} />
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--uv-gold)',
              boxShadow: '0 0 8px var(--uv-gold-glow)',
              display: 'inline-block',
            }} />
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'transparent',
              border: '1px solid var(--uv-text-dim)',
              display: 'inline-block',
            }} />
          </div>
        </div>
      </div>

      {/* ── 2. Page Header ── */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 34, fontWeight: 500,
          color: 'var(--uv-text)', margin: '0 0 6px',
          lineHeight: 1.15, letterSpacing: '-0.01em',
        }}>
          Set the <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>terms</em>.
        </h1>
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 400,
          color: 'var(--uv-text-dim)', margin: 0,
        }}>
          A vow without weight is a wish.
        </p>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, paddingBottom: 180 }}>

        {/* ── 3. Card 1 — The Vow ── */}
        <div style={{
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-border)',
          borderRadius: 14, padding: 16,
          marginBottom: 14,
        }}>
          {/* Label row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)',
            }}>
              THE VOW
            </span>
            <button
              onClick={() => router.back()}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-gold)',
              }}
            >
              Edit
            </button>
          </div>

          {/* Vow text */}
          <p style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 24, fontWeight: 500,
            color: 'var(--uv-text)', margin: 0, lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}>
            <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>I&apos;ll</em>{' '}
            {vowBody}
          </p>
        </div>

        {/* ── 4. Card 2 — The Stake ── */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(212,169,85,0.04) 0%, var(--uv-bg-card) 100%)',
          border: '1px solid var(--uv-gold-line)',
          borderRadius: 14, padding: 16,
          marginBottom: 14,
        }}>
          {/* Label */}
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.16em', textTransform: 'uppercase' as const,
            color: 'var(--uv-text-dim)',
            display: 'block', marginBottom: 12,
          }}>
            THE STAKE
          </span>

          {/* Tile grid: 4 columns */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8, marginBottom: 14,
          }}>
            {STAKE_AMOUNTS.map((amount) => {
              const active = !showCustomAmount && vow.stake.amount === amount;
              return (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  style={{
                    aspectRatio: '1 / 1',
                    background: active
                      ? 'rgba(200,155,60,0.12)'
                      : 'var(--uv-bg-elevated)',
                    border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--uv-font-serif)', fontWeight: 500,
                    fontSize: 24, letterSpacing: '-0.02em',
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

            {/* "Other" tile */}
            <button
              onClick={handleOtherTap}
              style={{
                aspectRatio: '1 / 1',
                background: showCustomAmount
                  ? 'rgba(200,155,60,0.12)'
                  : 'var(--uv-bg-elevated)',
                border: `1px solid ${showCustomAmount ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--uv-font-sans)', fontWeight: 500,
                fontSize: 13,
                color: showCustomAmount ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                cursor: 'pointer',
                boxShadow: showCustomAmount
                  ? '0 0 24px rgba(200,155,60,0.18), 0 1px 0 rgba(232,182,86,0.25) inset'
                  : 'none',
                transition: 'all 150ms',
                padding: 0,
              }}
            >
              Other
            </button>
          </div>

          {/* Custom amount input (inline below tiles) */}
          {showCustomAmount && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 4, marginBottom: 14,
            }}>
              <span style={{
                fontFamily: 'var(--uv-font-serif)', fontSize: 22, color: 'var(--uv-text-muted)',
                fontWeight: 500,
              }}>$</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
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
                  width: 100,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--uv-gold-line)',
                  outline: 'none',
                  fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 500,
                  color: 'var(--uv-gold-bright)',
                  padding: '2px 0 4px',
                  letterSpacing: '-0.02em',
                  fontFeatureSettings: '"tnum"',
                  textAlign: 'center' as const,
                }}
              />
            </div>
          )}

          {/* Caption below tiles */}
          {displayAmount > 0 && (
            <p style={{
              textAlign: 'center' as const, margin: '0 0 14px',
            }}>
              <span style={{
                fontFamily: 'var(--uv-font-serif)', fontSize: 16, fontWeight: 600,
                color: 'var(--uv-text)',
              }}>
                ${displayAmount}
              </span>
              {amountHint && (
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                  color: 'var(--uv-text-dim)',
                }}>
                  {' '}&mdash; {amountHint}
                </span>
              )}
            </p>
          )}

          {/* Penalty box */}
          {displayAmount > 0 && (
            <div style={{
              background: 'rgba(139,46,31,0.08)',
              border: '1px solid rgba(139,46,31,0.25)',
              borderRadius: 10, padding: '13px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {/* Left icon */}
              <span style={{
                fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic',
                fontSize: 22, color: 'var(--uv-gold)',
                flexShrink: 0, lineHeight: 1,
              }}>
                &#x27F3;
              </span>

              {/* Text */}
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                color: 'var(--uv-text-muted)', margin: 0, flex: 1,
                lineHeight: 1.4,
              }}>
                If you break it, <strong style={{ color: 'var(--uv-text)', fontWeight: 600 }}>
                  ${displayAmount} goes to
                </strong>{' '}
                <em style={{
                  fontStyle: 'italic', color: 'var(--uv-gold)',
                  borderBottom: '1px dotted var(--uv-gold-line)',
                  paddingBottom: 1,
                }}>
                  {vow.stake.destination}
                </em>.
              </p>

              {/* Change link */}
              <button
                onClick={() => setShowDestPicker(!showDestPicker)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                  color: 'var(--uv-text-dim)', flexShrink: 0,
                }}
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* ── Consequence/Destination picker (shown when "Change" tapped) ── */}
        {displayAmount > 0 && showDestPicker && (
          <div style={{
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border)',
            borderRadius: 14, padding: 16,
            marginBottom: 14,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* Consequence type label */}
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)',
            }}>
              IF YOU BREAK IT
            </span>

            {/* Consequence type cards */}
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
                      borderRadius: 10, padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' as const,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-elevated)',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-card)',
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
                  fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.16em', textTransform: 'uppercase' as const,
                  color: 'var(--uv-text-dim)',
                }}>
                  CHOOSE A CAUSE
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
                          background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-elevated)',
                          border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
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

        {/* ── 5. Card 3 — The Deadline ── */}
        {needsDeadlinePicker && (
          <div style={{
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border)',
            borderRadius: 14, padding: 16,
            marginBottom: 14,
          }}>
            {/* Label */}
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)',
              display: 'block', marginBottom: 12,
            }}>
              THE DEADLINE
            </span>

            {/* Chips row */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 12 }}>
              {DEADLINE_PRESETS.map((p) => {
                const active = deadlineLabel === p.label;
                return (
                  <button
                    key={p.label}
                    onClick={() => handleDeadlineSelect(p.label)}
                    style={{
                      padding: '8px 14px', borderRadius: 9999,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'transparent',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                      cursor: 'pointer', transition: 'all 150ms',
                      fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500,
                      color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom date input */}
            {showCustomDate && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 10,
                  fontFamily: 'var(--uv-font-sans)', fontSize: 15,
                  color: 'var(--uv-text)', background: 'transparent',
                  border: '1px solid var(--uv-border)', outline: 'none',
                  boxSizing: 'border-box' as const,
                  marginBottom: 8,
                }}
              />
            )}

            {/* Resolve text */}
            {deadlineResolveDisplay && (
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.14em', textTransform: 'uppercase' as const,
                color: 'var(--uv-text-dim)', margin: 0,
              }}>
                Resolves <strong style={{ color: 'var(--uv-text-muted)' }}>{deadlineResolveDisplay}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 6. Bottom CTA (sticky) ── */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 10,
      }}>
        {/* Gradient fade */}
        <div style={{
          height: 60,
          background: 'linear-gradient(to bottom, transparent, var(--uv-bg))',
          pointerEvents: 'none',
        }} />

        <div style={{
          background: 'var(--uv-bg)',
          padding: '0 20px 32px',
          maxWidth: 440, margin: '0 auto',
        }}>
          {/* Ledger row */}
          {displayAmount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase' as const,
                color: 'var(--uv-text-dim)',
              }}>
                YOU&apos;RE STAKING
              </span>
              <span>
                <span style={{
                  fontFamily: 'var(--uv-font-serif)', fontSize: 17, fontWeight: 600,
                  color: 'var(--uv-text)',
                }}>
                  ${displayAmount}
                </span>
                {daysUntilDeadline && (
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500,
                    color: 'var(--uv-text-dim)',
                  }}>
                    {' '}· {daysUntilDeadline} day{daysUntilDeadline !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Reassurance */}
          <p style={{
            textAlign: 'center' as const,
            fontFamily: 'var(--uv-font-sans)', fontSize: 13,
            color: 'var(--uv-text-dim)',
            margin: '0 0 12px',
          }}>
            Nothing charges unless you break it.
          </p>

          {/* CTA button */}
          <button
            onClick={() => router.push('/witness')}
            style={{
              width: '100%', padding: '16px 20px',
              background: 'var(--uv-text)',
              color: 'var(--uv-bg)',
              border: 'none', borderRadius: 9999,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 0 40px rgba(244,237,224,0.12), 0 8px 24px rgba(0,0,0,0.3)',
              transition: 'transform 100ms',
            }}
          >
            <span style={{
              fontFamily: 'var(--uv-font-serif)', fontSize: 18, fontWeight: 600,
              letterSpacing: '-0.01em',
            }}>
              Name your witness
            </span>

            {/* Arrow circle */}
            <span style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--uv-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: 'var(--uv-text)',
            }}>
              &rarr;
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
