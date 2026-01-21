import * as z from 'zod';

export const roleValues = ['developer', 'overseer', 'president', 'youth_outreach', 'committee_member'] as const;
export type Role = typeof roleValues[number];

export const roleOptions = [
  { value: 'committee_member', label: 'Committee Member' },
  { value: 'president', label: 'President' },
  { value: 'youth_outreach', label: 'Youth Outreach' },
  { value: 'overseer', label: 'Overseer' },
  { value: 'developer', label: 'Developer' },
] as const;

export const committeeInviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Please select a gender',
  }),
  phone: z.string().optional(),
  role: z.enum(roleValues).optional(),
});

export type CommitteeInviteFormValues = z.infer<typeof committeeInviteSchema>;
