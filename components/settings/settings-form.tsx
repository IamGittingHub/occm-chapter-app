'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/lib/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SettingsFormProps {
  settings: {
    unresponsive_threshold_days: string;
    rotation_day_of_month: string;
    current_rotation_month: string;
  };
}

const settingsSchema = z.object({
  unresponsive_threshold_days: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 90;
  }, 'Must be between 1 and 90 days'),
  rotation_day_of_month: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 28;
  }, 'Must be between 1 and 28'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsForm({ settings }: SettingsFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const setSetting = useMutation(api.appSettings.set);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      unresponsive_threshold_days: settings.unresponsive_threshold_days,
      rotation_day_of_month: settings.rotation_day_of_month,
    },
  });

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true);

    try {
      // Update settings
      await setSetting({
        key: 'unresponsive_threshold_days',
        value: data.unresponsive_threshold_days,
      });

      await setSetting({
        key: 'rotation_day_of_month',
        value: data.rotation_day_of_month,
      });

      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="unresponsive_threshold_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unresponsive Threshold (Days)</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={90} {...field} />
              </FormControl>
              <FormDescription>
                Members will be auto-transferred after this many days without a successful contact.
                Default is 30 days.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rotation_day_of_month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rotation Day of Month</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={28} {...field} />
              </FormControl>
              <FormDescription>
                Day of the month when prayer bucket rotation occurs (1-28).
                Default is the 1st.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </form>
    </Form>
  );
}
