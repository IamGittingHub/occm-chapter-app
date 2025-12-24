'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { CommunicationAssignment, Member, CommunicationLog, ContactMethod, CommunicationLogInsert, CommunicationAssignmentUpdate } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2, Phone, Mail, MessageSquare, User, MoreHorizontal, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CommunicationAssignmentWithDetails extends CommunicationAssignment {
  member: Member;
  communication_logs: CommunicationLog[];
}

interface ContactLogModalProps {
  assignment: CommunicationAssignmentWithDetails;
  open: boolean;
  onClose: () => void;
}

const contactLogSchema = z.object({
  contact_method: z.enum(['text', 'call', 'email', 'in_person', 'other']),
  notes: z.string().optional(),
  was_successful: z.boolean(),
});

type ContactLogFormValues = z.infer<typeof contactLogSchema>;

const contactMethodOptions = [
  { value: 'text', label: 'Text Message', icon: MessageSquare },
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'in_person', label: 'In Person', icon: User },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
] as const;

export function ContactLogModal({ assignment, open, onClose }: ContactLogModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const member = assignment.member;
  const initials = member ? `${member.first_name[0]}${member.last_name[0]}` : 'U';

  const form = useForm<ContactLogFormValues>({
    resolver: zodResolver(contactLogSchema),
    defaultValues: {
      contact_method: 'text',
      notes: '',
      was_successful: false,
    },
  });

  async function onSubmit(data: ContactLogFormValues) {
    setIsLoading(true);
    const supabase = createClient();

    // Get current user's committee member ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to log a contact.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { data: cmData } = await supabase
      .from('committee_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const committeeMember = cmData as { id: string } | null;

    if (!committeeMember) {
      toast({
        title: 'Error',
        description: 'Committee member not found.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Create the contact log
    const logData: CommunicationLogInsert = {
      assignment_id: assignment.id,
      committee_member_id: committeeMember.id as string,
      contact_method: data.contact_method as ContactMethod,
      notes: data.notes || null,
      was_successful: data.was_successful,
    };

    const { error: logError } = await supabase.from('communication_logs').insert(logData as never);

    if (logError) {
      toast({
        title: 'Error logging contact',
        description: logError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Update assignment status if successful
    if (data.was_successful) {
      const updateData: CommunicationAssignmentUpdate = {
        status: 'successful',
        last_contact_attempt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase
        .from('communication_assignments')
        .update(updateData as never)
        .eq('id', assignment.id);

      if (updateError) {
        toast({
          title: 'Warning',
          description: 'Contact logged but failed to update assignment status.',
          variant: 'destructive',
        });
      }
    } else {
      // Just update last contact attempt
      const updateData: CommunicationAssignmentUpdate = {
        last_contact_attempt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase
        .from('communication_assignments')
        .update(updateData as never)
        .eq('id', assignment.id);
    }

    toast({
      title: data.was_successful ? 'Success!' : 'Contact logged',
      description: data.was_successful
        ? `You've successfully connected with ${member?.first_name}!`
        : `Contact attempt with ${member?.first_name} has been recorded.`,
    });

    form.reset();
    setIsLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Contact</DialogTitle>
          <DialogDescription>
            Record your outreach attempt with this member.
          </DialogDescription>
        </DialogHeader>

        {/* Member Info */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-soft-blue text-white">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">
              {member?.first_name} {member?.last_name}
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              {member?.gender} - {member?.grade}
            </p>
          </div>
        </div>

        {/* Previous Contact History */}
        {assignment.communication_logs && assignment.communication_logs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Previous Attempts:</p>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {assignment.communication_logs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs p-2 bg-muted rounded flex items-center justify-between"
                >
                  <span>
                    {format(new Date(log.contact_date), 'MMM d, yyyy')} - via {log.contact_method}
                  </span>
                  <Badge variant={log.was_successful ? 'default' : 'secondary'} className="text-xs">
                    {log.was_successful ? 'Success' : 'No response'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contact_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How did you reach out?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contactMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about the conversation..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="was_successful"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-green-50">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      This contact was successful
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Check this if you made a meaningful connection with this member.
                      They will stay assigned to you permanently.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Contact
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
