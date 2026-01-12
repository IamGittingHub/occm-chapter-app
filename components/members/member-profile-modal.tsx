'use client';

import { Member, CommunicationLog } from '@/types/database';
import { gradeOptions } from '@/lib/validators/member';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Phone,
  Church,
  BookOpen,
  GraduationCap,
  Calendar,
  User,
  ExternalLink,
  Heart,
  Users,
  MessageSquare,
  CheckCircle,
  PhoneCall,
  Clock,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';

export interface CommunicationInfo {
  assignedTo?: string;
  status?: 'pending' | 'successful';
  assignedDate?: string;
  logs?: CommunicationLog[];
}

interface MemberProfileModalProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  communicationInfo?: CommunicationInfo;
}

export function MemberProfileModal({ member, open, onClose, communicationInfo }: MemberProfileModalProps) {
  if (!member) return null;

  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  const attemptCount = communicationInfo?.logs?.length || 0;
  const lastLog = communicationInfo?.logs?.[communicationInfo.logs.length - 1];
  const daysSinceAssigned = communicationInfo?.assignedDate
    ? differenceInDays(new Date(), new Date(communicationInfo.assignedDate))
    : null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gold flex items-center justify-center text-deep-blue text-xl font-bold">
              {member.first_name[0]}{member.last_name[0]}
            </div>
            <div>
              <SheetTitle className="text-xl text-left">
                {member.first_name} {member.last_name}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {member.gender}
                </Badge>
                <Badge variant="secondary">
                  {getGradeLabel(member.grade)}
                </Badge>
                {member.is_new_member && (
                  <Badge className="bg-blue-100 text-blue-800">New</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Contact Info - Most Important */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Contact
            </h4>
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Mail className="h-5 w-5 text-soft-blue" />
                <span className="text-sm break-all">{member.email}</span>
              </a>
            )}
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Phone className="h-5 w-5 text-soft-blue" />
                <span className="text-sm">{member.phone}</span>
              </a>
            )}
            {!member.email && !member.phone && (
              <p className="text-sm text-muted-foreground italic">No contact information</p>
            )}
          </div>

          {/* Communication Status */}
          {communicationInfo && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Outreach Status
                </h4>

                {/* Status Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  {communicationInfo.status === 'successful' ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Successfully Connected
                    </Badge>
                  ) : attemptCount > 0 ? (
                    <Badge className="bg-blue-100 text-blue-800">
                      <PhoneCall className="h-3 w-3 mr-1" />
                      In Progress - {attemptCount} {attemptCount === 1 ? 'attempt' : 'attempts'}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Not Yet Contacted
                    </Badge>
                  )}
                </div>

                {/* Assigned To */}
                {communicationInfo.assignedTo && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MessageSquare className="h-5 w-5 text-soft-blue" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned To</p>
                      <p className="text-sm font-medium">{communicationInfo.assignedTo}</p>
                      {daysSinceAssigned !== null && (
                        <p className="text-xs text-muted-foreground">
                          {daysSinceAssigned} days ago
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact History */}
                {communicationInfo.logs && communicationInfo.logs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Contact History</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {[...communicationInfo.logs].reverse().map((log, index) => (
                        <div
                          key={log.id || index}
                          className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-sm"
                        >
                          <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                            log.was_successful ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium capitalize">{log.contact_method}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.contact_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {log.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Academic Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Academic
            </h4>
            <div className="grid gap-3">
              {member.major && (
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Major</p>
                    <p className="text-sm font-medium">{member.major}</p>
                  </div>
                </div>
              )}
              {member.minor && (
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Minor</p>
                    <p className="text-sm font-medium">{member.minor}</p>
                  </div>
                </div>
              )}
              {member.expected_graduation && (
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Graduation</p>
                    <p className="text-sm font-medium">{member.expected_graduation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Church */}
          {member.church && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Church
                </h4>
                <div className="flex items-center gap-3">
                  <Church className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{member.church}</span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Personal Info */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Details
            </h4>
            <div className="grid gap-3">
              {member.date_of_birth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Birthday</p>
                    <p className="text-sm font-medium">
                      {format(new Date(member.date_of_birth), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium">
                    {member.is_graduated ? 'Graduated' : member.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mentor Program */}
          {(member.wants_mentor || member.wants_to_mentor) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Mentor Program
                </h4>
                <div className="flex flex-wrap gap-2">
                  {member.wants_mentor && (
                    <Badge variant="outline" className="gap-1">
                      <Heart className="h-3 w-3" />
                      Wants a mentor
                    </Badge>
                  )}
                  {member.wants_to_mentor && (
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      Wants to mentor
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {member.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Notes
                </h4>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {member.notes}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer with link to full profile */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t">
          <Button className="w-full" asChild>
            <Link href={`/members/${member.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Profile / Edit
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
