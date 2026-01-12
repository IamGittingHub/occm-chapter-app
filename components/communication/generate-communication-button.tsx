'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { MessageSquare, Loader2 } from 'lucide-react';

export function GenerateCommunicationButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const generateInitial = useMutation(api.communicationAssignments.generateInitial);

  async function handleGenerate() {
    setIsLoading(true);

    try {
      const result = await generateInitial({});

      toast({
        title: 'Assignments Generated',
        description: `Created ${result.count} communication assignments.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate assignments',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>
          <MessageSquare className="mr-2 h-4 w-4" />
          Generate Assignments
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Communication Assignments</AlertDialogTitle>
          <AlertDialogDescription>
            This will generate communication assignments for all active members.
            Members will be assigned to committee members based on gender matching.
            <br /><br />
            This action should only be run once when setting up the communication tracking system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleGenerate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
