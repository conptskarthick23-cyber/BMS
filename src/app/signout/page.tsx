'use client';

import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  ArrowLeft,
  UserCircle,
} from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function SignOutPage() {
  const mounted = useMounted();
  const router = useRouter();

  const handleSignOut = () => {
    toast.success('Signed out successfully!');
    router.push('/login');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AppHeader showNotifications={false} />

        <main className="flex-1 overflow-auto pb-24 md:pb-6 scroll-momentum bg-muted/5">
          <div className="container max-w-3xl mx-auto p-4 space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sign Out</h1>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to sign out?
                </p>
              </div>
            </div>

            {/* Sign Out Card */}
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center ring-2 ring-red-500/20">
                <UserCircle className="w-12 h-12 text-red-500" />
              </div>
              <p className="text-muted-foreground text-sm text-center max-w-xs">
                You will be signed out of the BMS Dashboard. You can sign back in anytime.
              </p>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="min-w-[200px] gap-2 text-base py-5"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
