'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen, RitualCard, FrauncesH1, FrauncesSub, GoldCTA } from '@/components/primitives';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';

/**
 * Settings — §6.1
 *
 * Six RitualCard sections: Account, Notifications, Payment, Defaults, Legal, Danger zone.
 * Account / Legal / Danger zone are functional. Others render as "Coming soon" shells.
 * Autosave on blur for editable fields. Delete account modal per §6.1.1.
 */

// ── Section header ──
function SectionLabel({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.18em', textTransform: 'uppercase' as const,
      color: 'var(--uv-text-dim)',
    }}>
      {children}
    </span>
  );
}

// ── Row inside a RitualCard ──
function SettingsRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 14 }}>
      <span style={{ color: 'var(--uv-text-muted)' }}>{label}</span>
      <span style={{ color: dim ? 'var(--uv-text-dim)' : 'var(--uv-text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ── Disabled toggle row (shell) ──
function ToggleRow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 14 }}>
      <span style={{ color: 'var(--uv-text-muted)' }}>{label}</span>
      <div
        aria-disabled="true"
        role="switch"
        aria-checked="false"
        aria-label={`${label} (coming soon)`}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: 'var(--uv-bg-elevated)', border: '1px solid var(--uv-border)',
          position: 'relative', cursor: 'not-allowed',
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--uv-text-dim)', position: 'absolute', top: 2, left: 2,
        }} />
      </div>
    </div>
  );
}

