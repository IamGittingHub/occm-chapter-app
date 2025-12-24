'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MemberFormValues } from '@/lib/validators/member';
import { MemberInsert } from '@/types/database';
import { MemberForm } from './member-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus } from 'lucide-react';

interface AddMemberDialogProps {
  onSuccess?: () => void;
}

export function AddMemberDialog({ onSuccess }: AddMemberDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(data: MemberFormValues) {
    setIsLoading(true);
    const supabase = createClient();

    const insertData: MemberInsert = {
      first_name: data.first_name,
      last_name: data.last_name,
      gender: data.gender,
      grade: data.grade,
      major: data.major || null,
      church: data.church || null,
      date_of_birth: data.date_of_birth || null,
      email: data.email || null,
      phone: data.phone || null,
    };

    const { error } = await supabase.from('members').insert(insertData as never);

    if (error) {
      toast({
        title: 'Error adding member',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Member added',
      description: `${data.first_name} ${data.last_name} has been added to the chapter.`,
    });

    setOpen(false);
    setIsLoading(false);

    if (onSuccess) {
      onSuccess();
    }

    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Add a new member to your chapter. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>
        <MemberForm onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
}
