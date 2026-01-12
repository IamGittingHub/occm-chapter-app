'use client';

import { useState, useMemo } from 'react';
import { CommunicationAssignment, Member, CommunicationLog } from '@/types/database';
import { gradeOptions } from '@/lib/validators/member';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ContactLogModal } from './contact-log-modal';
import { MemberProfileModal, CommunicationInfo } from '@/components/members/member-profile-modal';
import { MarkSuccessfulModal } from './mark-successful-modal';
import {
  Search,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Church,
  BookOpen,
  User,
  PhoneCall,
  RefreshCw,
  Check,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

interface CommunicationAssignmentWithDetails extends CommunicationAssignment {
  member: Member;
  communication_logs: CommunicationLog[];
}

interface CommunicationListProps {
  assignments: CommunicationAssignmentWithDetails[];
}

export function CommunicationList({ assignments }: CommunicationListProps) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<CommunicationAssignmentWithDetails | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCommunicationInfo, setSelectedCommunicationInfo] = useState<CommunicationInfo | null>(null);
  const [markSuccessfulAssignment, setMarkSuccessfulAssignment] = useState<CommunicationAssignmentWithDetails | null>(null);

  // Helper to open member modal with communication info
  const openMemberModal = (assignment: CommunicationAssignmentWithDetails) => {
    setSelectedMember(assignment.member);
    setSelectedCommunicationInfo({
      assignedTo: 'You',
      status: assignment.status as 'pending' | 'successful',
      assignedDate: assignment.assigned_date,
      logs: assignment.communication_logs,
    });
  };

  const closeMemberModal = () => {
    setSelectedMember(null);
    setSelectedCommunicationInfo(null);
  };

  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  // Helper to get attempt count and last contact date
  const getContactStats = (logs: CommunicationLog[] | undefined) => {
    const attemptCount = logs?.length || 0;
    const lastLog = logs?.[logs.length - 1];
    const lastContactDate = lastLog ? new Date(lastLog.contact_date) : null;
    return { attemptCount, lastLog, lastContactDate };
  };

  // Sort assignments: no attempts first, then by oldest last contact, then by most recent
  const sortAssignments = (assignments: CommunicationAssignmentWithDetails[]) => {
    return [...assignments].sort((a, b) => {
      const statsA = getContactStats(a.communication_logs);
      const statsB = getContactStats(b.communication_logs);

      // No attempts should come first (need attention)
      if (statsA.attemptCount === 0 && statsB.attemptCount > 0) return -1;
      if (statsA.attemptCount > 0 && statsB.attemptCount === 0) return 1;

      // If both have attempts, sort by oldest last contact first (need follow-up)
      if (statsA.lastContactDate && statsB.lastContactDate) {
        return statsA.lastContactDate.getTime() - statsB.lastContactDate.getTime();
      }

      // If both have no attempts, sort by assigned date (oldest first)
      return new Date(a.assigned_date).getTime() - new Date(b.assigned_date).getTime();
    });
  };

  const filterAssignments = (status: 'all' | 'pending' | 'in_progress' | 'successful') => {
    const filtered = assignments.filter((a) => {
      const { attemptCount } = getContactStats(a.communication_logs);

      const matchesStatus =
        status === 'all' ||
        (status === 'pending' && a.status === 'pending' && attemptCount === 0) ||
        (status === 'in_progress' && a.status === 'pending' && attemptCount > 0) ||
        (status === 'successful' && a.status === 'successful');

      const matchesSearch =
        search === '' ||
        `${a.member?.first_name} ${a.member?.last_name}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        a.member?.major?.toLowerCase().includes(search.toLowerCase());

      const matchesGrade = gradeFilter === 'all' || a.member?.grade === gradeFilter;

      return matchesStatus && matchesSearch && matchesGrade;
    });

    return sortAssignments(filtered);
  };

  const renderAssignmentCard = (assignment: CommunicationAssignmentWithDetails) => {
    const member = assignment.member;
    if (!member) return null;

    const initials = `${member.first_name[0]}${member.last_name[0]}`;
    const now = new Date();
    const daysSinceAssigned = differenceInDays(now, new Date(assignment.assigned_date));
    const isApproaching = daysSinceAssigned >= 20 && daysSinceAssigned < 30;
    const isOverdue = daysSinceAssigned >= 30;
    const { attemptCount, lastLog, lastContactDate } = getContactStats(assignment.communication_logs);
    const daysSinceLastContact = lastContactDate ? differenceInDays(now, lastContactDate) : null;
    const hasAttempts = attemptCount > 0;

    // Determine card border color based on status
    const getBorderClass = () => {
      if (assignment.status === 'successful') return 'border-green-400';
      if (hasAttempts) return 'border-blue-400'; // In progress
      if (isOverdue) return 'border-destructive';
      if (isApproaching) return 'border-orange-400';
      return '';
    };

    return (
      <Card
        key={assignment.id}
        className={`hover:shadow-md transition-shadow ${getBorderClass()}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarFallback
                className={`text-base font-semibold ${
                  assignment.status === 'successful'
                    ? 'bg-green-100 text-green-700'
                    : hasAttempts
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-soft-blue text-white'
                }`}
              >
                {assignment.status === 'successful' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : hasAttempts ? (
                  <span className="text-sm font-bold">{attemptCount}</span>
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <button
                  onClick={() => openMemberModal(assignment)}
                  className="font-semibold text-base hover:text-soft-blue hover:underline text-left"
                >
                  {member.first_name} {member.last_name}
                </button>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Attempt count badge - prominent */}
                  {hasAttempts && assignment.status === 'pending' && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      <PhoneCall className="h-3 w-3 mr-1" />
                      {attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'}
                    </Badge>
                  )}
                  {/* Status badge */}
                  {assignment.status === 'successful' ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : isOverdue && !hasAttempts ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {daysSinceAssigned}d
                    </Badge>
                  ) : isApproaching && !hasAttempts ? (
                    <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {daysSinceAssigned}d
                    </Badge>
                  ) : !hasAttempts ? (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {daysSinceAssigned}d
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="capitalize text-xs px-1.5 py-0">
                  {member.gender}
                </Badge>
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {getGradeLabel(member.grade)}
                </Badge>
              </div>

              {/* Contact Progress Indicator */}
              {hasAttempts && assignment.status === 'pending' && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-700 font-medium">
                      In Progress
                    </span>
                    {daysSinceLastContact !== null && (
                      <span className="text-blue-600">
                        {daysSinceLastContact === 0
                          ? 'Today'
                          : daysSinceLastContact === 1
                          ? 'Yesterday'
                          : `${daysSinceLastContact}d ago`}
                      </span>
                    )}
                  </div>
                  {lastLog && (
                    <p className="text-xs text-blue-600 mt-1">
                      Last: {lastLog.contact_method} on {format(new Date(lastLog.contact_date), 'MMM d')}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2 space-y-1 text-xs">
                {member.major && (
                  <div className="flex items-center text-muted-foreground">
                    <BookOpen className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{member.major}</span>
                  </div>
                )}
                {member.church && (
                  <div className="flex items-center text-muted-foreground">
                    <Church className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{member.church}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <a
                      href={`mailto:${member.email}`}
                      className="truncate hover:text-soft-blue hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {member.email}
                    </a>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <a
                      href={`tel:${member.phone}`}
                      className="hover:text-soft-blue hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {member.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {assignment.status === 'pending' && (
                  <Button
                    size="sm"
                    className={`h-8 text-xs ${hasAttempts ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    {hasAttempts ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Follow Up
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Log Contact
                      </>
                    )}
                  </Button>
                )}
                {/* Mark Successful button for in-progress contacts */}
                {hasAttempts && assignment.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-green-400 text-green-700 hover:bg-green-50"
                    onClick={() => setMarkSuccessfulAssignment(assignment)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Mark </span>Success
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => openMemberModal(assignment)}
                >
                  <User className="h-3.5 w-3.5 mr-1" />
                  Profile
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const pendingAssignments = filterAssignments('pending');
  const inProgressAssignments = filterAssignments('in_progress');
  const successfulAssignments = filterAssignments('successful');
  const allAssignments = filterAssignments('all');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or major..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-10">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {gradeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            New ({pendingAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">In Progress</span>
            <span className="sm:hidden">Active</span>
            <span className="ml-1">({inProgressAssignments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="successful" className="text-xs sm:text-sm">
            Done ({successfulAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            All ({allAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingAssignments.map(renderAssignmentCard)}
          </div>
          {pendingAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No new assignments. Check &quot;In Progress&quot; for people you&apos;ve contacted.
            </p>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressAssignments.map(renderAssignmentCard)}
          </div>
          {inProgressAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No contacts in progress. Log a contact to move someone here.
            </p>
          )}
        </TabsContent>

        <TabsContent value="successful" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {successfulAssignments.map(renderAssignmentCard)}
          </div>
          {successfulAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No successful connections yet.</p>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allAssignments.map(renderAssignmentCard)}
          </div>
          {allAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No assignments found.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Contact Log Modal */}
      {selectedAssignment && (
        <ContactLogModal
          assignment={selectedAssignment}
          open={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}

      {/* Mark Successful Modal */}
      {markSuccessfulAssignment && (
        <MarkSuccessfulModal
          assignment={markSuccessfulAssignment}
          open={!!markSuccessfulAssignment}
          onClose={() => setMarkSuccessfulAssignment(null)}
        />
      )}

      {/* Member Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        open={!!selectedMember}
        onClose={closeMemberModal}
        communicationInfo={selectedCommunicationInfo || undefined}
      />
    </div>
  );
}
