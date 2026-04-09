'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Shield } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, FadeUp } from '@/components/ui';
import { useVowFlow } from '@/providers/vow-flow';

export default function WitnessPage() {
  const router = useRouter();
  const { vow, setWitnessName, setWitnessType, switchToSolo } = useVowFlow();

  useEffect(() => {
    if (!vow.rawInput) {
      try {
        const stored = localStorage.getItem('unbreakable-vow-flow');
        if (stored && JSON.parse(stored).rawInput) return;
      } catch {}
      router.replace('/');
    }
  }, [vow.rawInput, router]);

  const handleFriend = () => {
    setWitnessName('Your witness');
    setWitnessType('friend');
    router.push('/seal');
  };

  const handleSolo = () => {
    switchToSolo();
    router.push('/seal');
  };

  return (
    <RitualScreen>
      <FadeUp><BackButton /></FadeUp>
      <FadeUp delay={0.05}>
        <TitleBlock
          title="Who's holding you to it?"
          subtitle="Pick one. You can always change later."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleFriend}
            className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
            style={{ backgroundColor: 'var(--surface)', border: '1.5px solid var(--border-strong)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}
            >
              <Users className="w-6 h-6" style={{ color: 'var(--gold)' }} />
            </div>
            <div>
              <span className="text-[16px] font-semibold block" style={{ color: 'var(--text)' }}>A friend</span>
              <span className="text-[13px] mt-0.5 block" style={{ color: 'var(--text-secondary)' }}>
                Share a link — they hold you to it
              </span>
            </div>
          </button>

          <button
            onClick={handleSolo}
            className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
            style={{ backgroundColor: 'var(--surface)', border: '1.5px solid var(--border)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(212,162,79,0.08)' }}
            >
              <Shield className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <span className="text-[16px] font-semibold block" style={{ color: 'var(--text)' }}>Just me</span>
              <span className="text-[13px] mt-0.5 block" style={{ color: 'var(--text-secondary)' }}>
                You&apos;ll be your own judge
              </span>
            </div>
          </button>
        </div>
      </FadeUp>
    </RitualScreen>
  );
}
