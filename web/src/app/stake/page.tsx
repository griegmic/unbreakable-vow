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

function getStakeNote(amount: number, isCustom = false): string {
  if (isCustom) return 'Name your pain. Just make it real.';
  if (amount <= 20) return 'Enough to sting. Still sane.';
  if (amount <= 50) return 'Enough to hurt. Not enough to be stupid.';
  if (amount <= 100) return 'Now your word has teeth.';
  return 'Max pain. Choose wisely.';
}

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

  const handleConsequenceSelect = (consequence: typeof vow.stake.consequence) => {
    const defaultDestination = consequence === 'charity' ? charities[0] : antiCauses[0];
    updateConsequence(consequence, defaultDestination);
  };

  const handleDestinationSelect = (destination: string) => {
    updateConsequence(vow.stake.consequence, destination);
    setShowDestPicker(false);
  };

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
  const amountHint = displayAmount > 0 ? getStakeNote(displayAmount, showCustomAmount) : 'Name your pain. Just make it real.';

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
          onClick={() => router.push('/refine')}
          aria-label="Go back"
          style={{
            width: 44, height: 44, borderRadius: '50%',
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
            fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 600,
            color: 'var(--uv-text-muted)', fontFeatureSettings: '"tnum"',
          }}>
            3 / 5
          </span>
          <div style={{
            height: 3,
            width: 72,
            borderRadius: 999,
            background: 'var(--uv-bg-elevated)',
            overflow: 'hidden',
          }}>
            <div style={{ width: '60%', height: '100%', borderRadius: 999, background: 'var(--uv-gold)' }} />
          </div>
        </div>
      </div>

      {/* ── 2. Page Header ── */}
      <div style={{ marginBottom: 18 }}>
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 36, fontWeight: 500,
          color: 'var(--uv-text)', margin: '0 0 6px',
          lineHeight: 1.06, letterSpacing: '0',
        }}>
          Set the <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>terms</em>.
        </h1>
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 450,
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
              onClick={() => router.push('/refine')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 12px', margin: '-8px -12px',
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-gold)',
              }}
            >
              Edit
            </button>
          </div>

          {/* Vow text */}
          <p style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 25, fontWeight: 500,
            color: 'var(--uv-text)', margin: 0, lineHeight: 1.18,
            letterSpacing: '0',
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
                    fontSize: 25, letterSpacing: '0',
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
          {displayAmount > 0 && amountHint && (
            <p style={{
              textAlign: 'center' as const, margin: '0 0 14px',
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              fontWeight: 450,
              fontStyle: 'italic',
              color: 'var(--uv-text-dim)',
            }}>
              {amountHint}
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
                onClick={() => setShowDestPicker(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 0 10px 8px', margin: '-10px 0 -10px -8px',
                  fontFamily: 'var(--uv-font-sans)', fontSize: 12, fontWeight: 700,
                  color: 'var(--uv-gold-bright)', flexShrink: 0,
                }}
              >
                Change
              </button>
            </div>
          )}
        </div>

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
          {/* Reassurance */}
          <p style={{
            textAlign: 'center' as const,
            fontFamily: 'var(--uv-font-sans)', fontSize: 13,
            color: 'var(--uv-text-muted)',
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
              fontFamily: 'var(--uv-font-sans)', fontSize: 16, fontWeight: 700,
              letterSpacing: '0',
            }}>
              Choose your witness
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

      {/* ── Cause picker sheet ── */}
      {displayAmount > 0 && showDestPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cause-sheet-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <button
            aria-label="Close cause picker"
            onClick={() => setShowDestPicker(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(5,4,3,0.72)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          />

          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 440,
            maxHeight: '82dvh',
            overflowY: 'auto',
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-strong)',
            borderBottom: 'none',
            borderRadius: '24px 24px 0 0',
            padding: '12px 20px max(28px, env(safe-area-inset-bottom))',
            boxShadow: '0 -24px 70px rgba(0,0,0,0.55)',
          }}>
            <div style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              background: 'var(--uv-border-strong)',
              margin: '0 auto 14px',
            }} />

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 14,
              marginBottom: 18,
            }}>
              <div>
                <h2
                  id="cause-sheet-title"
                  style={{
                    fontFamily: 'var(--uv-font-serif)',
                    fontSize: 26,
                    fontWeight: 500,
                    lineHeight: 1.08,
                    letterSpacing: '-0.01em',
                    color: 'var(--uv-text)',
                    margin: '0 0 6px',
                  }}
                >
                  Change where it goes.
                </h2>
                <p style={{
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: 'var(--uv-text-muted)',
                  margin: 0,
                }}>
                  If the vow breaks, the stake goes to the destination you choose here.
                </p>
              </div>

              <button
                onClick={() => setShowDestPicker(false)}
                aria-label="Close"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1px solid var(--uv-border)',
                  background: 'var(--uv-bg-elevated)',
                  color: 'var(--uv-text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 20,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {consequenceOptions.map((option) => {
                const Icon = consequenceIcons[option.id];
                const active = vow.stake.consequence === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleConsequenceSelect(option.id)}
                    style={{
                      borderRadius: 14,
                      padding: '13px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left' as const,
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-elevated)',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <span style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: active ? 'rgba(212,169,85,0.16)' : 'var(--uv-bg-card)',
                    }}>
                      <Icon style={{
                        width: 18,
                        height: 18,
                        color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                      }} />
                    </span>
                    <span>
                      <span style={{
                        fontFamily: 'var(--uv-font-sans)',
                        fontSize: 14,
                        fontWeight: 700,
                        display: 'block',
                        color: active ? 'var(--uv-text)' : 'var(--uv-text-muted)',
                        marginBottom: 2,
                      }}>
                        {option.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--uv-font-sans)',
                        fontSize: 12,
                        lineHeight: 1.35,
                        color: 'var(--uv-text-dim)',
                      }}>
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {destinations.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <span style={{
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--uv-text-dim)',
                  display: 'block',
                  marginBottom: 10,
                }}>
                  Choose a destination
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                  {destinations.map((dest) => {
                    const active = vow.stake.destination === dest;
                    return (
                      <button
                        key={dest}
                        onClick={() => handleDestinationSelect(dest)}
                        style={{
                          padding: '9px 13px',
                          borderRadius: 9999,
                          background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-elevated)',
                          border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border)'}`,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          fontFamily: 'var(--uv-font-sans)',
                          fontSize: 13,
                          fontWeight: 650,
                          color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                        }}
                      >
                        {dest}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDestPicker(false)}
              style={{
                width: '100%',
                minHeight: 46,
                borderRadius: 9999,
                border: '1px solid var(--uv-border-strong)',
                background: 'var(--uv-text)',
                color: 'var(--uv-bg)',
                cursor: 'pointer',
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 15,
                fontWeight: 750,
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
