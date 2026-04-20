'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { Card } from '@/components/uv/Card';
import { OathCheckbox } from '@/components/uv/OathCheckbox';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type Vow = Database['public']['Tables']['vows']['Row'];
type VerdictChoice = 'kept' | 'broken' | null;
type ViewState = 'choose' | 'confirm' | 'done';

export default function SelfResolvePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vow, setVow] = useState<Vow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sworn, setSworn] = useState(false);
  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [view, setView] = useState<ViewState>('choose');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    const fetchVow = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams(window.location.search);
      const vowId = params.get('id');

      let query = supabase.from('vows')
        .select('*')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'awaiting_verdict']);

      if (vowId) {
        query = query.eq('id', vowId);
      } else {
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data } = await query.maybeSingle();

      if (!data) {
        router.replace('/dashboard');
        return;
      }

      setVow(data);
      setLoading(false);

      const choiceParam = params.get('choice');
      if (choiceParam === 'kept' || choiceParam === 'broken') {
        setChoice(choiceParam);
        setView('confirm');
      }
    };

    fetchVow();
  }, [isAuthenticated, authLoading, router]);

  const handleChoose = (verdict: VerdictChoice) => {
    if (!sworn) return;
    setChoice(verdict);
    setView('confirm');
    setError('');
  };

  const handleConfirm = async () => {
    if (!choice || busyRef.current || !vow) return;
    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      const response = await supabase.functions.invoke('submit-verdict', {
        body: { token: vow.witness_invite_token, verdict: choice },
      });

      const fnError = response.error;
      const fnData = response.data;

      if (fnError) {
        const detail = fnData?.error || fnError.message || 'Unknown error';
        const msg = detail === 'already_judged' ? 'This vow has already been judged.'
          : detail === 'invalid_token' ? 'Could not find this vow.'
          : detail === 'invalid_status' ? 'This vow is not ready for a verdict yet.'
          : detail === 'refund_failed' ? 'Refund could not be processed right now. Please try again in a moment.'
          : typeof detail === 'string' ? detail : 'Verdict submission failed. Please try again.';
        setError(msg);
        busyRef.current = false;
        setBusy(false);
        return;
      }

      if (fnData?.error) {
        const msg = fnData.error === 'already_judged' ? 'This vow has already been judged.'
          : fnData.error === 'refund_failed' ? 'Refund could not be processed right now. Please try again in a moment.'
          : typeof fnData.error === 'string' ? fnData.error : 'Verdict submission failed. Please try again.';
        setError(msg);
        busyRef.current = false;
        setBusy(false);
        return;
      }
    } catch (err) {
      console.error('Verdict exception:', err);
      setError('Network error. Please try again.');
      busyRef.current = false;
      setBusy(false);
      return;
    }

    busyRef.current = false;
    setBusy(false);

    const amountDollars = Math.round(vow.stake_amount / 100);
    const text = encodeURIComponent(vow.refined_text || 'Your vow');
    const dest = encodeURIComponent(vow.destination || '');
    if (choice === 'kept') {
      router.push(`/vow-kept?amount=${amountDollars}&text=${text}&destination=${dest}`);
    } else {
      router.push(`/vow-broken?amount=${amountDollars}&text=${text}&destination=${dest}`);
    }
  };

  const handleBack = () => {
    if (view === 'confirm') {
      setView('choose');
      setChoice(null);
      setError('');
    } else {
      router.back();
    }
  };

  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid var(--uv-gold)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'uv-spin 600ms linear infinite',
            }}
          />
          <style>{`@keyframes uv-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </RitualScreen>
    );
  }

  if (!vow) return null;

  const isZeroStake = vow.stake_amount === 0;
  const stakeDisplay = isZeroStake ? '' : `$${Math.round(vow.stake_amount / 100)}`;
  const destination = vow.destination || 'charity';

  // Confirmation view
  if (view === 'confirm') {
    const isKept = choice === 'kept';
    return (
      <RitualScreen variant={isKept ? 'outcome-kept' : 'outcome-broken'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 40 }}>
          <h1
            style={{
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 32,
              fontWeight: 500,
              color: 'var(--uv-text)',
              textAlign: 'center',
            }}
          >
            {isKept ? 'You kept your word.' : 'Honest. Respect.'}
          </h1>
          <p
            style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 15,
              color: 'var(--uv-text-muted)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {isKept
              ? (isZeroStake ? 'Word honored.' : `${stakeDisplay} stays safe. No charge.`)
              : (isZeroStake ? 'The record stands. This cannot be undone.' : `${stakeDisplay} will be donated to ${destination}. This cannot be undone.`)
            }
          </p>

          {error && (
            <div style={{ background: 'var(--uv-danger-bg)', borderRadius: 12, padding: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--uv-danger)', textAlign: 'center', margin: 0 }}>{error}</p>
            </div>
          )}

          <PrimaryButton onClick={handleConfirm} loading={busy}>Confirm</PrimaryButton>
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--uv-text-muted)',
              fontSize: 14,
              fontWeight: 500,
              padding: '12px 0',
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
            }}
          >
            Go back
          </button>
        </div>
      </RitualScreen>
    );
  }

  // Main choose view
  return (
    <RitualScreen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 24 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 32,
              fontWeight: 500,
              color: 'var(--uv-text)',
              lineHeight: 1.2,
            }}
          >
            Only you know.
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
            No one else can answer this for you.
          </p>
        </div>

        {/* Vow card */}
        <Card variant="elevated">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p
              style={{
                fontSize: 17,
                fontFamily: 'var(--uv-font-serif)',
                fontWeight: 500,
                color: 'var(--uv-text)',
                margin: 0,
              }}
            >
              {vow.refined_text}
            </p>
            <div style={{ height: 1, background: 'var(--uv-border-strong)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>At stake</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>{stakeDisplay || 'Honor only'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>If broken</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>Donated to {destination}</span>
            </div>
          </div>
        </Card>

        {/* Oath */}
        <Card>
          <OathCheckbox
            checked={sworn}
            onChange={setSworn}
            label="I swear to tell the truth, even if it costs me money."
          />
        </Card>

        {/* Verdict choice cards */}
        {sworn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => handleChoose('kept')}
              disabled={busy}
              style={{
                width: '100%',
                borderRadius: 'var(--uv-radius-2xl)',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                textAlign: 'left',
                background: 'rgba(82,214,154,0.08)',
                border: '1.5px solid rgba(82,214,154,0.3)',
                cursor: 'pointer',
                transition: 'transform 120ms',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(82,214,154,0.15)',
                  fontSize: 24,
                }}
              >
                &#x2714;
              </div>
              <div>
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--uv-status-active)', display: 'block', fontFamily: 'var(--uv-font-sans)' }}>I kept my vow</span>
                <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
                  {isZeroStake ? 'Word honored.' : `${stakeDisplay} stays safe.`}
                </span>
              </div>
            </button>

            <button
              onClick={() => handleChoose('broken')}
              disabled={busy}
              style={{
                width: '100%',
                borderRadius: 'var(--uv-radius-2xl)',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                textAlign: 'left',
                background: 'rgba(248,113,113,0.08)',
                border: '1.5px solid rgba(248,113,113,0.3)',
                cursor: 'pointer',
                transition: 'transform 120ms',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(248,113,113,0.15)',
                  fontSize: 24,
                }}
              >
                &#x2717;
              </div>
              <div>
                <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--uv-danger)', display: 'block', fontFamily: 'var(--uv-font-sans)' }}>I broke it</span>
                <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
                  {isZeroStake ? 'The record stands.' : `${stakeDisplay} goes to ${destination}.`}
                </span>
              </div>
            </button>
          </div>
        ) : (
          <p
            style={{
              textAlign: 'center',
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--uv-text-muted)',
              fontFamily: 'var(--uv-font-sans)',
              margin: 0,
            }}
          >
            Take the oath to unlock your verdict.
          </p>
        )}
      </div>
    </RitualScreen>
  );
}
