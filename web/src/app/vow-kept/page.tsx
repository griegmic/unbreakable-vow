'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Share2, Check } from 'lucide-react';
import { RitualScreen, TitleBlock, PrimaryButton, SecondaryButton, StatPill, FadeUp } from '@/components/ui';
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
          <PrimaryButton label="Go again" onPress={() => router.push('/create')} />
          <SecondaryButton label="My Vows" onPress={() => router.push('/dashboard')} />
        </>
      }
    >
      <FadeUp>
        <TitleBlock
          title="You kept your word."
          subtitle={isZeroStake ? "Word honored. That's what integrity looks like." : "Your money stays safe. That's what integrity looks like."}
        />
      </FadeUp>

      {/* Receipt card */}
      <FadeUp delay={0.1}>
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--gold)',
            borderRadius: 22,
            padding: '28px 22px',
            boxShadow: '0 16px 28px rgba(0,0,0,0.26), 0 0 0 1px rgba(212,162,79,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}
        >
          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold-bright), var(--gold-deep))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Check style={{ width: 16, height: 16, color: '#0B0D11' }} />
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '1.6px',
              textTransform: 'uppercase' as const,
              color: 'var(--gold-bright)',
            }}>
              Vow Kept
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, backgroundColor: 'var(--border)' }} />

          {/* Vow text */}
          <p style={{
            fontSize: 17,
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontWeight: 500,
            color: 'var(--text)',
            textAlign: 'center',
            lineHeight: '26px',
            margin: 0,
          }}>
            &ldquo;{vowText}&rdquo;
          </p>

          {/* Amount */}
          <span style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--success)',
            letterSpacing: '-0.5px',
          }}>
            {isZeroStake ? 'Honored' : `$${amount} saved`}
          </span>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, backgroundColor: 'var(--border)' }} />

          {/* Branding */}
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.8px',
            color: 'var(--text-muted)',
          }}>
            unbreakablevow.app
          </span>
        </div>
      </FadeUp>

      {/* Stats */}
      {keptCount !== null && (
        <FadeUp delay={0.15}>
          <div className="flex gap-3">
            <StatPill value={String(keptCount)} label="vows kept" tone="success" />
            {streak !== null && streak > 1 && (
              <StatPill value={String(streak)} label="in a row" tone="success" />
            )}
          </div>
        </FadeUp>
      )}

      {/* Share */}
      <FadeUp delay={0.2}>
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
