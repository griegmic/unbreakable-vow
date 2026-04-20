'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, ArrowLeft, Check, X } from 'lucide-react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { toPng } from 'html-to-image';

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
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const isResolved = ['kept', 'broken'].includes(vow.status);
  const isKept = vow.verdict === 'kept';
  const amount = Math.round(vow.stake_amount / 100);
  const sealDate = vow.sealed_at
    ? new Date(vow.sealed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const verdictDate = vow.verdict_at
    ? new Date(vow.verdict_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const shareUrl = origin ? `${origin}/certificate/${vow.id}` : '';

  const handleShare = async () => {
    const text = `I made an Unbreakable Vow: "${vow.refined_text}"`;

    if (navigator.share) {
      try {
        // Try to export as image for sharing
        if (certRef.current) {
          try {
            const dataUrl = await toPng(certRef.current, { quality: 0.95 });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], 'certificate.png', { type: 'image/png' });
            await navigator.share({ text, url: shareUrl, files: [file] });
            return;
          } catch {
            // Fallback to text-only share
            await navigator.share({ text, url: shareUrl });
            return;
          }
        }
        await navigator.share({ text, url: shareUrl });
        return;
      } catch {}
    }

    // Fallback: copy URL
    await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
  };

  return (
    <RitualScreen variant={isResolved ? (isKept ? 'outcome-kept' : 'outcome-broken') : 'ceremony'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
        {/* Certificate card (phone-frame style) */}
        <div
          ref={certRef}
          style={{
            width: '100%',
            borderRadius: 'var(--uv-radius-2xl)',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            backgroundColor: 'var(--uv-bg-card)',
            border: '1.5px solid var(--uv-gold)',
            boxShadow: 'var(--uv-shadow-xl)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Kept stamp overlay */}
          {isResolved && isKept && (
            <div
              style={{
                position: 'absolute',
                top: 20,
                right: -20,
                transform: 'rotate(15deg)',
                border: '3px solid var(--uv-success)',
                borderRadius: 8,
                padding: '4px 24px',
                opacity: 0.7,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '3px', color: 'var(--uv-success)', fontFamily: 'var(--uv-font-serif)', textTransform: 'uppercase' }}>
                KEPT
              </span>
            </div>
          )}

          {/* Label */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>
              CERTIFICATE OF
            </span>
            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-serif)' }}>
              UNBREAKABLE VOW
            </span>
          </div>

          {/* Ornamental divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '80%' }}>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--uv-gold)', opacity: 0.3 }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--uv-gold)', opacity: 0.5 }} />
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--uv-gold)', opacity: 0.3 }} />
          </div>

          {/* Vow text */}
          <p style={{
            fontSize: 20,
            lineHeight: 1.4,
            fontFamily: 'var(--uv-font-serif)',
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'var(--uv-text)',
            margin: 0,
            textAlign: 'center',
            padding: '0 8px',
          }}>
            &ldquo;{vow.refined_text}&rdquo;
          </p>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, width: '100%', marginTop: 4 }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)', display: 'block' }}>
                STAKE
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: amount > 0 ? 'var(--uv-gold)' : 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', display: 'block', marginTop: 2 }}>
                {amount > 0 ? `$${amount}` : 'Honor'}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)', display: 'block' }}>
                JUDGE
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', display: 'block', marginTop: 2 }}>
                {vow.witness_name}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)', display: 'block' }}>
                BY
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', display: 'block', marginTop: 2 }}>
                {sealDate ? new Date(vow.sealed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u2014'}
              </span>
            </div>
          </div>

          {/* Verdict badge if resolved */}
          {isResolved && (
            <>
              <div style={{ width: '80%', height: 1, backgroundColor: 'var(--uv-gold)', opacity: 0.15 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isKept ? 'rgba(82,214,154,0.12)' : 'rgba(220,38,38,0.12)',
                  }}
                >
                  {isKept ? (
                    <Check style={{ width: 18, height: 18, color: 'var(--uv-success)' }} />
                  ) : (
                    <X style={{ width: 18, height: 18, color: 'var(--uv-danger)' }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: isKept ? 'var(--uv-success)' : 'var(--uv-danger)', fontFamily: 'var(--uv-font-sans)' }}>
                    {isKept ? 'Kept' : 'Broken'}
                  </span>
                  {verdictDate && (
                    <span style={{ fontSize: 11, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>{verdictDate}</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Brand footer */}
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
              unbreakablevow.app
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shareUrl && (
            <PrimaryButton onClick={handleShare}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Share2 style={{ width: 16, height: 16 }} />
                Share
              </span>
            </PrimaryButton>
          )}
          <div style={{ textAlign: 'center' }}>
            <SecondaryButton onClick={() => router.push('/dashboard')}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ArrowLeft style={{ width: 14, height: 14 }} />
                Back
              </span>
            </SecondaryButton>
          </div>
        </div>
      </div>
    </RitualScreen>
  );
}
