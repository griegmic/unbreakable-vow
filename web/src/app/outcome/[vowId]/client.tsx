'use client';
import { useState } from 'react';
import { Check, DollarSign, Share2, CheckCheck } from 'lucide-react';
import { GoldCTA, FrauncesH1, FrauncesSub, Stamp } from '@/components/primitives';

interface Vow {
  id: string;
  refined_text: string;
  verdict: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
}

export default function OutcomeClient({ vow }: { vow: Vow }) {
  const [shared, setShared] = useState(false);
  const isKept = vow.verdict === 'kept';
  const amount = Math.round(vow.stake_amount / 100);
  const outcomeUrl = `https://unbreakablevow.app/outcome/${vow.id}`;

  const handleShare = async () => {
    const text = isKept
      ? `Vow kept: "${vow.refined_text}" \u2014 $${amount} protected.`
      : `Vow broken: "${vow.refined_text}" \u2014 $${amount} to ${vow.destination}.`;

    if (navigator.share) {
      try {
        await navigator.share({ text, url: outcomeUrl });
        return;
      } catch {}
    }

    await navigator.clipboard.writeText(`${text}\n${outcomeUrl}`);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)', backgroundImage: isKept ? 'radial-gradient(ellipse at 50% 30%, rgba(74,222,128,0.06), var(--uv-bg) 70%)' : 'radial-gradient(ellipse at 50% 30%, rgba(248,113,113,0.06), var(--uv-bg) 70%)', padding: '80px 36px 40px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
          UNBREAKABLE VOW
        </span>

        {/* Phone-frame style container */}
        <div
          style={{
            border: '1.5px solid var(--uv-gold)',
            borderRadius: 'var(--uv-radius-2xl)',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            backgroundColor: 'var(--uv-bg-card)',
            boxShadow: 'var(--uv-shadow-xl)',
          }}
        >
          {/* Outcome icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isKept ? 'rgba(82,214,154,0.12)' : 'rgba(220,38,38,0.12)',
              border: isKept ? '2px solid rgba(82,214,154,0.3)' : '2px solid rgba(220,38,38,0.3)',
            }}
          >
            {isKept ? (
              <Check style={{ width: 36, height: 36, color: 'var(--uv-success)' }} />
            ) : (
              <DollarSign style={{ width: 36, height: 36, color: 'var(--uv-danger)' }} />
            )}
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 32,
            fontWeight: 600,
            fontFamily: 'var(--uv-font-serif)',
            color: isKept ? 'var(--uv-gold)' : 'var(--uv-danger)',
            margin: 0,
            textAlign: 'center',
          }}>
            {isKept ? 'Kept.' : 'Broken.'}
          </h1>

          {/* Description */}
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', margin: 0, textAlign: 'center', fontFamily: 'var(--uv-font-sans)', lineHeight: 1.5 }}>
            {isKept
              ? `${vow.witness_name} called it kept.`
              : amount > 0
                ? `$${amount} goes to ${vow.destination}.`
                : 'The vow was broken. The record stands.'
            }
          </p>

          {/* Vow quote */}
          <div style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--uv-bg-elevated)',
                border: '1px solid var(--uv-border-strong)',
              }}
            >
              <div style={{ width: 3, borderRadius: 2, backgroundColor: isKept ? 'var(--uv-success)' : 'var(--uv-danger)', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ fontSize: 16, lineHeight: '23px', fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontStyle: 'italic', color: 'var(--uv-text)', margin: 0 }}>
                  &ldquo;{vow.refined_text}&rdquo;
                </p>
                <p style={{ fontSize: 12, color: 'var(--uv-text-dim)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>
                  {amount > 0 ? `$${amount} at stake` : 'Accountability only'} &middot; Witnessed by {vow.witness_name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          style={{
            width: '100%',
            minHeight: 48,
            borderRadius: 'var(--uv-radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            backgroundColor: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-strong)',
            cursor: 'pointer',
            transition: 'transform 120ms',
          }}
        >
          {shared ? (
            <>
              <CheckCheck style={{ width: 16, height: 16, color: 'var(--uv-success)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-success)', fontFamily: 'var(--uv-font-sans)' }}>Copied!</span>
            </>
          ) : (
            <>
              <Share2 style={{ width: 16, height: 16, color: 'var(--uv-text-muted)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Share this outcome</span>
            </>
          )}
        </button>

        {/* CTA */}
        <GoldCTA label="Make your own vow →" onPress={() => { window.location.href = '/'; }} />
      </div>
    </div>
  );
}
