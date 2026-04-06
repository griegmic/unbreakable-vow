'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Calendar, DollarSign, User, Scale } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, VowPreview, PrimaryButton, FadeUp } from '@/components/ui';
import { ShareButton, CopyLinkButton } from '@/components/share-button';
import { useVowFlow } from '@/providers/vow-flow';
import { getVowVerdictDate } from '@/lib/vow-logic';

export default function SentPage() {
  const router = useRouter();
  const { vow, activeVowText, isSelfWitness, resetVow } = useVowFlow();

  const verdictInfo = getVowVerdictDate(activeVowText);
  const [origin, setOrigin] = useState('');
  const witnessUrl = vow.witnessInviteToken && origin
    ? `${origin}/w/${vow.witnessInviteToken}`
    : '';
  const shareText = `I just made a vow: "${activeVowText.replace(/\.$/, '')}" — I picked you to hold me accountable. Tap here to accept:`;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!vow.rawInput && !leaving) router.replace('/');
  }, [vow.rawInput, router, leaving]);

  const handleGotIt = () => {
    setLeaving(true);
    router.push('/live');
    // Delay reset so the redirect guard doesn't fire before navigation
    setTimeout(() => resetVow(), 500);
  };

  return (
    <RitualScreen
      footer={
        <PrimaryButton label="Got it" onPress={handleGotIt} />
      }
    >
      {/* Success check */}
      <FadeUp>
        <div className="flex justify-center mt-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center animate-scale-in"
            style={{ backgroundColor: 'var(--success-muted)' }}
          >
            <CheckCircle className="w-7 h-7" style={{ color: 'var(--success)' }} />
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <TitleBlock
          title={isSelfWitness ? 'Sealed.' : `${vow.witnessName} is your witness.`}
          subtitle={
            isSelfWitness
              ? "Your vow is locked. You'll judge yourself when the time comes."
              : `Send them a personal message so they know you're serious.`
          }
        />
      </FadeUp>

      <FadeUp delay={0.15}>
        <VowPreview text={activeVowText} />
      </FadeUp>

      {!isSelfWitness && witnessUrl && (
        <FadeUp delay={0.2}>
          <div className="flex flex-col gap-3">
            <ShareButton
              url={witnessUrl}
              text={shareText}
              buttonText={`Text ${vow.witnessName}`}
            />
            <div
              className="rounded-[16px] p-3 flex items-center gap-3"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="flex-1 text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
                {witnessUrl}
              </p>
              <CopyLinkButton url={witnessUrl} />
            </div>
            <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
              A personal message hits harder than an automated text.
            </p>
          </div>
        </FadeUp>
      )}

      <FadeUp delay={0.25}>
        <RitualCard>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {isSelfWitness ? 'Just me' : vow.witnessName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Stake</span>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>${vow.stake.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.stake.destination}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Verdict</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{verdictInfo.endLabel}</span>
            </div>
          </div>
        </RitualCard>
      </FadeUp>

      {/* What happens next */}
      <FadeUp delay={0.3}>
        <RitualCard>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>What happens next</span>
          <div className="flex flex-col gap-3">
            {[
              { n: '1', text: isSelfWitness ? 'Live your vow for the next 7 days.' : `${vow.witnessName} taps the link to accept.` },
              { n: '2', text: isSelfWitness ? "When time's up, you decide: kept or broken." : `Live your vow. ${vow.witnessName} is watching.` },
              { n: '3', text: isSelfWitness ? 'If broken, your stake goes to the cause.' : `On verdict day, ${vow.witnessName} calls it: kept or broken.` },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                  style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--gold)' }}
                >
                  {n}
                </div>
                <span className="text-[14px] leading-5" style={{ color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </RitualCard>
      </FadeUp>
    </RitualScreen>
  );
}
