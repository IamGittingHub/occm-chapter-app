import * as z from 'zod';

export const memberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Please select a gender',
  }),
  grade: z.enum(['freshman', 'sophomore', 'junior', 'senior', 'grad', 'unknown'], {
    required_error: 'Please select a grade',
  }),
  major: z.string().optional(),
  minor: z.string().optional(),
  church: z.string().optional(),
  date_of_birth: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  student_id: z.string().optional(),
  expected_graduation: z.string().optional(),
  is_new_member: z.boolean().optional(),
  wants_mentor: z.boolean().optional(),
  wants_to_mentor: z.boolean().optional(),
  notes: z.string().optional(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

export const gradeOptions = [
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'grad', label: 'Graduate' },
  { value: 'unknown', label: 'Unknown' },
] as const;

export const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;
