'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Heart,
  MessageSquare,
  Users,
  UserCog,
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Prayer List', href: '/prayer', icon: Heart },
  { name: 'Communication', href: '/communication', icon: MessageSquare },
  { name: 'Members', href: '/members', icon: Users },
  { name: 'Committee', href: '/committee', icon: UserCog },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-deep-blue overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-deep-blue-400">
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
    </aside>
  );
}
