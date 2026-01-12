'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SettingsForm } from '@/components/settings/settings-form';
import { ManualActions } from '@/components/settings/manual-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const settings = useQuery(api.appSettings.getAll);

  if (settings === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-deep-blue" />
      </div>
    );
  }

  const currentSettings = {
    unresponsive_threshold_days: settings.unresponsive_threshold_days || '30',
    rotation_day_of_month: settings.rotation_day_of_month || '1',
    current_rotation_month: settings.current_rotation_month || '',
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
