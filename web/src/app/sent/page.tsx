'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WaxSeal, FrauncesH1, FrauncesSub, GoldCTA, OutlinedGoldCTA, DeliveredPill, EyebrowTag } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';

/**
 * S8 · Sealed (state A) + S9 · Sealed (state B — returned from Messages)
 * S-WEB3 · Web sealed (desktop/non-iMessage variant)
 *
 * V6 CANONICAL — pixel-match targets:
 *   State A (mobile):  flow/html/05i-sealed-v6.html
 *   State B (mobile):  flow/html/05i-sealed-v6-sent.html
 *   Web variant:       flow/html/web-06-sealed.html
 *
 * §3.1 S8/S9 spec: visibilitychange triggers A→B transition.
 * §3.9 S-WEB3: desktop web shows vow summary receipt + share link.
 */
export default function SentPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { vow } = useVowFlow();
  const [stateB, setStateB] = useState(false);
  const [deliveredAt, setDeliveredAt] = useState<Date | null>(null);
  const [showDonePrompt, setShowDonePrompt] = useState(false);
  // Desktop detection after mount to avoid hydration mismatch.
  // SSR default is mobile (S8/S9). Desktop (S-WEB3) activates after useEffect.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const witnessName = vow.witnessName || 'your witness';
  const stake = vow.stake?.amount ?? 0;
  const stakeDollars = Math.round(stake / 100);
  const vowId = vow.vowId || '';
  const witnessInviteToken = vow.witnessInviteToken || '';

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const witnessUrl = `${baseUrl}/w/${witnessInviteToken}`;

  // V6 universal SMS template — no vow text in body (§1.2)
  const smsBody = stakeDollars > 0
    ? `I just made a vow and put $${stakeDollars} on it — hold me to it!  ${witnessUrl}`
    : `I just made a vow — hold me to it! ${witnessUrl}`;

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

  // Check if already in state B (persisted via localStorage)
  useEffect(() => {
    if (vowId) {
      const sentFlag = localStorage.getItem(`uv-sent-${vowId}`);
      if (sentFlag) {
        setStateB(true);
        setDeliveredAt(new Date(sentFlag));
      }
    }
  }, [vowId]);

  // Listen for visibilitychange — A→B transition (§3.1 S9)
  useEffect(() => {
    if (stateB) return;
    let wasHidden = false;
    const handleVisibility = () => {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        setStateB(true);
        setDeliveredAt(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // iOS Safari reliability: also listen to pageshow
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setStateB(true);
        setDeliveredAt(new Date());
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [stateB]);

  // Show "Done?" prompt after 10s in state B
  useEffect(() => {
    if (!stateB) return;
    const t = setTimeout(() => setShowDonePrompt(true), 10000);
    return () => clearTimeout(t);
  }, [stateB]);

  // State A: "Tell witness" handler
  const handleTellWitness = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && vow.witnessPhone) {
      // Open iMessage / SMS with prefilled body
      window.location.href = `sms:${vow.witnessPhone}&body=${encodeURIComponent(smsBody)}`;
    } else if (isMobile) {
      // No phone — open SMS with no recipient
      window.location.href = `sms:?&body=${encodeURIComponent(smsBody)}`;
    } else {
      // Desktop — use navigator.share or fallback to copy
      if (navigator.share) {
        navigator.share({ text: smsBody, url: witnessUrl }).catch(() => {});
      } else {
        navigator.clipboard.writeText(smsBody);
      }
    }
  }, [smsBody, witnessUrl, vow.witnessPhone]);

  // "or share link here" handler
  const handleShareFallback = useCallback(async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
      try { await navigator.share({ text: smsBody, url: witnessUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(witnessUrl);
    }
  }, [smsBody, witnessUrl]);

  // ── S-WEB3: Desktop web variant (§3.9) ──
  // isDesktop is set after mount via useEffect to avoid hydration mismatch.
  // SSR always renders the mobile (S8/S9) path; desktop variant activates client-side.
  if (isDesktop) {
    const vowText = vow.refinedText || vow.rawInput || '';
    const verdictDate = vow.deadlineIso
      ? new Date(vow.deadlineIso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : 'TBD';

    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#0F0D0A',
          backgroundImage: 'radial-gradient(ellipse 700px 500px at 50% 35%, rgba(200,155,60,0.14), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(200,155,60,0.05), transparent 70%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '60px 22px 22px',
          textAlign: 'center',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        {/* Seal */}
        <div style={{ marginBottom: 28 }}>
          <WaxSeal size="lg" showHalo />
        </div>

        {/* Em-dash stamp per mock — not an EyebrowTag pill */}
        <span style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
          color: 'var(--uv-gold)',
        }}>
          — Sealed —
        </span>

        <h1 style={{
          fontFamily: 'var(--uv-font-serif)',
          fontVariationSettings: '"opsz" 144',
          fontSize: 38,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'var(--uv-text)',
          margin: '12px 0 14px',
        }}>
          It&apos;s <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>done.</em>
        </h1>

        <p style={{
          fontFamily: 'var(--uv-font-serif)',
          fontStyle: 'italic',
          fontSize: 14,
          lineHeight: 1.45,
          color: 'var(--uv-text-muted)',
          maxWidth: 290,
          marginBottom: 22,
        }}>
          Your word is on the line. <span style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>Whoever taps the link becomes your witness.</span>
        </p>

        {/* Receipt card */}
        <div style={{
          width: '100%',
          maxWidth: 340,
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-border-soft)',
          borderRadius: 12,
          padding: '12px 18px',
          marginBottom: 22,
        }}>
          {[
            { k: 'THE VOW', v: vowText.length > 30 ? vowText.slice(0, 27) + '...' : vowText || 'Your vow' },
            { k: 'ON HOLD', v: stakeDollars > 0 ? `$${stakeDollars}` : 'No stake' },
            { k: 'VERDICT', v: verdictDate },
            { k: 'WITNESS', v: `Sent · waiting on tap`, pending: true, showDot: true },
          ].map((row, i) => (
            <div key={row.k} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              lineHeight: 1.2,
              borderTop: i > 0 ? '1px dashed var(--uv-border-soft)' : 'none',
            }}>
              <span style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--uv-text-dim)',
              }}>{row.k}</span>
              <span style={{
                fontFamily: 'var(--uv-font-serif)',
                fontSize: row.pending ? 12.5 : 13.5,
                fontWeight: row.pending ? 400 : 500,
                fontStyle: row.pending ? 'italic' : 'normal',
                color: row.pending ? 'var(--uv-gold-bright)' : 'var(--uv-text)',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '-0.005em',
              }}>
                {'showDot' in row && row.showDot && (
                  <span style={{
                    display: 'inline-block',
                    width: 5, height: 5,
                    borderRadius: '50%',
                    background: 'var(--uv-gold-bright)',
                    marginRight: 6,
                    verticalAlign: 'middle',
                    boxShadow: '0 0 5px var(--uv-gold-bright)',
                  }} />
                )}
                {row.v}
              </span>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div style={{ width: '100%' }}>
          <GoldCTA
            label="See your vow live →"
            onPress={() => router.push(vowId ? `/vow/${vowId}` : '/dashboard')}
          />
          <div style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'center',
            marginTop: 8,
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 11.5,
            lineHeight: 1.2,
            color: 'var(--uv-text-dim)',
          }}>
            <button
              onClick={() => navigator.clipboard.writeText(witnessUrl)}
              style={{ background: 'none', border: 'none', color: 'var(--uv-text-muted)', fontSize: 11.5, lineHeight: 1.2, cursor: 'pointer', borderBottom: '1px dotted var(--uv-border-soft)', paddingBottom: 1, padding: 0 }}
            >
              Resend the link
            </button>
            <span>·</span>
            <button
              onClick={handleShareFallback}
              style={{ background: 'none', border: 'none', color: 'var(--uv-text-muted)', fontSize: 11.5, lineHeight: 1.2, cursor: 'pointer', borderBottom: '1px dotted var(--uv-border-soft)', paddingBottom: 1, padding: 0 }}
            >
              Send to someone else
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── S8/S9: Mobile variant ──
  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'hidden',
        background: '#0F0D0A',
        backgroundImage: stateB
          ? 'radial-gradient(ellipse 620px 480px at 50% 32%, rgba(200,155,60,0.18), transparent 62%), radial-gradient(ellipse 900px 500px at 50% 100%, rgba(200,155,60,0.06), transparent 70%)'
          : 'radial-gradient(ellipse 620px 480px at 50% 32%, rgba(200,155,60,0.16), transparent 62%), radial-gradient(ellipse 900px 500px at 50% 100%, rgba(200,155,60,0.05), transparent 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '120px 36px 30px',
        textAlign: 'center',
      }}
    >
      {/* Wax Seal */}
      <div style={{ marginBottom: 40, position: 'relative' }}>
        <WaxSeal size="lg" showHalo showCheck={stateB} />
      </div>

      {/* State B: Delivered pill */}
      {stateB && deliveredAt && (
        <div style={{ marginBottom: 20 }}>
          <DeliveredPill timestamp={deliveredAt} />
        </div>
      )}

      {/* H1 */}
      <div style={{ marginBottom: 16 }}>
        <FrauncesH1>{stateB ? `Over to ${witnessName}.` : 'Sealed.'}</FrauncesH1>
      </div>

      {/* Sub */}
      <div style={{ marginBottom: 40, maxWidth: 300 }}>
        {stateB ? (
          <FrauncesSub>
            They&apos;ve got <span style={{ color: 'var(--uv-gold-bright)', fontWeight: 500, fontStyle: 'italic' }}>24 hours</span> to accept.<br/>Heckle them until they do.
          </FrauncesSub>
        ) : (
          <FrauncesSub>
            Now tell <span style={{ color: 'var(--uv-gold)', fontWeight: 500, fontStyle: 'italic' }}>{witnessName}</span>.<br/>They don&apos;t know yet.
          </FrauncesSub>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* CTA */}
      {stateB ? (
        <OutlinedGoldCTA
          label="See your vow →"
          onPress={() => router.push(vowId ? `/vow/${vowId}` : '/dashboard')}
        />
      ) : (
        <>
          <GoldCTA
            label={`Tell ${witnessName} →`}
            onPress={handleTellWitness}
            variant="filled-imsg-green"
          />
          <button
            onClick={handleShareFallback}
            style={{
              marginTop: 18,
              background: 'none',
              border: 'none',
              color: 'var(--uv-text-dim)',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 12.5,
              lineHeight: 1.2,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span style={{
              color: 'var(--uv-text-muted)',
              borderBottom: '1px dotted var(--uv-border-soft)',
              paddingBottom: 1,
            }}>
              or share link here
            </span>
          </button>
        </>
      )}

      {/* "Done?" prompt after 10s in state B */}
      {showDonePrompt && stateB && (
        <div style={{ marginTop: 18 }}>
          <FrauncesSub dim>Done? See your vow →</FrauncesSub>
        </div>
      )}

      {/* Footer micro */}
      <div style={{ marginTop: stateB ? 20 : 24, fontSize: 10.5, lineHeight: 1.5 }}>
        <span
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 10.5,
            lineHeight: 1.5,
            color: 'var(--uv-text-dim)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Nothing charges unless you break it
        </span>
      </div>
    </div>
  );
}
