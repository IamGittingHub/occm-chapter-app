'use client';

import { useState, useRef, useCallback } from 'react';
import { Gender } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Phone, Mail, ChevronLeft, ChevronRight, User } from 'lucide-react';

interface MemberToSwipe {
  index: number;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  grade?: string | null;
}

interface GenderSwipeCardProps {
  member: MemberToSwipe;
  onSwipe: (index: number, gender: Gender) => void;
  isActive: boolean;
}

const SWIPE_THRESHOLD = 100; // pixels needed to trigger swipe
const ROTATION_FACTOR = 0.1; // rotation per pixel of movement

export function GenderSwipeCard({ member, onSwipe, isActive }: GenderSwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState({
    startX: 0,
    currentX: 0,
    isDragging: false,
  });

  const deltaX = dragState.currentX - dragState.startX;
  const rotation = deltaX * ROTATION_FACTOR;
  const opacity = Math.max(0.5, 1 - Math.abs(deltaX) / 300);

  // Determine which indicator to show based on swipe direction
  const showMale = deltaX < -30;
  const showFemale = deltaX > 30;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isActive) return;
    setDragState({
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      isDragging: true,
    });
  }, [isActive]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) return;
    e.preventDefault();
    setDragState({
      startX: e.clientX,
      currentX: e.clientX,
      isDragging: true,
    });
  }, [isActive]);

  const handleMove = useCallback((clientX: number) => {
    if (!dragState.isDragging) return;
    setDragState(prev => ({ ...prev, currentX: clientX }));
  }, [dragState.isDragging]);

  const handleEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    if (deltaX < -SWIPE_THRESHOLD) {
      // Swiped LEFT = MALE
      onSwipe(member.index, 'male');
    } else if (deltaX > SWIPE_THRESHOLD) {
      // Swiped RIGHT = FEMALE
      onSwipe(member.index, 'female');
    }

    setDragState({ startX: 0, currentX: 0, isDragging: false });
  }, [dragState.isDragging, deltaX, member.index, onSwipe]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Gender indicators (always visible, opacity changes on swipe) */}
      <div className="absolute inset-y-0 left-0 flex items-center -translate-x-16 z-10">
        <div className={cn(
          "flex flex-col items-center transition-opacity duration-150",
          showMale ? "opacity-100" : "opacity-30"
        )}>
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            M
          </div>
          <span className="text-xs mt-1 text-blue-600 font-medium">Male</span>
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 flex items-center translate-x-16 z-10">
        <div className={cn(
          "flex flex-col items-center transition-opacity duration-150",
          showFemale ? "opacity-100" : "opacity-30"
        )}>
          <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            F
          </div>
          <span className="text-xs mt-1 text-pink-600 font-medium">Female</span>
        </div>
      </div>

      {/* The swipeable card */}
      <Card
        ref={cardRef}
        className={cn(
          "cursor-grab active:cursor-grabbing touch-none select-none",
          "transition-shadow duration-200",
          dragState.isDragging && "shadow-2xl",
          !isActive && "pointer-events-none opacity-50"
        )}
        style={{
          transform: `translateX(${deltaX}px) rotate(${rotation}deg)`,
          opacity: dragState.isDragging ? opacity : 1,
          transition: dragState.isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => dragState.isDragging && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <CardContent className="p-6">
          {/* Member Avatar */}
          <div className="flex flex-col items-center mb-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gold to-amber-400 flex items-center justify-center text-deep-blue text-2xl font-bold mb-3">
              {member.firstName[0]}{member.lastName[0]}
            </div>
            <h3 className="text-xl font-semibold text-center">
              {member.firstName} {member.lastName}
            </h3>
            {member.grade && member.grade !== 'unknown' && (
              <Badge variant="secondary" className="mt-2 capitalize">
                {member.grade}
              </Badge>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            {member.phone && (
              <div className="flex items-center gap-2 justify-center">
                <Phone className="h-4 w-4" />
                <span>{member.phone}</span>
              </div>
            )}
            {member.email && (
              <div className="flex items-center gap-2 justify-center">
                <Mail className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{member.email}</span>
              </div>
            )}
            {!member.phone && !member.email && (
              <div className="flex items-center gap-2 justify-center text-muted-foreground/50">
                <User className="h-4 w-4" />
                <span>No contact info</span>
              </div>
            )}
          </div>

          {/* Swipe instruction */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4 text-blue-500" />
              <span>Male</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              <span>Female</span>
              <ChevronRight className="h-4 w-4 text-pink-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swipe direction overlay */}
      {dragState.isDragging && (
        <>
          {deltaX < -30 && (
            <div className="absolute inset-0 rounded-lg bg-blue-500/20 pointer-events-none flex items-center justify-center">
              <span className="text-4xl font-bold text-blue-600 opacity-50">MALE</span>
            </div>
          )}
          {deltaX > 30 && (
            <div className="absolute inset-0 rounded-lg bg-pink-500/20 pointer-events-none flex items-center justify-center">
              <span className="text-4xl font-bold text-pink-600 opacity-50">FEMALE</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
