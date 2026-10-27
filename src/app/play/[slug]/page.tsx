'use client';

import React, { useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

function PlayRedirectContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const slug = (params?.slug as string) || 'wedding-adventure';
    const to = searchParams?.get('to');
    const query = to ? `?to=${encodeURIComponent(to)}` : '';
    router.replace(`/view/${slug}${query}`);
  }, [params, searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      Mengarahkan ke Undangan...
    </div>
  );
}

export default function PlayRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Mengarahkan...</div>}>
      <PlayRedirectContent />
    </Suspense>
  );
}
