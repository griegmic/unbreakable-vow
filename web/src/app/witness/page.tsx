'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, FadeUp } from '@/components/ui';
import { useVowFlow } from '@/providers/vow-flow';
import { formalizeVow } from '@/lib/vow-logic';

export default function WitnessPage() {
  const router = useRouter();
  const { vow, setWitnessName, setWitnessType, setWitnessInviteToken, switchToSolo } = useVowFlow();

  useEffect(() => {
    if (!vow.rawInput) {
      try {
        const stored = localStorage.getItem('unbreakable-vow-flow');
        if (stored && JSON.parse(stored).rawInput) return;
      } catch {}
      router.replace('/');
    }
  }, [vow.rawInput, router]);

  const handleFriend = async () => {
    // Reuse existing token if user navigated back and re-tapped
    const token = vow.witnessInviteToken || crypto.randomUUID();
    setWitnessName('Your witness');
    setWitnessType('friend');
    setWitnessInviteToken(token);

    const vowText = (vow.refinedText || formalizeVow(vow.rawInput)).replace(/\.$/, '');
    const witnessUrl = `${window.location.origin}/w/${token}`;
    const stakeHook = vow.stake.amount > 0 ? ` and put $${vow.stake.amount} on it` : '';
    const shareText = `I just made a vow to ${vowText.toLowerCase()}${stakeHook}. You're my witness: ${witnessUrl}`;

    // Pop native share sheet (non-blocking — navigate to seal regardless)
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    }

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
          subtitle="Pick someone who won't let you off the hook."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <button
          onClick={handleFriend}
          className="w-full rounded-[22px] p-[18px] flex items-center gap-3.5 text-left transition-all active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1.5px solid var(--border-strong)',
            boxShadow: '0 6px 14px rgba(212,162,79,0.12)',
          }}
        >
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(212,162,79,0.1)', border: '1px solid var(--border-strong)' }}
          >
            <Users className="w-[22px] h-[22px]" style={{ color: 'var(--gold-bright)' }} />
          </div>
          <div className="flex-1">
            <span className="text-[17px] font-bold font-serif block tracking-[-0.2px]" style={{ color: 'var(--gold-bright)' }}>Text a friend</span>
            <span className="text-[13px] mt-0.5 block leading-[18px]" style={{ color: 'var(--text-secondary)' }}>
              They&apos;ll decide if you kept your word
            </span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </FadeUp>

      <FadeUp delay={0.15}>
        <div className="flex-1 flex items-end justify-center pt-5 pb-6">
          <button
            onClick={handleSolo}
            className="py-2 px-4"
          >
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              No witness — just my word
            </span>
          </button>
        </div>
      </FadeUp>
    </RitualScreen>
  );
}