// ── Radio row (shell) ──
function RadioRow({ label, selected }: { label: string; selected?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--uv-font-sans)', fontSize: 14 }}>
      <div
        aria-disabled="true"
        role="radio"
        aria-checked={selected ? 'true' : 'false'}
        aria-label={`${label} (coming soon)`}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          border: `2px solid ${selected ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'not-allowed',
        }}
      >
        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--uv-gold)' }} />}
      </div>
      <span style={{ color: 'var(--uv-text-muted)' }}>{label}</span>
    </div>
  );
}

// ── "Coming soon" pill ──
function ComingSoonPill() {
  return (
    <span style={{
      fontFamily: 'var(--uv-font-sans)', fontSize: 9, fontWeight: 600,
      letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      color: 'var(--uv-text-dim)', background: 'var(--uv-bg-elevated)',
      padding: '3px 8px', borderRadius: 9999,
    }}>
      Coming soon
    </span>
  );
}

// ── Delete Account Modal (§6.1.1) ──
function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfirmed = confirmText === 'DELETE';

  // Focus trap + escape key
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Reset on close
  useEffect(() => {
    if (!open) { setConfirmText(''); setError(null); }
  }, [open]);

  const handleDelete = useCallback(async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed');

      await signOut();
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Your account is intact.');
      setDeleting(false);
    }
  }, [isConfirmed, deleting, signOut, router]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        ref={modalRef}
        style={{
          width: '100%', maxWidth: 360,
          background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border)',
          borderRadius: 18, padding: '28px 24px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        <h2
          id="delete-modal-title"
          style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 28, fontWeight: 500,
            fontStyle: 'italic', fontVariationSettings: '"opsz" 144',
            color: 'var(--uv-text)', margin: 0, textAlign: 'center',
          }}
        >
          Are you sure?
        </h2>

        <p style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 15, fontStyle: 'italic',
          color: 'var(--uv-text-muted)', margin: 0, textAlign: 'center', lineHeight: 1.5,
        }}>
          Your record will be lost. Vows that are still active will void and refund automatically.
        </p>

        <div>
          <label
            htmlFor="delete-confirm-input"
            style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12, fontWeight: 500,
              color: 'var(--uv-text-dim)', display: 'block', marginBottom: 8,
            }}
          >
            Type DELETE to confirm
          </label>
          <input
            ref={inputRef}
            id="delete-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%', padding: '10px 14px',
              fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 600,
              letterSpacing: '0.15em',
              background: 'var(--uv-bg)', color: 'var(--uv-text)',
              border: `1.5px solid ${isConfirmed ? 'var(--uv-danger)' : 'var(--uv-border-strong)'}`,
              borderRadius: 10, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 13,
            color: 'var(--uv-danger)', margin: 0, textAlign: 'center',
          }}>
            {error}
          </p>
        )}

        {/* Destructive primary */}
        <button
          onClick={handleDelete}
          disabled={!isConfirmed || deleting}
          style={{
            width: '100%', height: 50, borderRadius: 12,
            border: 'none', cursor: isConfirmed && !deleting ? 'pointer' : 'not-allowed',
            background: isConfirmed && !deleting ? 'var(--uv-danger)' : 'var(--uv-bg-elevated)',
            color: isConfirmed && !deleting ? '#FFFFFF' : 'var(--uv-text-dim)',
            fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 600,
            opacity: isConfirmed && !deleting ? 1 : 0.5,
            transition: 'background 120ms, opacity 120ms',
          }}
        >
          {deleting ? 'Deleting...' : 'Delete my account'}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            fontFamily: 'var(--uv-font-sans)', fontSize: 14,
            color: 'var(--uv-text-muted)', cursor: 'pointer', padding: 0,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Inline-editable display name ──
function EditableName({ initial, userId }: { initial: string; userId: string }) {
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(false);

  const handleBlur = useCallback(async () => {
    const trimmed = name.trim();
    if (trimmed === initial || !trimmed) {
      setName(initial);
      return;
    }
    await supabase.from('users').update({ display_name: trimmed }).eq('id', userId);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [name, initial, userId]);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-text-muted)' }}>
        Display name
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          aria-label="Display name"
          style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500,
            color: 'var(--uv-text)', background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--uv-border)', outline: 'none',
            padding: '2px 0', textAlign: 'right', width: 140,
          }}
        />
        {saved && (
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 500,
            color: 'var(--uv-gold)', animation: 'uv-fade-up 1.5s ease forwards',
          }}>
            Saved ✓
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main page ──
export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, displayName, session, signOut, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const phone = session?.user?.phone || '';
  const email = session?.user?.email || '';

  return (
    <RitualScreen variant="utility">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 16, paddingBottom: 40 }}>
        {/* Header — back + wordmark (matches dashboard pattern) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
            style={{
              background: 'none', border: 'none',
              color: 'var(--uv-text-muted)', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--uv-font-sans)',
              padding: '4px 0',
            }}
          >
            &larr; Dashboard
          </button>
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 13, fontStyle: 'italic',
            fontVariationSettings: '"opsz" 144', color: 'var(--uv-gold)',
          }}>
            Unbreakable Vow
          </span>
        </div>

        {/* H1 */}
        <FrauncesH1 italic size="lg">Settings.</FrauncesH1>

        {!isAuthenticated && !authLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
            <FrauncesSub>Not signed in</FrauncesSub>
            <GoldCTA label="Sign in" onPress={() => setShowAuth(true)} />
          </div>
        ) : isAuthenticated ? (
          <>
            {/* §6.1 — ACCOUNT (functional) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionLabel>Account</SectionLabel>
              <RitualCard>
                <EditableName
                  initial={displayName || 'User'}
                  userId={session?.user?.id || ''}
                />
                {phone && <SettingsRow label="Phone" value={phone} />}
                {email && <SettingsRow label="Email" value={email} />}
              </RitualCard>
            </div>

            {/* §6.1 — NOTIFICATIONS (shell) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionLabel>Notifications</SectionLabel>
                <ComingSoonPill />
              </div>
              <RitualCard>
                <ToggleRow label="Push notifications" />
                <ToggleRow label="Verdict day reminders" />
                <ToggleRow label="Witness updates" />
              </RitualCard>
            </div>

            {/* §6.1 — PAYMENT (shell) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionLabel>Payment</SectionLabel>
                <ComingSoonPill />
              </div>
              <RitualCard>
                <SettingsRow label="Saved card" value="•••• •••• •••• ••••" dim />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    disabled
                    aria-disabled="true"
                    aria-label="Manage cards (coming soon)"
                    style={{
                      background: 'none', border: 'none',
                      fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                      color: 'var(--uv-text-dim)', cursor: 'not-allowed', padding: 0,
                    }}
                  >
                    Manage →
                  </button>
                </div>
              </RitualCard>
            </div>

            {/* §6.1 — DEFAULTS (shell) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionLabel>Defaults</SectionLabel>
                <ComingSoonPill />
              </div>
              <RitualCard>
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-muted)', marginBottom: 4 }}>
                  Default stake
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <RadioRow label="$10" />
                  <RadioRow label="$25" selected />
                  <RadioRow label="$50" />
                  <RadioRow label="$100" />
                </div>
              </RitualCard>
            </div>

            {/* §6.1 — LEGAL (functional) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionLabel>Legal</SectionLabel>
              <RitualCard>
                <a
                  href="/terms"
                  style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500,
                    color: 'var(--uv-text)', textDecoration: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>Terms of Service</span>
                  <span style={{ color: 'var(--uv-text-dim)' }}>&rsaquo;</span>
                </a>
                <a
                  href="/privacy"
                  style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500,
                    color: 'var(--uv-text)', textDecoration: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>Privacy Policy</span>
                  <span style={{ color: 'var(--uv-text-dim)' }}>&rsaquo;</span>
                </a>
              </RitualCard>
            </div>

            {/* §6.1 — DANGER ZONE (functional) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionLabel>Danger zone</SectionLabel>
              <RitualCard>
                <button
                  onClick={() => { signOut(); router.push('/'); }}
                  style={{
                    background: 'none', border: 'none',
                    fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                    color: 'var(--uv-text-dim)', cursor: 'pointer',
                    padding: 0, textAlign: 'left',
                  }}
                >
                  Sign out
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    background: 'none', border: 'none',
                    fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                    color: 'var(--uv-danger)', cursor: 'pointer',
                    padding: 0, textAlign: 'left',
                  }}
                >
                  Delete account
                </button>
              </RitualCard>
            </div>
          </>
        ) : null}
      </div>

      <AuthModal
        visible={showAuth}
        onDismiss={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />

      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </RitualScreen>
  );
}
