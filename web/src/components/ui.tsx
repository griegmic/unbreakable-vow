'use client';
import { ArrowLeft, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';

export function RitualScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative min-h-dvh flex flex-col" style={{ background: `linear-gradient(135deg, var(--bg) 0%, #08101A 50%, var(--bg-secondary) 100%)` }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-[90px] -right-[40px] w-[260px] h-[260px] rounded-full opacity-70" style={{ backgroundColor: 'var(--gold-glow)' }} />
      <div className="pointer-events-none absolute top-[180px] -left-[50px] w-[160px] h-[160px] rounded-full" style={{ backgroundColor: 'rgba(94,124,250,0.12)' }} />

      {/* Content */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[440px] px-5 pt-3 pb-7 flex flex-col gap-[18px] safe-top">
          {children}
        </div>
      </div>

      {/* Footer */}
      {footer && (
        <div className="relative z-10 px-5 pb-4 pt-3 safe-bottom" style={{ backdropFilter: 'blur(12px)', background: 'rgba(5,7,11,0.8)' }}>
          <div className="mx-auto max-w-[440px] flex flex-col gap-3">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

export function HeaderBadge() {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
          boxShadow: '0 8px 20px rgba(212,162,79,0.35)',
        }}
      >
        <Star className="w-3.5 h-3.5" fill="#0B0D11" color="#0B0D11" />
      </div>
      <span className="text-[13px] font-semibold tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        Unbreakable Vow
      </span>
    </div>
  );
}

export function BackButton() {
  const router = useRouter();
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };
  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-opacity active:opacity-80"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <ArrowLeft className="w-[18px] h-[18px]" style={{ color: 'var(--text)' }} />
    </button>
  );
}

export function TitleBlock({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow && (
        <span className="text-[12px] font-bold tracking-[1.4px] uppercase" style={{ color: 'var(--gold)' }}>
          {eyebrow}
        </span>
      )}
      <h1 className="text-[32px] leading-[38px] font-bold font-serif tracking-[-0.8px]" style={{ color: 'var(--text)' }}>
        {title}
      </h1>
      <p className="text-[15px] leading-[23px]" style={{ color: 'var(--text-secondary)' }}>
        {subtitle}
      </p>
    </div>
  );
}

export function RitualCard({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-[22px] p-[18px] flex flex-col gap-3 ${className || ''}`}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 16px 28px rgba(0,0,0,0.26)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ label, onPress, disabled, loading }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled || loading}
      className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] disabled:active:scale-100"
      style={{
        boxShadow: disabled ? 'none' : '0 12px 24px rgba(212,162,79,0.28)',
      }}
    >
      <div
        className="min-h-[56px] flex items-center justify-center px-5"
        style={{
          background: disabled
            ? '#29303C'
            : 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
        }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-[#0B0D11] border-t-transparent rounded-full animate-spin" />
        ) : (
          <span
            className="text-[15px] font-extrabold tracking-[0.2px]"
            style={{ color: disabled ? 'var(--text-muted)' : '#0B0D11' }}
          >
            {label}
          </span>
        )}
      </div>
    </button>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="min-h-[46px] flex items-center justify-center w-full"
    >
      <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </button>
  );
}

export function ChoiceChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="px-3.5 py-[11px] rounded-full mr-2 mb-2 transition-colors"
      style={{
        backgroundColor: active ? 'rgba(212,162,79,0.12)' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
      }}
    >
      <span
        className="text-[13px] font-medium"
        style={{ color: active ? 'var(--gold-bright)' : 'var(--text-secondary)' }}
      >
        {label}
      </span>
    </button>
  );
}

export function VowPreview({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div
      className={`flex items-stretch overflow-hidden ${compact ? 'rounded-xl' : 'rounded-[14px]'}`}
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
    >
      <div className="w-[3px] shrink-0" style={{ backgroundColor: 'var(--gold)' }} />
      <p
        className={`flex-1 font-serif ${compact ? 'text-sm leading-5 py-2.5 px-3' : 'text-[15px] leading-[22px] py-3 px-3.5'}`}
        style={{ color: 'var(--text)' }}
      >
        {text}
      </p>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[12px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--text-muted)' }}>
      {children}
    </span>
  );
}

export function StatPill({ value, label, tone = 'default' }: { value: string; label: string; tone?: 'default' | 'success' | 'danger' }) {
  const valueColor = tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : 'var(--text)';
  return (
    <div
      className="flex-1 rounded-[20px] p-4 flex flex-col gap-2"
      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
    >
      <span className="text-xl font-extrabold" style={{ color: valueColor }}>{value}</span>
      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

export function FadeUp({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

export function OathCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="flex items-start gap-3 text-left w-full"
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${checked ? 'animate-check-bounce' : ''}`}
        style={{
          backgroundColor: checked ? 'var(--gold-bright)' : 'transparent',
          border: checked ? '2px solid var(--gold-bright)' : '2px solid var(--text-muted)',
        }}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7L6 10L11 4" stroke="#0B0D11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm leading-5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </button>
  );
}
