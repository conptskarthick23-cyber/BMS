'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Battery,
  AlertTriangle,
  CheckCircle,
  Thermometer,
  Zap,
  Timer,
  Activity,
  TrendingUp,
  Info,
} from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useBMSData } from '@/hooks/useBMSData';
import { useShallow } from 'zustand/react/shallow';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration, getTemperatureZone } from '@/utils/calculations';
import { getChargeRecommendation } from '@/utils/alertRules';
import { cn } from '@/lib/utils';
import { ClientOnly } from '@/components/shared/ClientOnly';

// Animated milestone component
function MilestoneIndicator({
  threshold,
  isActive,
  isPassed,
  timeTo,
  delay,
}: {
  threshold: number;
  isActive: boolean;
  isPassed: boolean;
  timeTo: number | null;
  delay: number;
}) {
  const getColor = () => {
    if (isPassed) return 'bg-muted';
    if (threshold >= 60) return 'bg-green-500';
    if (threshold >= 20) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center transition-opacity',
        isPassed && 'opacity-40',
        isActive && 'opacity-100'
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div
        className={cn(
          'w-4 h-4 rounded-full mb-1.5 transition-all duration-300',
          getColor(),
          isActive && 'ring-2 ring-offset-2 ring-offset-background ring-primary animate-pulse'
        )}
      />
      <span className="text-xs font-medium">{threshold}%</span>
      {/* Show time for all upcoming thresholds, 'Now' for current band */}
      {isActive ? (
        <span className="text-[10px] font-bold text-primary mt-0.5">Now</span>
      ) : !isPassed && timeTo !== null ? (
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {formatDuration(timeTo)}
        </span>
      ) : null}
    </motion.div>
  );
}

