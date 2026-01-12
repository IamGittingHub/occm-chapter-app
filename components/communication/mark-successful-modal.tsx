'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
}

interface MarkSuccessfulModalProps {
  assignment: {
    id: string;
    member: Member | null;
  };
  open: boolean;
  onClose: () => void;
}

export function MarkSuccessfulModal({ assignment, open, onClose }: MarkSuccessfulModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const markSuccessful = useMutation(api.communicationAssignments.markSuccessful);

  const member = assignment.member;

  async function handleMarkSuccessful() {
    setIsLoading(true);

    try {
      await markSuccessful({
        assignmentId: assignment.id as Id<"communicationAssignments">,
      });

      toast({
        title: 'Success!',
        description: `You've successfully connected with ${member?.first_name}!`,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark as successful. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Mark as Successful?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will mark your outreach to <strong>{member?.first_name} {member?.last_name}</strong> as successful.
            They will stay assigned to you permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleMarkSuccessful}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Mark Successful
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
