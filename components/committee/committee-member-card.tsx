'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommitteeMember } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Mail,
  Phone,
  MoreVertical,
  Send,
  Trash2,
  Pencil,
  UserCheck,
  UserX,
  Loader2,
} from 'lucide-react';
import { EditCommitteeMemberDialog } from './edit-member-dialog';

interface CommitteeMemberCardProps {
  member: CommitteeMember;
  isCurrentUser: boolean;
}

export function CommitteeMemberCard({ member, isCurrentUser }: CommitteeMemberCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const initials = `${member.first_name[0]}${member.last_name[0]}`;
  const isPending = !member.is_active && !member.user_id;
  const isInactive = !member.is_active && member.user_id;

  const handleResendInvite = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/committee/${member.id}/resend-invite`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to resend invite',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: result.message,
      });

      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to resend invite',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/committee/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !member.is_active }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update member',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `${member.first_name} is now ${member.is_active ? 'inactive' : 'active'}`,
      });

      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/committee/${member.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete member',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `${member.first_name} ${member.last_name} has been removed`,
      });

      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className={isCurrentUser ? 'ring-2 ring-gold' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-soft-blue text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">
                    {member.first_name} {member.last_name}
                  </h3>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>

                    {isPending && (
                      <DropdownMenuItem onClick={handleResendInvite}>
                        <Send className="mr-2 h-4 w-4" />
                        Resend Invite
                      </DropdownMenuItem>
                    )}

                    {!isCurrentUser && member.user_id && (
                      <DropdownMenuItem onClick={handleToggleActive}>
                        {member.is_active ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    )}

                    {!isCurrentUser && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowDeleteDialog(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {member.gender}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>
              <div className="mt-3">
                {member.is_active ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                ) : member.user_id ? (
                  <Badge variant="secondary">Inactive</Badge>
                ) : (
                  <Badge variant="outline">Pending Invite</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Committee Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{member.first_name} {member.last_name}</strong> from the committee?
              This action cannot be undone and will remove all their assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <EditCommitteeMemberDialog
        member={member}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  );
}
