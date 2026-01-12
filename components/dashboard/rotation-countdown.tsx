'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

function getNextRotationDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

function getTimeRemaining(targetDate: Date) {
  const now = new Date();
  const total = targetDate.getTime() - now.getTime();

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));

  return { total, days, hours, minutes };
}

export function RotationCountdown() {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);

  useEffect(() => {
    const nextRotation = getNextRotationDate();

    const updateCountdown = () => {
      const remaining = getTimeRemaining(nextRotation);
      setTimeRemaining({
        days: remaining.days,
        hours: remaining.hours,
        minutes: remaining.minutes,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!timeRemaining) return null;

  const nextRotation = getNextRotationDate();
  const monthName = nextRotation.toLocaleString('default', { month: 'long' });

  return (
    <Card className="bg-gradient-to-br from-deep-blue to-deep-blue-600 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-gold" />
          Next Prayer List Rotation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gold">
            {timeRemaining.days}
          </span>
          <span className="text-lg text-deep-blue-100">
            {timeRemaining.days === 1 ? 'day' : 'days'}
          </span>
          {timeRemaining.days < 7 && (
            <>
              <span className="text-xl font-semibold">
                {timeRemaining.hours}h
              </span>
            </>
          )}
        </div>
        <p className="text-sm text-deep-blue-200 mt-1">
          {monthName} 1st — Update member information before rotation
        </p>
      </CardContent>
    </Card>
  );
}
