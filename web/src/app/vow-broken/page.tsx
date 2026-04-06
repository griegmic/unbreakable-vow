'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DollarSign } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';

function VowBrokenContent() {
  const router = useRouter();
  const params = useSearchParams();
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || 'charity';

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton label="Make another vow" onPress={() => router.push('/')} />
          <SecondaryButton label="View history" onPress={() => router.push('/history')} />
        </>
      }
    >
      <FadeUp>
        <div className="flex justify-center mt-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center animate-scale-in"
            style={{ backgroundColor: 'var(--warm-amber-muted)', boxShadow: '0 0 40px rgba(212,162,79,0.3)' }}
          >
            <DollarSign className="w-10 h-10" style={{ color: 'var(--warm-amber)' }} />
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <TitleBlock
          title="Vow broken."
          subtitle={`Your $${amount} goes to ${destination}.`}
        />
      </FadeUp>

      <FadeUp delay={0.15}>
        <RitualCard>
          <p className="text-[17px] font-serif font-medium text-center" style={{ color: 'var(--text)' }}>{vowText}</p>
          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--warm-amber)' }}>${amount} donated</span>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>to {destination}</span>
          </div>
        </RitualCard>
      </FadeUp>

      <FadeUp delay={0.2}>
        <RitualCard>
          <p className="text-[15px] text-center" style={{ color: 'var(--text-secondary)' }}>
            You didn&apos;t keep your word this time. But making another vow means you haven&apos;t given up.
          </p>
        </RitualCard>
      </FadeUp>
    </RitualScreen>
  );
}

export default function VowBrokenPage() {
  return (
    <Suspense>
      <VowBrokenContent />
    </Suspense>
  );
}
