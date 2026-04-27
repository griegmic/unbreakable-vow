'use client';

import type { ReactNode } from 'react';

export function FlowShell({ children, center = false, tone = 'default' }: { children: ReactNode; center?: boolean; tone?: 'default' | 'success' | 'danger' }) {
  const bottomGlow = tone === 'success'
    ? 'rgba(52,199,89,.06)'
    : tone === 'danger'
      ? 'rgba(248,113,113,.07)'
      : 'rgba(52,199,89,.04)';

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      justifyContent: 'center',
      background: 'var(--uv-bg)',
      backgroundImage: `radial-gradient(480px 340px at 50% -8%, rgba(200,155,60,.14), transparent 62%), radial-gradient(520px 400px at 50% 108%, ${bottomGlow}, transparent 68%)`,
      padding: '0',
      color: 'var(--uv-text)',
    }}>
      <section style={{
        width: '100%',
        maxWidth: 430,
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: center ? 'center' : 'stretch',
        textAlign: center ? 'center' : 'left',
        padding: '26px 22px max(24px, env(safe-area-inset-bottom))',
        borderLeft: '1px solid rgba(240,233,219,.06)',
        borderRight: '1px solid rgba(240,233,219,.06)',
      }}>
        {children}
      </section>
    </main>
  );
}

export function FlowTop({ action, onAction }: { action?: string; onAction?: () => void }) {
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-serif)', fontSize: 14, fontWeight: 500 }}>
        <div style={{ width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'var(--uv-text-on-gold)', background: 'linear-gradient(135deg, var(--uv-gold-bright), var(--uv-gold))', fontFamily: 'var(--uv-font-serif)', fontSize: 10, fontWeight: 700 }}>
          UV
        </div>
        <span>Unbreakable <em style={{ color: 'var(--uv-gold)', fontStyle: 'italic' }}>Vow</em></span>
      </div>
      {action ? (
        <button type="button" onClick={onAction} style={{ border: 0, background: 'none', color: 'var(--uv-gold-bright)', cursor: 'pointer', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 800, padding: 0 }}>
          {action}
        </button>
      ) : <span />}
    </div>
  );
}

export function FlowPill({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'green' | 'red' }) {
  const color = tone === 'green' ? 'var(--uv-success)' : tone === 'red' ? 'var(--uv-danger)' : 'var(--uv-gold-bright)';
  const bg = tone === 'green' ? 'rgba(82,214,154,.07)' : tone === 'red' ? 'rgba(248,113,113,.08)' : 'transparent';
  const border = tone === 'green' ? 'rgba(82,214,154,.22)' : tone === 'red' ? 'rgba(248,113,113,.24)' : 'rgba(200,155,60,.32)';

  return (
    <div style={{ width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '7px 11px', borderRadius: 999, border: `1px solid ${border}`, background: bg, color, fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 850, letterSpacing: '.18em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

export function FlowStatus({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'gold' | 'red' }) {
  const color = tone === 'green' ? 'var(--uv-success)' : tone === 'red' ? 'var(--uv-danger)' : 'var(--uv-gold-bright)';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, width: 'fit-content', marginBottom: 16, color, fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
      {children}
    </div>
  );
}

export function FlowTitle({ children, small = false, center = false }: { children: ReactNode; small?: boolean; center?: boolean }) {
  return (
    <h1 style={{ margin: '0 0 12px', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: small ? 'clamp(30px, 8.6vw, 35px)' : 'clamp(36px, 10vw, 42px)', lineHeight: small ? 1.02 : .98, fontWeight: 850, letterSpacing: 0, textAlign: center ? 'center' : 'left' }}>
      {children}
    </h1>
  );
}

export function FlowSub({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <p style={{ margin: '0 0 18px', color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 16.5, lineHeight: 1.4, fontWeight: 550, textAlign: center ? 'center' : 'left', maxWidth: center ? 312 : undefined }}>
      {children}
    </p>
  );
}

export function FlowCard({ children, hot = false, compact = false, danger = false }: { children: ReactNode; hot?: boolean; compact?: boolean; danger?: boolean }) {
  const border = danger ? 'rgba(248,113,113,.26)' : hot ? 'rgba(200,155,60,.36)' : 'var(--uv-border-soft)';
  const bg = danger
    ? 'linear-gradient(180deg, rgba(248,113,113,.1), rgba(240,233,219,.025))'
    : hot
      ? 'linear-gradient(180deg, rgba(200,155,60,.12), rgba(240,233,219,.025))'
      : 'linear-gradient(180deg, rgba(240,233,219,.055), rgba(240,233,219,.025))';
  return (
    <section style={{ width: '100%', border: `1px solid ${border}`, background: bg, borderRadius: compact ? 16 : 18, padding: compact ? 15 : 18, marginBottom: 12, textAlign: 'left' }}>
      {children}
    </section>
  );
}

export function FlowLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ color: 'var(--uv-text-dim)', textTransform: 'uppercase', letterSpacing: '.22em', fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 800, marginBottom: 8 }}>
      {children}
    </div>
  );
}

