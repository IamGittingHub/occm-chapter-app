'use client';

import { useState } from 'react';
import { CommunicationAssignment, Member, CommunicationLog } from '@/types/database';
import { gradeOptions } from '@/lib/validators/member';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ContactLogModal } from './contact-log-modal';
import { Search, MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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

  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  const filterAssignments = (status: 'all' | 'pending' | 'successful') => {
    return assignments.filter((a) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'pending' && a.status === 'pending') ||
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
  };

  const renderAssignmentCard = (assignment: CommunicationAssignmentWithDetails) => {
    const member = assignment.member;
    if (!member) return null;

    const initials = `${member.first_name[0]}${member.last_name[0]}`;
    const now = new Date();
    const daysSinceAssigned = differenceInDays(now, new Date(assignment.assigned_date));
    const isApproaching = daysSinceAssigned >= 20 && daysSinceAssigned < 30;
    const isOverdue = daysSinceAssigned >= 30;
    const lastLog = assignment.communication_logs?.[assignment.communication_logs.length - 1];

    return (
      <Card
        key={assignment.id}
        className={`hover:shadow-md transition-shadow ${
          isOverdue ? 'border-destructive' : isApproaching ? 'border-orange-400' : ''
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback
                className={`${
                  assignment.status === 'successful'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-soft-blue text-white'
                }`}
              >
                {assignment.status === 'successful' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  initials
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold truncate">
                  {member.first_name} {member.last_name}
                </h3>
                {assignment.status === 'successful' ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : isOverdue ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {daysSinceAssigned} days
                  </Badge>
                ) : isApproaching ? (
                  <Badge variant="outline" className="border-orange-400 text-orange-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {daysSinceAssigned} days
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {daysSinceAssigned} days
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span className="capitalize">{member.gender}</span>
                <span>-</span>
                <span>{getGradeLabel(member.grade)}</span>
                {member.major && (
                  <>
                    <span>-</span>
                    <span className="truncate">{member.major}</span>
                  </>
                )}
              </div>

              {lastLog && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last contact: {format(new Date(lastLog.contact_date), 'MMM d, yyyy')} via{' '}
                  {lastLog.contact_method}
                </p>
              )}

              <div className="mt-3">
                {assignment.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Log Contact
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const pendingAssignments = filterAssignments('pending');
  const successfulAssignments = filterAssignments('successful');
  const allAssignments = filterAssignments('all');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or major..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
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
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({allAssignments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger>
          <TabsTrigger value="successful">Successful ({successfulAssignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allAssignments.map(renderAssignmentCard)}
          </div>
          {allAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No assignments found.</p>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingAssignments.map(renderAssignmentCard)}
          </div>
          {pendingAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No pending assignments.</p>
          )}
        </TabsContent>

        <TabsContent value="successful" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {successfulAssignments.map(renderAssignmentCard)}
          </div>
          {successfulAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No successful connections yet.</p>
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
    </div>
  );
}
