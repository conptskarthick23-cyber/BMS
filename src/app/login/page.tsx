'use client';

import { useSyncExternalStore, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Battery,
  LogIn,
  User,
  Phone,
  Mail,
  Key,
  Globe,
  UserCircle,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

export default function LoginPage() {
  const mounted = useMounted();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        setProfile(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const fieldLabels: Record<keyof ProfileData, string> = {
    name: 'Name',
    phone: 'Phone Number',
    email: 'Email',
    firebaseApiKey: 'Firebase API Key',
    firebaseUrl: 'Firebase URL',
    firebaseAccountName: 'Firebase Account Name',
    firebasePassword: 'Firebase Password',
  };

  const handleLogin = () => {
    // Validate all fields
    const newErrors: Partial<Record<keyof ProfileData, string>> = {};
    (Object.keys(profile) as (keyof ProfileData)[]).forEach((field) => {
      if (!profile[field].trim()) {
        newErrors[field] = `${fieldLabels[field]} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill in all fields before logging in');
      return;
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    toast.success('Logged in successfully!');
    router.push('/profile');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4 my-8">
        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-cyan-500" />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Logo & Title */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto ring-2 ring-primary/20">
                <Battery className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">BMS Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Personal Information */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Personal Information
              </p>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs flex items-center gap-1.5">
                  <User className="w-3 h-3 text-muted-foreground" /> Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={profile.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-muted-foreground" /> Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={errors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-muted-foreground" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Firebase Configuration */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Firebase Configuration
              </p>
              <div className="space-y-2">
                <Label htmlFor="firebaseApiKey" className="text-xs flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-muted-foreground" /> Firebase API Key
                </Label>
                <Input
                  id="firebaseApiKey"
                  placeholder="Enter your Firebase API key"
                  value={profile.firebaseApiKey}
                  onChange={(e) => handleChange('firebaseApiKey', e.target.value)}
                  className={errors.firebaseApiKey ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.firebaseApiKey && <p className="text-xs text-red-500">{errors.firebaseApiKey}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firebaseUrl" className="text-xs flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-muted-foreground" /> Firebase URL
                </Label>
                <Input
                  id="firebaseUrl"
                  type="url"
                  placeholder="https://your-project.firebaseio.com"
                  value={profile.firebaseUrl}
                  onChange={(e) => handleChange('firebaseUrl', e.target.value)}
                  className={errors.firebaseUrl ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.firebaseUrl && <p className="text-xs text-red-500">{errors.firebaseUrl}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firebaseAccountName" className="text-xs flex items-center gap-1.5">
                  <UserCircle className="w-3 h-3 text-muted-foreground" /> Firebase Account Name
                </Label>
                <Input
                  id="firebaseAccountName"
                  placeholder="Enter your Firebase account name"
                  value={profile.firebaseAccountName}
                  onChange={(e) => handleChange('firebaseAccountName', e.target.value)}
                  className={errors.firebaseAccountName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.firebaseAccountName && <p className="text-xs text-red-500">{errors.firebaseAccountName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firebasePassword" className="text-xs flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-muted-foreground" /> Firebase Password
                </Label>
                <div className="relative">
                  <Input
                    id="firebasePassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your Firebase password"
                    value={profile.firebasePassword}
                    onChange={(e) => handleChange('firebasePassword', e.target.value)}
                    className={`pr-10 ${errors.firebasePassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.firebasePassword && <p className="text-xs text-red-500">{errors.firebasePassword}</p>}
              </div>
            </div>

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              className="w-full gap-2 py-5 text-base font-medium"
              size="lg"
            >
              <LogIn className="w-5 h-5" />
              Login
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Real-time battery monitoring &amp; analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
