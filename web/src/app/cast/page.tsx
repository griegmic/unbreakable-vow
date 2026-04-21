'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { Card } from '@/components/uv/Card';
import { Input } from '@/components/uv/Input';
import { Textarea } from '@/components/uv/Textarea';
import { RadioCard } from '@/components/uv/RadioCard';
import { AuthModal } from '@/components/auth-modal';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { analyzeVow, generateSuggestion } from '@/lib/vow-logic';

async function ensurePublicUser(userId: string, meta?: Record<string, unknown>, email?: string) {
  await supabase.from('users').upsert(
    { id: userId, display_name: (meta?.full_name as string) || email?.split('@')[0] || null },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

const DEADLINE_OPTIONS = [
  { label: 'This Friday', days: () => { const d = new Date(); const diff = 5 - d.getDay(); return diff <= 0 ? diff + 7 : diff; } },
  { label: 'End of week', days: () => { const d = new Date(); const diff = 7 - d.getDay(); return diff === 0 ? 7 : diff; } },
  { label: '7 days', days: () => 7 },
  { label: '14 days', days: () => 14 },
  { label: '30 days', days: () => 30 },
];

export default function CastPage() {
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();

  // Form state
  const [targetName, setTargetName] = useState('');
  const [dareText, setDareText] = useState('');
  const [deadlineLabel, setDeadlineLabel] = useState('7 days');
  const [taunt, setTaunt] = useState('');

  // Flow state
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [dareLink, setDareLink] = useState('');
  const [dareSent, setDareSent] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vowId, setVowId] = useState<string | null>(null);
  const [challengeAccepted, setChallengeAccepted] = useState(false);
  const [acceptedVowDetails, setAcceptedVowDetails] = useState<{
    stakeAmount: number;
    destination: string;
    endsAt: string | null;
    witnessInviteToken: string | null;
  } | null>(null);

  // Auth gate
  useEffect(() => {
    if (!isAuthenticated && !showAuth) {
      setShowAuth(true);
    }
  }, [isAuthenticated, showAuth]);

  // Poll for challenge acceptance
  useEffect(() => {
    if (!vowId || (!dareSent && !shared)) return;
    if (challengeAccepted) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('vows')
        .select('challenge_status, stake_amount, destination, ends_at, witness_invite_token')
        .eq('id', vowId)
        .single();
      if (data?.challenge_status === 'accepted') {
        setChallengeAccepted(true);
        setAcceptedVowDetails({
          stakeAmount: data.stake_amount || 0,
          destination: data.destination || '',
          endsAt: data.ends_at,
          witnessInviteToken: data.witness_invite_token || null,
        });
      } else if (data?.challenge_status === 'declined') {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [vowId, dareSent, shared, challengeAccepted]);

  // Compute end date
  const endDate = useMemo(() => {
    const preset = DEADLINE_OPTIONS.find((p) => p.label === deadlineLabel);
    if (!preset) {
      const f = new Date();
      f.setDate(f.getDate() + 7);
      f.setHours(23, 59, 59, 0);
      return f;
    }
    const days = preset.days();
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 0);
    return d;
  }, [deadlineLabel]);

  const senderName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';

  const formattedText = (() => {
    const t = dareText.trim();
    if (!t) return '';
    const capped = t.charAt(0).toUpperCase() + t.slice(1);
    return capped.endsWith('.') || capped.endsWith('!') ? capped : capped + '.';
  })();

  // Create the dare
  const handleSendDare = useCallback(async () => {
    if (sending || !dareText.trim() || !targetName.trim()) return;
    setError('');

    const { data: { session: currentSession } } = await supabase.auth.refreshSession();
    if (!currentSession) {
      setShowAuth(true);
      return;
    }

    setSending(true);
    try {
      await ensurePublicUser(currentSession.user.id, currentSession.user.user_metadata, currentSession.user.email ?? undefined);

      const challengeToken = crypto.randomUUID();

      const { data: newVow, error: vowError } = await supabase
        .from('vows')
        .insert({
          user_id: currentSession.user.id,
          raw_input: dareText,
          refined_text: formattedText,
          vow_type: 'challenge',
          status: 'draft',
          challenge_status: 'pending',
          challenge_invite_token: challengeToken,
          witness_user_id: currentSession.user.id,
          witness_name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'You',
          witness_invite_token: crypto.randomUUID(),
          stake_amount: 0, // recipient decides
          consequence: 'charity',
          destination: '', // recipient decides
          starts_at: new Date().toISOString(),
          ends_at: endDate.toISOString(),
        })
        .select()
        .single();

      if (vowError) throw new Error(`Failed to create dare: ${vowError.message}`);

      setVowId(newVow?.id || null);
      const link = `${window.location.origin}/c/${challengeToken}`;
      setDareLink(link);

      // Auto-trigger share sheet
      const vowPart = formattedText.replace(/\.$/, '').toLowerCase();
      const shareText = senderName
        ? `${senderName} dared you to make an Unbreakable Vow: ${vowPart} -> ${link}`
        : `You've been dared to make an Unbreakable Vow: ${vowPart} -> ${link}`;
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ text: shareText });
          setShared(true);
          return;
        } catch {}
      }
      setDareSent(true);
    } catch (err) {
      console.error('Create dare error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create dare. Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, dareText, targetName, formattedText, endDate, senderName]);

  const getShareText = () => {
    const vowPart = formattedText.replace(/\.$/, '').toLowerCase();
    if (senderName) {
      return `${senderName} dared you to make an Unbreakable Vow: ${vowPart} -> ${dareLink}`;
    }
    return `You've been dared to make an Unbreakable Vow: ${vowPart} -> ${dareLink}`;
  };

  const handleShare = async () => {
    const text = getShareText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        setShared(true);
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(dareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession) return;
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const resetForm = () => {
    setDareSent(false);
    setShared(false);
    setDareLink('');
    setDareText('');
    setTargetName('');
    setTaunt('');
    setVowId(null);
    setChallengeAccepted(false);
    setAcceptedVowDetails(null);
    setError('');
  };

  // === ACCEPTED STATE ===
  if (shared && challengeAccepted) {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 40, textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--uv-text)',
            }}
          >
            {targetName} accepted!
          </h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
            You&apos;ll decide the verdict at the deadline.
          </p>

          <Card variant="elevated">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 15, fontFamily: 'var(--uv-font-serif)', color: 'var(--uv-text)', margin: 0 }}>
                &ldquo;{formattedText}&rdquo;
              </p>
              <div style={{ height: 1, background: 'var(--uv-border-strong)' }} />
              {acceptedVowDetails && acceptedVowDetails.stakeAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Stakes</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
                    ${Math.round(acceptedVowDetails.stakeAmount / 100)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <PrimaryButton onClick={() => router.push('/dashboard')}>Go to dashboard</PrimaryButton>
          <SecondaryButton onClick={resetForm}>Dare someone else</SecondaryButton>
        </div>
      </RitualScreen>
    );
  }

  // === WAITING STATE ===
  if (shared) {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 40, textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--uv-text)',
            }}
          >
            Waiting for {targetName}...
          </h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
            No reply? Send it again or copy the link below.
          </p>
          <PrimaryButton onClick={handleShare}>Send again</PrimaryButton>
          <button
            onClick={handleCopyLink}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? 'var(--uv-status-active)' : 'var(--uv-text-muted)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
              padding: '8px 0',
            }}
          >
            {copied ? 'Copied!' : 'Or copy the link'}
          </button>
          <SecondaryButton onClick={() => router.push('/dashboard')}>Dashboard</SecondaryButton>
        </div>
      </RitualScreen>
    );
  }

  // === SHARE SCREEN (fallback) ===
  if (dareSent) {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 40, textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--uv-text)',
            }}
          >
            Send it to {targetName}.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
            {targetName} has 48 hours to accept or back down.
          </p>
          <PrimaryButton onClick={handleShare}>Send to {targetName} &rarr;</PrimaryButton>
          <button
            onClick={handleCopyLink}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? 'var(--uv-status-active)' : 'var(--uv-text-muted)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
              padding: '8px 0',
            }}
          >
            {copied ? 'Copied!' : 'Or copy the link'}
          </button>
          <SecondaryButton onClick={resetForm}>Dare someone else</SecondaryButton>
        </div>
      </RitualScreen>
    );
  }

  // === CREATION FORM ===
  return (
    <>
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 16 }}>
          {/* Header with back + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--uv-text-muted)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--uv-font-sans)',
                textAlign: 'left',
                padding: '4px 0',
              }}
            >
              &larr; Dashboard
            </button>
            {isAuthenticated && <HamburgerMenu />}
          </div>

          {/* Hero */}
          <div>
            <h1
              style={{
                fontFamily: 'var(--uv-font-serif)',
                fontSize: 32,
                fontWeight: 500,
                color: 'var(--uv-text)',
                lineHeight: 1.2,
              }}
            >
              Dare{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>a friend.</span>
            </h1>
            <p
              style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 15,
                color: 'var(--uv-text-muted)',
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              Put them on the spot. They decide the stakes.
            </p>
          </div>

          {/* Target name */}
          <Input
            value={targetName}
            onChange={setTargetName}
            placeholder="Their first name"
            label="Who are you daring?"
          />

          {/* Dare text */}
          <Textarea
            value={dareText}
            onChange={setDareText}
            placeholder="e.g. No phone for a week"
            label="The dare"
            rows={3}
          />

          {/* Deadline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                color: 'var(--uv-text-muted)',
                fontFamily: 'var(--uv-font-sans)',
              }}
            >
              Deadline
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DEADLINE_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.label}
                  label={opt.label}
                  selected={deadlineLabel === opt.label}
                  onClick={() => setDeadlineLabel(opt.label)}
                />
              ))}
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--uv-text-muted)',
                fontFamily: 'var(--uv-font-sans)',
                margin: 0,
              }}
            >
              Ends {endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>

          {/* Taunt (optional) */}
          <Textarea
            value={taunt}
            onChange={setTaunt}
            placeholder="Optional taunt message..."
            label="Add a taunt (optional)"
            rows={2}
          />

          {/* Error */}
          {error && (
            <div style={{ background: 'var(--uv-danger-bg)', borderRadius: 12, padding: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--uv-danger)', margin: 0, fontFamily: 'var(--uv-font-sans)' }}>{error}</p>
            </div>
          )}

          {/* CTA */}
          <PrimaryButton
            onClick={handleSendDare}
            disabled={!dareText.trim() || !targetName.trim()}
            loading={sending}
          >
            Send dare &mdash; {targetName || 'they'} decide{targetName ? 's' : ''} stakes &rarr;
          </PrimaryButton>
        </div>
      </RitualScreen>

      <AuthModal
        visible={showAuth}
        onDismiss={() => {
          setShowAuth(false);
          if (!isAuthenticated) router.push('/');
        }}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
