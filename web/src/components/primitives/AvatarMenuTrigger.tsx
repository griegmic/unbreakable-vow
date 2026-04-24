'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { Home, PlusCircle, Settings, Send } from 'lucide-react';

/**
 * AvatarMenuTrigger — 28px avatar circle with user initial, wrapped in >=44x44 touch target.
 * On tap: opens navigation menu (same links as HamburgerMenu).
 *
 * Sources:
 *   - 08-quick-vow.html .topbar-r .ic (28px, serif gold letter, surface bg, rule border)
 *   - s20-dashboard-*.html .avatar (same pattern)
 *
 * display_name fallback chain (matches auth-provider.tsx):
 *   1. First letter of displayName
 *   2. First letter of email (before @)
 *   3. "?"
 */

interface AvatarMenuTriggerProps {
  displayName: string | null;
  email?: string | null;
}

const links = [
  { label: 'New Vow', icon: PlusCircle, path: '/create' },
  { label: 'My Vows', icon: Home, path: '/dashboard' },
  { label: 'Dare a Friend', icon: Send, path: '/cast' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function AvatarMenuTrigger({ displayName, email }: AvatarMenuTriggerProps) {
  const initial = displayName?.charAt(0)?.toUpperCase()
    || email?.split('@')[0]?.charAt(0)?.toUpperCase()
    || '?';

  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* 44x44 transparent touch target wrapping 28px visual avatar */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          position: 'relative',
          zIndex: menuOpen ? 100000 : 'auto',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--uv-font-serif)',
            fontWeight: 500,
            fontSize: 12,
            color: 'var(--uv-gold)',
          }}
        >
          {initial}
        </div>
      </button>

      {menuOpen && mounted && <MenuPortal onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

function MenuPortal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleNavigate = useCallback((path: string) => {
    onClose();
    router.push(path);
  }, [onClose, router]);

  return createPortal(
    <div className="fixed inset-0 z-[99999]" style={{ touchAction: 'none' }}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="absolute right-4 w-56 rounded-2xl py-2 animate-fade-in"
        style={{
          top: 'max(60px, env(safe-area-inset-top, 0px) + 52px)',
          backgroundColor: '#10141C',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {links.map(({ label, icon: Icon, path }) => {
          const isActive = pathname === path;
          return (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/5"
            >
              <Icon
                className="w-[18px] h-[18px]"
                style={{ color: isActive ? 'var(--gold)' : 'var(--text-muted)' }}
              />
              <span
                className="text-[15px] font-medium"
                style={{ color: isActive ? 'var(--gold)' : 'var(--text)' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
