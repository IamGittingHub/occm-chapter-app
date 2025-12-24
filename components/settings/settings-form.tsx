'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
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
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      unresponsive_threshold_days: settings.unresponsive_threshold_days,
      rotation_day_of_month: settings.rotation_day_of_month,
    },
  });

  async function onSubmit(data: SettingsFormValues) {
    setIsLoading(true);
    const supabase = createClient();

    // Update settings
    const updates = [
      {
        setting_key: 'unresponsive_threshold_days',
        setting_value: data.unresponsive_threshold_days,
        updated_at: new Date().toISOString(),
      },
      {
        setting_key: 'rotation_day_of_month',
        setting_value: data.rotation_day_of_month,
        updated_at: new Date().toISOString(),
      },
    ];

    for (const update of updates) {
      const { error } = await supabase.from('app_settings').upsert(update as never, {
        onConflict: 'setting_key',
      });

      if (error) {
        toast({
          title: 'Error saving settings',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    toast({
      title: 'Settings saved',
      description: 'Your settings have been updated.',
    });

    setIsLoading(false);
    router.refresh();
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
