'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { CommitteeMember, Gender } from '@/types/database';
import { genderOptions } from '@/lib/validators/member';
import { roleOptions, roleValues, Role } from '@/lib/validators/committee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const editMemberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['male', 'female'] as const),
  phone: z.string().optional(),
  role: z.enum(roleValues).optional(),
});

type EditMemberFormValues = z.infer<typeof editMemberSchema>;

interface EditCommitteeMemberDialogProps {
  member: CommitteeMember & { _id?: Id<"committeeMembers">; role?: Role };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCommitteeMemberDialog({
  member,
  open,
  onOpenChange,
}: EditCommitteeMemberDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const updateMember = useMutation(api.committeeMembers.update);
  const myRole = useQuery(api.committeeMembers.getMyRole);
  const canAssignRoles = myRole?.role === 'developer';

  // Get the Convex ID - either from _id or from id field
  const convexId = member._id || member.id as Id<"committeeMembers">;

  const form = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      first_name: member.first_name,
      last_name: member.last_name,
      gender: member.gender as Gender,
      phone: member.phone || '',
      role: (member.role as Role) || 'committee_member',
    },
  });

  // Reset form when member changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        first_name: member.first_name,
        last_name: member.last_name,
        gender: member.gender as Gender,
        phone: member.phone || '',
        role: (member.role as Role) || 'committee_member',
      });
    }
  }, [open, member, form]);

  async function onSubmit(data: EditMemberFormValues) {
    setIsLoading(true);

    try {
      await updateMember({
        id: convexId,
        firstName: data.first_name,
        lastName: data.last_name,
        gender: data.gender,
        phone: data.phone || undefined,
        role: canAssignRoles ? data.role : undefined,
      });

      toast({
        title: 'Success',
        description: 'Committee member updated successfully',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Committee Member</DialogTitle>
          <DialogDescription>
            Update information for {member.first_name} {member.last_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genderOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canAssignRoles && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'committee_member'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> {member.email}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed. To use a different email, delete this member and invite the new email.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
