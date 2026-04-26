'use client';
import { useState } from 'react';
import { Send, Check, Copy } from 'lucide-react';

export function ShareButton({ url, text, buttonText }: { url: string; text: string; buttonText: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="w-full min-h-[52px] rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.975]"
      style={{
        background: 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold))',
        boxShadow: '0 1px 0 rgba(255,220,140,0.25) inset, 0 10px 30px rgba(200,155,60,0.18)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {copied ? (
        <>
          <Check className="w-[18px] h-[18px]" color="var(--uv-text-on-gold)" />
          <span className="text-[15px] font-bold" style={{ color: 'var(--uv-text-on-gold)', fontFamily: 'var(--uv-font-sans)' }}>Copied!</span>
        </>
      ) : (
        <>
          <Send className="w-[18px] h-[18px]" color="var(--uv-text-on-gold)" />
          <span className="text-[15px] font-bold" style={{ color: 'var(--uv-text-on-gold)', fontFamily: 'var(--uv-font-sans)' }}>{buttonText}</span>
        </>
      )}
    </button>
  );
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-opacity active:opacity-80"
      style={{
        backgroundColor: 'var(--uv-bg-elevated)',
        border: '1px solid var(--uv-border)',
        cursor: 'pointer',
      }}
    >
      {copied ? (
        <Check className="w-4 h-4" style={{ color: 'var(--uv-success)' }} />
      ) : (
        <Copy className="w-4 h-4" style={{ color: 'var(--uv-text-muted)' }} />
      )}
      <span className="text-[13px] font-medium" style={{ color: copied ? 'var(--uv-success)' : 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
        {copied ? 'Copied!' : 'Copy link'}
      </span>
    </button>
  );
}
