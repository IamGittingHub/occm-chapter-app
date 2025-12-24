'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rotatePrayerBuckets } from '@/lib/prayer/rotation';
import { processAutoTransfers } from '@/lib/communication/transfer';
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
import { Loader2, RotateCcw, ArrowRightLeft } from 'lucide-react';

export function ManualActions() {
  const router = useRouter();
  const { toast } = useToast();
  const [isRotating, setIsRotating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  async function handleRotation() {
    setIsRotating(true);
    const supabase = createClient();

    const result = await rotatePrayerBuckets(supabase);

    if (result.success) {
      toast({
        title: 'Rotation Complete',
        description: result.message,
      });
      router.refresh();
    } else {
      toast({
        title: 'Rotation Failed',
        description: result.message,
        variant: 'destructive',
      });
    }

    setIsRotating(false);
  }

  async function handleAutoTransfer() {
    setIsTransferring(true);
    const supabase = createClient();

    const result = await processAutoTransfers(supabase);

    if (result.success) {
      toast({
        title: 'Transfers Complete',
        description: result.message,
      });
      router.refresh();
    } else {
      toast({
        title: 'Transfer Failed',
        description: result.message,
        variant: 'destructive',
      });
    }

    setIsTransferring(false);
  }

  return (
    <div className="space-y-4">
      {/* Rotate Prayer Buckets */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-medium">Rotate Prayer Buckets</h4>
          <p className="text-sm text-muted-foreground">
            Manually trigger the monthly prayer bucket rotation
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isRotating}>
              {isRotating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Rotate
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rotate Prayer Buckets</AlertDialogTitle>
              <AlertDialogDescription>
                This will rotate all prayer bucket assignments for the current month.
                Members will be reassigned to different committee members based on their bucket numbers.
                <br /><br />
                This action is typically run automatically on the 1st of each month.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRotation}>
                Rotate Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Process Auto Transfers */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-medium">Process Auto-Transfers</h4>
          <p className="text-sm text-muted-foreground">
            Transfer members who have been unresponsive past the threshold
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isTransferring}>
              {isTransferring ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="mr-2 h-4 w-4" />
              )}
              Transfer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Process Auto-Transfers</AlertDialogTitle>
              <AlertDialogDescription>
                This will find all communication assignments that have been pending for longer than
                the threshold and transfer them to the next available committee member.
                <br /><br />
                This action is typically run automatically every day.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAutoTransfer}>
                Transfer Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
