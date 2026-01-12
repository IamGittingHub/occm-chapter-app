'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Gender, Grade } from '@/types/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, RefreshCw, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenderSwipeUI, MemberNeedingGender } from './gender-swipe-ui';

interface CSVImportProps {
  onSuccess?: () => void;
}

interface ConvexMember {
  _id: Id<"members">;
  firstName: string;
  lastName: string;
  gender: Gender;
  grade: Grade;
  email?: string;
  phone?: string;
  church?: string;
  major?: string;
  minor?: string;
  studentId?: string;
  dateOfBirth?: string;
  expectedGraduation?: string;
  isNewMember?: boolean;
  wantsMentor?: boolean;
  wantsToMentor?: boolean;
  notes?: string;
  isActive: boolean;
  isGraduated: boolean;
}

// Common Coptic/Orthodox name patterns for gender inference
const femaleNames = new Set([
  'maria', 'mariam', 'marina', 'mary', 'christine', 'christina', 'jessica', 'jennifer', 'julie',
  'joice', 'josiana', 'jomana', 'kereia', 'kerestin', 'karin', 'kireya', 'klara',
  'karen', 'lydia', 'melissa', 'melody', 'merola', 'miriam', 'maryam', 'martina',
  'natalie', 'nadia', 'nermin', 'phoebe', 'rosalenda', 'saly', 'sandy', 'sara', 'sarah',
  'sama', 'veronica', 'verena', 'eva', 'angela', 'anastasia', 'emiliya', 'donia',
  'franshiska', 'happy', 'jesika', 'demiana', 'boulla', 'mera', 'marvy', 'brittany',
  'jusiana', 'gousian', 'monica', 'irini', 'eirini', 'eriny', 'rebecca', 'ruth',
  'esther', 'elizabeth', 'anna', 'anne', 'hannah', 'sophia', 'victoria', 'catherine',
  'katherine', 'kate', 'emily', 'emma', 'olivia', 'isabella', 'mia', 'abigail',
  'ashley', 'amanda', 'nicole', 'stephanie', 'samantha', 'rachel', 'helen', 'helena',
  'diana', 'julia', 'grace', 'chloe', 'zoe', 'lily', 'madison', 'natasha', 'tanya',
  'tamara', 'pauline', 'patricia', 'paula', 'gloria', 'agnes', 'bridget', 'carol',
  'caroline', 'cecilia', 'clara', 'dina', 'donna', 'dorothy', 'eva', 'evelyn', 'florence',
  'frances', 'gabriella', 'gina', 'gloria', 'heather', 'holly', 'iris', 'ivy', 'jacqueline',
  'jane', 'janet', 'jasmine', 'joan', 'josephine', 'joyce', 'judith', 'kelly', 'kimberly',
  'laura', 'lauren', 'leah', 'linda', 'lisa', 'louise', 'lucy', 'margaret', 'marie',
  'martha', 'megan', 'melanie', 'michelle', 'mirna', 'nancy', 'naomi', 'nina', 'norma',
  'olga', 'pamela', 'peggy', 'phyllis', 'renee', 'rita', 'roberta', 'rosa', 'rosemary',
  'ruby', 'sandra', 'sharon', 'sheila', 'shirley', 'silvia', 'susan', 'suzanne', 'sylvia',
  'teresa', 'theresa', 'tiffany', 'tracy', 'valerie', 'vanessa', 'violet', 'virginia',
  'vivian', 'wendy', 'yvonne', 'martha', 'mariana', 'marianne'
]);

