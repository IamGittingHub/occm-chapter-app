'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Heart,
  MessageSquare,
  Users,
  UserCog,
  UserPlus,
  Settings,
} from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Prayer List', href: '/prayer', icon: Heart },
  { name: 'Communication', href: '/communication', icon: MessageSquare },
  { name: 'Claim Members', href: '/claim-members', icon: UserPlus },
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-deep-blue border-r-0"
        closeButtonClassName="text-white hover:text-gold"
      >
        <VisuallyHidden>
          <SheetTitle>Navigation Menu</SheetTitle>
        </VisuallyHidden>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center h-16 px-4 border-b border-deep-blue-400">
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
                    'group flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors',
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
      </SheetContent>
    </Sheet>
  );
}
