'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Share2, ShieldCheck, ArrowRight, Camera } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';
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
@keyframes gold-glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(212,162,79,0.3), 0 0 40px rgba(212,162,79,0.15); }
  50% { box-shadow: 0 0 30px rgba(212,162,79,0.5), 0 0 60px rgba(212,162,79,0.25); }
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
.trophy-glow {
  animation: gold-glow-pulse 2s ease-in-out infinite;
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

function isAntiCause(dest: string): boolean {
  return antiCauses.some(c => dest.toLowerCase().includes(c.toLowerCase()));
}

function VowKeptContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { session } = useAuth();
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || '';
  const witnessName = params.get('witness') || '';

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
  const isSelfWitness = !witnessName;

  const firstName = witnessName.split(' ')[0];
  const title = isSelfWitness ? 'Unbroken.' : `${firstName} confirmed it.`;
  const subtitle = isZeroStake
    ? 'Word honored. Another one in the books.'
    : `Your $${amount} stays safe. Another one in the books.`;

  const shareText = isZeroStake
    ? `I kept my Unbreakable Vow: "${vowText}" ${streak && streak > 1 ? `— ${streak} in a row 🔥 ` : ''}Think you could do it? → unbreakablevow.app`
    : `I kept my Unbreakable Vow: "${vowText}" — $${amount} on the line and I didn't blink. ${streak && streak > 1 ? `${streak} in a row 🔥 ` : ''}Think you could do it? → unbreakablevow.app`;

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
      <RitualScreen
        footer={
          <>
            <PrimaryButton label="Make a new vow" onPress={() => router.push('/create')} />
            <SecondaryButton label="Challenge a friend" onPress={() => router.push('/cast')} />
            <SecondaryButton label="View your record" onPress={() => router.push('/dashboard')} />
          </>
        }
      >
        {/* Trophy icon with gold glow */}
        <FadeUp>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
            <div
              className="trophy-glow"
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                background: 'linear-gradient(135deg, rgba(240,200,110,0.15), rgba(212,162,79,0.2))',
                border: '2px solid rgba(212,162,79,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck style={{ width: 36, height: 36, color: 'var(--gold-bright)' }} />
            </div>
          </div>
        </FadeUp>

        {/* Title + subtitle */}
        <FadeUp delay={0.08}>
          <TitleBlock title={title} subtitle={subtitle} />
        </FadeUp>

        {/* Shareable receipt card — gold border */}
        <FadeUp delay={0.14}>
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '2px solid var(--gold)',
              borderRadius: 22,
              padding: '24px 20px',
              boxShadow: '0 16px 28px rgba(0,0,0,0.26), 0 0 0 1px rgba(212,162,79,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Header stamp */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '3px',
                color: 'var(--gold-bright)',
                textTransform: 'uppercase',
              }}>
                VOW KEPT
              </span>
            </div>

            {/* Vow text in serif */}
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

            {/* Divider */}
            <div style={{ width: '100%', height: 1, backgroundColor: 'var(--border)' }} />

            {/* Meta rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Witness</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {isSelfWitness ? 'Self' : witnessName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Stake</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
                  {isZeroStake ? 'Accountability only' : `$${amount} saved`}
                </span>
              </div>
              {streak !== null && streak > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Streak</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-bright)' }}>
                    🔥 {streak} in a row
                  </span>
                </div>
              )}
            </div>

            {/* Watermark */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
              <span style={{
                fontSize: 10,
                letterSpacing: '1px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                opacity: 0.5,
              }}>
                unbreakablevow.app
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Pay it forward section — staked vows with destination only */}
        {!isZeroStake && destination && !isAntiCause(destination) && (
          <FadeUp delay={0.18}>
            <RitualCard>
              <p style={{
                fontSize: 15,
                color: 'var(--text)',
                margin: 0,
                lineHeight: '22px',
                textAlign: 'center',
              }}>
                You saved ${amount}. Pay it forward?
              </p>
              <a
                href={`https://www.google.com/search?q=donate+${encodeURIComponent(destination)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'var(--gold-bright)',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  padding: '8px 0',
                }}
              >
                Donate to {destination} anyway
                <ArrowRight style={{ width: 14, height: 14 }} />
              </a>
            </RitualCard>
          </FadeUp>
        )}

        {/* Share section — primary gold CTA */}
        <FadeUp delay={0.22}>
          <button
            onClick={handleShare}
            className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
            style={{
              boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
            }}
          >
            <div
              className="min-h-[56px] flex items-center justify-center px-5 gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              }}
            >
              <Share2 style={{ width: 16, height: 16, color: '#0B0D11' }} />
              <span
                className="text-[15px] font-extrabold tracking-[0.2px]"
                style={{ color: '#0B0D11' }}
              >
                {copied ? 'Copied!' : 'Share your streak'}
              </span>
            </div>
          </button>
        </FadeUp>

        {/* Screenshot hint */}
        <FadeUp delay={0.26}>
          <p style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
            margin: 0,
            opacity: 0.6,
          }}>
            Screenshot the card above to share as an image
          </p>
        </FadeUp>
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
