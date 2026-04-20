'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { Card } from '@/components/uv/Card';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { antiCauses } from '@/lib/vow-logic';

const confettiCSS = `
@keyframes confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes confetti-spread {
  0% { transform: translateX(0); }
  50% { transform: translateX(var(--spread)); }
  100% { transform: translateX(calc(var(--spread) * -0.5)); }
}
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
  overflow: hidden;
}
.confetti-piece {
  position: absolute;
  top: -10px;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  animation: confetti-fall 1.5s ease-out forwards, confetti-spread 1.5s ease-out forwards;
}
`;

function ConfettiEffect() {
  const [particles, setParticles] = useState<Array<{ id: number; left: string; delay: string; color: string; spread: string }>>([]);

  useEffect(() => {
    const colors = ['#F0C86E', '#D4A24F', '#FFD700', '#FFFFFF', '#F5E6C8', '#E8C547'];
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.8}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
      spread: `${(Math.random() - 0.5) * 200}px`,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            backgroundColor: p.color,
            '--spread': p.spread,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function VowKeptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { session } = useAuth();
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || '';
  const witnessName = params.get('witness') || '';

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

  const shareText = isZeroStake
    ? `I kept my Unbreakable Vow: "${vowText}" ${streak && streak > 1 ? `-- ${streak} in a row ` : ''}Think you could do it? -> unbreakablevow.app`
    : `I kept my Unbreakable Vow: "${vowText}" -- $${amount} on the line and I didn't blink. ${streak && streak > 1 ? `${streak} in a row ` : ''}Think you could do it? -> unbreakablevow.app`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: confettiCSS }} />
      <ConfettiEffect />
      <RitualScreen variant="outcome-kept">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 48 }}>
          {/* Big "Kept." */}
          <h1
            style={{
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 52,
              fontWeight: 500,
              color: 'var(--uv-gold)',
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            Kept.
          </h1>
          <p
            style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 16,
              color: 'var(--uv-text-muted)',
              textAlign: 'center',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            You said you would. You did.
          </p>

          {/* Receipt card */}
          <Card variant="elevated">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '3px',
                  color: 'var(--uv-gold)',
                  textTransform: 'uppercase' as const,
                  fontFamily: 'var(--uv-font-sans)',
                }}
              >
                VOW KEPT
              </span>
              <p
                style={{
                  fontSize: 17,
                  fontFamily: 'var(--uv-font-serif)',
                  fontWeight: 500,
                  color: 'var(--uv-text)',
                  textAlign: 'center',
                  lineHeight: '26px',
                  margin: 0,
                }}
              >
                &ldquo;{vowText}&rdquo;
              </p>
              <div style={{ width: '100%', height: 1, background: 'var(--uv-border-strong)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Witness</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>
                  {witnessName || 'Self'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Stake</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-status-active)', fontFamily: 'var(--uv-font-sans)' }}>
                  {isZeroStake ? 'Accountability only' : `$${amount} saved`}
                </span>
              </div>
              {streak !== null && streak > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Streak</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
                    {streak} in a row
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Share */}
          <PrimaryButton onClick={handleShare}>
            {copied ? 'Copied!' : 'Share your streak'}
          </PrimaryButton>

          {/* Certificate link */}
          <SecondaryButton onClick={() => router.push('/certificate')}>
            View certificate
          </SecondaryButton>

          {/* New vow */}
          <button
            onClick={() => router.push('/create')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--uv-text-muted)',
              fontSize: 14,
              fontWeight: 500,
              padding: '8px 0',
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
              textAlign: 'center',
            }}
          >
            + New vow
          </button>
        </div>
      </RitualScreen>
    </>
  );
}

export default function VowKeptPage() {
  return (
    <Suspense>
      <VowKeptContent />
    </Suspense>
  );
}
