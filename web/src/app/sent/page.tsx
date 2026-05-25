'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WaxSeal, FrauncesH1, FrauncesSub, GoldCTA, OutlinedGoldCTA, DeliveredPill } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { useVowFlow } from '@/providers/vow-flow';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { supabase } from '@/lib/supabase';

type PostSealTarget = {
  id: string;
  witnessInviteToken?: string | null;
  rawInput?: string;
  refinedText?: string;
  witnessName?: string;
  witnessPhone?: string;
  stakeAmount?: number;
  deadlineIso?: string | null;
  isSelfWitness?: boolean;
  ts?: number;
};

function readPostSealTarget(): PostSealTarget | null {
  try {
    const raw = sessionStorage.getItem('uv-post-seal-target') || localStorage.getItem('uv-post-seal-target');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostSealTarget;
    if (parsed?.id && Date.now() - Number(parsed.ts || 0) < 10 * 60 * 1000) return parsed;
  } catch {}
  return null;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

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
  const [recoveredTarget, setRecoveredTarget] = useState<PostSealTarget | null>(null);
  const [shareFeedback, setShareFeedback] = useState('');
  const [shareSheetAvailable, setShareSheetAvailable] = useState(false);
  const [clientOrigin, setClientOrigin] = useState('');
  // Desktop detection after mount to avoid hydration mismatch.
  // SSR default is mobile (S8/S9). Desktop (S-WEB3) activates after useEffect.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setClientOrigin(window.location.origin);
    setIsDesktop(!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    setShareSheetAvailable(typeof navigator.share === 'function');
  }, []);

  const witnessName = vow.witnessName || recoveredTarget?.witnessName || 'your judge';
  const stakeDollars = vow.rawInput ? (vow.stake?.amount ?? 0) : (recoveredTarget?.stakeAmount ?? 0);
  const vowId = vow.vowId || '';
  const targetVowId = vowId || recoveredTarget?.id || '';
  const witnessInviteToken = vow.witnessInviteToken || recoveredTarget?.witnessInviteToken || '';
  const witnessPhone = vow.witnessPhone || recoveredTarget?.witnessPhone || '';

  const baseUrl = clientOrigin;
  const witnessUrl = witnessInviteToken
    ? `${baseUrl}/w/${witnessInviteToken}`
    : targetVowId
      ? `${baseUrl}/vow/${targetVowId}`
      : baseUrl;

  // V6 universal SMS template — no vow text in body (§1.2)
  const smsBody = stakeDollars > 0
    ? `I just made a vow and put $${stakeDollars} on it — hold me to it!  ${witnessUrl}`
    : `I just made a vow — hold me to it! ${witnessUrl}`;

  // Redirect if no vow state
  useEffect(() => {
    if (!vow.rawInput) {
      const recovered = readPostSealTarget();
      if (recovered) {
        setRecoveredTarget(recovered);
        return;
      }
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
    if (targetVowId) {
      const sentFlag = localStorage.getItem(`uv-sent-${targetVowId}`);
      if (sentFlag) {
        setStateB(true);
        setDeliveredAt(new Date(sentFlag));
      }
    }
  }, [targetVowId]);

  useEffect(() => {
    if (vowId) return;
    const recovered = readPostSealTarget();
    if (recovered) setRecoveredTarget(recovered);
  }, [vowId]);

  useEffect(() => {
    if (!targetVowId || (witnessInviteToken && (vow.rawInput || recoveredTarget?.rawInput))) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('vows')
        .select('id, raw_input, refined_text, witness_name, witness_phone, witness_invite_token, stake_amount, ends_at')
        .eq('id', targetVowId)
        .maybeSingle();

      if (cancelled || !data) return;
      setRecoveredTarget((current) => ({
        id: targetVowId,
        ...current,
        rawInput: current?.rawInput || data.raw_input || '',
        refinedText: current?.refinedText || data.refined_text || '',
        witnessName: current?.witnessName || data.witness_name || '',
        witnessPhone: current?.witnessPhone || data.witness_phone || '',
        witnessInviteToken: current?.witnessInviteToken || data.witness_invite_token || '',
        stakeAmount: current?.stakeAmount ?? Math.round(Number(data.stake_amount || 0) / 100),
        deadlineIso: current?.deadlineIso || data.ends_at || null,
        ts: current?.ts || Date.now(),
      }));
    })();

    return () => { cancelled = true; };
  }, [recoveredTarget?.rawInput, targetVowId, vow.rawInput, witnessInviteToken]);

  const goToVow = useCallback(() => {
    if (targetVowId) {
      try {
        sessionStorage.removeItem('uv-post-seal-target');
        localStorage.removeItem('uv-post-seal-target');
      } catch {}
      router.push(`/vow/${targetVowId}`);
    } else {
      router.push('/dashboard');
    }
  }, [router, targetVowId]);

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
  const markShareAttempted = useCallback((message = 'Link ready. Send it to your judge.') => {
    const now = new Date();
    setStateB(true);
    setDeliveredAt(now);
    setShareFeedback(message);
    if (targetVowId) {
      try { localStorage.setItem(`uv-sent-${targetVowId}`, now.toISOString()); } catch {}
    }
  }, [targetVowId]);

  const copyShareText = useCallback(async (text: string, feedback = 'Link copied. Paste it anywhere.') => {
    const didCopy = await copyTextToClipboard(text);
    if (didCopy) {
      markShareAttempted(feedback);
    } else {
      setShareFeedback('Select the link and copy it manually.');
    }
  }, [markShareAttempted]);

  const copyJudgeLink = useCallback(async () => {
    await copyShareText(witnessUrl, 'Judge link copied. Paste it into any message.');
  }, [copyShareText, witnessUrl]);

  const openShareSheet = useCallback(async () => {
    if (!shareSheetAvailable) {
      await copyShareText(smsBody, 'Judge link copied. Paste it into any message.');
      return;
    }

    try {
      await navigator.share({ text: smsBody, url: witnessUrl });
      markShareAttempted('Share sheet opened.');
    } catch {
      await copyShareText(smsBody, 'Share sheet was closed. Link copied instead.');
    }
  }, [copyShareText, markShareAttempted, shareSheetAvailable, smsBody, witnessUrl]);

  const handleTellWitness = useCallback(async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && witnessPhone) {
      // Open iMessage / SMS with prefilled body
      window.location.href = `sms:${witnessPhone}&body=${encodeURIComponent(smsBody)}`;
      markShareAttempted('Message opened.');
    } else if (isMobile) {
      // No phone — open SMS with no recipient
      window.location.href = `sms:?&body=${encodeURIComponent(smsBody)}`;
      markShareAttempted('Message opened.');
    } else {
      await copyJudgeLink();
    }
  }, [copyJudgeLink, markShareAttempted, smsBody, witnessPhone]);

  // ── S-WEB3: Desktop web variant (§3.9) ──
  // isDesktop is set after mount via useEffect to avoid hydration mismatch.
  // SSR always renders the mobile (S8/S9) path; desktop variant activates client-side.
  if (isDesktop) {
    const vowText = vow.refinedText || vow.rawInput || recoveredTarget?.refinedText || recoveredTarget?.rawInput || '';
    const deadlineIso = vow.deadlineIso || recoveredTarget?.deadlineIso;
    const verdictDate = deadlineIso
      ? new Date(deadlineIso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
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
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1.03,
          color: 'var(--uv-text)',
          margin: '12px 0 14px',
        }}>
          Send your <em style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>judge link.</em>
        </h1>

        <p style={{
          fontFamily: 'var(--uv-font-serif)',
          fontStyle: 'italic',
          fontSize: 14.5,
          lineHeight: 1.45,
          color: 'var(--uv-text-muted)',
          maxWidth: 326,
          marginBottom: 22,
        }}>
          Your vow is sealed. <span style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>Now send this private link to the person who will judge it.</span>
        </p>

        <div style={{
          width: '100%',
          maxWidth: 392,
          borderRadius: 14,
          border: '1px solid rgba(231, 198, 116, 0.34)',
          background: 'linear-gradient(180deg, rgba(231, 198, 116, 0.12), rgba(240, 232, 216, 0.035))',
          padding: '14px 14px 12px',
          marginBottom: 16,
          boxShadow: '0 18px 45px rgba(0,0,0,0.28)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <div style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 9.5,
              fontWeight: 650,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--uv-gold)',
              textAlign: 'left',
            }}>
              Judge link
            </div>
            <div style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 11,
              color: 'var(--uv-text-muted)',
              whiteSpace: 'nowrap',
            }}>
              Private until shared
            </div>
          </div>
          <button
            type="button"
            onClick={copyJudgeLink}
            aria-label="Judge link URL"
            style={{
              width: '100%',
              minHeight: 42,
              border: '1px solid rgba(240, 232, 216, 0.10)',
              borderRadius: 10,
              background: 'rgba(0,0,0,0.22)',
              color: 'var(--uv-text)',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 13,
              lineHeight: 1.25,
              textAlign: 'left',
              padding: '10px 12px',
              cursor: 'copy',
              overflowWrap: 'anywhere',
            }}
          >
            {witnessUrl}
          </button>
          <div style={{
            display: 'grid',
            gridTemplateColumns: shareSheetAvailable ? '1fr 1fr' : '1fr',
            gap: 8,
            marginTop: 10,
          }}>
            <button
              type="button"
              onClick={copyJudgeLink}
              style={{
                height: 44,
                border: 'none',
                borderRadius: 999,
                background: 'var(--uv-gold)',
                color: '#0F0D0A',
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 14,
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              Copy judge link
            </button>
            {shareSheetAvailable && (
              <button
                type="button"
                onClick={openShareSheet}
                style={{
                  height: 44,
                  border: '1px solid rgba(231, 198, 116, 0.36)',
                  borderRadius: 999,
                  background: 'rgba(231, 198, 116, 0.10)',
                  color: 'var(--uv-gold-bright)',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Open share sheet
              </button>
            )}
          </div>
          <div style={{
            minHeight: 17,
            marginTop: 8,
            color: shareFeedback.includes('failed') ? '#f0a58f' : 'var(--uv-text-muted)',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 11.5,
            lineHeight: 1.35,
            textAlign: 'center',
          }}>
            {shareFeedback || 'Copy it, text it, DM it. The judge just needs this link.'}
          </div>
          <button
            type="button"
            onClick={goToVow}
            style={{
              marginTop: 6,
              background: 'none',
              border: 'none',
              color: 'var(--uv-text-dim)',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 11.5,
              cursor: 'pointer',
              padding: 0,
              borderBottom: '1px dotted var(--uv-border-soft)',
            }}
          >
            See vow live
          </button>
        </div>

        {/* Receipt card */}
        <div style={{
          width: '100%',
          maxWidth: 392,
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-border-soft)',
          borderRadius: 12,
          padding: '12px 18px',
          marginBottom: 22,
        }}>
          {[
            { k: 'THE VOW', v: vowText.length > 30 ? vowText.slice(0, 27) + '...' : vowText || 'Your vow' },
            { k: 'STAKE', v: stakeDollars > 0 ? `$${stakeDollars}` : 'No stake' },
            { k: 'VERDICT', v: verdictDate },
            { k: 'JUDGE', v: stateB ? 'Waiting for acceptance' : 'Needs the link', pending: true, showDot: true },
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

        <div style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 10.5,
          lineHeight: 1.45,
          color: 'var(--uv-text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          You can come back after your judge accepts
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
        padding: '96px 30px 28px',
        textAlign: 'center',
      }}
    >
      <div style={{ position: 'fixed', top: 14, left: 18, right: 18, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <button
          type="button"
          onClick={goToVow}
          style={{
            pointerEvents: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--uv-text-muted)',
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 13,
            fontWeight: 650,
            cursor: 'pointer',
            padding: 8,
          }}
        >
          See vow
        </button>
        {isAuthenticated && (
          <div style={{ pointerEvents: 'auto' }}>
            <HamburgerMenu />
          </div>
        )}
      </div>
      {/* Wax Seal */}
      <div style={{ marginBottom: 30, position: 'relative' }}>
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
        <FrauncesH1>{stateB ? `Waiting on ${witnessName}.` : 'Share the judge link.'}</FrauncesH1>
      </div>

      {/* Sub */}
      <div style={{ marginBottom: 24, maxWidth: 310 }}>
        {stateB ? (
          <FrauncesSub>
            They need to tap the link and accept.<br/>Until then, the vow is waiting.
          </FrauncesSub>
        ) : (
          <FrauncesSub>
            Send this to the person who will judge it.<br/>The share sheet is the fastest path.
          </FrauncesSub>
        )}
      </div>

      <button
        type="button"
        onClick={copyJudgeLink}
        aria-label="Judge link URL"
        style={{
          width: '100%',
          maxWidth: 330,
          border: '1px solid rgba(231, 198, 116, 0.26)',
          borderRadius: 18,
          background: 'rgba(231, 198, 116, 0.075)',
          color: 'var(--uv-text-muted)',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 12.5,
          lineHeight: 1.3,
          padding: '13px 14px',
          textAlign: 'center',
          overflowWrap: 'anywhere',
          cursor: 'copy',
        }}
      >
        {witnessUrl}
      </button>
      <div style={{
        minHeight: 18,
        marginTop: 10,
        color: shareFeedback.includes('failed') ? '#f0a58f' : 'var(--uv-text-dim)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 12,
        lineHeight: 1.3,
      }}>
        {shareFeedback || 'Private link ready.'}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* CTA */}
      {stateB ? (
        <>
          <GoldCTA
            label={shareSheetAvailable ? 'Share again →' : 'Copy link again →'}
            onPress={shareSheetAvailable ? openShareSheet : copyJudgeLink}
          />
          <button
            onClick={goToVow}
            style={{
              marginTop: 16,
              background: 'none',
              border: 'none',
              color: 'var(--uv-text-muted)',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 12.5,
              cursor: 'pointer',
              padding: 0,
              borderBottom: '1px dotted var(--uv-border-soft)',
            }}
          >
            See vow live
          </button>
        </>
      ) : (
        <>
          <GoldCTA
            label={shareSheetAvailable ? 'Open share sheet →' : `Text ${witnessName} →`}
            onPress={shareSheetAvailable ? openShareSheet : handleTellWitness}
            variant="filled-imsg-green"
          />
          <button
            onClick={copyJudgeLink}
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
              Copy link instead
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
