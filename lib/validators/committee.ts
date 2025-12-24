import * as z from 'zod';

export const committeeInviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Please select a gender',
  }),
  phone: z.string().optional(),
});

export type CommitteeInviteFormValues = z.infer<typeof committeeInviteSchema>;
