'use client';

import { useState } from 'react';
import { skip, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2, RotateCcw, ArrowRightLeft, Trash2, FlaskConical, Eye, Wrench } from 'lucide-react';

export function ManualActions() {
  const { toast } = useToast();
  const [isRotating, setIsRotating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showRotationPreview, setShowRotationPreview] = useState(false);
  const [showTransferPreview, setShowTransferPreview] = useState(false);
  const [showRepairDiagnostics, setShowRepairDiagnostics] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const settings = useQuery(api.appSettings.getAll);
  const testMode = settings?.test_mode === 'true';

  const triggerRotation = useMutation(api.prayerAssignments.triggerRotation);
  const triggerAutoTransfers = useMutation(api.communicationAssignments.triggerAutoTransfers);
  const resetPrayerAssignments = useMutation(api.prayerAssignments.resetAll);
  const resetCommunicationAssignments = useMutation(api.communicationAssignments.resetAll);
  const repairPrayerAssignments = useMutation(api.prayerAssignments.repairCurrentPeriod);

  // Dry-run queries for test mode previews
  const rotationPreview = useQuery(api.prayerAssignments.rotateBucketsDryRun, {});
  const transferPreview = useQuery(api.communicationAssignments.processAutoTransfersDryRun, {});
  const repairDiagnostics = useQuery(
    api.prayerAssignments.getRepairDiagnostics,
    showRepairDiagnostics ? {} : skip
  );

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

  async function handleRepairAssignments() {
    setIsRepairing(true);
    try {
      const result = await repairPrayerAssignments({});
      const skippedNote = result.skippedReasons?.length
        ? ` Skipped: ${result.skippedReasons.slice(0, 2).join(' | ')}${result.skippedReasons.length > 2 ? '…' : ''}`
        : '';

      toast({
        title: 'Repair Complete',
        description: `Backfilled ${result.backfilledCount}, reassigned ${result.reassignedCount}. Zero assignments: ${result.zeroBefore} → ${result.zeroAfter}.${skippedNote}`,
      });
    } catch (error) {
      toast({
        title: 'Repair Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
    setIsRepairing(false);
  }

  return (
    <div className="space-y-4">
      {/* Test Mode Indicator */}
      {testMode && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <FlaskConical className="h-4 w-4 text-purple-600" />
          <span className="text-sm text-purple-700 font-medium">
            Test Mode Active - Actions will show previews only
          </span>
        </div>
      )}

      {/* Rotate Prayer Buckets */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            Rotate Prayer Buckets
            {testMode && <Badge variant="outline" className="text-xs">Preview Only</Badge>}
          </h4>
          <p className="text-sm text-muted-foreground">
            Manually trigger the monthly prayer bucket rotation
          </p>
        </div>
        {testMode ? (
          <Button variant="outline" onClick={() => setShowRotationPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        ) : (
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
        )}
      </div>

      {/* Process Auto Transfers */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            Process Auto-Transfers
            {testMode && <Badge variant="outline" className="text-xs">Preview Only</Badge>}
          </h4>
          <p className="text-sm text-muted-foreground">
            Transfer members who have been unresponsive past the threshold
          </p>
        </div>
        {testMode ? (
          <Button variant="outline" onClick={() => setShowTransferPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        ) : (
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
        )}
      </div>

      {/* Repair Prayer Assignments */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            Repair Prayer Lists
          </h4>
          <p className="text-sm text-muted-foreground">
            Backfill missing assignments and rebalance unclaimed ones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowRepairDiagnostics(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Diagnostics
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isRepairing}>
                {isRepairing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="mr-2 h-4 w-4" />
                )}
                Repair
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Repair Prayer Lists</AlertDialogTitle>
                <AlertDialogDescription>
                  This will backfill missing prayer assignments and rebalance unclaimed assignments
                  so committee members with zero assignments receive at least one.
                  <br /><br />
                  Claimed assignments will not be moved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRepairAssignments}>
                  Repair Now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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

      {/* Rotation Preview Dialog */}
      <Dialog open={showRotationPreview} onOpenChange={setShowRotationPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-purple-600" />
              Prayer Rotation Preview
            </DialogTitle>
            <DialogDescription>
              This is a preview of what would happen if you rotate the prayer buckets.
              No changes have been made.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {rotationPreview ? (
              rotationPreview.wouldSucceed ? (
                <>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">
                      <strong>From:</strong> {rotationPreview.fromPeriod} <strong>To:</strong> {rotationPreview.toPeriod}
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Total:</strong> {rotationPreview.summary?.totalAssignments || 0} assignments
                      ({rotationPreview.summary?.rotating || 0} rotating, {rotationPreview.summary?.staying || 0} staying)
                    </p>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-lg p-3">
                    <div className="space-y-2">
                      {rotationPreview.changes?.map((change, index) => (
                        <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                          <strong>{change.memberName}</strong>: {change.fromCommitteeMember} (bucket {change.fromBucket})
                          → {change.toCommitteeMember} (bucket {change.toBucket})
                          <Badge variant="outline" className="ml-2 text-xs">{change.action}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="text-amber-600 bg-amber-50 p-3 rounded-lg">
                  {rotationPreview.reason}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Preview Dialog */}
      <Dialog open={showTransferPreview} onOpenChange={setShowTransferPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-purple-600" />
              Auto-Transfer Preview
            </DialogTitle>
            <DialogDescription>
              This is a preview of members that would be auto-transferred.
              No changes have been made.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {transferPreview ? (
              transferPreview.transfers && transferPreview.transfers.length > 0 ? (
                <>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">
                      <strong>{transferPreview.transfers.length}</strong> members would be transferred
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Threshold: {transferPreview.thresholdDays} days
                    </p>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-lg p-3">
                    <div className="space-y-2">
                      {transferPreview.transfers.map((transfer, index) => (
                        <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                          <strong>{transfer.memberName}</strong>: {transfer.fromCommitteeMember} → {transfer.toCommitteeMember}
                          <span className="text-muted-foreground ml-2">
                            (pending {transfer.daysSinceAssigned} days)
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="text-green-600 bg-green-50 p-3 rounded-lg">
                  No members are past the threshold. No transfers needed.
                </div>
              )
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Repair Diagnostics Dialog */}
      <Dialog open={showRepairDiagnostics} onOpenChange={setShowRepairDiagnostics}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-purple-600" />
              Prayer Repair Diagnostics
            </DialogTitle>
            <DialogDescription>
              Snapshot of current prayer assignment coverage for this month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {repairDiagnostics ? (
              <>
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <div><strong>Period:</strong> {repairDiagnostics.periodStart}</div>
                  <div><strong>Assignments exist:</strong> {repairDiagnostics.hasAssignmentsForPeriod ? 'Yes' : 'No'}</div>
                  <div><strong>Eligible members:</strong> {repairDiagnostics.eligibleMembersByGender.male} male / {repairDiagnostics.eligibleMembersByGender.female} female</div>
                  <div><strong>Committee (eligible):</strong> {repairDiagnostics.committeeMembersByGender.male} male / {repairDiagnostics.committeeMembersByGender.female} female</div>
                  <div><strong>Members missing assignment:</strong> {repairDiagnostics.membersMissingAssignment}</div>
                  <div><strong>Committee with zero assignments:</strong> {repairDiagnostics.committeeMembersWithZeroAssignments.length}</div>
                </div>
                {repairDiagnostics.committeeMembersWithZeroAssignments.length > 0 && (
                  <ScrollArea className="h-[220px] border rounded-lg p-3">
                    <div className="space-y-2 text-sm">
                      {repairDiagnostics.committeeMembersWithZeroAssignments.map((cm) => (
                        <div key={cm.committeeMemberId} className="p-2 bg-muted/50 rounded">
                          {cm.name} ({cm.email}) - {cm.gender}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
