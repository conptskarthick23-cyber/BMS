'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useBMSData } from '@/hooks/useBMSData';
import { useShallow } from 'zustand/react/shallow';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ClientOnly } from '@/components/shared/ClientOnly';

export default function AlertsPage() {
  const { liveData } = useBMSData();
  const {
    thresholds,
    updateThreshold,
    resetThresholds,
    alertHistory,
    activeAlerts,
    removeActiveAlert,
  } = useBMSStore(
    useShallow((state) => ({
      thresholds: state.thresholds,
      updateThreshold: state.updateThreshold,
      resetThresholds: state.resetThresholds,
      alertHistory: state.alertHistory,
      activeAlerts: state.activeAlerts,
      removeActiveAlert: state.removeActiveAlert,
    }))
  );

  const [filter, setFilter] = useState<'all' | 'warning' | 'critical' | 'resolved'>('all');
  const [showEditor, setShowEditor] = useState(false);

  const isLoading = !liveData;

  // Filter alert history
  const filteredHistory = useMemo(() => {
    const history = alertHistory || [];
    if (filter === 'all') return history;
    return history.filter((alert) => alert.level === filter);
  }, [alertHistory, filter]);

  // Group active alerts by level
  const groupedAlerts = useMemo(() => {
    const alerts = activeAlerts || [];
    const critical = alerts.filter((a) => a.level === 'critical');
    const warning = alerts.filter((a) => a.level === 'warning');
    return { critical, warning };
  }, [activeAlerts]);

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AppHeader />

        <main className="flex-1 overflow-auto pb-24 md:pb-6 scroll-momentum bg-muted/5">
          <ClientOnly fallback={<div className="flex flex-1 items-center justify-center p-12"><span className="animate-pulse text-muted-foreground">Loading alerts...</span></div>}>
            <div className="container max-w-6xl mx-auto p-4 space-y-6">
              {/* Page Title */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
                  <p className="text-sm text-muted-foreground">
                    Threshold monitoring and alert history
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditor(!showEditor)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {showEditor ? 'Hide Settings' : 'Configure'}
                </Button>
              </div>

              {/* Active Alerts */}
              {activeAlerts && activeAlerts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Active Alerts
                  </h2>

                  {groupedAlerts.critical.map((alert, index) => (
                    <AlertBanner
                      key={`${alert.id}-${index}`}
                      variant="critical"
                      title={alert.alertName}
                      message={`Value: ${typeof alert.value === 'number' ? alert.value.toFixed(2) : String(alert.value)} (threshold: ${typeof alert.threshold === 'number' ? alert.threshold.toFixed(2) : String(alert.threshold)})`}
                      dismissible
                      onDismiss={() => removeActiveAlert(alert.id)}
                    />
                  ))}

                  {groupedAlerts.warning.map((alert, index) => (
                    <AlertBanner
                      key={`${alert.id}-${index}`}
                      variant="warning"
                      title={alert.alertName}
                      message={`Value: ${typeof alert.value === 'number' ? alert.value.toFixed(2) : String(alert.value)} (threshold: ${typeof alert.threshold === 'number' ? alert.threshold.toFixed(2) : String(alert.threshold)})`}
                      dismissible
                      onDismiss={() => removeActiveAlert(alert.id)}
                    />
                  ))}
                </div>
              )}

              {/* Default Threshold Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Alert Thresholds
                    </CardTitle>
                    {showEditor && (
                      <Button variant="ghost" size="sm" onClick={resetThresholds}>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <SkeletonCard variant="list" />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Alert</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>Trigger</TableHead>
                            <TableHead>Level</TableHead>
                            {showEditor && <TableHead>Enabled</TableHead>}
                            {showEditor && <TableHead>Custom Value</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {thresholds.map((threshold) => (
                            <TableRow key={threshold.id}>
                              <TableCell className="font-medium">
                                {threshold.name}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {threshold.field}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    threshold.operator === 'gt' && 'text-red-500 border-red-500',
                                    threshold.operator === 'lt' && 'text-blue-500 border-blue-500'
                                  )}
                                >
                                  {threshold.operator === 'gt' ? '>' : '<'}{' '}
                                  {threshold.value}
                                  {threshold.field === 'Temperature' ? '°C' :
                                    threshold.field === 'BatteryPercent' ? '%' :
                                      threshold.field === 'Voltage' ? 'V' :
                                        threshold.field === 'Current' ? 'A' : ''}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn(
                                    threshold.level === 'critical' &&
                                    'bg-red-500/10 text-red-500 border-red-500/20',
                                    threshold.level === 'warning' &&
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  )}
                                >
                                  {threshold.level}
                                </Badge>
                              </TableCell>
                              {showEditor && (
                                <TableCell>
                                  <Switch
                                    checked={threshold.enabled}
                                    onCheckedChange={(checked) =>
                                      updateThreshold(threshold.id, { enabled: checked })
                                    }
                                  />
                                </TableCell>
                              )}
                              {showEditor && (
                                <TableCell>
                                  <Input
                                    type="number"
                                    className="w-20 h-8"
                                    defaultValue={threshold.value}
                                    onChange={(e) =>
                                      updateThreshold(threshold.id, {
                                        value: parseFloat(e.target.value),
                                      })
                                    }
                                  />
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alert History */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Alert History
                    </CardTitle>
                    <div className="flex gap-1">
                      {(['all', 'warning', 'critical', 'resolved'] as const).map((f) => (
                        <Button
                          key={f}
                          variant={filter === f ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setFilter(f)}
                        >
                          {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No alert history for the selected filter
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredHistory.slice(0, 20).map((alert, index) => (
                        <div
                          key={`${alert.id}-${index}`}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border',
                            alert.level === 'critical' && 'bg-red-500/5 border-red-500/20',
                            alert.level === 'warning' && 'bg-amber-500/5 border-amber-500/20',
                            alert.level === 'resolved' && 'bg-green-500/5 border-green-500/20'
                          )}
                        >
                          {alert.level === 'critical' && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          {alert.level === 'warning' && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          {alert.level === 'resolved' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {alert.alertName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Value: {typeof alert.value === 'number' ? alert.value.toFixed(2) : String(alert.value)} • Threshold: {typeof alert.threshold === 'number' ? alert.threshold.toFixed(2) : String(alert.threshold)}
                              {alert.duration && ` • Duration: ${Math.round(alert.duration / 1000)}s`}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(alert.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Toast Rules Info */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium mb-2">Notification Rules</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      CRITICAL alerts: Red, persistent (manual dismiss)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      WARNING alerts: Amber, auto-dismiss after 5 seconds
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      RESOLVED alerts: Green, auto-dismiss after 3 seconds
                    </li>
                    <li>Maximum 3 toasts visible at once (queued)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </ClientOnly>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
