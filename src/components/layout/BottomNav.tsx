'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, TrendingUp, Zap, Battery, Bell, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/trip', label: 'Trip', icon: Zap },
  { href: '/battery', label: 'Battery', icon: Battery },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/85 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2 pb-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-xl transition-all duration-300',
                'min-w-[48px] touch-manipulation',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-300 ease-out',
                  isActive ? 'bg-primary/15 scale-110 shadow-sm' : 'hover:bg-muted/50'
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "fill-primary/20")} />
              </div>
              <span className={cn(
                "text-[10px] font-semibold transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
