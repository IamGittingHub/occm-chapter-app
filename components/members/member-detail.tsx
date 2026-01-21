'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Member } from '@/types/database';
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
  Sparkles,
  AlertCircle,
  Minus,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { Priority } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const priorityOptions: { value: Priority; label: string; description: string; color: string; icon: React.ReactNode }[] = [
  { value: 'high', label: 'High Priority', description: 'Not attending regularly - needs more attention', color: 'text-red-600 bg-red-50 border-red-200', icon: <AlertCircle className="h-4 w-4" /> },
  { value: 'normal', label: 'Normal Priority', description: 'Default priority level', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: <Minus className="h-4 w-4" /> },
  { value: 'low', label: 'Low Priority', description: 'Regular attender - lower outreach priority', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <CheckCircle2 className="h-4 w-4" /> },
];

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

  const updateMember = useMutation(api.members.update);
  const removeMember = useMutation(api.members.remove);
  const markGraduated = useMutation(api.members.markGraduated);
  const setPriorityMutation = useMutation(api.members.setPriority);

  const handlePriorityChange = async (priority: Priority) => {
    try {
      await setPriorityMutation({ memberId: member.id as Id<"members">, priority });
      toast({
        title: 'Priority updated',
        description: `Outreach priority set to ${priority}.`,
      });
    } catch (error) {
      toast({
        title: 'Error updating priority',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  async function handleUpdate(data: MemberFormValues) {
    setIsLoading(true);

    try {
      await updateMember({
        id: member.id as Id<"members">,
        firstName: data.first_name,
        lastName: data.last_name,
        gender: data.gender,
        grade: data.grade,
        major: data.major || undefined,
        minor: data.minor || undefined,
        church: data.church || undefined,
        dateOfBirth: data.date_of_birth || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        studentId: data.student_id || undefined,
        expectedGraduation: data.expected_graduation || undefined,
        isNewMember: data.is_new_member || false,
        wantsMentor: data.wants_mentor || false,
        wantsToMentor: data.wants_to_mentor || false,
        notes: data.notes || undefined,
      });

      toast({
        title: 'Member updated',
        description: `${data.first_name} ${data.last_name}'s profile has been updated.`,
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error updating member',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await removeMember({ id: member.id as Id<"members"> });

      toast({
        title: 'Member deleted',
        description: `${member.first_name} ${member.last_name} has been removed.`,
      });

      router.push('/members');
    } catch (error) {
      toast({
        title: 'Error deleting member',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      setIsDeleting(false);
    }
  }

  async function handleMarkGraduated() {
    setIsLoading(true);

    try {
      await markGraduated({ id: member.id as Id<"members"> });

      toast({
        title: member.is_graduated ? 'Removed graduated status' : 'Marked as graduated',
        description: `${member.first_name} ${member.last_name} ${
          member.is_graduated ? 'is no longer marked as graduated' : 'has been marked as graduated'
        }.`,
      });
    } catch (error) {
      toast({
        title: 'Error updating member',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }

  if (isEditing) {
    return (
      <div className="space-y-6 pb-20">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-warm-white -mx-4 px-4 py-3 border-b sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold text-deep-blue">Edit Member</h1>
          </div>
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
    <div className="pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-warm-white -mx-4 px-4 py-3 border-b sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/members">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-deep-blue">
                  {member.first_name} {member.last_name}
                </h1>
                {member.is_graduated ? (
                  <Badge variant="secondary" className="text-xs">Graduated</Badge>
                ) : member.is_active ? (
                  <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Inactive</Badge>
                )}
                {member.is_committee_member && (
                  <Badge className="bg-gold/20 text-gold border border-gold text-xs">Committee</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm capitalize">
                {member.gender} - {getGradeLabel(member.grade)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkGraduated}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <GraduationCap className="mr-1 h-3.5 w-3.5" />
              )}
              {member.is_graduated ? 'Ungraduate' : 'Graduate'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
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
      </div>

      {/* Details */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium">
                  {member.first_name} {member.last_name}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="text-sm font-medium capitalize">{member.gender}</p>
              </div>
            </div>
            {member.date_of_birth && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm font-medium">
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Academic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.student_id && (
              <>
                <div className="flex items-center gap-3">
                  <IdCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Student ID</p>
                    <p className="text-sm font-medium">{member.student_id}</p>
                  </div>
                </div>
                <Separator />
              </>
            )}
            <div className="flex items-center gap-3">
              <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Grade</p>
                <p className="text-sm font-medium">{getGradeLabel(member.grade)}</p>
              </div>
            </div>
            {member.major && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Major</p>
                    <p className="text-sm font-medium">{member.major}</p>
                  </div>
                </div>
              </>
            )}
            {member.minor && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Minor</p>
                    <p className="text-sm font-medium">{member.minor}</p>
                  </div>
                </div>
              </>
            )}
            {member.expected_graduation && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Graduation</p>
                    <p className="text-sm font-medium">{member.expected_graduation}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Church Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Church Information</CardTitle>
          </CardHeader>
          <CardContent>
            {member.church ? (
              <div className="flex items-center gap-3">
                <Church className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Home Church</p>
                  <p className="text-sm font-medium">{member.church}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No church information provided</p>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.email ? (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${member.email}`}
                    className="text-sm font-medium text-soft-blue hover:underline block truncate"
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
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <a
                      href={`tel:${member.phone}`}
                      className="text-sm font-medium text-soft-blue hover:underline"
                    >
                      {member.phone}
                    </a>
                  </div>
                </div>
              </>
            )}
            {!member.email && !member.phone && (
              <p className="text-sm text-muted-foreground">No contact information provided</p>
            )}
          </CardContent>
        </Card>

        {/* Mentor Program */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mentor Program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Wants a Mentor</p>
                <p className="text-sm font-medium">{member.wants_mentor ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Wants to Mentor Others</p>
                <p className="text-sm font-medium">{member.wants_to_mentor ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outreach Priority */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Outreach Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Select
                value={member.priority || 'normal'}
                onValueChange={(value) => handlePriorityChange(value as Priority)}
              >
                <SelectTrigger className={`w-full ${
                  priorityOptions.find(p => p.value === (member.priority || 'normal'))?.color
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <div>
                          <p className="font-medium">{option.label}</p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {priorityOptions.find(p => p.value === (member.priority || 'normal'))?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Membership Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Membership Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">New Member</p>
                <p className="text-sm font-medium">{member.is_new_member ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium">
                  {member.is_graduated ? 'Graduated' : member.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Committee Member</p>
                <p className="text-sm font-medium">
                  {member.is_committee_member ? (
                    <span className="text-gold">Yes - excluded from communication assignments</span>
                  ) : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      {member.notes && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
