'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Home, PlusCircle, LayoutDashboard, Settings, History, Zap } from 'lucide-react';

export function HamburgerMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click (ignore clicks on button or panel)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const links = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Quick Vow', icon: Zap, path: '/?new=1' },
    { label: 'New Vow', icon: PlusCircle, path: '/create' },
    { label: 'History', icon: History, path: '/history' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-80"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {open
          ? <X className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
          : <Menu className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
        }
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div
            ref={panelRef}
            className="fixed right-4 top-14 w-52 rounded-2xl py-2 z-[9999] safe-top"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
            }}
          >
            {links.map(({ label, icon: Icon, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:opacity-80"
              >
                <Icon className="w-[18px] h-[18px]" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
