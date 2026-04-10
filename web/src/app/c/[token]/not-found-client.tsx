'use client';

export default function ChallengeNotFound({ token }: { token: string }) {
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center px-6 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: 'var(--text)' }}>
          Challenge not found
        </h1>
        <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          This link may have expired or is invalid. Ask the person who sent it to share it again.
        </p>
        <a
          href="/"
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold no-underline"
          style={{
            backgroundColor: 'rgba(212,162,79,0.12)',
            border: '1px solid rgba(212,162,79,0.25)',
            color: 'var(--gold)',
          }}
        >
          Make your own vow
        </a>
      </div>
    </div>
  );
}
