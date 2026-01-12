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
import { Loader2, RotateCcw, ArrowRightLeft, Trash2 } from 'lucide-react';

export function ManualActions() {
  const { toast } = useToast();
  const [isRotating, setIsRotating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const triggerRotation = useMutation(api.prayerAssignments.triggerRotation);
  const triggerAutoTransfers = useMutation(api.communicationAssignments.triggerAutoTransfers);
  const resetPrayerAssignments = useMutation(api.prayerAssignments.resetAll);
  const resetCommunicationAssignments = useMutation(api.communicationAssignments.resetAll);

  async function handleRotation() {
    setIsRotating(true);
    try {
      await triggerRotation({});
      toast({
        title: 'Rotation Scheduled',
        description: 'Prayer bucket rotation has been scheduled and will complete shortly.',
      });
    } catch (error) {
      toast({
        title: 'Rotation Failed',
        description: error instanceof Error ? error.message : 'Failed to trigger rotation',
        variant: 'destructive',
      });
    }
    setIsRotating(false);
  }

  async function handleAutoTransfer() {
    setIsTransferring(true);
    try {
      await triggerAutoTransfers({});
      toast({
        title: 'Transfers Scheduled',
        description: 'Auto-transfers have been scheduled and will complete shortly.',
      });
    } catch (error) {
      toast({
        title: 'Transfer Failed',
        description: error instanceof Error ? error.message : 'Failed to trigger transfers',
        variant: 'destructive',
      });
    }
    setIsTransferring(false);
  }

  async function handleResetAssignments() {
    setIsResetting(true);
    try {
      const prayerResult = await resetPrayerAssignments({});
      const commResult = await resetCommunicationAssignments({});

      toast({
        title: 'Reset Complete',
        description: `Deleted ${prayerResult.deletedAssignments} prayer assignments and ${commResult.deletedLogs} logs, ${commResult.deletedTransfers} transfers, ${commResult.deletedAssignments} communication assignments.`,
      });
    } catch (error) {
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
    setIsResetting(false);
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

      {/* Reset All Assignments */}
      <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/50 bg-destructive/5">
        <div>
          <h4 className="font-medium text-destructive">Reset All Assignments</h4>
          <p className="text-sm text-muted-foreground">
            Delete ALL prayer and communication assignments (for testing)
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isResetting}>
              {isResetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Reset All Assignments</AlertDialogTitle>
              <AlertDialogDescription>
                <strong className="text-destructive">WARNING: This action cannot be undone!</strong>
                <br /><br />
                This will permanently delete:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>All prayer assignments</li>
                  <li>All communication assignments</li>
                  <li>All communication logs</li>
                  <li>All transfer history</li>
                </ul>
                <br />
                After reset, you will need to regenerate assignments from the Prayer List and Communication pages.
                <br /><br />
                <strong>Only use this for testing purposes!</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetAssignments}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, Reset Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
