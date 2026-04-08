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
  const isZeroStake = !amount || amount === '0';

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton label="Make a redemption vow" onPress={() => router.push('/')} />
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
          title="You were honest."
          subtitle={isZeroStake ? 'The vow was broken, but you told the truth.' : `Your $${amount} goes to ${destination}. But you told the truth.`}
        />
      </FadeUp>

      <FadeUp delay={0.15}>
        <RitualCard>
          <p className="text-[17px] font-serif font-medium text-center" style={{ color: 'var(--text)' }}>{vowText}</p>
          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--warm-amber)' }}>{isZeroStake ? 'Vow broken' : `$${amount} donated`}</span>
            {!isZeroStake && <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>to {destination}</span>}
          </div>
        </RitualCard>
      </FadeUp>

      {/* Settlement receipt — only show for staked vows */}
      {!isZeroStake && (
        <FadeUp delay={0.2}>
          <RitualCard>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Amount</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>${amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Donated to</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{destination}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--warm-amber)' }}>Payment processed</span>
              </div>
            </div>
          </RitualCard>
        </FadeUp>
      )}

      <FadeUp delay={0.25}>
        <p className="text-[14px] text-center" style={{ color: 'var(--text-secondary)' }}>
          You were honest. That takes guts. Make a new vow and come back stronger.
        </p>
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
