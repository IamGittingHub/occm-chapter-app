'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Member, Priority } from '@/types/database';
import { gradeOptions, genderOptions } from '@/lib/validators/member';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Eye, Pencil, Trash2, AlertCircle, Minus, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';

const priorityOptions: { value: Priority; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'high', label: 'High', color: 'text-red-600 bg-red-50 border-red-200', icon: <AlertCircle className="h-3 w-3" /> },
  { value: 'normal', label: 'Normal', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: <Minus className="h-3 w-3" /> },
  { value: 'low', label: 'Low', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <CheckCircle2 className="h-3 w-3" /> },
];

interface MemberTableProps {
  members: Member[];
  onDelete?: (id: string) => void;
}

export function MemberTable({ members, onDelete }: MemberTableProps) {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const { toast } = useToast();
  const setPriority = useMutation(api.members.setPriority);

  const handlePriorityChange = async (memberId: string, priority: Priority) => {
    try {
      await setPriority({ memberId: memberId as Id<"members">, priority });
      toast({
        title: 'Priority updated',
        description: `Member priority set to ${priority}.`,
      });
    } catch (error) {
      toast({
        title: 'Error updating priority',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      search === '' ||
      `${member.first_name} ${member.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      member.email?.toLowerCase().includes(search.toLowerCase()) ||
      member.major?.toLowerCase().includes(search.toLowerCase());

    const matchesGrade = gradeFilter === 'all' || member.grade === gradeFilter;
    const matchesGender = genderFilter === 'all' || member.gender === genderFilter;

    return matchesSearch && matchesGrade && matchesGender;
  });

  const getGradeLabel = (grade: string) => {
    return gradeOptions.find((g) => g.value === grade)?.label || grade;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
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
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            {genderOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredMembers.length} of {members.length} members
      </p>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Gender</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="hidden md:table-cell">Major</TableHead>
              <TableHead className="hidden lg:table-cell">Church</TableHead>
              <TableHead className="hidden md:table-cell">Priority</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground sm:hidden">
                        {member.gender === 'male' ? 'M' : 'F'} - {getGradeLabel(member.grade)}
                      </p>
                      {member.email && (
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell capitalize">
                    {member.gender}
                  </TableCell>
                  <TableCell>{getGradeLabel(member.grade)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {member.major || '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {member.church || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Select
                      value={member.priority || 'normal'}
                      onValueChange={(value) => handlePriorityChange(member.id, value as Priority)}
                    >
                      <SelectTrigger className={`w-[100px] h-8 text-xs ${
                        priorityOptions.find(p => p.value === (member.priority || 'normal'))?.color
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-1.5">
                              {option.icon}
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {member.is_graduated ? (
                        <Badge variant="secondary">Graduated</Badge>
                      ) : member.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                      {member.is_new_member && (
                        <Badge className="bg-blue-100 text-blue-800">New</Badge>
                      )}
                      {member.is_committee_member && (
                        <Badge className="bg-gold/20 text-gold border border-gold">Committee</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/members/${member.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/members/${member.id}?edit=true`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(member.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