const maleNames = new Set([
  'abanoub', 'andro', 'antoun', 'arsanious', 'amir', 'ahmed', 'amonious', 'antonious',
  'fady', 'george', 'gorg', 'gwargeous', 'ibram', 'john', 'kerolos', 'kerolous',
  'kevin', 'kirollos', 'kirolous', 'kyrollos', 'kirolos', 'lukas', 'mahraeel', 'mark',
  'michael', 'mikey', 'mina', 'mohrail', 'nathan', 'peter', 'philo', 'philopateer',
  'samwaeil', 'tomas', 'youssef', 'estifin', 'gorg', 'joseph', 'david', 'daniel',
  'andrew', 'matthew', 'james', 'robert', 'william', 'richard', 'charles', 'thomas',
  'christopher', 'anthony', 'paul', 'steven', 'steve', 'brian', 'edward', 'ronald',
  'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan',
  'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'gregory',
  'frank', 'raymond', 'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron',
  'jose', 'adam', 'henry', 'douglas', 'zachary', 'marcus', 'philip', 'keith', 'randy',
  'howard', 'eugene', 'gerald', 'carl', 'bobby', 'christian', 'joshua', 'jesse', 'billy',
  'bruce', 'wayne', 'roy', 'vincent', 'roger', 'johnny', 'eugene', 'russell', 'louis',
  'martin', 'maged', 'magdy', 'maher', 'maurice', 'milad', 'ramy', 'rafik', 'ramez',
  'sameh', 'samir', 'sherif', 'simon', 'sobhy', 'stefanos', 'tamer', 'tarek', 'tony',
  'wagdy', 'wael', 'waleed', 'waseem', 'yasser', 'yousef', 'zaki', 'ayman', 'ashraf',
  'atef', 'basem', 'bishoy', 'boules', 'emad', 'essam', 'fawzy', 'gamil', 'george',
  'habib', 'hany', 'hazem', 'hosni', 'ibrahim', 'kamal', 'karim', 'khaled', 'magdi',
  'mahmoud', 'medhat', 'nabil', 'nader', 'osama', 'raouf', 'reda', 'refaat', 'saad',
  'sabry', 'said', 'salah', 'samy', 'seif', 'shady', 'sherif', 'shokry', 'sobhy'
]);

