'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Heart, Users, Flame } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, SectionLabel, ChoiceChip, PrimaryButton, SecondaryButton, FadeUp, RitualCard } from '@/components/ui';
import { useVowFlow } from '@/providers/vow-flow';
import { stakeAmounts, charities, antiCauses, consequenceOptions, inferDeadline } from '@/lib/vow-logic';

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
    <RitualScreen
      footer={
        <>
          <PrimaryButton label={vow.stake.amount > 0 ? `Confirm $${vow.stake.amount} stake` : 'Continue'} onPress={() => router.push('/witness')} />
          <SecondaryButton label="Back" onPress={() => router.back()} />
        </>
      }
    >
      <FadeUp><BackButton /></FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock
          title="Set the stakes."
          subtitle="Pick an amount that'll keep you honest."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="grid grid-cols-4 gap-3">
          {stakeAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleAmountSelect(amount)}
              className="rounded-[18px] py-5 flex flex-col items-center justify-center transition-all"
              style={{
                backgroundColor: vow.stake.amount === amount ? 'rgba(212,162,79,0.12)' : 'var(--surface)',
                border: `1.5px solid ${vow.stake.amount === amount ? 'var(--gold)' : 'var(--border)'}`,
                boxShadow: vow.stake.amount === amount ? '0 0 20px rgba(212,162,79,0.15)' : 'none',
              }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: vow.stake.amount === amount ? 'var(--gold-bright)' : 'var(--text)' }}
              >
                ${amount}
              </span>
              <span
                className="text-[10px] mt-0.5"
                style={{ color: vow.stake.amount === amount ? 'var(--gold)' : 'var(--text-muted)' }}
              >
                {amountHints[amount]}
              </span>
            </button>
          ))}
        </div>
      </FadeUp>

      {/* $0 escape hatch — de-emphasized per expert panel */}
      <FadeUp delay={0.12}>
        <div className="flex justify-center -mt-1">
          <button
            onClick={() => handleAmountSelect(0)}
            className="text-[13px] font-medium py-1"
            style={{ color: vow.stake.amount === 0 ? 'var(--gold)' : 'var(--text-muted)' }}
          >
            {vow.stake.amount === 0 ? '✓ Free vow — just my word' : 'or make a free vow'}
          </button>
        </div>
      </FadeUp>

      {vow.stake.amount > 0 && (
      <FadeUp delay={0.15}>
        <SectionLabel>IF YOU BREAK IT</SectionLabel>
      </FadeUp>
      )}

      {vow.stake.amount > 0 && (
      <FadeUp delay={0.2}>
        <div className="flex flex-col gap-2.5">
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
                className="rounded-[18px] p-4 flex items-center gap-3.5 text-left transition-all"
                style={{
                  backgroundColor: active ? 'rgba(212,162,79,0.08)' : 'var(--surface)',
                  border: `1.5px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: active ? 'rgba(212,162,79,0.15)' : 'var(--surface-elevated)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: active ? 'var(--gold-bright)' : 'var(--text-muted)' }} />
                </div>
                <div>
                  <span className="text-[15px] font-semibold block" style={{ color: active ? 'var(--text)' : 'var(--text-secondary)' }}>
                    {option.label}
                  </span>
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {option.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </FadeUp>
      )}

      {vow.stake.amount > 0 && destinations.length > 0 && (
        <FadeUp delay={0.25}>
          <div className="flex flex-col gap-2">
            <SectionLabel>{vow.stake.consequence === 'charity' ? 'CHOOSE A CAUSE' : 'CHOOSE A CAUSE'}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {destinations.map((dest) => (
                <button
                  key={dest}
                  onClick={() => updateConsequence(vow.stake.consequence, dest)}
                  className="px-3.5 py-[11px] rounded-full transition-colors"
                  style={{
                    backgroundColor: vow.stake.destination === dest ? 'rgba(212,162,79,0.12)' : 'var(--surface)',
                    border: `1px solid ${vow.stake.destination === dest ? 'var(--border-strong)' : 'var(--border)'}`,
                  }}
                >
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: vow.stake.destination === dest ? 'var(--gold-bright)' : 'var(--text-secondary)' }}
                  >
                    {dest}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </FadeUp>
      )}

      {/* Deadline picker — only shown when vow text doesn't imply one */}
      {needsDeadlinePicker && (
        <FadeUp delay={0.3}>
          <RitualCard>
            <SectionLabel>Deadline</SectionLabel>
            <div className="flex flex-wrap">
              {DEADLINE_PRESETS.map((p) => (
                <ChoiceChip
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
                className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
            )}
            {pickedEndDate && (
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Ends {pickedEndDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            )}
          </RitualCard>
        </FadeUp>
      )}
    </RitualScreen>
  );
}
