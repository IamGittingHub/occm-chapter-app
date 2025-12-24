'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  LayoutDashboard,
  Heart,
  MessageSquare,
  Users,
  UserCog,
  Settings,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Prayer List', href: '/prayer', icon: Heart },
  { name: 'Communication', href: '/communication', icon: MessageSquare },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Committee', href: '/committee', icon: UserCog },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fixed inset-y-0 left-0 z-50 w-full max-w-xs overflow-y-auto bg-deep-blue p-0 sm:max-w-sm">
        <VisuallyHidden>
          <DialogTitle>Navigation Menu</DialogTitle>
        </VisuallyHidden>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-deep-blue-400">
            <div className="flex items-center gap-3">
              <Image
                src="/occm-logo.png"
                alt="OCCM Logo"
                width={40}
                height={40}
                className="rounded-full bg-white"
              />
              <div>
                <h1 className="text-white font-semibold">OCCM</h1>
                <p className="text-deep-blue-200 text-xs">Chapter Management</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-deep-blue-600"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-deep-blue-600 text-white'
                      : 'text-deep-blue-100 hover:bg-deep-blue-600 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-gold' : 'text-deep-blue-300 group-hover:text-gold'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </DialogContent>
    </Dialog>
  );
}
