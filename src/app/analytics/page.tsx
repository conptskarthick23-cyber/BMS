'use client';

import dynamic from 'next/dynamic';
import { memo, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { format } from 'date-fns';
import { Activity, Calendar, Clock, Download, Thermometer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { ClientOnly } from '@/components/shared/ClientOnly';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useBMSData } from '@/hooks/useBMSData';
import { TIME_RANGE_SECONDS } from '@/constants/thresholds';
import { exportToCSV } from '@/utils/csvExport';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/types/bms';

const MAX_CHART_POINTS = 480;

const ChartSkeleton = memo(function ChartSkeleton({ height }: { height: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
});

const VoltageChart = dynamic(
  () => import('@/components/charts/VoltageChart').then((module) => module.VoltageChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

const TemperatureChart = dynamic(
  () =>
    import('@/components/charts/TemperatureChart').then((module) => module.TemperatureChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

const PowerCurrentChart = dynamic(
  () =>
    import('@/components/charts/PowerCurrentChart').then(
      (module) => module.PowerCurrentChart
    ),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

const DrainCurveChart = dynamic(
  () => import('@/components/charts/DrainCurveChart').then((module) => module.DrainCurveChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> }
);

const EfficiencyChart = dynamic(
  () => import('@/components/charts/EfficiencyChart').then((module) => module.EfficiencyChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> }
);

function downsampleByStride<T>(input: T[], maxPoints: number): T[] {
  if (input.length <= maxPoints) return input;
  const stride = Math.ceil(input.length / maxPoints);
  return input.filter((_, index) => index % stride === 0);
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const history = useBMSStore((state) => state.history);
  const { liveData } = useBMSData();

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const rangeMs = TIME_RANGE_SECONDS[timeRange] * 1000;
    return history.filter((entry) => entry.recordedAt >= now - rangeMs);
  }, [history, timeRange]);

  const summaryStats = useMemo(() => {
    if (filteredHistory.length === 0) return null;

    const avgVoltage =
      filteredHistory.reduce((sum, entry) => sum + entry.Voltage, 0) / filteredHistory.length;
    const peakTemp = filteredHistory.reduce((max, entry) => entry.Temperature > max ? entry.Temperature : max, -Infinity);
    const totalWh = filteredHistory.reduce((sum, entry) => sum + entry.Power / 3600, 0);
    const sessions = new Set(
      filteredHistory.map((entry) => Math.floor(entry.recordedAt / 3600000))
    ).size;

    return {
      avgVoltage: avgVoltage.toFixed(2),
      peakTemp: peakTemp.toFixed(1),
      totalWh: totalWh.toFixed(1),
      sessions,
    };
  }, [filteredHistory]);

  const chartData = useMemo(() => {
    const sampledHistory = downsampleByStride(filteredHistory, MAX_CHART_POINTS);

    return sampledHistory.map((entry) => ({
      timestamp: entry.recordedAt,
      timeLabel: format(new Date(entry.recordedAt), 'HH:mm'),
      voltage: entry.Voltage,
      temperature: entry.Temperature,
      power: entry.Power,
      current: entry.Current,
      batteryPercent: entry.BatteryPercent,
      efficiency: entry.efficiency || 0,
    }));
  }, [filteredHistory]);

  const sessionHistory = useMemo(() => {
    const sessions: Array<{
      date: string;
      duration: number;
      whUsed: number;
      peakTemp: number;
      peakCurrent: number;
      avgEfficiency: number;
    }> = [];

    let currentSession: typeof filteredHistory = [];
    let sessionStart = 0;

    for (let index = 0; index < filteredHistory.length; index += 1) {
      const entry = filteredHistory[index];

      if (entry.Current > 0.5 && currentSession.length === 0) {
        sessionStart = entry.recordedAt;
        currentSession = [entry];
      } else if (entry.Current > 0.5) {
        currentSession.push(entry);
      } else if (currentSession.length > 0) {
        const duration = (entry.recordedAt - sessionStart) / 1000;
        const whUsed = currentSession.reduce((sum, item) => sum + item.Power, 0) / 3600;
        // Use reduce instead of Math.max(...spread) to avoid stack overflow on large arrays
        const peakTemp = currentSession.reduce((max, item) => item.Temperature > max ? item.Temperature : max, -Infinity);
        const peakCurrent = currentSession.reduce((max, item) => item.Current > max ? item.Current : max, -Infinity);
        const avgEfficiency =
          currentSession.reduce((sum, item) => sum + (item.efficiency || 0), 0) /
          currentSession.length;

        sessions.push({
          date: format(new Date(sessionStart), 'MMM dd, HH:mm'),
          duration,
          whUsed,
          peakTemp,
          peakCurrent,
          avgEfficiency,
        });

        currentSession = [];
      }
    }

    return sessions.slice(-10);
  }, [filteredHistory]);

  const isLoading = !liveData;

  const handleExport = () => {
    exportToCSV(
      filteredHistory.map((entry) => ({
        ...entry,
        Status: 'CONNECTED' as const,
      })),
      `bms-analytics-${timeRange}`
    );
  };

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AppHeader />

        <main className="flex-1 overflow-auto pb-24 md:pb-0 scroll-momentum bg-muted/5">
          <ClientOnly
            fallback={
              <div className="flex flex-1 items-center justify-center p-12">
                <span className="animate-pulse text-muted-foreground">Loading analytics...</span>
              </div>
            }
          >
            <div className="container max-w-6xl mx-auto p-4 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
                  <p className="text-sm text-muted-foreground">Historical data and trends</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <TabsList>
                  <TabsTrigger value="1h">1H</TabsTrigger>
                  <TabsTrigger value="6h">6H</TabsTrigger>
                  <TabsTrigger value="24h">24H</TabsTrigger>
                  <TabsTrigger value="7d">7D</TabsTrigger>
                  <TabsTrigger value="30d">30D</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Summary Stats — always show when we have history OR live data */}
              {summaryStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="rounded-2xl border-border/40 hover:border-primary/20 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 rounded-xl bg-blue-500/10">
                          <Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[11px] md:text-xs font-semibold tracking-wider text-muted-foreground uppercase">Avg Voltage</p>
                          <p className="text-xl md:text-2xl font-black tabular-nums">{summaryStats.avgVoltage}V</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/40 hover:border-primary/20 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 rounded-xl bg-red-500/10">
                          <Thermometer className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                        </div>
                        <div>
                          <p className="text-[11px] md:text-xs font-semibold tracking-wider text-muted-foreground uppercase">Peak Temp</p>
                          <p className="text-xl md:text-2xl font-black tabular-nums">{summaryStats.peakTemp}°C</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/40 hover:border-primary/20 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 rounded-xl bg-amber-500/10">
                          <Zap className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-[11px] md:text-xs font-semibold tracking-wider text-muted-foreground uppercase">Total Wh</p>
                          <p className="text-xl md:text-2xl font-black tabular-nums">{summaryStats.totalWh} Wh</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/40 hover:border-primary/20 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="p-2.5 md:p-3 rounded-xl bg-green-500/10">
                          <Calendar className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-[11px] md:text-xs font-semibold tracking-wider text-muted-foreground uppercase">Sessions</p>
                          <p className="text-xl md:text-2xl font-black tabular-nums">{summaryStats.sessions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-dashed border-border/50">
                  <CardContent className="p-6 text-center">
                    <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">No history data for this time range</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Data is recorded every {liveData ? '60s' : '—'} from Firebase. Try a shorter range like <span className="font-mono">1H</span> or <span className="font-mono">6H</span> if you just connected.
                    </p>
                    {liveData && (
                      <div className="mt-4 grid grid-cols-3 gap-2 text-left">
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Live Voltage</p>
                          <p className="text-base font-bold text-blue-500">{liveData.Voltage.toFixed(2)}V</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Live Temp</p>
                          <p className="text-base font-bold text-red-500">{liveData.Temperature.toFixed(1)}°C</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Live Power</p>
                          <p className="text-base font-bold text-amber-500">{liveData.Power.toFixed(1)}W</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <VoltageChart data={chartData} loading={isLoading} height={220} />
                <TemperatureChart data={chartData} loading={isLoading} height={220} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PowerCurrentChart data={chartData} loading={isLoading} height={220} />
                <DrainCurveChart data={chartData} loading={isLoading} height={220} />
              </div>

              <EfficiencyChart data={chartData} loading={isLoading} height={200} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Session History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <SkeletonCard variant="list" />
                  ) : sessionHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No sessions recorded in this time range
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Wh Used</TableHead>
                            <TableHead>Peak Temp</TableHead>
                            <TableHead>Peak Current</TableHead>
                            <TableHead>Avg Efficiency</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionHistory.map((session, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{session.date}</TableCell>
                              <TableCell>{Math.floor(session.duration / 60)}m</TableCell>
                              <TableCell>{session.whUsed.toFixed(1)}</TableCell>
                              <TableCell>{session.peakTemp.toFixed(1)}C</TableCell>
                              <TableCell>{session.peakCurrent.toFixed(2)}A</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    session.avgEfficiency > 0.9
                                      ? 'text-green-500 border-green-500'
                                      : session.avgEfficiency > 0.8
                                        ? 'text-amber-500 border-amber-500'
                                        : 'text-red-500 border-red-500'
                                  )}
                                >
                                  {(session.avgEfficiency * 100).toFixed(0)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
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