function inferGender(firstName: string): Gender | null {
  const name = firstName.toLowerCase().trim();
  if (femaleNames.has(name)) return 'female';
  if (maleNames.has(name)) return 'male';
  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function mapGradeValue(value: string): Grade | null {
  const grade = value.toLowerCase().trim();
  if (grade.includes('freshman') || grade === 'fr') return 'freshman';
  if (grade.includes('sophomore') || grade === 'so') return 'sophomore';
  if (grade.includes('junior') || grade === 'jr') return 'junior';
  if (grade.includes('senior') || grade === 'sr') return 'senior';
  if (grade.includes('grad') || grade.includes('graduate')) return 'grad';
  // Handle N/A, unknown, and empty values
  if (grade === 'n/a' || grade === 'na' || grade === 'unknown' || grade === '' || grade === '-') return 'unknown';
  return null;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;
      if (match[1].length === 4) {
        [, year, month, day] = match;
      } else {
        [, month, day, year] = match;
      }

      const yearNum = parseInt(year);
      if (yearNum < 1950 || yearNum > 2010) return null;

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

function cleanPhoneNumber(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 10) return null;
  return cleaned;
}

function parseYesNo(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'yes' || lower === 'y' || lower === 'true' || lower === '1';
}

interface ParsedMember {
  first_name: string;
  last_name: string;
  gender: Gender;
  grade: Grade;
  major?: string;
  minor?: string;
  church?: string;
  email?: string;
  phone?: string;
  student_id?: string;
  date_of_birth?: string;
  expected_graduation?: string;
  is_new_member?: boolean;
  wants_mentor?: boolean;
  wants_to_mentor?: boolean;
  notes?: string;
  _needsGender?: boolean;
  _existingId?: Id<"members">;
  _isUpdate?: boolean;
  _changes?: string[];
}

type ImportMode = 'add' | 'sync';

export function CSVImport({ onSuccess }: CSVImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedMember[]>([]);
  const [needsGender, setNeedsGender] = useState<{ index: number; name: string; gender: Gender | null }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<ImportMode>('sync');
  const [advanceGrades, setAdvanceGrades] = useState(false);
  const [showSwipeUI, setShowSwipeUI] = useState(false);

  // Use Convex query for existing members
  const existingMembersData = useQuery(api.members.list);
  const existingMembers: ConvexMember[] = existingMembersData || [];

  // Convex mutations
  const bulkCreateMembers = useMutation(api.members.bulkCreate);
  const updateMember = useMutation(api.members.update);

  // Create data structure for swipe UI
  const membersNeedingGenderData: MemberNeedingGender[] = useMemo(() => {
    return needsGender.map(ng => {
      const member = preview[ng.index];
      return {
        index: ng.index,
        firstName: member?.first_name || ng.name.split(' ')[0] || '',
        lastName: member?.last_name || ng.name.split(' ').slice(1).join(' ') || '',
        phone: member?.phone,
        email: member?.email,
        grade: member?.grade,
        gender: ng.gender,
      };
    });
  }, [needsGender, preview]);

  const parseGoogleFormsCSV = useCallback((csv: string, existingMembers: ConvexMember[], mode: ImportMode): {
    members: ParsedMember[];
    errors: string[];
    needsGender: { index: number; name: string; gender: Gender | null }[];
    newCount: number;
    updateCount: number;
  } => {
    const lines = csv.trim().split('\n');
    const errors: string[] = [];
    const members: ParsedMember[] = [];
    const needsGenderList: { index: number; name: string; gender: Gender | null }[] = [];
    let newCount = 0;
    let updateCount = 0;

    // Create lookup map by email
    const existingByEmail = new Map<string, ConvexMember>();
    existingMembers.forEach(m => {
      if (m.email) existingByEmail.set(m.email.toLowerCase(), m);
    });

    if (lines.length < 2) {
      return { members: [], errors: ['CSV must have a header row and at least one data row'], needsGender: [], newCount: 0, updateCount: 0 };
    }

    // Parse header
    let headerLine = lines[0];
    let dataStartIndex = 1;

    const quoteCount = (headerLine.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      let combinedHeader = headerLine;
      for (let i = 1; i < lines.length; i++) {
        combinedHeader += '\n' + lines[i];
        const totalQuotes = (combinedHeader.match(/"/g) || []).length;
        if (totalQuotes % 2 === 0) {
          headerLine = combinedHeader;
          dataStartIndex = i + 1;
          break;
        }
      }
    }

    const headerValues = parseCSVLine(headerLine);
    const header = headerValues.map((h) => h.toLowerCase().replace(/['"]/g, '').trim());

    // Map columns
    const columnMap: Record<string, number> = {};

    header.forEach((h, idx) => {
      if (h.includes('first name')) columnMap['first_name'] = idx;
      else if (h.includes('last name')) columnMap['last_name'] = idx;
      else if (h.includes('school email') || (h.includes('email') && !h.includes('example'))) columnMap['email'] = idx;
      else if (h.includes('phone')) columnMap['phone'] = idx;
      else if (h.includes('date of birth') || h.includes('birthday') || h.includes('dob')) columnMap['date_of_birth'] = idx;
      else if (h.includes('church') || h.includes('attend')) columnMap['church'] = idx;
      else if (h.includes('classification')) columnMap['grade'] = idx;
      else if (h.includes('m-number') || h.includes('m number') || h.includes('student id')) columnMap['student_id'] = idx;
      else if (h.includes('expected graduation') || h.includes('graduation date')) columnMap['expected_graduation'] = idx;
      else if (h.includes('major') && !h.includes('minor')) {
        if (!columnMap['major']) columnMap['major'] = idx;
      }
      else if (h.includes('minor') && !h.includes('major')) {
        if (!columnMap['minor']) columnMap['minor'] = idx;
      }
      else if (h.includes('mentor') && h.includes('paired')) columnMap['wants_mentor'] = idx;
      else if (h.includes('mentor') && h.includes('be a mentor')) columnMap['wants_to_mentor'] = idx;
      else if (h.includes('is new')) columnMap['is_new'] = idx;
      else if (h.includes('suggestion') || h.includes('activities') || h.includes('interested')) {
        if (!columnMap['notes']) columnMap['notes'] = idx;
      }
      else if (h === 'gender') columnMap['gender'] = idx;
    });

    if (columnMap['first_name'] === undefined || columnMap['last_name'] === undefined) {
      return { members: [], errors: ['Could not find First Name and Last Name columns'], needsGender: [], newCount: 0, updateCount: 0 };
    }

    if (columnMap['grade'] === undefined) {
      return { members: [], errors: ['Could not find Classification/Grade column'], needsGender: [], newCount: 0, updateCount: 0 };
    }

    // Parse rows
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);

      const firstName = values[columnMap['first_name']]?.replace(/['"]/g, '').trim();
      const lastName = values[columnMap['last_name']]?.replace(/['"]/g, '').trim();

      if (!firstName || !lastName) continue;

      const gradeValue = values[columnMap['grade']]?.replace(/['"]/g, '').trim();
      const grade = mapGradeValue(gradeValue || '');

      if (!grade) {
        errors.push(`Row ${i + 1} (${firstName} ${lastName}): Invalid grade "${gradeValue}"`);
        continue;
      }

      let gender: Gender | null = null;
      if (columnMap['gender'] !== undefined) {
        const genderValue = values[columnMap['gender']]?.toLowerCase().trim();
        if (genderValue === 'male' || genderValue === 'm') gender = 'male';
        else if (genderValue === 'female' || genderValue === 'f') gender = 'female';
      }

      if (!gender) {
        gender = inferGender(firstName);
      }

      const email = columnMap['email'] !== undefined ? values[columnMap['email']]?.replace(/['"]/g, '').trim().toLowerCase() : undefined;
      const phone = columnMap['phone'] !== undefined ? cleanPhoneNumber(values[columnMap['phone']]) : undefined;
      const church = columnMap['church'] !== undefined ? values[columnMap['church']]?.replace(/['"]/g, '').trim() : undefined;
      const major = columnMap['major'] !== undefined ? values[columnMap['major']]?.replace(/['"]/g, '').trim() : undefined;
      const minor = columnMap['minor'] !== undefined ? values[columnMap['minor']]?.replace(/['"]/g, '').trim() : undefined;
      const studentId = columnMap['student_id'] !== undefined ? values[columnMap['student_id']]?.replace(/['"]/g, '').trim() : undefined;
      const expectedGraduation = columnMap['expected_graduation'] !== undefined ? values[columnMap['expected_graduation']]?.replace(/['"]/g, '').trim() : undefined;
      const dobRaw = columnMap['date_of_birth'] !== undefined ? values[columnMap['date_of_birth']]?.replace(/['"]/g, '').trim() : undefined;
      const dateOfBirth = dobRaw ? parseDate(dobRaw) : undefined;
      const isNew = columnMap['is_new'] !== undefined ? parseYesNo(values[columnMap['is_new']]) : undefined;
      const wantsMentor = columnMap['wants_mentor'] !== undefined ? parseYesNo(values[columnMap['wants_mentor']]) : undefined;
      const wantsToMentor = columnMap['wants_to_mentor'] !== undefined ? parseYesNo(values[columnMap['wants_to_mentor']]) : undefined;
      const notes = columnMap['notes'] !== undefined ? values[columnMap['notes']]?.replace(/['"]/g, '').trim() : undefined;

      // Check if member exists
      const existing = email ? existingByEmail.get(email) : null;

      if (existing && mode === 'add') {
        // Skip existing members in add mode
        continue;
      }

      const member: ParsedMember = {
        first_name: firstName,
        last_name: lastName,
        gender: gender || existing?.gender || 'male',
        grade,
        major: major && major.toLowerCase() !== 'n/a' ? major : existing?.major || undefined,
        minor: minor && minor.toLowerCase() !== 'n/a' ? minor : existing?.minor || undefined,
        church: church || existing?.church || undefined,
        email: email && email.includes('@') ? email : existing?.email || undefined,
        phone: phone || existing?.phone || undefined,
        student_id: studentId || existing?.studentId || undefined,
        date_of_birth: dateOfBirth || existing?.dateOfBirth || undefined,
        expected_graduation: expectedGraduation || existing?.expectedGraduation || undefined,
        is_new_member: isNew ?? existing?.isNewMember,
        wants_mentor: wantsMentor ?? existing?.wantsMentor,
        wants_to_mentor: wantsToMentor ?? existing?.wantsToMentor,
        notes: notes && notes.length > 0 ? notes : existing?.notes || undefined,
        _needsGender: !gender && !existing?.gender,
        _existingId: existing?._id,
        _isUpdate: !!existing,
      };

      // Track changes for updates
      if (existing) {
        const changes: string[] = [];
        if (grade !== existing.grade) changes.push(`Grade: ${existing.grade} → ${grade}`);
        if (phone && phone !== existing.phone) changes.push('Phone updated');
        if (church && church !== existing.church) changes.push('Church updated');
        if (major && major !== existing.major) changes.push('Major updated');
        member._changes = changes;
        updateCount++;
      } else {
        newCount++;
      }

      if (!gender && !existing?.gender) {
        needsGenderList.push({
          index: members.length,
          name: `${firstName} ${lastName}`,
          gender: null,
        });
      }

      members.push(member);
    }

    return { members, errors, needsGender: needsGenderList, newCount, updateCount };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const result = parseGoogleFormsCSV(csv, existingMembers, importMode);
      setPreview(result.members);
      setErrors(result.errors);
      setNeedsGender(result.needsGender);
    };
    reader.readAsText(file);
  };

  // Re-parse when mode changes
  useEffect(() => {
    if (fileName && fileInputRef.current?.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        const result = parseGoogleFormsCSV(csv, existingMembers, importMode);
        setPreview(result.members);
        setErrors(result.errors);
        setNeedsGender(result.needsGender);
      };
      reader.readAsText(fileInputRef.current.files[0]);
    }
  }, [importMode, existingMembers, fileName, parseGoogleFormsCSV]);

  const updateGender = (index: number, gender: Gender) => {
    const newPreview = [...preview];
    const memberIndex = needsGender.find(n => n.index === index)?.index;
    if (memberIndex !== undefined) {
      newPreview[memberIndex] = { ...newPreview[memberIndex], gender, _needsGender: false };
    }
    setPreview(newPreview);
    setNeedsGender(prev => prev.map(n => n.index === index ? { ...n, gender } : n));
  };

  const handleImport = async () => {
    const unassigned = needsGender.filter(n => !n.gender);
    if (unassigned.length > 0) {
      toast({
        title: 'Missing gender assignments',
        description: `Please assign gender for ${unassigned.length} member(s)`,
        variant: 'destructive',
      });
      return;
    }

    if (preview.length === 0) {
      toast({
        title: 'No members to import',
        description: 'Please check your CSV data and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    interface NewMemberData {
      firstName: string;
      lastName: string;
      gender: Gender;
      grade: Grade;
      major?: string;
      minor?: string;
      church?: string;
      email?: string;
      phone?: string;
      studentId?: string;
      dateOfBirth?: string;
      expectedGraduation?: string;
      isNewMember?: boolean;
      wantsMentor?: boolean;
      wantsToMentor?: boolean;
      notes?: string;
    }

    const newMembers: NewMemberData[] = [];
    const updates: { id: Id<"members">; data: NewMemberData }[] = [];

    preview.forEach((member, idx) => {
      const genderAssignment = needsGender.find(n => n.index === idx);
      const { _needsGender, _existingId, _isUpdate, _changes, ...memberData } = member;

      const finalData: NewMemberData = {
        firstName: memberData.first_name,
        lastName: memberData.last_name,
        gender: genderAssignment?.gender || memberData.gender,
        grade: memberData.grade,
        major: memberData.major,
        minor: memberData.minor,
        church: memberData.church,
        email: memberData.email,
        phone: memberData.phone,
        studentId: memberData.student_id,
        dateOfBirth: memberData.date_of_birth,
        expectedGraduation: memberData.expected_graduation,
        isNewMember: memberData.is_new_member,
        wantsMentor: memberData.wants_mentor,
        wantsToMentor: memberData.wants_to_mentor,
        notes: memberData.notes,
      };

      if (_isUpdate && _existingId) {
        updates.push({ id: _existingId, data: finalData });
      } else {
        newMembers.push(finalData);
      }
    });

    let hasError = false;

    try {
      // Insert new members using bulk create
      if (newMembers.length > 0) {
        await bulkCreateMembers({ members: newMembers });
      }

      // Update existing members one by one
      for (const update of updates) {
        await updateMember({
          id: update.id,
          firstName: update.data.firstName,
          lastName: update.data.lastName,
          gender: update.data.gender,
          grade: update.data.grade,
          major: update.data.major,
          minor: update.data.minor,
          church: update.data.church,
          email: update.data.email,
          phone: update.data.phone,
          studentId: update.data.studentId,
          dateOfBirth: update.data.dateOfBirth,
          expectedGraduation: update.data.expectedGraduation,
          isNewMember: update.data.isNewMember,
          wantsMentor: update.data.wantsMentor,
          wantsToMentor: update.data.wantsToMentor,
          notes: update.data.notes,
        });
      }

      // Advance grades for members not in CSV if option is checked
      if (advanceGrades) {
        const gradeOrder: Grade[] = ['freshman', 'sophomore', 'junior', 'senior', 'grad'];
        const csvEmails = new Set(preview.filter(m => m.email).map(m => m.email!.toLowerCase()));

        // Find active members not in the CSV who should advance
        const toAdvance = existingMembers.filter(m =>
          m.email &&
          !csvEmails.has(m.email.toLowerCase()) &&
          m.isActive &&
          !m.isGraduated &&
          m.grade !== 'grad'
        );

        for (const member of toAdvance) {
          const currentIndex = gradeOrder.indexOf(member.grade);
          if (currentIndex < gradeOrder.length - 1) {
            const newGrade = gradeOrder[currentIndex + 1];
            await updateMember({ id: member._id, grade: newGrade });
          }
        }
      }

      toast({
        title: 'Import successful',
        description: `Added ${newMembers.length} new members, updated ${updates.length} existing members.`,
      });
    } catch (error) {
      hasError = true;
      toast({
        title: 'Error during import',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    if (!hasError) {
      setOpen(false);
      setFileName('');
      setPreview([]);
      setErrors([]);
      setNeedsGender([]);
      setAdvanceGrades(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onSuccess) {
        onSuccess();
      }
    }

    setIsLoading(false);
  };

  const newCount = preview.filter(m => !m._isUpdate).length;
  const updateCount = preview.filter(m => m._isUpdate).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Members from CSV</DialogTitle>
          <DialogDescription>
            Import or sync members from your OCCM Google Forms registration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import Mode Selection */}
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Import Mode:</Label>
            <Tabs value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
              <TabsList>
                <TabsTrigger value="sync" className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync (Update & Add)
                </TabsTrigger>
                <TabsTrigger value="add" className="gap-2">
                  <UserPlus className="h-3.5 w-3.5" />
                  Add New Only
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {importMode === 'sync' && (
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch
                id="advance-grades"
                checked={advanceGrades}
                onCheckedChange={setAdvanceGrades}
              />
              <Label htmlFor="advance-grades" className="text-sm cursor-pointer">
                Advance grades for members not in CSV (freshman → sophomore, etc.)
              </Label>
            </div>
          )}

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {fileName || 'Click to upload CSV file'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {importMode === 'sync'
                  ? 'Existing members (by email) will be updated, new ones will be added'
                  : 'Only members not already in the system will be added'
                }
              </p>
            </label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-4 bg-destructive/10 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="font-medium text-destructive">Issues found:</p>
              </div>
              <ul className="text-sm text-destructive list-disc list-inside max-h-32 overflow-y-auto">
                {errors.slice(0, 10).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {errors.length > 10 && (
                  <li>...and {errors.length - 10} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Gender Assignment */}
          {needsGender.length > 0 && (
            <div className="p-4 bg-amber-500/10 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="font-medium text-amber-600">
                    {needsGender.filter(n => !n.gender).length} member(s) need gender assigned
                  </p>
                </div>
                <Badge variant="outline">
                  {needsGender.filter(n => n.gender).length} / {needsGender.length} done
                </Badge>
              </div>

              {/* Preview of members needing gender */}
              <div className="mb-4 max-h-24 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {needsGender.slice(0, 10).map((item) => (
                    <Badge
                      key={item.index}
                      variant={item.gender ? "default" : "outline"}
                      className={
                        item.gender === 'male' ? "bg-blue-500 hover:bg-blue-600" :
                        item.gender === 'female' ? "bg-pink-500 hover:bg-pink-600" :
                        ""
                      }
                    >
                      {item.name}
                      {item.gender && ` (${item.gender[0].toUpperCase()})`}
                    </Badge>
                  ))}
                  {needsGender.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{needsGender.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                onClick={() => setShowSwipeUI(true)}
                className="w-full"
                variant={needsGender.some(n => !n.gender) ? "default" : "secondary"}
              >
                {needsGender.some(n => !n.gender)
                  ? `Assign Gender (${needsGender.filter(n => !n.gender).length} remaining)`
                  : 'Review Gender Assignments'
                }
              </Button>
            </div>
          )}

          {/* Swipe UI Sheet */}
          <Sheet open={showSwipeUI} onOpenChange={setShowSwipeUI}>
            <SheetContent side="bottom" className="h-[90vh] p-0">
              <GenderSwipeUI
                members={membersNeedingGenderData}
                onGenderAssigned={(index, gender) => updateGender(index, gender)}
                onComplete={() => setShowSwipeUI(false)}
                onCancel={() => setShowSwipeUI(false)}
              />
            </SheetContent>
          </Sheet>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="font-medium">Ready to import:</p>
                <Badge variant="default">{newCount} new</Badge>
                {updateCount > 0 && <Badge variant="secondary">{updateCount} updates</Badge>}
              </div>

              <Tabs defaultValue="new" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="new" className="flex-1">New Members ({newCount})</TabsTrigger>
                  <TabsTrigger value="updates" className="flex-1">Updates ({updateCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="new">
                  <div className="max-h-48 overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Gender</th>
                          <th className="px-3 py-2 text-left">Grade</th>
                          <th className="px-3 py-2 text-left">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.filter(m => !m._isUpdate).slice(0, 15).map((member, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{member.first_name} {member.last_name}</td>
                            <td className="px-3 py-2 capitalize">{member.gender}</td>
                            <td className="px-3 py-2 capitalize">{member.grade}</td>
                            <td className="px-3 py-2 truncate max-w-[180px]">{member.email || '-'}</td>
                          </tr>
                        ))}
                        {newCount > 15 && (
                          <tr className="border-t bg-muted">
                            <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">
                              ...and {newCount - 15} more
                            </td>
                          </tr>
                        )}
                        {newCount === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                              No new members to add
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="updates">
                  <div className="max-h-48 overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Grade</th>
                          <th className="px-3 py-2 text-left">Changes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.filter(m => m._isUpdate).slice(0, 15).map((member, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{member.first_name} {member.last_name}</td>
                            <td className="px-3 py-2 capitalize">{member.grade}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {member._changes?.length ? member._changes.join(', ') : 'Re-registration'}
                            </td>
                          </tr>
                        ))}
                        {updateCount > 15 && (
                          <tr className="border-t bg-muted">
                            <td colSpan={3} className="px-3 py-2 text-center text-muted-foreground">
                              ...and {updateCount - 15} more
                            </td>
                          </tr>
                        )}
                        {updateCount === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                              No existing members to update
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleImport}
                disabled={isLoading || needsGender.some(n => !n.gender)}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {newCount > 0 && updateCount > 0
                  ? `Add ${newCount} & Update ${updateCount} Members`
                  : newCount > 0
                  ? `Add ${newCount} Members`
                  : `Update ${updateCount} Members`
                }
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
