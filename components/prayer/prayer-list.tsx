'use client';

import { PrayerAssignment, Member } from '@/types/database';
import { gradeOptions } from '@/lib/validators/member';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, Church, GraduationCap, BookOpen } from 'lucide-react';

interface PrayerAssignmentWithMember extends PrayerAssignment {
  member: Member;
}

interface PrayerListProps {
  assignments: PrayerAssignmentWithMember[];
}

export function PrayerList({ assignments }: PrayerListProps) {
  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assignments.map((assignment) => {
        const member = assignment.member;
        if (!member) return null;

        const initials = `${member.first_name[0]}${member.last_name[0]}`;

        return (
          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-gold text-deep-blue text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">
                    {member.first_name} {member.last_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {member.gender}
                    </Badge>
                    <Badge variant="secondary">
                      {getGradeLabel(member.grade)}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    {member.major && (
                      <div className="flex items-center text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                        <span className="truncate">{member.major}</span>
                      </div>
                    )}
                    {member.church && (
                      <div className="flex items-center text-muted-foreground">
                        <Church className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                        <span className="truncate">{member.church}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className="flex items-center text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                        <a
                          href={`mailto:${member.email}`}
                          className="truncate hover:text-soft-blue hover:underline"
                        >
                          {member.email}
                        </a>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                        <a
                          href={`tel:${member.phone}`}
                          className="hover:text-soft-blue hover:underline"
                        >
                          {member.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
