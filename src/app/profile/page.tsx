'use client';

import { useSyncExternalStore, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Phone,
  Mail,
  Database,
  Key,
  Globe,
  UserCircle,
  Lock,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from 'sonner';
import Link from 'next/link';

const PROFILE_STORAGE_KEY = 'bms-profile';

interface ProfileData {
  name: string;
  phone: string;
  email: string;
  firebaseApiKey: string;
  firebaseUrl: string;
  firebaseAccountName: string;
  firebasePassword: string;
}

const defaultProfile: ProfileData = {
  name: '',
  phone: '',
  email: '',
  firebaseApiKey: '',
  firebaseUrl: '',
  firebaseAccountName: '',
  firebasePassword: '',
};

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function ProfilePage() {
  const mounted = useMounted();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      toast.success('Profile saved successfully!');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
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
                <h1 className="text-2xl font-bold text-foreground">Profile</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your personal information and Firebase configuration
                </p>
              </div>
            </div>

            {/* Profile Avatar Section */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                <UserCircle className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">
                  {profile.name || 'Your Name'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile.email || 'your@email.com'}
                </p>
              </div>
            </div>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={profile.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={profile.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={profile.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Firebase Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Firebase Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firebaseApiKey" className="flex items-center gap-2 text-sm">
                    <Key className="w-3.5 h-3.5 text-muted-foreground" />
                    Firebase API Key
                  </Label>
                  <Input
                    id="firebaseApiKey"
                    placeholder="Enter your Firebase API key"
                    value={profile.firebaseApiKey}
                    onChange={(e) => handleChange('firebaseApiKey', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firebaseUrl" className="flex items-center gap-2 text-sm">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Firebase URL
                  </Label>
                  <Input
                    id="firebaseUrl"
                    type="url"
                    placeholder="https://your-project.firebaseio.com"
                    value={profile.firebaseUrl}
                    onChange={(e) => handleChange('firebaseUrl', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firebaseAccountName" className="flex items-center gap-2 text-sm">
                    <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    Firebase Account Name
                  </Label>
                  <Input
                    id="firebaseAccountName"
                    placeholder="Enter your Firebase account name"
                    value={profile.firebaseAccountName}
                    onChange={(e) => handleChange('firebaseAccountName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firebasePassword" className="flex items-center gap-2 text-sm">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    Firebase Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="firebasePassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your Firebase password"
                      value={profile.firebasePassword}
                      onChange={(e) => handleChange('firebasePassword', e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="min-w-[140px] gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
