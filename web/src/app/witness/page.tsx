'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Shield, ArrowLeft, Phone } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, RitualCard, PrimaryButton, FadeUp } from '@/components/ui';
import { useVowFlow } from '@/providers/vow-flow';

type View = 'pick' | 'phone' | 'confirm' | 'solo';

export default function WitnessPage() {
  const router = useRouter();
  const { vow, setWitnessName, setWitnessPhone, setWitnessType, switchToSolo } = useVowFlow();
  const [view, setView] = useState<View>('pick');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!vow.rawInput) router.replace('/');
  }, [vow.rawInput, router]);

  const handleNameSubmit = () => {
    if (!name.trim()) return;
    setWitnessName(name.trim());
    setWitnessType('friend');
    setView('phone');
  };

  const handlePhoneContinue = () => {
    // Strip everything except digits and leading +
    const digits = phone.trim().replace(/[^\d]/g, '');
    if (digits) {
      let normalized: string;
      if (digits.length === 10) {
        // US 10-digit: add +1
        normalized = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        // US 11-digit with country code: add +
        normalized = `+${digits}`;
      } else {
        // International or other: add + if not present
        normalized = phone.trim().startsWith('+') ? `+${digits}` : `+${digits}`;
      }
      setWitnessPhone(normalized);
    }
    setView('confirm');
  };

  const handleSolo = () => {
    switchToSolo();
    setView('solo');
  };

  const handleContinue = () => {
    router.push('/seal');
  };

  const InternalBack = () => (
    <button
      onClick={() => {
        if (view === 'confirm') setView('phone');
        else if (view === 'phone') setView('pick');
        else setView('pick');
      }}
      className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-opacity active:opacity-80"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      aria-label="Go back"
    >
      <ArrowLeft className="w-[18px] h-[18px]" style={{ color: 'var(--text)' }} />
    </button>
  );

  if (view === 'solo') {
    return (
      <RitualScreen
        footer={<PrimaryButton label="Continue" onPress={handleContinue} />}
      >
        <FadeUp><InternalBack /></FadeUp>
        <FadeUp delay={0.05}>
          <TitleBlock
            title="A promise to yourself."
            subtitle="Just you and your word."
          />
        </FadeUp>
        <FadeUp delay={0.1}>
          <RitualCard>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}>
                <Shield className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              </div>
              <div>
                <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>How this works</span>
                <span className="text-[13px] leading-5 mt-1 block" style={{ color: 'var(--text-secondary)' }}>
                  When the vow period ends, you&apos;ll decide for yourself whether you kept it. Your honesty is the whole point.
                </span>
              </div>
            </div>
          </RitualCard>
        </FadeUp>
      </RitualScreen>
    );
  }

  if (view === 'phone') {
    return (
      <RitualScreen
        footer={<PrimaryButton label={phone.trim() ? 'Continue' : 'Skip'} onPress={handlePhoneContinue} />}
      >
        <FadeUp><InternalBack /></FadeUp>
        <FadeUp delay={0.05}>
          <TitleBlock
            title={`Add ${name}'s number?`}
            subtitle="We'll text them on verdict day so they can deliver the verdict. Optional but recommended."
          />
        </FadeUp>
        <FadeUp delay={0.1}>
          <div
            className="rounded-[22px] p-5 flex flex-col items-center gap-4"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}>
              <Phone className="w-6 h-6" style={{ color: 'var(--gold)' }} />
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePhoneContinue()}
              placeholder="(555) 123-4567"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-label="Witness phone number"
              className="w-full bg-transparent text-[16px] outline-none px-4 py-3 rounded-[14px] text-center"
              style={{ color: 'var(--text)', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            />
            <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
              Without a number, you&apos;ll need to share the invite link yourself.
            </p>
          </div>
        </FadeUp>
      </RitualScreen>
    );
  }

  if (view === 'confirm') {
    return (
      <RitualScreen
        footer={<PrimaryButton label="Lock it in" onPress={handleContinue} />}
      >
        <FadeUp><InternalBack /></FadeUp>
        <FadeUp delay={0.05}>
          <TitleBlock
            title={`${name} is your witness.`}
            subtitle="Here's what happens if you break it."
          />
        </FadeUp>
        <FadeUp delay={0.1}>
          <RitualCard>
            <div className="flex items-center justify-between">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If you break it</span>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--gold)' }}>
                ${vow.stake.amount} → {vow.stake.destination}
              </span>
            </div>
          </RitualCard>
        </FadeUp>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen>
      <FadeUp><BackButton /></FadeUp>
      <FadeUp delay={0.05}>
        <TitleBlock
          title={`$${vow.stake.amount} is on the line.`}
          subtitle="Who's going to hold you to it?"
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div
          className="rounded-[22px] p-5 flex flex-col items-center gap-4"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}>
            <UserPlus className="w-6 h-6" style={{ color: 'var(--gold)' }} />
          </div>
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>Name your witness</span>

          <div className="w-full flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="Type their name..."
              aria-label="Witness name"
              className="flex-1 bg-transparent text-[16px] outline-none px-4 py-3 rounded-[14px]"
              style={{ color: 'var(--text)', backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            />
            {name.trim() && (
              <button
                onClick={handleNameSubmit}
                className="px-5 py-3 rounded-[14px] font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg, var(--gold-bright), var(--gold))', color: '#0B0D11' }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.15}>
        <button
          onClick={handleSolo}
          className="w-full py-3 flex items-center justify-center"
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            I&apos;ll hold myself accountable
          </span>
        </button>
      </FadeUp>
    </RitualScreen>
  );
}
