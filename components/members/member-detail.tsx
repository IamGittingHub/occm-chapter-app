'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Member, MemberUpdate } from '@/types/database';
import { MemberFormValues, gradeOptions } from '@/lib/validators/member';
import { MemberForm } from './member-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  ArrowLeft,
  Pencil,
  Trash2,
  GraduationCap,
  User,
  Mail,
  Phone,
  Church,
  Calendar,
  BookOpen,
  Loader2,
  IdCard,
  FileText,
  Users,
  Heart,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

interface MemberDetailProps {
  member: Member;
  editMode?: boolean;
}

export function MemberDetail({ member, editMode = false }: MemberDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(editMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  async function handleUpdate(data: MemberFormValues) {
    setIsLoading(true);
    const supabase = createClient();

    const updateData: MemberUpdate = {
      first_name: data.first_name,
      last_name: data.last_name,
      gender: data.gender,
      grade: data.grade,
      major: data.major || null,
      minor: data.minor || null,
      church: data.church || null,
      date_of_birth: data.date_of_birth || null,
      email: data.email || null,
      phone: data.phone || null,
      student_id: data.student_id || null,
      expected_graduation: data.expected_graduation || null,
      is_new_member: data.is_new_member || false,
      wants_mentor: data.wants_mentor || false,
      wants_to_mentor: data.wants_to_mentor || false,
      notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('members')
      .update(updateData as never)
      .eq('id', member.id);

    if (error) {
      toast({
        title: 'Error updating member',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Member updated',
      description: `${data.first_name} ${data.last_name}'s profile has been updated.`,
    });

    setIsEditing(false);
    setIsLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    setIsDeleting(true);
    const supabase = createClient();

    const { error } = await supabase.from('members').delete().eq('id', member.id);

    if (error) {
      toast({
        title: 'Error deleting member',
        description: error.message,
        variant: 'destructive',
      });
      setIsDeleting(false);
      return;
    }

    toast({
      title: 'Member deleted',
      description: `${member.first_name} ${member.last_name} has been removed.`,
    });

    router.push('/members');
    router.refresh();
  }

  async function handleMarkGraduated() {
    setIsLoading(true);
    const supabase = createClient();

    const gradUpdateData: MemberUpdate = {
      is_graduated: !member.is_graduated,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('members')
      .update(gradUpdateData as never)
      .eq('id', member.id);

    if (error) {
      toast({
        title: 'Error updating member',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: member.is_graduated ? 'Removed graduated status' : 'Marked as graduated',
      description: `${member.first_name} ${member.last_name} ${
        member.is_graduated ? 'is no longer marked as graduated' : 'has been marked as graduated'
      }.`,
    });

    setIsLoading(false);
    router.refresh();
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setIsEditing(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <h1 className="text-2xl font-bold text-deep-blue">Edit Member</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <MemberForm member={member} onSubmit={handleUpdate} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/members">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-deep-blue">
                {member.first_name} {member.last_name}
              </h1>
              {member.is_graduated ? (
                <Badge variant="secondary">Graduated</Badge>
              ) : member.is_active ? (
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
              {member.is_new_member && (
                <Badge className="bg-blue-100 text-blue-800">New Member</Badge>
              )}
            </div>
            <p className="text-muted-foreground capitalize">
              {member.gender} - {getGradeLabel(member.grade)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleMarkGraduated}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GraduationCap className="mr-2 h-4 w-4" />
            )}
            {member.is_graduated ? 'Remove Graduated' : 'Mark Graduated'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {member.first_name} {member.last_name}? This
                  action cannot be undone and will remove all associated assignments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">
                  {member.first_name} {member.last_name}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{member.gender}</p>
              </div>
            </div>
            {member.date_of_birth && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">
                      {format(new Date(member.date_of_birth), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Academic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.student_id && (
              <>
                <div className="flex items-center gap-3">
                  <IdCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="font-medium">{member.student_id}</p>
                  </div>
                </div>
                <Separator />
              </>
            )}
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Grade</p>
                <p className="font-medium">{getGradeLabel(member.grade)}</p>
              </div>
            </div>
            {member.major && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Major</p>
                    <p className="font-medium">{member.major}</p>
                  </div>
                </div>
              </>
            )}
            {member.minor && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Minor</p>
                    <p className="font-medium">{member.minor}</p>
                  </div>
                </div>
              </>
            )}
            {member.expected_graduation && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Graduation</p>
                    <p className="font-medium">{member.expected_graduation}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Church Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Church Information</CardTitle>
          </CardHeader>
          <CardContent>
            {member.church ? (
              <div className="flex items-center gap-3">
                <Church className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Home Church</p>
                  <p className="font-medium">{member.church}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No church information provided</p>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.email ? (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${member.email}`}
                    className="font-medium text-soft-blue hover:underline"
                  >
                    {member.email}
                  </a>
                </div>
              </div>
            ) : null}
            {member.phone && (
              <>
                {member.email && <Separator />}
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${member.phone}`}
                      className="font-medium text-soft-blue hover:underline"
                    >
                      {member.phone}
                    </a>
                  </div>
                </div>
              </>
            )}
            {!member.email && !member.phone && (
              <p className="text-muted-foreground">No contact information provided</p>
            )}
          </CardContent>
        </Card>

        {/* Mentor Program */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mentor Program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Wants a Mentor</p>
                <p className="font-medium">{member.wants_mentor ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Wants to Mentor Others</p>
                <p className="font-medium">{member.wants_to_mentor ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Membership Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">New Member</p>
                <p className="font-medium">{member.is_new_member ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  {member.is_graduated ? 'Graduated' : member.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      {member.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{member.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
