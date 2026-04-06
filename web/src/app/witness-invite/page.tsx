'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function WitnessInviteRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  useEffect(() => {
    if (token) {
      router.replace(`/w/${token}`);
    } else {
      router.replace('/');
    }
  }, [token, router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
    </div>
  );
}

export default function WitnessInvitePage() {
  return (
    <Suspense>
      <WitnessInviteRedirect />
    </Suspense>
  );
}
