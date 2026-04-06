'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';

function VowKeptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';

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
            style={{ backgroundColor: 'var(--success-muted)', boxShadow: '0 0 40px rgba(82,214,154,0.3)' }}
          >
            <Trophy className="w-10 h-10" style={{ color: 'var(--success)' }} />
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <TitleBlock
          title="Vow kept."
          subtitle="You did what you said. Your money stays safe."
        />
      </FadeUp>

      <FadeUp delay={0.15}>
        <RitualCard>
          <p className="text-[17px] font-serif font-medium text-center" style={{ color: 'var(--text)' }}>{vowText}</p>
          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex justify-center">
            <span className="text-2xl font-bold" style={{ color: 'var(--success)' }}>${amount} saved</span>
          </div>
        </RitualCard>
      </FadeUp>
    </RitualScreen>
  );
}

export default function VowKeptPage() {
  return (
    <Suspense>
      <VowKeptContent />
    </Suspense>
  );
}
