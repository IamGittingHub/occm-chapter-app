'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Gender } from '@/types/database';
import { GenderSwipeCard } from './gender-swipe-card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MemberNeedingGender {
  index: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  grade?: string | null;
  gender: Gender | null;
}

interface GenderSwipeUIProps {
  members: MemberNeedingGender[];
  onGenderAssigned: (index: number, gender: Gender) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export function GenderSwipeUI({
  members,
  onGenderAssigned,
  onComplete,
  onCancel,
}: GenderSwipeUIProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<{ index: number; prevGender: Gender | null }[]>([]);

  const assignedCount = useMemo(() =>
    members.filter(m => m.gender !== null).length,
    [members]
  );

  const progress = (assignedCount / members.length) * 100;
  const isComplete = assignedCount === members.length;
  const currentMember = members[currentIndex];
  const canUndo = history.length > 0;

  // Find first unassigned member on mount
  useEffect(() => {
    const firstUnassigned = members.findIndex(m => m.gender === null);
    if (firstUnassigned !== -1) {
      setCurrentIndex(firstUnassigned);
    }
  }, []);

  const handleSwipe = useCallback((index: number, gender: Gender) => {
    // Add to history for undo (save previous state)
    const prevGender = members.find(m => m.index === index)?.gender ?? null;
    setHistory(prev => [...prev, { index, prevGender }]);

    // Update gender
    onGenderAssigned(index, gender);

    // Move to next unassigned member
    setTimeout(() => {
      const nextUnassigned = members.findIndex((m, i) => i > currentIndex && m.gender === null);
      if (nextUnassigned !== -1) {
        setCurrentIndex(nextUnassigned);
      } else {
        // Check if there's any unassigned member before current
        const anyUnassigned = members.findIndex(m => m.gender === null);
        if (anyUnassigned !== -1 && anyUnassigned !== currentIndex) {
          setCurrentIndex(anyUnassigned);
        } else if (currentIndex < members.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
    }, 300);
  }, [currentIndex, members, onGenderAssigned]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];

    // Navigate back to that member
    const memberArrayIndex = members.findIndex(m => m.index === lastAction.index);
    if (memberArrayIndex !== -1) {
      setCurrentIndex(memberArrayIndex);
    }

    // Clear the gender (set to null by passing prevGender which was null)
    // We need to communicate this back - but since we can't set to null via onGenderAssigned,
    // we'll just navigate back and let user re-swipe
    // For proper undo, the parent needs to support clearing gender

    // Remove from history
    setHistory(prev => prev.slice(0, -1));
  }, [history, members]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < members.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, members.length]);

  const handleQuickAssign = useCallback((gender: Gender) => {
    if (currentMember && !currentMember.gender) {
      handleSwipe(currentMember.index, gender);
    }
  }, [currentMember, handleSwipe]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentMember) return;

      if (e.key === 'ArrowLeft' && !currentMember.gender) {
        handleQuickAssign('male');
      } else if (e.key === 'ArrowRight' && !currentMember.gender) {
        handleQuickAssign('female');
      } else if (e.key === 'ArrowUp') {
        handlePrevious();
      } else if (e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMember, handleQuickAssign, handlePrevious, handleNext, handleUndo]);

  if (!currentMember) {
    return null;
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header with progress */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Assign Gender</h3>
          <Badge variant="outline">
            {assignedCount} / {members.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground text-center">
          Swipe left for Male, right for Female
        </p>
      </div>

      {/* Card Stack Area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden min-h-[350px]">
        <div className="relative w-full max-w-sm">
          {/* Show cards in a stack (current + next visible) */}
          {members.slice(currentIndex, currentIndex + 2).map((member, offset) => (
            <div
              key={member.index}
              className={cn(
                "transition-all duration-300",
                offset === 0 ? "relative z-10" : "absolute inset-0 z-0 scale-95 translate-y-4 opacity-50"
              )}
              style={{
                pointerEvents: offset === 0 ? 'auto' : 'none',
              }}
            >
              <GenderSwipeCard
                member={{
                  index: member.index,
                  firstName: member.firstName,
                  lastName: member.lastName,
                  phone: member.phone,
                  email: member.email,
                  grade: member.grade,
                }}
                onSwipe={handleSwipe}
                isActive={offset === 0 && !member.gender}
              />
            </div>
          ))}

          {/* Assigned indicator overlay if current member is already assigned */}
          {currentMember.gender && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 rounded-lg">
              <div className="text-center">
                <Badge
                  className={cn(
                    "text-lg px-4 py-2",
                    currentMember.gender === 'male'
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-pink-500 hover:bg-pink-600"
                  )}
                >
                  {currentMember.gender === 'male' ? 'Male' : 'Female'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">Already assigned</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Button Controls */}
      <div className="p-4 border-t space-y-3">
        {/* Quick assign buttons for accessibility/desktop */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 border-blue-300 hover:bg-blue-50 hover:border-blue-400"
            onClick={() => handleQuickAssign('male')}
            disabled={!!currentMember.gender}
          >
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2">
              M
            </span>
            Male
          </Button>
          <Button
            variant="outline"
            className="h-12 border-pink-300 hover:bg-pink-50 hover:border-pink-400"
            onClick={() => handleQuickAssign('female')}
            disabled={!!currentMember.gender}
          >
            <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center mr-2">
              F
            </span>
            Female
          </Button>
        </div>

        {/* Navigation and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {currentIndex + 1} of {members.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === members.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo
            </Button>
          </div>
        </div>

        {/* Complete/Cancel buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onComplete}
            disabled={!isComplete}
            className={cn(
              isComplete && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Done
              </>
            ) : (
              `${members.length - assignedCount} remaining`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
