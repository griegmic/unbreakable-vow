'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { GoldSealBadge } from '@/components/uv/GoldSealBadge';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { Toast } from '@/components/uv/Toast';
import { useVowFlow } from '@/providers/vow-flow';

export default function SentPage() {
  const router = useRouter();
  const { vow, activeVowText } = useVowFlow();
  const [toast, setToast] = useState<string | null>(null);
  const [showDismissPrompt, setShowDismissPrompt] = useState(false);

  // Redirect if no vow state
  useEffect(() => {
    if (!vow.rawInput) {
      try {
        const stored = localStorage.getItem('unbreakable-vow-flow');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.rawInput) return;
        }
      } catch {}
      router.replace('/');
    }
  }, [vow.rawInput, router]);

  // Show dismiss prompt after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowDismissPrompt(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const witnessName = vow.witnessName || 'your witness';
  const stake = vow.stake?.amount ?? 0;
  const vowId = vow.vowId || '';
  const witnessInviteToken = vow.witnessInviteToken || '';

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const witnessUrl = `${baseUrl}/w/${witnessInviteToken}`;

  const vowText = activeVowText.length > 80
    ? activeVowText.substring(0, 77) + '...'
    : activeVowText;

  const smsBody = `I vowed to ${vowText}. $${stake} on the line \u2014 you're the judge. Takes 5 sec to accept: ${witnessUrl}`;

  const handleShare = useCallback(async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
      navigator.share({ text: smsBody }).catch(() => {});
    } else if (isMobile) {
      window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`;
    } else {
      await navigator.clipboard.writeText(smsBody);
      setToast('Link + message copied. Paste it into your messenger.');
    }
  }, [smsBody]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(witnessUrl);
    setToast('Witness link copied to clipboard.');
  }, [witnessUrl]);

  return (
    <RitualScreen variant="ceremony">
      {/* Gold seal icon */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, marginTop: 32 }}>
        <GoldSealBadge size={48} animate />
      </div>

      {/* Hero */}
      <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 32, fontWeight: 400, color: 'var(--uv-text)', textAlign: 'center', margin: '0 0 8px' }}>
        Sealed.
      </h1>
      <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text-muted)', textAlign: 'center', margin: '0 0 4px' }}>
        Your vow is live.
      </p>
      <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text-muted)', textAlign: 'center', margin: '0 0 28px' }}>
        Now tell {witnessName}.
      </p>

      {/* SMS preview block */}
      <div
        style={{
          background: 'var(--uv-bg-elev)',
          border: '1px solid var(--uv-border-strong)',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 10, fontFamily: 'var(--uv-font-sans)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--uv-text-faint)', margin: '0 0 8px' }}>
          YOUR TEXT TO {witnessName.toUpperCase()}
        </p>
        <p style={{ fontSize: 14, fontFamily: 'var(--uv-font-sans)', color: 'var(--uv-text)', margin: '0 0 8px', lineHeight: 1.5 }}>
          I vowed to {vowText}. ${stake} on the line &mdash; you&apos;re the judge. Takes 5 sec to accept:
        </p>
        <p style={{ fontSize: 11, fontFamily: 'var(--uv-font-sans)', color: 'var(--uv-text-faint)', margin: 0, wordBreak: 'break-all' }}>
          {witnessUrl}
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryButton onClick={handleShare}>
          Tell {witnessName} {'\uD83D\uDCF1'}
        </PrimaryButton>
        <SecondaryButton onClick={handleCopyLink}>
          Copy link instead
        </SecondaryButton>
      </div>

      {/* Dismissible prompt after 10s */}
      {showDismissPrompt && (
        <div
          style={{
            marginTop: 24,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--uv-bg-elev)',
            border: '1px solid var(--uv-border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => router.push(vowId ? `/vow/${vowId}` : '/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--uv-gold)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--uv-font-sans)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Done? See your vow &rarr;
          </button>
          <button
            onClick={() => setShowDismissPrompt(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--uv-text-faint)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast} variant="success" onDismiss={() => setToast(null)} />
      )}
    </RitualScreen>
  );
}
