'use client';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { api } from '@/lib/client';
import IdeaForm from '@/components/IdeaForm';
import { Header, ListSkeleton } from '@/components/ui';

export default function EditIdeaPage() {
  const { id } = useParams();
  const { data, error } = useSWR(`/api/ideas/${id}`, api);
  if (error) return <><Header title="Edit idea" back /><p className="px-4 text-sm text-red-600">{error.message}</p></>;
  if (!data) return <><Header title="Edit idea" back /><ListSkeleton n={3} h="h-24" /></>;
  return <IdeaForm id={id} initial={data.idea} />;
}
