import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MemberDetail } from '@/components/members/member-detail';
import { Member } from '@/types/database';

interface MemberPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function MemberPage({ params, searchParams }: MemberPageProps) {
  const { id } = await params;
  const { edit } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  const member = data as Member | null;

  if (error || !member) {
    notFound();
  }

  return <MemberDetail member={member} editMode={edit === 'true'} />;
}