export function FlowVow({ children, quote = false }: { children: ReactNode; quote?: boolean }) {
  return (
    <p style={{ margin: '0 0 16px', color: 'var(--uv-text)', fontFamily: quote ? 'var(--uv-font-serif)' : 'var(--uv-font-sans)', fontSize: quote ? 23 : 26, lineHeight: quote ? 1.28 : 1.08, fontWeight: quote ? 500 : 820, fontStyle: quote ? 'italic' : 'normal', letterSpacing: 0 }}>
      {quote ? <>“{children}”</> : children}
    </p>
  );
}

export function FlowMeta({ items }: { items: Array<{ label: string; gold?: boolean }> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid var(--uv-border-soft)' }}>
      {items.filter(Boolean).map((item) => (
        <span key={item.label} style={{ minHeight: 34, display: 'inline-flex', alignItems: 'center', border: `1px solid ${item.gold ? 'var(--uv-gold-line)' : 'var(--uv-border-soft)'}`, borderRadius: 999, background: item.gold ? 'rgba(200,155,60,.1)' : 'rgba(240,233,219,.035)', color: item.gold ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)', padding: '0 12px', fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 750 }}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function FlowGrid({ left, right }: { left: { label: string; value: string; sub: string; tone?: 'gold' | 'red' | 'green' }; right: { label: string; value: string; sub: string; tone?: 'gold' | 'red' | 'green' } }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 14, borderTop: '1px solid var(--uv-border-soft)' }}>
      {[left, right].map((tile) => {
        const toneColor = tile.tone === 'red' ? 'var(--uv-danger)' : tile.tone === 'green' ? 'var(--uv-success)' : tile.tone === 'gold' ? 'var(--uv-gold-bright)' : 'var(--uv-text)';
        const tileBorder = tile.tone === 'red' ? 'rgba(248,113,113,.28)' : tile.tone === 'gold' ? 'rgba(200,155,60,.36)' : 'var(--uv-border-soft)';
        const tileBg = tile.tone === 'red' ? 'rgba(248,113,113,.08)' : tile.tone === 'gold' ? 'rgba(200,155,60,.1)' : 'rgba(240,233,219,.028)';
        return (
          <div key={tile.label} style={{ minHeight: 82, border: `1px solid ${tileBorder}`, borderRadius: 14, padding: 12, background: tileBg }}>
            <FlowLabel>{tile.label}</FlowLabel>
            <strong style={{ display: 'block', marginBottom: 4, color: toneColor, fontFamily: 'var(--uv-font-sans)', fontSize: 20, lineHeight: 1, fontWeight: 850 }}>{tile.value}</strong>
            <span style={{ color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 12, lineHeight: 1.25 }}>{tile.sub}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FlowJob({ title, body, mark = '✓' }: { title: string; body: string; mark?: string }) {
  return (
    <section style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 14, padding: '13px 14px', border: '1px solid var(--uv-border-soft)', borderRadius: 16, background: 'rgba(240,233,219,.035)', textAlign: 'left' }}>
      <div>
        <b style={{ display: 'block', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 14.5, lineHeight: 1.2, marginBottom: 3 }}>{title}</b>
        <span style={{ color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, lineHeight: 1.25 }}>{body}</span>
      </div>
      <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: '0 0 auto', color: 'var(--uv-text-on-gold)', background: 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold))', fontFamily: 'var(--uv-font-sans)', fontSize: 18, fontWeight: 900 }}>
        {mark}
      </div>
    </section>
  );
}

export function FlowReceipt({ rows }: { rows: Array<{ title: string; body: string }> }) {
  return (
    <section style={{ width: '100%', display: 'grid', gap: 0, marginBottom: 14 }}>
      {rows.map((row, index) => (
        <div key={row.title} style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 12, alignItems: 'start', padding: '11px 0', borderBottom: index === rows.length - 1 ? 0 : '1px solid var(--uv-border-soft)', textAlign: 'left' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', color: index === 0 ? 'var(--uv-text-on-gold)' : 'var(--uv-text-muted)', background: index === 0 ? 'var(--uv-gold)' : 'rgba(240,233,219,.08)', fontFamily: 'var(--uv-font-sans)', fontWeight: 850, fontSize: 13 }}>
            {index + 1}
          </div>
          <div>
            <b style={{ display: 'block', marginBottom: 3, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 15.5, lineHeight: 1.15 }}>{row.title}</b>
            <span style={{ color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', fontSize: 13.5, lineHeight: 1.34 }}>{row.body}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

export function FlowMeter({ pct }: { pct: number }) {
  return (
    <div style={{ height: 7, borderRadius: 999, overflow: 'hidden', background: 'rgba(240,233,219,.07)', marginTop: 12 }}>
      <div style={{ width: `${Math.max(4, Math.min(100, pct))}%`, height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg, var(--uv-imessage), var(--uv-gold-bright))' }} />
    </div>
  );
}

export function FlowCTA({ children, onClick, disabled = false, tone = 'gold' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'gold' | 'green' | 'red' }) {
  const bg = tone === 'green'
    ? 'linear-gradient(180deg, #56e07f, var(--uv-imessage))'
    : tone === 'red'
      ? 'linear-gradient(180deg, #ff9d9d, var(--uv-danger) 58%, #b93e3e)'
      : 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold) 60%, var(--uv-gold-deep))';
  const color = tone === 'green' ? '#071109' : tone === 'red' ? '#1a0909' : 'var(--uv-text-on-gold)';
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ width: '100%', minHeight: 58, border: 0, borderRadius: 999, color: disabled ? 'var(--uv-text-dim)' : color, background: disabled ? 'var(--uv-bg-elevated)' : bg, fontFamily: 'var(--uv-font-sans)', fontSize: 17, fontWeight: 850, cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: disabled ? 'none' : '0 18px 46px rgba(200,155,60,.18), inset 0 1px 0 rgba(255,255,255,.28)' }}>
      {children}
    </button>
  );
}

export function FlowSecondary({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', minHeight: 46, marginTop: 9, borderRadius: 999, border: '1px solid var(--uv-border-soft)', color: 'var(--uv-text-muted)', background: 'transparent', fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 750, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

export function FlowInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        height: 54,
        marginBottom: 10,
        padding: '0 16px',
        border: '1px solid var(--uv-border-strong)',
        borderRadius: 14,
        color: 'var(--uv-text)',
        background: 'var(--uv-bg-input)',
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 16,
        outline: 'none',
        ...props.style,
      }}
    />
  );
}

export function FlowCheck({ tone = 'gold', children = '✓' }: { tone?: 'gold' | 'green' | 'red'; children?: ReactNode }) {
  const bg = tone === 'green'
    ? 'rgba(82,214,154,.08)'
    : tone === 'red'
      ? 'rgba(248,113,113,.08)'
      : 'radial-gradient(circle at 30% 22%, #f2c766 0%, var(--uv-gold-bright) 32%, var(--uv-gold) 66%, var(--uv-gold-deep) 100%)';
  const color = tone === 'green' ? 'var(--uv-success)' : tone === 'red' ? 'var(--uv-danger)' : 'var(--uv-text-on-gold)';
  const border = tone === 'gold' ? 'none' : `1px solid ${tone === 'green' ? 'rgba(82,214,154,.18)' : 'rgba(248,113,113,.2)'}`;
  return (
    <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color, background: bg, border, fontFamily: 'var(--uv-font-sans)', fontSize: 32, fontWeight: 900, boxShadow: tone === 'gold' ? '0 0 0 8px rgba(200,155,60,.07), 0 20px 48px rgba(200,155,60,.24)' : '0 0 0 8px rgba(240,233,219,.025)' }}>
      {children}
    </div>
  );
}

export function FlowStamp({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.28em', textTransform: 'uppercase', textAlign: 'center' }}>
      {children}
    </div>
  );
}

export function FlowSpacer() {
  return <div style={{ flex: 1, minHeight: 18 }} />;
}

export function shortDestinationName(destination: string | null | undefined) {
  const trimmed = destination?.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/\bAssociation\b/gi, '')
    .replace(/\bOrganization\b/gi, '')
    .replace(/\bFoundation\b/gi, 'Fund')
    .replace(/\s+/g, ' ')
    .trim();
}
