'use client';

import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell, Moon, Sun, User, AlertTriangle, XCircle, X,
  Menu, Home, TrendingUp, Zap, Battery, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useShallow } from 'zustand/react/shallow';
import { formatTimeAgo } from '@/utils/calculations';
import { useEffect, useState } from 'react';

const sidebarNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/trip', label: 'Trip', icon: Zap },
  { href: '/battery', label: 'Battery', icon: Battery },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface AppHeaderProps {
  showNotifications?: boolean;
}

export function AppHeader({ showNotifications = true }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { connectionStatus, lastUpdated, activeAlerts, removeActiveAlert } = useBMSStore(
    useShallow((state) => ({
      connectionStatus: state.connectionStatus,
      lastUpdated: state.lastUpdated,
      activeAlerts: state.activeAlerts,
      removeActiveAlert: state.removeActiveAlert,
    }))
  );
  const [timeAgo, setTimeAgo] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const updateTimer = setInterval(() => {
      if (lastUpdated) {
        setTimeAgo(formatTimeAgo(lastUpdated));
      }
    }, 1000);
    return () => clearInterval(updateTimer);
  }, [lastUpdated]);

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              {/* Sidebar Header */}
              <div className="flex items-center gap-3 h-14 px-4 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Battery className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-foreground">BMS</span>
                  <span className="text-xs text-muted-foreground">Dashboard</span>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 py-4 px-2 space-y-1">
                {sidebarNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div
              className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                connectionStatus.isConnected
                  ? 'bg-green-500'
                  : 'bg-gray-400'
              )}
            />
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              Battery Monitor
            </span>
          </div>
          
          {/* Last Updated */}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated {timeAgo}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          {showNotifications && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {activeAlerts.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                    >
                      {activeAlerts.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {activeAlerts.length > 0
                      ? `${activeAlerts.length} active alert${activeAlerts.length > 1 ? 's' : ''}`
                      : 'No active alerts'}
                  </p>
                </div>
                {activeAlerts.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    All clear — no alerts right now
                  </div>
                ) : (
                  activeAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-start gap-2 px-3 py-2 border-b border-border/50 last:border-0',
                        alert.level === 'critical' && 'bg-red-500/5',
                        alert.level === 'warning' && 'bg-amber-500/5'
                      )}
                    >
                      {alert.level === 'critical' ? (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-xs font-medium',
                          alert.level === 'critical' ? 'text-red-500' : 'text-amber-500'
                        )}>
                          {alert.alertName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Value: {typeof alert.value === 'number' ? alert.value.toFixed(2) : String(alert.value)} (limit: {typeof alert.threshold === 'number' ? alert.threshold.toFixed(2) : String(alert.threshold)})
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeActiveAlert(alert.id);
                        }}
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/alerts" className="w-full text-center justify-center text-xs text-primary font-medium cursor-pointer">
                    View All Alerts
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/signout">Sign out</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

