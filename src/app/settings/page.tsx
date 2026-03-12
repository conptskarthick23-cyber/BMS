'use client';

import { useSyncExternalStore } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Database,
  Bell,
  Download,
  Trash2,
  User,
  LogOut,
  Wifi,
  ExternalLink,
  Info,
} from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useBMSData } from '@/hooks/useBMSData';
import { useShallow } from 'zustand/react/shallow';
import { exportToPDF } from '@/utils/pdfExport';
import { HISTORY_LOG_INTERVALS } from '@/constants/thresholds';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

// Custom hook for mounted state without setting state in effect
function useMounted() {
  return useSyncExternalStore(
    () => () => { },
    () => true,
    () => false
  );
}

export default function SettingsPage() {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const {
    vehicleProfile,
    history,
    historyLogInterval,
    setHistoryLogInterval,
    alertSoundEnabled,
    setAlertSoundEnabled,
    browserNotificationsEnabled,
    setBrowserNotificationsEnabled,
    temperatureUnit,
    setTemperatureUnit,
    whatsappAlerts,
    updateWhatsappAlerts,
    emailAlerts,
    updateEmailAlerts,
    clearHistory,
  } = useBMSStore(
    useShallow((state) => ({
      vehicleProfile: state.vehicleProfile,
      history: state.history,
      historyLogInterval: state.historyLogInterval,
      setHistoryLogInterval: state.setHistoryLogInterval,
      alertSoundEnabled: state.alertSoundEnabled,
      setAlertSoundEnabled: state.setAlertSoundEnabled,
      browserNotificationsEnabled: state.browserNotificationsEnabled,
      setBrowserNotificationsEnabled: state.setBrowserNotificationsEnabled,
      temperatureUnit: state.temperatureUnit,
      setTemperatureUnit: state.setTemperatureUnit,
      whatsappAlerts: state.whatsappAlerts,
      updateWhatsappAlerts: state.updateWhatsappAlerts,
      emailAlerts: state.emailAlerts,
      updateEmailAlerts: state.updateEmailAlerts,
      clearHistory: state.clearHistory,
    }))
  );
  const { connectionStatus, isLeader } = useBMSData();

  if (!mounted) {
    return null;
  }

  const handleExportData = () => {
    if (history.length === 0) {
      toast.error('No history data to export');
      return;
    }

    try {
      exportToPDF(
        history.map((h) => ({
          ...h,
          Status: 'CONNECTED' as const,
        })),
        vehicleProfile
      );
      toast.success('PDF Report generated successfully');
    } catch (error) {
      toast.error('Error generating PDF report');
      console.error(error);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all history data? This cannot be undone.')) {
      clearHistory();
      toast.success('History cleared');
    }
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications not supported');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationsEnabled(true);
      toast.success('Browser notifications enabled');
    } else {
      toast.error('Notification permission denied');
    }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsappAlerts.phone || !whatsappAlerts.apikey) {
      toast.error('Please enter Phone Number and CallMeBot API Key first');
      return;
    }
    const cleanPhone = whatsappAlerts.phone.replace(/[\s\-()]/g, '');
    toast.info(`Sending test message to ${cleanPhone}...`);

    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          apikey: whatsappAlerts.apikey,
          message: '🔋 BMS Dashboard Test: Your WhatsApp notifications are working!',
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Test message sent via CallMeBot!');
      } else if (data.needsRegistration) {
        toast.error('Phone not linked! Send "I allow callmebot to send me messages" to +34 644 71 98 98 on WhatsApp first.');
      } else {
        const rawError = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || 'Unknown error');
        const cleanError = rawError.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim();
        toast.error(`Failed: ${cleanError}`);
        console.error('WhatsApp test failed:', data);
      }
    } catch (error) {
      toast.error('Network error sending test message');
      console.error('WhatsApp test error:', error);
    }
  };

  const handleTestEmail = async () => {
    if (!emailAlerts.serviceId || !emailAlerts.templateId || !emailAlerts.publicKey || !emailAlerts.userEmail) {
      toast.error('Please fill all EmailJS fields first');
      return;
    }
    toast.info('Sending test Email...');
    const { sendEmailAlert } = await import('@/utils/notifications');
    const success = await sendEmailAlert(
      emailAlerts.serviceId,
      emailAlerts.templateId,
      emailAlerts.publicKey,
      emailAlerts.userEmail,
      'BMS Dashboard Test',
      'This is a test notification from your BMS Dashboard. Your EmailJS configuration is working perfectly!'
    );
    if (success) toast.success('Test email sent via EmailJS!');
    else toast.error('Failed to send test email. Check your credentials.');
  };

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AppHeader showNotifications={false} />

        <main className="flex-1 overflow-auto pb-24 md:pb-6 scroll-momentum bg-muted/5">
          <div className="container max-w-6xl mx-auto p-4 space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Application preferences and configuration
              </p>
            </div>

            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">
                      Select your preferred color scheme
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === 'light' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme('light')}
                    >
                      <Sun className="w-4 h-4 mr-1" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                    >
                      <Moon className="w-4 h-4 mr-1" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setTheme('system')}
                    >
                      <Monitor className="w-4 h-4 mr-1" />
                      System
                    </Button>
                  </div>
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
                  <Label>Database URL</Label>
                  <Input
                    value={process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || ''}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Wifi
                      className={cn(
                        'w-4 h-4',
                        connectionStatus.isConnected
                          ? 'text-green-500'
                          : 'text-gray-400'
                      )}
                    />
                    <span className="text-sm">
                      {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {isLeader ? 'Leader (writing history)' : 'Follower'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>History Logging Interval</Label>
                  <Select
                    value={historyLogInterval.toString()}
                    onValueChange={(v) => setHistoryLogInterval(parseInt(v))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HISTORY_LOG_INTERVALS.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value.toString()}>
                          {interval.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Alert Sounds</p>
                    <p className="text-xs text-muted-foreground">
                      Play sound for critical alerts
                    </p>
                  </div>
                  <Switch
                    checked={alertSoundEnabled}
                    onCheckedChange={setAlertSoundEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Browser Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Show desktop notifications for alerts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={browserNotificationsEnabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleEnableNotifications();
                        } else {
                          setBrowserNotificationsEnabled(false);
                        }
                      }}
                    />
                  </div>
                </div>
                {/* WhatsApp configuration */}
                <div className="pt-4 border-t border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">WhatsApp Alerts (CallMeBot)</p>
                      <p className="text-xs text-muted-foreground">
                        Receive critical alerts directly to your WhatsApp
                      </p>
                    </div>
                    <Switch
                      checked={whatsappAlerts.enabled}
                      onCheckedChange={(c) => updateWhatsappAlerts({ enabled: c })}
                    />
                  </div>

                  {whatsappAlerts.enabled && (
                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          <strong>Setup:</strong> Save <strong>+34 644 71 98 98</strong> in your contacts → Send <em>&quot;I allow callmebot to send me messages&quot;</em> to that number on WhatsApp → You will receive your API key → Enter it below
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone Number (with country code)</Label>
                          <Input
                            value={whatsappAlerts.phone}
                            onChange={(e) => updateWhatsappAlerts({ phone: e.target.value })}
                            placeholder="+918122552210"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">CallMeBot API Key</Label>
                          <Input
                            value={whatsappAlerts.apikey}
                            onChange={(e) => updateWhatsappAlerts({ apikey: e.target.value })}
                            placeholder="API key from CallMeBot"
                            type="password"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                          How to get API Key?
                        </a>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleTestWhatsApp}>
                          Test WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email configuration */}
                <div className="pt-4 border-t border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Alerts (EmailJS)</p>
                      <p className="text-xs text-muted-foreground">
                        Receive critical alerts to your email inbox
                      </p>
                    </div>
                    <Switch
                      checked={emailAlerts.enabled}
                      onCheckedChange={(c) => updateEmailAlerts({ enabled: c })}
                    />
                  </div>

                  {emailAlerts.enabled && (
                    <div className="space-y-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Recipient Email</Label>
                        <Input
                          value={emailAlerts.userEmail}
                          onChange={(e) => updateEmailAlerts({ userEmail: e.target.value })}
                          placeholder="you@example.com"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Service ID</Label>
                          <Input
                            value={emailAlerts.serviceId}
                            onChange={(e) => updateEmailAlerts({ serviceId: e.target.value })}
                            placeholder="service_xxx"
                            className="h-8 text-[11px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Template ID</Label>
                          <Input
                            value={emailAlerts.templateId}
                            onChange={(e) => updateEmailAlerts({ templateId: e.target.value })}
                            placeholder="template_xxx"
                            className="h-8 text-[11px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Public Key</Label>
                          <Input
                            value={emailAlerts.publicKey}
                            onChange={(e) => updateEmailAlerts({ publicKey: e.target.value })}
                            placeholder="Public API Key"
                            type="password"
                            className="h-8 text-[11px]"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                          Create Free EmailJS Account
                        </a>
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleTestEmail}>
                          Test Email
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Temperature Unit</p>
                    <p className="text-xs text-muted-foreground">
                      Choose between Celsius and Fahrenheit
                    </p>
                  </div>
                  <Select
                    value={temperatureUnit}
                    onValueChange={(v: 'C' | 'F') => setTemperatureUnit(v)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">Celsius (°C)</SelectItem>
                      <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Export Report</p>
                    <p className="text-xs text-muted-foreground">
                      Download a PDF summary of your trip
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Clear History</p>
                    <p className="text-xs text-muted-foreground">
                      Remove all stored history data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearHistory}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Total history entries: {history.length.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            {/* PWA Install */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">
                      Install as App
                    </p>
                    <p>
                      On mobile, use your browser's "Add to Home Screen" option to
                      install this dashboard as a standalone app for quick access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* App Info */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>BMS Dashboard v1.0.0</span>
                  <span>12V System • {vehicleProfile.capacityAh}Ah</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
