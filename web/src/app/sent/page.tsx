'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/ui';

/**
 * /sent now redirects to /live.
 * The post-seal experience has been merged into the /create page's sealed state.
 * This route is kept alive for backward compatibility (bookmarks, browser history).
 */
export default function SentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/live');
  }, [router]);

  return (
    <RitualScreen>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
      </div>
    </RitualScreen>
  );
}
