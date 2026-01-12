'use client';

import { useState } from 'react';
import { PrayerAssignment, Member } from '@/types/database';
import { gradeOptions } from '@/lib/validators/member';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MemberProfileModal } from '@/components/members/member-profile-modal';
import { Mail, Phone, Church, BookOpen, User } from 'lucide-react';

interface PrayerAssignmentWithMember extends PrayerAssignment {
  member: Member;
}

interface PrayerListProps {
  assignments: PrayerAssignmentWithMember[];
}

export function PrayerList({ assignments }: PrayerListProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((assignment) => {
          const member = assignment.member;
          if (!member) return null;

          const initials = `${member.first_name[0]}${member.last_name[0]}`;

          return (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-gold text-deep-blue text-base font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedMember(member)}
                      className="font-semibold text-base hover:text-soft-blue hover:underline text-left block"
                    >
                      {member.first_name} {member.last_name}
                    </button>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="capitalize text-xs px-1.5 py-0">
                        {member.gender}
                      </Badge>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {getGradeLabel(member.grade)}
                      </Badge>
                    </div>

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
                          >
                            {member.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => setSelectedMember(member)}
                      >
                        <User className="h-3.5 w-3.5 mr-1" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Member Profile Modal */}
      <MemberProfileModal
        member={selectedMember}
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </>
  );
}
