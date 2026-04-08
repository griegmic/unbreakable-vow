'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trophy, Share2 } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, StatPill, FadeUp } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

function VowKeptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { session } = useAuth();
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';

  const [keptCount, setKeptCount] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchStats = async () => {
      const { data } = await supabase.from('vows')
        .select('verdict, verdict_at')
        .eq('user_id', session.user.id)
        .not('verdict', 'is', null)
        .order('verdict_at', { ascending: false });
      if (!data) return;
      const kept = data.filter(v => v.verdict === 'kept').length;
      setKeptCount(kept);
      // Calculate streak
      let s = 0;
      for (const v of data) {
        if (v.verdict === 'kept') s++;
        else break;
      }
      setStreak(s);
    };
    fetchStats();
  }, [session?.user?.id]);

  const isZeroStake = !amount || amount === '0';

  const handleShare = () => {
    const text = isZeroStake
      ? `I kept my vow: "${vowText}" 💪 unbreakablevow.app`
      : `I kept my vow: "${vowText}" — $${amount} was on the line. 💪 unbreakablevow.app`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton label="Make another vow" onPress={() => router.push('/create')} />
          <SecondaryButton label="My Vows" onPress={() => router.push('/dashboard')} />
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
          title="You kept your word."
          subtitle={isZeroStake ? "Word honored. That's what integrity looks like." : "Your money stays safe. That's what integrity looks like."}
        />
      </FadeUp>

      <FadeUp delay={0.15}>
        <RitualCard>
          <p className="text-[17px] font-serif font-medium text-center" style={{ color: 'var(--text)' }}>{vowText}</p>
          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex justify-center">
            <span className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{isZeroStake ? 'Vow honored' : `$${amount} saved`}</span>
          </div>
        </RitualCard>
      </FadeUp>

      {/* Stats */}
      {keptCount !== null && (
        <FadeUp delay={0.2}>
          <div className="flex gap-3">
            <StatPill value={String(keptCount)} label="vows kept" tone="success" />
            {streak !== null && streak > 1 && (
              <StatPill value={String(streak)} label="in a row" tone="success" />
            )}
          </div>
        </FadeUp>
      )}

      {/* Share */}
      <FadeUp delay={0.25}>
        <button
          onClick={handleShare}
          className="w-full rounded-[18px] min-h-[48px] flex items-center justify-center gap-2 transition-transform active:scale-[0.975]"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
        >
          <Share2 className="w-4 h-4" style={{ color: 'var(--gold-bright)' }} />
          <span className="text-[14px] font-bold" style={{ color: 'var(--gold-bright)' }}>
            {copied ? 'Copied!' : 'Share your win'}
          </span>
        </button>
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
