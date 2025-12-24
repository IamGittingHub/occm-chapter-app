'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateInitialPrayerAssignments } from '@/lib/prayer/assignment';
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
import { Shuffle, Loader2 } from 'lucide-react';

export function GenerateAssignmentsButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleGenerate() {
    setIsLoading(true);
    const supabase = createClient();

    const result = await generateInitialPrayerAssignments(supabase);

    if (result.success) {
      toast({
        title: 'Assignments Generated',
        description: result.message,
      });
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>
          <Shuffle className="mr-2 h-4 w-4" />
          Generate Assignments
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Prayer Assignments</AlertDialogTitle>
          <AlertDialogDescription>
            This will generate prayer assignments for all active members for the current month.
            Members will be assigned to committee members based on gender matching.
            <br /><br />
            This action should only be run once when setting up assignments for a new chapter or after
            a significant roster change.
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
