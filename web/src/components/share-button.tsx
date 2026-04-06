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
        background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
        boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
      }}
    >
      {copied ? (
        <>
          <Check className="w-[18px] h-[18px]" color="#0B0D11" />
          <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>Copied!</span>
        </>
      ) : (
        <>
          <Send className="w-[18px] h-[18px]" color="#0B0D11" />
          <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>{buttonText}</span>
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
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {copied ? (
        <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
      ) : (
        <Copy className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
      )}
      <span className="text-[13px] font-medium" style={{ color: copied ? 'var(--success)' : 'var(--text-secondary)' }}>
        {copied ? 'Copied!' : 'Copy link'}
      </span>
    </button>
  );
}
