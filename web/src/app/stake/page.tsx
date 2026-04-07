'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Heart, Users, Flame } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, SectionLabel, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';
import { useVowFlow } from '@/providers/vow-flow';
import { stakeAmounts, charities, antiCauses, consequenceOptions } from '@/lib/vow-logic';

const consequenceIcons = { charity: Heart, witness: Users, anti: Flame };

export default function StakePage() {
  const router = useRouter();
  const { vow, setStake, updateConsequence } = useVowFlow();

  useEffect(() => {
    if (!vow.rawInput) router.replace('/');
  }, [vow.rawInput, router]);

  const handleAmountSelect = (amount: number) => {
    setStake({ ...vow.stake, amount });
  };

  const destinations = vow.stake.consequence === 'charity' ? charities : vow.stake.consequence === 'anti' ? antiCauses : [];

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton label="Continue" onPress={() => router.push('/witness')} />
          <SecondaryButton label="Back" onPress={() => router.back()} />
        </>
      }
    >
      <FadeUp><BackButton /></FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock
          title="What's at stake?"
          subtitle="Enough to hurt. Not enough to regret."
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
            </button>
          ))}
        </div>
      </FadeUp>

      <FadeUp delay={0.15}>
        <SectionLabel>IF YOU BREAK IT</SectionLabel>
      </FadeUp>

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

      {destinations.length > 0 && (
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
    </RitualScreen>
  );
}