// Time prediction card
function TimePredictionCard({
  label,
  time,
  colorClass,
  bgClass,
  delay,
}: {
  label: string;
  time: string;
  colorClass: string;
  bgClass: string;
  delay: number;
}) {
  return (
    <motion.div
      className={cn(
        'text-center p-4 rounded-2xl border transition-all duration-300',
        bgClass
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">
        {label}
      </p>
      <p className={cn('text-2xl font-bold', colorClass)}>
        {time}
      </p>
    </motion.div>
  );
}

export default function TripEnergyPage() {
  const { liveData, calculations } = useBMSData();
  const history = useBMSStore((state) => state.history);

  const isLoading = !liveData || !calculations;

  // Charge recommendation
  const chargeRecommendation = useMemo(() => {
    if (!liveData || !calculations) return null;
    return getChargeRecommendation(
      liveData.BatteryPercent,
      liveData.Temperature,
      calculations.healthScore,
      calculations.chargeMode
    );
  }, [liveData, calculations]);

  // Temperature trend prediction
  const tempPrediction = useMemo(() => {
    if (!liveData || calculations?.tempRiseRate === undefined) return null;

    const rate = calculations.tempRiseRate;
    if (rate <= 0) {
      return { message: 'Temperature stable — no thermal risk', type: 'good' as const };
    }

    const minsToWarning = calculations.minsToWarning;
    if (minsToWarning && minsToWarning > 0) {
      return {
        message: `Rising at ${rate.toFixed(2)}°C/min → Warning zone (45°C) in ~${Math.round(minsToWarning)} min`,
        type: 'warning' as const,
      };
    }

    return { message: 'Temperature rising', type: 'warning' as const };
  }, [liveData, calculations]);

  // Battery milestones — compute time to each threshold directly from Firebase values
  const milestones = useMemo(() => {
    if (!liveData || !calculations) return [];

    const currentPct = liveData.BatteryPercent;
    const thresholds = [100, 80, 60, 40, 20, 10, 0];

    // Get capacityAh from the store (synced from Firebase BMS_12V)
    const { vehicleProfile } = useBMSStore.getState();
    const capacityAh = vehicleProfile.capacityAh; // e.g. 7 Ah
    const currentA = Math.abs(liveData.Current);   // discharge current in A
    const isDischarging = liveData.Current > 0.1;  // positive = drawing power

    return thresholds.map((threshold, idx) => {
      const isPassed = currentPct < threshold;   // already below this level
      // isActive = battery is currently AT this milestone band
      const nextThreshold = thresholds[idx - 1] ?? 101;
      const isActive = currentPct >= threshold && currentPct < nextThreshold;

      // timeTo: how many minutes until we reach this threshold
      // = (Ah to drain to reach threshold) / |Current|
      let timeTo: number | null = null;
      if (!isPassed && threshold < currentPct && isDischarging && currentA > 0.01) {
        const ahToDrain = ((currentPct - threshold) / 100) * capacityAh;
        const hoursTo = ahToDrain / currentA;
        timeTo = hoursTo * 60; // convert to minutes
      }

      return { threshold, isActive, isPassed, timeTo };
    });
  }, [liveData, calculations]);

  // Session stats
  const sessionStats = useMemo(() => {
    if (!liveData || history.length === 0) return null;

    const now = Date.now();
    const sessionStart = now - 30 * 60 * 1000;
    const sessionData = history.filter((h) => h.recordedAt >= sessionStart);

    if (sessionData.length === 0) return null;

    return {
      duration: 30,
      whUsed: sessionData.reduce((sum, h) => sum + h.Power, 0) / 3600,
      peakCurrent: sessionData.reduce((max, h) => h.Current > max ? h.Current : max, -Infinity),
      peakTemp: sessionData.reduce((max, h) => h.Temperature > max ? h.Temperature : max, -Infinity),
      avgEfficiency: sessionData.reduce((sum, h) => sum + (h.efficiency || 0), 0) / sessionData.length,
    };
  }, [liveData, history]);

  const tempZone = liveData ? getTemperatureZone(liveData.Temperature) : null;

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="h-14 px-4 flex items-center">
            <h1 className="text-lg font-semibold">Trip Energy</h1>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-24 md:pb-6 scroll-momentum bg-muted/5">
          <ClientOnly fallback={<div className="flex flex-1 items-center justify-center p-12"><span className="animate-pulse text-muted-foreground">Loading trip analysis...</span></div>}>
            <div className="max-w-6xl mx-auto p-4 space-y-5">

              {/* Time Remaining Hero */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="overflow-hidden border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Timer className="w-4 h-4 text-primary" />
                      Time Remaining
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-32" />
                        <div className="grid grid-cols-3 gap-3">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-4">
                          At current {liveData?.Power.toFixed(0) || 0}W draw
                        </p>

                        <div className="grid grid-cols-3 gap-3">
                          <TimePredictionCard
                            label="To Low (20%)"
                            time={calculations?.timeTo20Percent ? formatDuration(calculations.timeTo20Percent) : '—'}
                            colorClass="text-amber-400"
                            bgClass="bg-amber-500/10 border-amber-500/20"
                            delay={0.1}
                          />
                          <TimePredictionCard
                            label="To Critical (10%)"
                            time={calculations?.timeTo10Percent ? formatDuration(calculations.timeTo10Percent) : '—'}
                            colorClass="text-orange-400"
                            bgClass="bg-orange-500/10 border-orange-500/20"
                            delay={0.15}
                          />
                          <TimePredictionCard
                            label="To Empty"
                            time={calculations?.timeToEmpty ? formatDuration(calculations.timeToEmpty) : '—'}
                            colorClass="text-red-400"
                            bgClass="bg-red-500/10 border-red-500/20"
                            delay={0.2}
                          />
                        </div>

                        {calculations?.chargeMode === 'CHARGING' && (
                          <motion.div
                            className="mt-4 text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                          >
                            <p className="text-sm text-muted-foreground">Full charge in</p>
                            <p className="text-2xl font-bold text-green-400 mt-1">
                              {calculations.estimatedChargeTime
                                ? formatDuration(calculations.estimatedChargeTime)
                                : '—'}
                            </p>
                          </motion.div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.section>

              {/* Battery Milestones */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Battery className="w-4 h-4 text-primary" />
                      Battery Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-20 w-full rounded-lg" />
                    ) : (
                      <div className="space-y-4">
                        {/* Progress bar */}
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              width: `${liveData?.BatteryPercent || 0}%`,
                              backgroundColor: cn(
                                (liveData?.BatteryPercent || 0) > 60 ? '#22C55E' :
                                  (liveData?.BatteryPercent || 0) > 20 ? '#F59E0B' : '#EF4444'
                              ),
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${liveData?.BatteryPercent || 0}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        </div>

                        {/* Milestone markers */}
                        <div className="flex justify-between px-1">
                          {milestones.map((m, i) => (
                            <MilestoneIndicator
                              key={m.threshold}
                              {...m}
                              delay={i * 0.05}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.section>

              {/* Charge Recommendation */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    {isLoading || !chargeRecommendation ? (
                      <Skeleton className="h-16 w-full rounded-lg" />
                    ) : (
                      <div
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-xl transition-colors',
                          chargeRecommendation.type === 'good' && 'bg-green-500/10 border border-green-500/20',
                          chargeRecommendation.type === 'warning' && 'bg-amber-500/10 border border-amber-500/20',
                          chargeRecommendation.type === 'critical' && 'bg-red-500/10 border border-red-500/20',
                          chargeRecommendation.type === 'charging' && 'bg-blue-500/10 border border-blue-500/20'
                        )}
                      >
                        {chargeRecommendation.type === 'good' && (
                          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        )}
                        {chargeRecommendation.type === 'warning' && (
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        {chargeRecommendation.type === 'critical' && (
                          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        {chargeRecommendation.type === 'charging' && (
                          <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        )}
                        <p className={cn(
                          'text-sm font-medium',
                          chargeRecommendation.type === 'good' && 'text-green-400',
                          chargeRecommendation.type === 'warning' && 'text-amber-400',
                          chargeRecommendation.type === 'critical' && 'text-red-400',
                          chargeRecommendation.type === 'charging' && 'text-blue-400',
                        )}>
                          {chargeRecommendation.message}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.section>

              {/* Temperature Trend */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-primary" />
                      Temperature Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading || !tempPrediction ? (
                      <Skeleton className="h-12 w-full rounded-lg" />
                    ) : (
                      <div
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl',
                          tempPrediction.type === 'good' && 'bg-green-500/10 border border-green-500/20',
                          tempPrediction.type === 'warning' && 'bg-amber-500/10 border border-amber-500/20'
                        )}
                      >
                        {tempPrediction.type === 'good' ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                        )}
                        <p className="text-sm text-foreground">{tempPrediction.message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.section>

              {/* Session Stats */}
              {sessionStats && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        This Session
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {[
                          { label: 'Duration', value: `${sessionStats.duration}m` },
                          { label: 'Wh Used', value: sessionStats.whUsed.toFixed(1) },
                          { label: 'Peak Current', value: `${sessionStats.peakCurrent.toFixed(1)}A` },
                          { label: 'Peak Temp', value: `${sessionStats.peakTemp.toFixed(1)}°C` },
                          { label: 'Efficiency', value: `${(sessionStats.avgEfficiency * 100).toFixed(0)}%` },
                        ].map((stat, i) => (
                          <div key={stat.label} className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">{stat.label}</p>
                            <p className="text-lg font-semibold">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.section>
              )}

              {/* Disclaimer */}
              <Card className="bg-muted/20 border-border/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> Time predictions are based on current power draw and may vary with usage patterns.
                      Range estimates depend on speed, terrain, and driving conditions not available in current BMS data.
                    </p>
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
