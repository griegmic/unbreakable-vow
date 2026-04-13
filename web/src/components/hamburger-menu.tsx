'use client';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Home, PlusCircle, History, Settings, Zap } from 'lucide-react';

const links = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'Quick Vow', icon: Zap, path: '/?new=1' },
  { label: 'New Vow', icon: PlusCircle, path: '/create' },
  { label: 'History', icon: History, path: '/history' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

function MenuPortal({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) {
  const pathname = usePathname();

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[99999]" style={{ touchAction: 'none' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Panel */}
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
          const isActive = pathname === path || (path === '/?new=1' && pathname === '/');
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
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

export function HamburgerMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleClose = useCallback(() => setOpen(false), []);
  const handleNavigate = useCallback((path: string) => {
    setOpen(false);
    router.push(path);
  }, [router]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-80 shrink-0"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          position: 'relative',
          zIndex: open ? 100000 : 'auto',
        }}
      >
        {open
          ? <X className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
          : <Menu className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
        }
      </button>

      {open && mounted && <MenuPortal onClose={handleClose} onNavigate={handleNavigate} />}
    </>
  );
}
