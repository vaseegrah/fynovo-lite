'use client';

import GoalsCard from '@/components/GoalsCard';
import { Header, ListSkeleton } from '@/components/ui';
import { useNow } from '@/lib/client';

export default function GoalsPage() {
  const { today, ready } = useNow();

  return (
    <>
      <Header title="Daily Goals" back="/" subtitle="Choose the work that matters today" />
      <div className="space-y-4 px-4 pb-8 pt-4">
        {ready ? <GoalsCard date={today} /> : <ListSkeleton n={1} h="h-56" />}
      </div>
    </>
  );
}
