'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Link2, Check } from 'lucide-react';
import { RitualScreen, FrauncesH1, FrauncesSub } from '@/components/primitives';
import { useVowFlow } from '@/providers/vow-flow';
import { formalizeVow } from '@/lib/vow-logic';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

/**
 * S4 · Witness pick — §3.4
 *
 * Device-aware two-option layout:
 *   Mobile (navigator.share available): "Text a friend" → share sheet → push /seal
 *   Desktop (no share): "Copy invite link" → clipboard + inline confirmation → push /seal
 *   Both: "No witness — just my word" → switchToSolo() → push /seal
 *
 * Device detection via navigator.share feature check (not UA sniffing).
 * SSR defaults to mobile to avoid hydration mismatch.
 */

export default function WitnessPage() {
  const router = useRouter();
  const { vow, activeVowText, setWitnessName, setWitnessType, setWitnessInviteToken, setVowId, switchToSolo } = useVowFlow();
  const { isAuthenticated, session } = useAuth();

  // Device detection: SSR = mobile (safe default), client = feature check
  const [canShare, setCanShare] = useState<boolean | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Desktop copy feedback state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!vow.rawInput) {
      try {
        const stored = localStorage.getItem('unbreakable-vow-flow');
        if (stored && JSON.parse(stored).rawInput) return;
      } catch {}
      router.replace('/');
    }
  }, [vow.rawInput, router]);

  const ensureDraftForWitness = useCallback(async (token: string): Promise<boolean> => {
    const s = session || (await supabase.auth.getSession()).data.session;
    if (!s) return false;

    await supabase.from('users').upsert(
      { id: s.user.id, display_name: (s.user.user_metadata?.full_name as string) || s.user.email?.split('@')[0] || null },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    const endDate = vow.deadlineIso ? new Date(vow.deadlineIso) : new Date(Date.now() + 7 * 86400000);
    const payload = {
      refined_text: activeVowText,
      witness_name: 'Your witness',
      witness_phone: vow.witnessPhone || null,
      witness_invite_token: token,
      stake_amount: vow.stake.amount * 100,
      consequence: vow.stake.consequence,
      destination: vow.stake.destination,
      ends_at: endDate.toISOString(),
    };

    if (vow.vowId) {
      const { data, error } = await supabase.from('vows')
        .update(payload)
        .eq('id', vow.vowId)
        .eq('status', 'draft')
        .select('id, witness_invite_token')
        .maybeSingle();

      if (!error && data?.id) {
        setVowId(data.id, data.witness_invite_token || token);
        return true;
      }
    }

    const { data, error } = await supabase.from('vows').insert({
      user_id: s.user.id,
      raw_input: vow.rawInput,
      status: 'draft',
      starts_at: new Date().toISOString(),
      ...payload,
    }).select('id, witness_invite_token').single();

    if (error || !data) {
      console.error('[witness] draft creation failed before share:', error);
      return false;
    }

    setVowId(data.id, data.witness_invite_token || token);
    return true;
  }, [activeVowText, session, setVowId, vow]);

  // Shared: generate invite text + URL, set witness state
  const prepareWitness = useCallback(async () => {
    const token = vow.witnessInviteToken || crypto.randomUUID();
    setWitnessName('Your witness');
    setWitnessType('friend');
    setWitnessInviteToken(token);

    const vowText = (vow.refinedText || formalizeVow(vow.rawInput)).replace(/\.$/, '');
    const witnessUrl = `${window.location.origin}/w/${token}`;
    const stakeHook = vow.stake.amount > 0 ? ` and put $${vow.stake.amount} on it` : '';
    const shareText = `I just made a vow to ${vowText.toLowerCase()}${stakeHook}. You're my witness: ${witnessUrl}`;

    if (isAuthenticated) {
      const ready = await ensureDraftForWitness(token);
      if (!ready) {
        try { localStorage.setItem('uv-share-witness-after-auth', '1'); } catch {}
        router.push('/seal?shareWitness=1');
        return null;
      }
    } else {
      try { localStorage.setItem('uv-share-witness-after-auth', '1'); } catch {}
      router.push('/seal?shareWitness=1');
      return null;
    }

    return { shareText, witnessUrl };
  }, [ensureDraftForWitness, isAuthenticated, router, vow, setWitnessName, setWitnessType, setWitnessInviteToken]);

  // Mobile: share sheet → push /seal
  const handleMobileShare = useCallback(async () => {
    const prepared = await prepareWitness();
    if (!prepared) return;
    const { shareText } = prepared;
    if (navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    }
    router.push('/seal');
  }, [prepareWitness, router]);

  // Desktop: copy to clipboard → show confirmation → auto-push /seal after 1.5s
  const handleDesktopCopy = useCallback(async () => {
    if (copied) return; // Already in copied state
    const prepared = await prepareWitness();
    if (!prepared) return;
    const { shareText } = prepared;
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      // Clipboard failed — push anyway, user can share later
    }
    setCopied(true);
    setTimeout(() => router.push('/seal'), 1500);
  }, [copied, prepareWitness, router]);

  const handleSolo = () => {
    switchToSolo();
    router.push('/seal');
  };

  // Card content based on device + copy state
  const shareAvailable = canShare ?? true;

  const primaryIcon = shareAvailable
    ? <Users style={{ width: 22, height: 22, color: 'var(--uv-gold-bright)' }} />
    : copied
      ? <Check style={{ width: 22, height: 22, color: 'var(--uv-success)' }} />
      : <Link2 style={{ width: 22, height: 22, color: 'var(--uv-gold-bright)' }} />;

  const primaryTitle = shareAvailable
    ? 'Text a friend'
    : copied ? 'Link copied ✓' : 'Copy invite link';

  const primarySub = shareAvailable
    ? "They'll decide if you kept your word"
    : copied ? 'Now send it to them however you want' : 'Paste it anywhere to send to your witness';

  const primaryHandler = shareAvailable ? handleMobileShare : handleDesktopCopy;

  const primaryBorder = copied
    ? '1.5px solid var(--uv-success-border)'
    : '1.5px solid var(--uv-border-strong)';

  const primaryTitleColor = copied ? 'var(--uv-success)' : 'var(--uv-gold-bright)';

  return (
    <RitualScreen variant="utility">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
        {/* Back */}
        <button
          onClick={() => router.push('/stake')}
          aria-label="Go back"
          style={{
            background: 'none', border: 'none',
            color: 'var(--uv-text-muted)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--uv-font-sans)',
            padding: '4px 0', alignSelf: 'flex-start',
          }}
        >
          &larr; Back
        </button>

        <FrauncesH1 italic size="page">Who&apos;s holding you to it?</FrauncesH1>
        <FrauncesSub>Pick someone who won&apos;t let you off the hook.</FrauncesSub>

        <div style={{
          borderLeft: '2px solid var(--uv-gold-line)',
          padding: '2px 0 2px 12px',
          marginTop: -4,
        }}>
          <p style={{
            margin: 0,
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 15,
            lineHeight: 1.45,
            color: 'var(--uv-text-muted)',
          }}>
            They get the invite now and the verdict link when your deadline hits.
          </p>
        </div>

        {/* Primary option — device-aware */}
        <button
          onClick={primaryHandler}
          disabled={copied}
          style={{
            width: '100%', borderRadius: 22, padding: 18,
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
            background: 'var(--uv-bg-card)',
            border: primaryBorder,
            boxShadow: copied ? 'none' : '0 6px 14px var(--uv-gold-glow)',
            cursor: copied ? 'default' : 'pointer',
            transition: 'transform 100ms, border-color 200ms',
          }}
          onMouseDown={(e) => { if (!copied) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            background: copied ? 'var(--uv-success-bg)' : 'var(--uv-gold-bg)',
            border: `1px solid ${copied ? 'var(--uv-success-border)' : 'var(--uv-border-strong)'}`,
          }}>
            {primaryIcon}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 18, fontWeight: 750,
              color: primaryTitleColor, display: 'block',
              letterSpacing: '0',
            }}>
              {primaryTitle}
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 15, marginTop: 3,
              display: 'block', lineHeight: '21px', color: 'var(--uv-text-muted)',
            }}>
              {primarySub}
            </span>
          </div>
          {!copied && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--uv-gold-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>

        {/* Solo option */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingTop: 20, paddingBottom: 24 }}>
          <button
            onClick={handleSolo}
            style={{
              background: 'none', border: 'none', padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 15,
              color: 'var(--uv-text-muted)',
            }}>
              No witness — just my word
            </span>
          </button>
        </div>
      </div>
    </RitualScreen>
  );
}
