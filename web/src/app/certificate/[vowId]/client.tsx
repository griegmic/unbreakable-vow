'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Stamp } from '@/components/primitives';
import { toPng } from 'html-to-image';

/**
 * Certificate — §5.7 / §5.7.1
 *
 * The celebratory shareable for KEPT vows. Museum-placard style gold frame,
 * bespoke typography hierarchy per §5.7.1 Apr 22 revision.
 *
 * Typography contract:
 *   - Eyebrow: Inter Tight 9.5px, 0.42em spacing, gold
 *   - Seal: 76px screen-local (no halo, no check)
 *   - Voice lines: Fraunces italic 13px, dim
 *   - Maker name: Fraunces italic 22px, gold-bright
 *   - Vow action: Inter Tight 26px 600 (the one sans moment — holds at thumbnail)
 *   - Divider: gold gradient + diamond
 *   - KEPT stamp: filled-gold variant from Stamp primitive
 *   - Attribution: 2×2 grid, Inter Tight labels + Fraunces values
 *   - Wordmark: Fraunces italic 11px, dim
 *
 * Canonical mock: flow/html/certificate.html
 */

interface CertVow {
  id: string;
  refined_text: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
  sealed_at: string | null;
  verdict_at: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function CertificateClient({ vow, makerName }: { vow: CertVow; makerName: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const shareUrl = origin ? `${origin}/certificate/${vow.id}` : '';
  const amount = Math.round(vow.stake_amount / 100);

  // Wait for fonts before capturing PNG
  const captureImage = useCallback(async (): Promise<Blob | null> => {
    if (!certRef.current) return null;
    try {
      await document.fonts.ready;
      const dataUrl = await toPng(certRef.current, {
        quality: 0.95,
        pixelRatio: 3,
        cacheBust: true,
      });
      const resp = await fetch(dataUrl);
      return await resp.blob();
    } catch {
      return null;
    }
  }, []);

  const handleShare = useCallback(async () => {
    const text = `I kept my vow: "${vow.refined_text}"`;

    if (navigator.share) {
      try {
        const blob = await captureImage();
        if (blob) {
          const file = new File([blob], 'certificate.png', { type: 'image/png' });
          await navigator.share({ text, url: shareUrl, files: [file] });
          return;
        }
        await navigator.share({ text, url: shareUrl });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard also failed
    }
  }, [vow.refined_text, shareUrl, captureImage]);

  const handleSaveImage = useCallback(async () => {
    setSaving(true);
    try {
      const blob = await captureImage();
      if (!blob) { setSaving(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unbreakable-vow-certificate.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setSaving(false);
    }
  }, [captureImage]);

  return (
    <div style={{
      width: '100%', maxWidth: 393,
      minHeight: '100dvh', margin: '0 auto',
      background: 'var(--uv-bg)',
      backgroundImage: 'radial-gradient(ellipse 700px 500px at 50% 30%, rgba(200,155,60,0.10), transparent 62%)',
      display: 'flex', flexDirection: 'column',
      padding: '16px 16px 22px',
    }}>
      {/* ── Top bar — close + share pill ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 4px 12px',
      }}>
        <button
          onClick={() => { window.location.href = `/vow/${vow.id}`; }}
          aria-label="Close"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--uv-font-sans)', fontSize: 22,
            color: 'var(--uv-text-muted)', padding: 0, lineHeight: 1,
          }}
        >
          &times;
        </button>
        <button
          onClick={handleShare}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 13px', borderRadius: 999,
            background: 'rgba(200,155,60,0.10)', border: '1px solid var(--uv-gold-line)',
            color: 'var(--uv-gold-bright)', cursor: 'pointer',
            fontFamily: 'var(--uv-font-sans)', fontSize: 12, fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L8 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M4 5L8 1L12 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 9L3 14L13 14L13 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* ── Certificate paper — flex:1 fills remaining space ── */}
      <div
        ref={certRef}
        style={{
          flex: 1,
          background: 'var(--uv-cert-paper)',
          border: '1px solid var(--uv-gold-line)',
          borderRadius: 6,
          padding: '28px 22px 24px',
          position: 'relative',
          textAlign: 'center',
          boxShadow: [
            '0 1px 0 rgba(232,182,86,0.15) inset',
            '0 0 0 4px rgba(200,155,60,0.05)',
            '0 24px 60px rgba(0,0,0,0.55)',
          ].join(', '),
        }}
      >
        {/* Inner frame border — museum placard */}
        <div style={{
          position: 'absolute', inset: 10,
          border: '1px solid rgba(200,155,60,0.32)',
          borderRadius: 3, pointerEvents: 'none',
        }} />

        {/* 1. Eyebrow */}
        <div style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 500,
          letterSpacing: '0.42em', textTransform: 'uppercase' as const,
          color: 'var(--uv-gold)', marginBottom: 14,
        }}>
          Certificate of Vow
        </div>

        {/* 2. Wax seal — 76px screen-local */}
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 22%, #F2C766 0%, #E8B656 30%, #C89B3C 62%, #8B6820 100%)',
          boxShadow: [
            '0 2px 0 rgba(255,228,150,0.35) inset',
            '0 -2px 8px rgba(139,104,32,0.65) inset',
            '0 8px 22px rgba(200,155,60,0.32)',
            '0 0 0 1px rgba(139,104,32,0.45)',
          ].join(', '),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', margin: '0 auto 18px',
        }}>
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            border: '1px solid rgba(139,104,32,0.30)', pointerEvents: 'none',
          }} />
          <span style={{
            fontFamily: 'var(--uv-font-serif)',
            fontVariationSettings: '"opsz" 144',
            fontSize: 30, fontWeight: 600, fontStyle: 'italic',
            color: 'var(--uv-cert-stamp-text)',
            letterSpacing: '-0.03em', position: 'relative',
          }}>
            UV
          </span>
        </div>

