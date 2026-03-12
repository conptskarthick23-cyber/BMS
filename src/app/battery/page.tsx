'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Activity, Database, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { ClientOnly } from '@/components/shared/ClientOnly';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useBMSData } from '@/hooks/useBMSData';
import { linearRegression } from '@/utils/calculations';

const HealthScoreCard = dynamic(
  () =>
    import('@/components/intelligence/HealthScoreGauge').then(
      (module) => module.HealthScoreCard
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-8">
        <div className="w-48 h-48 skeleton-shimmer rounded-full" />
      </div>
    ),
  }
);

const DegradationChart = dynamic(
  () =>
    import('@/components/intelligence/DegradationChart').then(
      (module) => module.DegradationChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[220px]" />,
  }
);

const ThermalRisk = dynamic(
  () => import('@/components/intelligence/ThermalRisk').then((module) => module.ThermalRisk),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[220px]" />,
  }
);

const RangeTrend = dynamic(
  () => import('@/components/intelligence/ThermalRisk').then((module) => module.RangeTrend),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[140px]" />,
  }
);

const AnomalyFeed = dynamic(
  () => import('@/components/intelligence/AnomalyFeed').then((module) => module.AnomalyFeed),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[280px]" />,
  }
);

export default function BatteryIntelligencePage() {
  const { liveData, calculations } = useBMSData();
  const history = useBMSStore((state) => state.history);
  const anomalies = useBMSStore((state) => state.anomalies);
  const dismissAnomaly = useBMSStore((state) => state.dismissAnomaly);
  const isLoading = !liveData || !calculations;

  // Slice to last 500 entries for all heavy computations — reduces useMemo work significantly
  const recentHistory = useMemo(() => history.slice(0, 500), [history]);

  const degradationData = useMemo(() => {
    if (recentHistory.length < 3) return { daysTo70: null as number | null, data: [] as Array<{ timestamp: number; healthScore: number }> };

    const dailyScores: Record<string, { total: number; count: number; timestamp: number }> = {};

    for (const entry of recentHistory) {
      const dayKey = new Date(entry.recordedAt).toDateString();
      if (!dailyScores[dayKey]) {
        dailyScores[dayKey] = { total: 0, count: 0, timestamp: entry.recordedAt };
      }
      dailyScores[dayKey].total += entry.healthScore || 0;
      dailyScores[dayKey].count += 1;
    }

    const chartData = Object.values(dailyScores)
      .map((day) => ({
        timestamp: day.timestamp,
        healthScore: day.total / day.count,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const points = chartData.map((point, index) => ({ x: index, y: point.healthScore }));
    const { slope } = linearRegression(points);

    let daysTo70: number | null = null;
    if (slope < 0 && calculations) {
      const daysToDrop = (calculations.healthScore - 70) / Math.abs(slope);
      daysTo70 = daysToDrop > 0 ? daysToDrop : null;
    }

    return { daysTo70, data: chartData };
  }, [recentHistory, calculations]);

  const avgTempData = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weekHistory = recentHistory.filter((entry) => entry.recordedAt >= sevenDaysAgo);

    if (weekHistory.length === 0) {
      return { avgTemp: 0, currentEnergy: 0, avgEnergy: 0 };
    }

    const avgTemp =
      weekHistory.reduce((sum, entry) => sum + entry.Temperature, 0) / weekHistory.length;

    const todayKey = new Date().toDateString();
    const todayHistory = weekHistory.filter(
      (entry) => new Date(entry.recordedAt).toDateString() === todayKey
    );

    const currentEnergy =
      todayHistory.length > 0
        ? todayHistory.reduce((sum, entry) => sum + entry.Voltage * entry.Current, 0) /
        todayHistory.length
        : 0;

    const avgEnergy =
      weekHistory.reduce((sum, entry) => sum + entry.Voltage * entry.Current, 0) /
      weekHistory.length;

    return { avgTemp, currentEnergy, avgEnergy };
  }, [recentHistory]);

  const sparklineData = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weekHistory = recentHistory.filter((entry) => entry.recordedAt >= sevenDaysAgo);

    const dailyEnergy: Record<string, number> = {};
    for (const entry of weekHistory) {
      const day = new Date(entry.recordedAt).toDateString();
      dailyEnergy[day] = (dailyEnergy[day] || 0) + entry.Power;
    }

    return Object.values(dailyEnergy).slice(-7);
  }, [recentHistory]);

  const healthFactors = useMemo(() => {
    if (!liveData || !calculations) return null;

    // BatteryScore (20% weight) — matches calculateHealthScore() in calculations.ts
    let batteryScore = 100;
    if (liveData.BatteryPercent < 20) batteryScore = 70 + (liveData.BatteryPercent * 1.5);
    else if (liveData.BatteryPercent > 80) batteryScore = 100 - ((liveData.BatteryPercent - 80) * 1.5);

    // TempScore (40% weight) — same thresholds as calculateHealthScore()
    let tempScore: number;
    if (liveData.Temperature > 50) tempScore = 30;
    else if (liveData.Temperature > 45) tempScore = 55;
    else if (liveData.Temperature > 40) tempScore = 75;
    else if (liveData.Temperature < 15) tempScore = 65;
    else tempScore = 100;

    return {
      batteryScore,
      tempScore,
      efficiencyScore: calculations.efficiency * 100,
    };
  }, [liveData, calculations]);

  const dataSourceBreakdown = useMemo(() => {
    if (!liveData || !calculations || !healthFactors) return null;

    const measuredPower = liveData.Voltage * Math.abs(liveData.Current);
    const efficiencyPercent = calculations.efficiency * 100;
    // Weighted average matches calculateHealthScore(): 0.2*battery + 0.4*temp + 0.4*efficiency
    const weightedHealth =
      healthFactors.batteryScore * 0.2 +
      healthFactors.tempScore * 0.4 +
      efficiencyPercent * 0.4;

    return {
      measuredPower,
      efficiencyPercent,
      weightedHealth,
      latestTimestamp: liveData.timestamp ?? Date.now(),
      historyCount: history.length,
      batteryScore: healthFactors.batteryScore,
      tempScore: healthFactors.tempScore,
    };
  }, [liveData, calculations, healthFactors, history.length]);

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AppHeader />

        <main className="flex-1 overflow-auto pb-24 md:pb-6 scroll-momentum bg-muted/5">
          <ClientOnly
            fallback={
              <div className="flex flex-1 items-center justify-center p-12">
                <span className="animate-pulse text-muted-foreground">Loading battery data...</span>
              </div>
            }
          >
            <div className="container max-w-6xl mx-auto p-4 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Battery Intelligence</h1>
                <p className="text-sm text-muted-foreground">
                  Health analysis and degradation tracking
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Battery Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading || !healthFactors ? (
                    <div className="flex justify-center py-8">
                      <div className="w-48 h-48 skeleton-shimmer rounded-full" />
                    </div>
                  ) : (
                    <HealthScoreCard
                      score={calculations.healthScore}
                      voltageScore={healthFactors.batteryScore}
                      tempScore={healthFactors.tempScore}
                      efficiencyScore={healthFactors.efficiencyScore}
                    />
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <DegradationChart
                  historyData={degradationData.data}
                  daysTo70={degradationData.daysTo70}
                />
                <ThermalRisk avgTemp={avgTempData.avgTemp} />
              </div>

              <RangeTrend
                currentEnergy={avgTempData.currentEnergy}
                avgEnergy={avgTempData.avgEnergy}
                sparklineData={sparklineData}
              />

              <AnomalyFeed anomalies={anomalies} onDismiss={dismissAnomaly} />

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Firebase Data Source and Formulas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    Live source: <strong className="text-foreground">BMS_12V</strong> (Voltage,
                    Current, Power, Temperature, BatteryPercent, Status)
                  </p>
                  <p>
                    History source: <strong className="text-foreground">BMS_12V_history</strong>{' '}
                    (recordedAt, healthScore, efficiency, raw sensor fields)
                  </p>
                  <p>
                    Health formula:{' '}
                    <strong className="text-foreground">
                      0.2 × BatteryScore + 0.4 × TempScore + 0.4 × EfficiencyScore
                    </strong>
                  </p>
                  <p>
                    Efficiency formula:{' '}
                    <strong className="text-foreground">
                      (Voltage × |Current|) / Power
                    </strong>
                  </p>
                  {dataSourceBreakdown && liveData && (
                    <div className="grid gap-2 md:grid-cols-2 border-t border-border/50 pt-3 mt-1">
                      <p className="col-span-2 font-medium text-foreground">Live Firebase values → sub-scores:</p>
                      <p>
                        BatteryPercent: <strong className="text-foreground">{liveData.BatteryPercent.toFixed(1)}%</strong>
                        {' '}→ BatteryScore: <strong className="text-foreground">{dataSourceBreakdown.batteryScore.toFixed(1)}</strong>
                      </p>
                      <p>
                        Temperature: <strong className="text-foreground">{liveData.Temperature.toFixed(1)}°C</strong>
                        {' '}→ TempScore: <strong className="text-foreground">{dataSourceBreakdown.tempScore.toFixed(1)}</strong>
                      </p>
                      <p>
                        {liveData.Voltage.toFixed(2)}V × |{liveData.Current.toFixed(2)}A| / {liveData.Power.toFixed(2)}W{' '}
                        → Efficiency: <strong className="text-foreground">{dataSourceBreakdown.efficiencyPercent.toFixed(1)}%</strong>
                      </p>
                      <p>
                        Weighted output:{' '}
                        <strong className="text-foreground">{dataSourceBreakdown.weightedHealth.toFixed(1)}</strong>
                        {' '}(= gauge score)
                      </p>
                      <p>
                        Measured power: <strong className="text-foreground">{dataSourceBreakdown.measuredPower.toFixed(2)}W</strong>
                      </p>
                      <p>
                        History points loaded: <strong className="text-foreground">{dataSourceBreakdown.historyCount}</strong>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        All displayed battery intelligence values on this screen are derived from
                        real-time Firebase data, not hardcoded sample numbers.
                      </p>
                      <p>
                        Degradation forecast accuracy improves after at least 3 distinct days of
                        history.
                      </p>
                    </div>
                  </div>
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
