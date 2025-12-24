import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from '@/components/settings/settings-form';
import { ManualActions } from '@/components/settings/manual-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { AppSetting } from '@/types/database';

export default async function SettingsPage() {
  const supabase = await createClient();

  // Get current settings
  const { data } = await supabase
    .from('app_settings')
    .select('*');

  const settings = data as AppSetting[] | null;
  const settingsMap = new Map(settings?.map((s) => [s.setting_key, s.setting_value]) || []);

  const currentSettings = {
    unresponsive_threshold_days: settingsMap.get('unresponsive_threshold_days') || '30',
    rotation_day_of_month: settingsMap.get('rotation_day_of_month') || '1',
    current_rotation_month: settingsMap.get('current_rotation_month') || '',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-deep-blue flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your chapter management settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings Form */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Settings</CardTitle>
            <CardDescription>
              Configure how prayer and communication assignments work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm settings={currentSettings} />
          </CardContent>
        </Card>

        {/* Manual Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Actions</CardTitle>
            <CardDescription>
              Trigger assignment operations manually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManualActions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
