'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { MemberFormValues } from '@/lib/validators/member';
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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const createMember = useMutation(api.members.create);

  async function handleSubmit(data: MemberFormValues) {
    setIsLoading(true);

    try {
      await createMember({
        firstName: data.first_name,
        lastName: data.last_name,
        gender: data.gender,
        grade: data.grade,
        major: data.major || undefined,
        church: data.church || undefined,
        dateOfBirth: data.date_of_birth || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
      });

      toast({
        title: 'Member added',
        description: `${data.first_name} ${data.last_name} has been added to the chapter.`,
      });

      setOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error adding member',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
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
