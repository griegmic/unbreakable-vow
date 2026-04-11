'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Copy, Check, Shield, Calendar, MessageCircle } from 'lucide-react';
import {
  RitualScreen, RitualCard, PrimaryButton, ChoiceChip,
  SectionLabel, FadeUp, VowPreview,
} from '@/components/ui';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { analyzeVow, generateSuggestion } from '@/lib/vow-logic';

async function ensurePublicUser(userId: string, meta?: Record<string, unknown>, email?: string) {
  await supabase.from('users').upsert(
    { id: userId, display_name: (meta?.full_name as string) || email?.split('@')[0] || null },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

const SUGGESTED_STAKES = [0, 10, 25, 50, 100];

const DEADLINE_PRESETS = [
  { label: 'This Friday', days: () => { const d = new Date(); const diff = 5 - d.getDay(); return diff <= 0 ? diff + 7 : diff; } },
  { label: 'End of week', days: () => { const d = new Date(); const diff = 7 - d.getDay(); return diff === 0 ? 7 : diff; } },
  { label: 'In 7 days', days: () => 7 },
  { label: 'Pick date', days: () => -1 },
];

export default function CastPage() {
  const router = useRouter();
  const { session } = useAuth();

  // Form state
  const [vowText, setVowText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [targetName, setTargetName] = useState('');
  const [suggestedStake, setSuggestedStake] = useState<number>(25);
  const [deadlineLabel, setDeadlineLabel] = useState('In 7 days');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

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
  const [verdictBusy, setVerdictBusy] = useState(false);
  const [verdictError, setVerdictError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Poll for challenge acceptance when waiting
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

  // Compute suggestion as user types
  useEffect(() => {
    if (vowText.trim().length < 3) { setSuggestion(''); return; }
    const analysis = analyzeVow(vowText);
    if (analysis.type === 'vague') {
      setSuggestion(generateSuggestion(vowText));
    } else {
      setSuggestion('');
    }
  }, [vowText]);

  // Compute end date
  const endDate = useMemo(() => {
    if (showCustomDate && customDate) {
      return new Date(customDate + 'T23:59:59');
    }
    const preset = DEADLINE_PRESETS.find((p) => p.label === deadlineLabel);
    if (!preset) { const f = new Date(); f.setDate(f.getDate() + 7); f.setHours(23, 59, 59, 0); return f; }
    const days = preset.days();
    if (days === -1) { const f = new Date(); f.setDate(f.getDate() + 7); f.setHours(23, 59, 59, 0); return f; }
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 0);
    return d;
  }, [deadlineLabel, customDate, showCustomDate]);

  const activeText = suggestion || vowText;
  const formattedText = activeText.trim().charAt(0).toUpperCase() + activeText.trim().slice(1);

  const handleDeadlineSelect = (label: string) => {
    setDeadlineLabel(label);
    if (label === 'Pick date') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomDate('');
    }
  };

  const acceptSuggestion = () => {
    if (suggestion) { setVowText(suggestion); setSuggestion(''); }
  };

  // Create the dare
  const handleSendDare = useCallback(async () => {
    if (sending || !vowText.trim() || !targetName.trim()) return;
    setError('');

    const { data: { session: currentSession } } = await supabase.auth.refreshSession();
    if (!currentSession) {
      setShowAuth(true);
      return;
    }

    setSending(true);
    try {
      const finalText = formattedText.endsWith('.') || formattedText.endsWith('!') ? formattedText : formattedText + '.';

      await ensurePublicUser(currentSession.user.id, currentSession.user.user_metadata, currentSession.user.email ?? undefined);

      const challengeToken = crypto.randomUUID();

      const { data: newVow, error: vowError } = await supabase
        .from('vows')
        .insert({
          user_id: currentSession.user.id,
          raw_input: vowText,
          refined_text: finalText,
          vow_type: 'challenge',
          status: 'draft',
          challenge_status: 'pending',
          challenge_invite_token: challengeToken,
          witness_user_id: currentSession.user.id,
          witness_name: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'You',
          witness_invite_token: crypto.randomUUID(),
          suggested_stake_amount: (suggestedStake || 0) * 100,
          stake_amount: 0, // recipient decides
          consequence: 'charity',
          destination: '',  // recipient decides
          starts_at: new Date().toISOString(),
          ends_at: endDate.toISOString(),
        })
        .select()
        .single();

      if (vowError) throw new Error(`Failed to create dare: ${vowError.message}`);

      setVowId(newVow?.id || null);
      const link = `${window.location.origin}/c/${challengeToken}`;
      setDareLink(link);

      // Auto-trigger share sheet immediately
      const vowPart = formattedText.replace(/\.$/, '').toLowerCase();
      const shareText = senderName
        ? `${senderName} dared you to make an Unbreakable Vow: ${vowPart} → ${link}`
        : `You've been dared to make an Unbreakable Vow: ${vowPart} → ${link}`;
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ text: shareText });
          setShared(true);
          return;
        } catch {}
      }
      // If share cancelled or unavailable, fall through to share screen
      setDareSent(true);
    } catch (err) {
      console.error('Create dare error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  }, [sending, vowText, targetName, formattedText, suggestedStake, endDate]);

  const senderName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';

  const getShareText = () => {
    const vowPart = formattedText.replace(/\.$/, '').toLowerCase();
    if (senderName) {
      return `${senderName} dared you to make an Unbreakable Vow: ${vowPart} → ${dareLink}`;
    }
    return `You've been dared to make an Unbreakable Vow: ${vowPart} → ${dareLink}`;
  };

  const handleShare = async () => {
    const text = getShareText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        setShared(true);
      } catch {
        // User cancelled share sheet — that's ok
      }
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
      if (freshSession) { handleSendDare(); return; }
      await new Promise((r) => setTimeout(r, 300));
    }
    setError('Session not found after sign-in. Please try again.');
  };

  // === POST-SHARE: ACCEPTED STATE ===
  if (shared && challengeAccepted) {
    const stakeDollars = acceptedVowDetails ? Math.round(acceptedVowDetails.stakeAmount / 100) : 0;
    const acceptedEndDate = acceptedVowDetails?.endsAt
      ? new Date(acceptedVowDetails.endsAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : null;

    return (
      <RitualScreen
        footer={
          <button
            onClick={() => {
              setDareSent(false); setShared(false); setDareLink(''); setVowText('');
              setSuggestion(''); setTargetName(''); setSuggestedStake(25);
              setVowId(null); setChallengeAccepted(false); setAcceptedVowDetails(null); setError('');
            }}
            className="min-h-[44px] flex items-center justify-center"
          >
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Dare someone else
            </span>
          </button>
        }
      >
        <FadeUp>
          <div className="text-center mt-4">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(82,214,154,0.12)', border: '2px solid rgba(82,214,154,0.3)' }}>
                <Check className="w-7 h-7" style={{ color: 'var(--success)' }} />
              </div>
            </div>
            <h1
              className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
              style={{ color: 'var(--text)' }}
            >
              {targetName} accepted!
            </h1>
            <p className="text-[15px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              You&apos;ll decide the verdict at the deadline.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <RitualCard>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--gold)' }} />
                <p className="text-[15px] leading-[22px] font-serif" style={{ color: 'var(--text)' }}>
                  &ldquo;{formattedText}&rdquo;
                </p>
              </div>
              <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
              {stakeDollars > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Stakes</span>
                  <span className="text-[14px] font-semibold" style={{ color: 'var(--gold)' }}>${stakeDollars}</span>
                </div>
              )}
              {stakeDollars > 0 && acceptedVowDetails?.destination && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If they fail</span>
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{acceptedVowDetails.destination}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Vow keeper</span>
                </div>
                <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{targetName}</span>
              </div>
              {acceptedEndDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Ends</span>
                  </div>
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{acceptedEndDate}</span>
                </div>
              )}
            </div>
          </RitualCard>
        </FadeUp>

        <FadeUp delay={0.18}>
          <div className="flex flex-col gap-3">
            <PrimaryButton label="Go to dashboard" onPress={() => router.push('/dashboard')} />
          </div>
        </FadeUp>

        {/* Fast-forward test verdict */}
        {process.env.NODE_ENV === 'development' && acceptedVowDetails?.witnessInviteToken && (
          <FadeUp delay={0.25}>
            <div className="flex flex-col gap-2 pt-2">
              <p className="text-[11px] font-bold tracking-[1px] uppercase text-center" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                Fast-forward (testing)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (verdictBusy) return;
                    setVerdictBusy(true);
                    setVerdictError('');
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-verdict`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({ token: acceptedVowDetails.witnessInviteToken, verdict: 'kept' }),
                      });
                      const data = await res.json().catch(() => null);
                      if (!res.ok || data?.error) { setVerdictError(data?.error || `Error ${res.status}`); setVerdictBusy(false); return; }
                      const amtD = acceptedVowDetails ? Math.round(acceptedVowDetails.stakeAmount / 100) : 0;
                      const txtE = encodeURIComponent(formattedText);
                      const destE = encodeURIComponent(acceptedVowDetails?.destination || '');
                      const witE = encodeURIComponent(senderName || 'You');
                      window.location.href = `/vow-kept?amount=${amtD}&text=${txtE}&destination=${destE}&witness=${witE}&self=1`;
                    } catch { setVerdictError('Network error'); setVerdictBusy(false); }
                  }}
                  disabled={verdictBusy}
                  className="flex-1 min-h-[44px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97] disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(82,214,154,0.12)', border: '1px solid rgba(82,214,154,0.25)' }}
                >
                  <span className="text-[13px] font-bold" style={{ color: 'var(--success)' }}>
                    {verdictBusy ? '...' : 'Mark Kept'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (verdictBusy) return;
                    setVerdictBusy(true);
                    setVerdictError('');
                    try {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-verdict`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({ token: acceptedVowDetails.witnessInviteToken, verdict: 'broken' }),
                      });
                      const data = await res.json().catch(() => null);
                      if (!res.ok || data?.error) { setVerdictError(data?.error || `Error ${res.status}`); setVerdictBusy(false); return; }
                      const amtD2 = acceptedVowDetails ? Math.round(acceptedVowDetails.stakeAmount / 100) : 0;
                      const txtE2 = encodeURIComponent(formattedText);
                      const destE2 = encodeURIComponent(acceptedVowDetails?.destination || '');
                      const witE2 = encodeURIComponent(senderName || 'You');
                      window.location.href = `/vow-broken?amount=${amtD2}&text=${txtE2}&destination=${destE2}&witness=${witE2}&self=1`;
                    } catch { setVerdictError('Network error'); setVerdictBusy(false); }
                  }}
                  disabled={verdictBusy}
                  className="flex-1 min-h-[44px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97] disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(255,123,123,0.12)', border: '1px solid rgba(255,123,123,0.25)' }}
                >
                  <span className="text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
                    {verdictBusy ? '...' : 'Mark Broken'}
                  </span>
                </button>
              </div>
              {verdictError && (
                <p className="text-[13px] text-center" style={{ color: 'var(--danger)' }}>{verdictError}</p>
              )}
            </div>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // === POST-SHARE: WAITING STATE ===
  if (shared) {
    return (
      <RitualScreen
        footer={
          <button
            onClick={() => {
              setDareSent(false); setShared(false); setDareLink(''); setVowText('');
              setSuggestion(''); setTargetName(''); setSuggestedStake(25);
              setVowId(null); setChallengeAccepted(false); setAcceptedVowDetails(null); setError('');
            }}
            className="min-h-[44px] flex items-center justify-center"
          >
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Dare someone else
            </span>
          </button>
        }
      >
        <FadeUp>
          <div className="text-center mt-6">
            <h1
              className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
              style={{ color: 'var(--text)' }}
            >
              Waiting for {targetName} to respond...
            </h1>
            <p className="text-[15px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              No reply? Send it again or copy the link below.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="flex flex-col gap-2">
            <PrimaryButton label="Send again" onPress={handleShare} />
            <button
              onClick={handleCopyLink}
              className="min-h-[44px] flex items-center justify-center gap-2"
            >
              {copied ? (
                <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
              ) : (
                <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
              <span className="text-[14px] font-semibold" style={{ color: copied ? 'var(--success)' : 'var(--text-secondary)' }}>
                {copied ? 'Copied!' : 'Or copy the link'}
              </span>
            </button>
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <button
            onClick={() => router.push('/dashboard')}
            className="min-h-[44px] flex items-center justify-center"
          >
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Dashboard →</span>
          </button>
        </FadeUp>
      </RitualScreen>
    );
  }

  // === SHARE SCREEN (fallback if native share was cancelled) ===
  if (dareSent) {
    return (
      <RitualScreen
        footer={
          <button
            onClick={() => {
              setDareSent(false);
              setShared(false);
              setDareLink('');
              setVowText('');
              setSuggestion('');
              setTargetName('');
              setSuggestedStake(25);
              setVowId(null);
              setChallengeAccepted(false);
              setError('');
            }}
            className="min-h-[44px] flex items-center justify-center"
          >
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Dare someone else
            </span>
          </button>
        }
      >
        <FadeUp>
          <div className="text-center mt-6">
            <h1
              className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
              style={{ color: 'var(--text)' }}
            >
              Send it to {targetName}.
            </h1>
            <p className="text-[15px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              {targetName} has 48 hours to accept or back down.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="flex flex-col gap-2 mt-2">
            <PrimaryButton label={`Send to ${targetName} →`} onPress={handleShare} />
            <button
              onClick={handleCopyLink}
              className="min-h-[44px] flex items-center justify-center gap-2"
            >
              {copied ? (
                <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
              ) : (
                <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
              <span className="text-[14px] font-semibold" style={{ color: copied ? 'var(--success)' : 'var(--text-secondary)' }}>
                {copied ? 'Copied!' : 'Or copy the link'}
              </span>
            </button>
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <VowPreview text={formattedText} />
        </FadeUp>
      </RitualScreen>
    );
  }

  // === CREATION FORM ===
  return (
    <>
      <RitualScreen
        footer={
          <div>
            <PrimaryButton
              label="Send the dare"
              onPress={handleSendDare}
              disabled={!vowText.trim() || !targetName.trim()}
              loading={sending}
            />
          </div>
        }
      >
        {/* Back to Dashboard */}
        <FadeUp>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 py-2"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Dashboard</span>
          </button>
        </FadeUp>

        {/* Title */}
        <FadeUp delay={0.05}>
          <h1
            className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
            style={{ color: 'var(--text)' }}
          >
            Dare a friend to an Unbreakable Vow
          </h1>
        </FadeUp>

        {/* Vow text */}
        <FadeUp delay={0.1}>
          <RitualCard>
            <SectionLabel>The dare</SectionLabel>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={vowText}
                onChange={(e) => setVowText(e.target.value)}
                placeholder="e.g. No phone for a week"
                rows={3}
                className="w-full bg-transparent text-[16px] leading-[24px] outline-none resize-none"
                style={{ color: 'var(--text)' }}
              />
              {suggestion && suggestion !== vowText && (
                <button
                  onClick={acceptSuggestion}
                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgba(212,162,79,0.08)', border: '1px solid rgba(212,162,79,0.2)' }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: 'var(--gold)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--gold)' }}>{suggestion}</span>
                </button>
              )}
            </div>

            {/* Deadline */}
            <div className="h-px my-2" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-muted)' }}>Ends</span>
              <div className="flex flex-wrap">
                {DEADLINE_PRESETS.map((p) => (
                  <ChoiceChip
                    key={p.label}
                    label={p.label === 'Pick date' ? 'Pick' : p.label}
                    active={deadlineLabel === p.label}
                    onPress={() => handleDeadlineSelect(p.label)}
                  />
                ))}
              </div>
            </div>
            {showCustomDate && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
            )}
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </RitualCard>
        </FadeUp>

        {/* Who are you daring? */}
        <FadeUp delay={0.15}>
          <RitualCard>
            <SectionLabel>Who are you daring?</SectionLabel>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder="First name"
              className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
              style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </RitualCard>
        </FadeUp>

        {/* Suggest a stake */}
        <FadeUp delay={0.2}>
          <RitualCard>
            <SectionLabel>Suggest a stake</SectionLabel>
            <div className="flex flex-wrap">
              {SUGGESTED_STAKES.map((amt) => (
                <ChoiceChip
                  key={amt}
                  label={amt === 0 ? 'Free' : `$${amt}`}
                  active={suggestedStake === amt}
                  onPress={() => setSuggestedStake(amt)}
                />
              ))}
            </div>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              They choose their own stake. This is just a nudge.
            </p>
          </RitualCard>
        </FadeUp>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--danger-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}
      </RitualScreen>

      <AuthModal
        visible={showAuth}
        onDismiss={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