        {/* 3. "Be it known that" */}
        <div style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 13, fontWeight: 400,
          fontStyle: 'italic', letterSpacing: '0.01em',
          color: 'var(--uv-text-dim)', marginBottom: 10,
        }}>
          Be it known that
        </div>

        {/* 4. Maker name */}
        <div style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 500,
          fontStyle: 'italic', fontVariationSettings: '"opsz" 144',
          color: 'var(--uv-gold-bright)',
          letterSpacing: '-0.01em', marginBottom: 14,
        }}>
          {makerName}
        </div>

        {/* 5. Vow prefix */}
        <div style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 13, fontWeight: 400,
          fontStyle: 'italic', color: 'var(--uv-text-dim)',
          marginBottom: 6,
        }}>
          pledged their word{amount > 0 ? ', on stake,' : ''} to
        </div>

        {/* 6. THE VOW ACTION — Inter Tight 26px 600 */}
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 26, fontWeight: 600,
          letterSpacing: '-0.018em', lineHeight: 1.16,
          color: 'var(--uv-text)', margin: '0 4px 22px',
        }}>
          {vow.refined_text}
        </p>

        {/* 7. Decorative divider */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginBottom: 18,
        }}>
          <span style={{
            flex: 1, maxWidth: 70, height: 1,
            background: 'linear-gradient(90deg, transparent, var(--uv-gold-line), transparent)',
            display: 'block',
          }} />
          <span style={{
            fontSize: 8, color: 'var(--uv-gold-bright)',
            transform: 'translateY(-1px)', display: 'inline-block',
          }}>
            &#9670;
          </span>
          <span style={{
            flex: 1, maxWidth: 70, height: 1,
            background: 'linear-gradient(90deg, transparent, var(--uv-gold-line), transparent)',
            display: 'block',
          }} />
        </div>

        {/* 8. KEPT stamp — filled-gold variant */}
        <div style={{ marginBottom: 22 }}>
          <Stamp text="KEPT" tone="filled-gold" />
        </div>

        {/* 9. Attribution grid (2×2) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 6 }}>
            <AttrCell label="Witnessed by" value={vow.witness_name} />
            <AttrCell label="Stake" value={amount > 0 ? `$${amount}` : 'Honor'} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 22 }}>
            <AttrCell label="Sealed" value={formatDate(vow.sealed_at)} italic />
            <AttrCell label="Verdict" value={formatDate(vow.verdict_at)} italic />
          </div>
        </div>

        {/* 10. Wordmark */}
        <div style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 11,
          fontStyle: 'italic', color: 'var(--uv-text-dim)',
          letterSpacing: '0.04em', marginTop: 14,
        }}>
          &mdash; Unbreakable Vow &mdash;
        </div>
      </div>

      {/* ── Bottom action row — side-by-side ── */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 14,
      }}>
        <button
          onClick={handleSaveImage}
          style={{
            flex: 1, height: 50, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6,
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-soft)',
            color: 'var(--uv-text)',
            fontFamily: 'var(--uv-font-serif)', fontWeight: 500,
            fontSize: 14, cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save image'}
        </button>
        <button
          onClick={handleShare}
          style={{
            flex: 1, height: 50, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6,
            background: 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold-deep))',
            border: 'none',
            color: 'var(--uv-cert-stamp-text)',
            fontFamily: 'var(--uv-font-serif)', fontWeight: 500,
            fontSize: 14, cursor: 'pointer',
            boxShadow: '0 1px 0 rgba(255,220,140,0.3) inset, 0 8px 22px rgba(200,155,60,0.22)',
          }}
        >
          {copied ? 'Copied!' : 'Share \u2192'}
        </button>
      </div>
    </div>
  );
}

// ── Attribution cell ──
function AttrCell({ label, value, italic }: {
  label: string; value: string; italic?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--uv-font-sans)', fontSize: 8.5, fontWeight: 500,
        letterSpacing: '0.32em', textTransform: 'uppercase' as const,
        color: 'var(--uv-text-dim)', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--uv-font-serif)', fontSize: 13, fontWeight: 500,
        fontStyle: italic ? 'italic' : 'normal',
        color: 'var(--uv-text)',
        fontFeatureSettings: '"tnum"',
      }}>
        {value}
      </div>
    </div>
  );
}
