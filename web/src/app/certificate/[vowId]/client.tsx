'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Check, X } from 'lucide-react';
import { ShareButton } from '@/components/share-button';
import { FadeUp } from '@/components/ui';

interface Vow {
  id: string;
  refined_text: string;
  verdict: string | null;
  stake_amount: number;
  destination: string;
  witness_name: string;
  status: string;
  sealed_at: string | null;
  verdict_at: string | null;
}

export default function CertificateClient({ vow }: { vow: Vow }) {
  const router = useRouter();
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const isResolved = ['kept', 'broken'].includes(vow.status);
  const isKept = vow.verdict === 'kept';
  const sealDate = vow.sealed_at
    ? new Date(vow.sealed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const verdictDate = vow.verdict_at
    ? new Date(vow.verdict_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const shareUrl = origin ? `${origin}/certificate/${vow.id}` : '';
  const shareText = `I made an Unbreakable Vow: "${vow.refined_text}" — ${shareUrl}`;

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(135deg, #030508 0%, #08101A 50%, #0A0F18 100%)' }}
    >
      <div className="w-full max-w-[400px] flex flex-col items-center gap-8">
        {/* Certificate card */}
        <FadeUp>
          <div
            className="w-full rounded-[28px] p-8 flex flex-col items-center gap-6 relative overflow-hidden"
            style={{
              backgroundColor: 'rgba(15,18,25,0.9)',
              border: '1.5px solid rgba(212,162,79,0.3)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4), 0 0 80px rgba(212,162,79,0.08)',
            }}
          >
            {/* Top ornament */}
            <div className="flex items-center gap-2">
              <div className="h-px w-8" style={{ backgroundColor: 'rgba(212,162,79,0.3)' }} />
              <Star className="w-5 h-5" style={{ color: '#D4A24F' }} fill="#D4A24F" />
              <span className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color: '#D4A24F' }}>
                Unbreakable Vow
              </span>
              <Star className="w-5 h-5" style={{ color: '#D4A24F' }} fill="#D4A24F" />
              <div className="h-px w-8" style={{ backgroundColor: 'rgba(212,162,79,0.3)' }} />
            </div>

            {/* Vow text */}
            <p
              className="text-[22px] leading-[30px] font-serif font-bold text-center"
              style={{ color: '#F5F5F5' }}
            >
              &ldquo;{vow.refined_text}&rdquo;
            </p>

            {/* Details */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[13px]" style={{ color: '#8B8B9E' }}>
                Witnessed by {vow.witness_name}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: vow.stake_amount > 0 ? '#D4A24F' : '#8B8B9E' }}>
                {vow.stake_amount > 0
                  ? `$${Math.round(vow.stake_amount / 100)} on the line`
                  : 'Accountability vow'}
              </span>
              {sealDate && (
                <span className="text-[12px]" style={{ color: '#6B6B7E' }}>
                  Sealed: {sealDate}
                </span>
              )}
            </div>

            {/* Verdict badge */}
            {isResolved && (
              <>
                <div className="w-full h-px" style={{ backgroundColor: 'rgba(212,162,79,0.15)' }} />
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: isKept ? 'rgba(82,214,154,0.15)' : 'rgba(239,68,68,0.15)',
                    }}
                  >
                    {isKept ? (
                      <Check className="w-5 h-5" style={{ color: '#52D69A' }} />
                    ) : (
                      <X className="w-5 h-5" style={{ color: '#EF4444' }} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className="text-[15px] font-bold uppercase tracking-[1px]"
                      style={{ color: isKept ? '#52D69A' : '#EF4444' }}
                    >
                      Vow {isKept ? 'Kept' : 'Broken'}
                    </span>
                    {verdictDate && (
                      <span className="text-[12px]" style={{ color: '#6B6B7E' }}>{verdictDate}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </FadeUp>

        {/* Actions */}
        <FadeUp delay={0.1}>
          <div className="w-full flex flex-col gap-3">
            {shareUrl && (
              <ShareButton
                url={shareUrl}
                text={shareText}
                buttonText="Share"
              />
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="min-h-[46px] flex items-center justify-center w-full"
            >
              <span className="text-sm font-semibold" style={{ color: '#8B8B9E' }}>
                Back to Dashboard
              </span>
            </button>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
