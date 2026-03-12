'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Battery,
  Zap,
  Thermometer,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Power,
  Timer,
  Fuel,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { useBMSStore } from '@/hooks/useBMSStore';
import { useBMSData } from '@/hooks/useBMSData';
import { useShallow } from 'zustand/react/shallow';
import {
  getTemperatureZone,
  getBatteryColor,
  formatDuration,
  formatTimeAgo,
  detectChargeMode,
} from '@/utils/calculations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ClientOnly } from '@/components/shared/ClientOnly';
// Animated number counter hook
function useAnimatedNumber(target: number, duration = 800) {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const start = display;
    const diff = target - start;
    if (Math.abs(diff) < 0.1) { setDisplay(target); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + diff * eased);
      if (t < 1) requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

// Circular battery gauge — full 360° ring, fills completely at 100%
function BatteryIllustration({ percent, temperature, isCharging }: { percent: number; temperature: number; isCharging?: boolean }) {
  const animatedPercent = useAnimatedNumber(percent);
  const size = 260;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Full 360° — at 100% the ring is completely filled
  const filled = circumference * (animatedPercent / 100);
  const empty = circumference - filled;

  // Color transitions: green > 60%, amber 20–60%, red < 20%
  const getColors = (p: number) => {
    if (p > 60) return {
      stroke: '#22C55E',
      glow: 'rgba(34,197,94,0.45)',
      glowStrong: 'rgba(34,197,94,0.9)',
      text: '#22C55E',
      label: isCharging ? 'Charging' : 'Good',
      bg: 'rgba(34,197,94,0.07)',
      track: 'rgba(34,197,94,0.12)',
    };
    if (p > 20) return {
      stroke: '#F59E0B',
      glow: 'rgba(245,158,11,0.45)',
      glowStrong: 'rgba(245,158,11,0.9)',
      text: '#F59E0B',
      label: 'Moderate',
      bg: 'rgba(245,158,11,0.07)',
      track: 'rgba(245,158,11,0.12)',
    };
    return {
      stroke: '#EF4444',
      glow: 'rgba(239,68,68,0.55)',
      glowStrong: 'rgba(239,68,68,0.9)',
      text: '#EF4444',
      label: 'Low Battery!',
      bg: 'rgba(239,68,68,0.07)',
      track: 'rgba(239,68,68,0.12)',
    };
  };
  const c = getColors(percent);

  // Rotate so arc starts at top (12 o'clock) = -90deg
  const rotateCSS = 'rotate(-90deg)';

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[280px] mx-auto select-none">
      {/* Subtle ambient glow — soft, not blinding */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 40,
          height: size + 40,
          background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
          opacity: 0.6,
        }}
        animate={{ opacity: percent < 20 ? [0.5, 0.75, 0.5] : [0.25, 0.4, 0.25] }}
        transition={{ duration: percent < 20 ? 1.2 : 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* SVG ring — starts at 12 o'clock */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: rotateCSS, overflow: 'visible' }}>

        {/* Track ring — full circle background, rounded caps for smooth edges */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={c.track}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Main progress ring — crisp, smooth glow */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={c.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${empty}`}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${filled} ${empty}` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${c.stroke})` }}
        />

        {/* Charging sweep shimmer */}
        {isCharging && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={c.stroke}
            strokeWidth={strokeWidth * 0.5}
            strokeDasharray={`${circumference * 0.10} ${circumference}`}
            strokeLinecap="round"
            style={{ filter: 'blur(3px)', opacity: 0.5 }}
            animate={{ strokeDashoffset: [0, -circumference] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Low battery — subtle pulse on the ring outline only */}
        {percent < 20 && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={c.stroke}
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`${filled} ${empty}`}
            strokeLinecap="round"
            animate={{ opacity: [0, 0.25, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </svg>

      {/* Center content */}
      <div
        className="absolute flex flex-col items-center justify-center rounded-full"
        style={{ width: size - strokeWidth * 3.5, height: size - strokeWidth * 3.5, background: c.bg }}
      >
        {/* Number count-up */}
        <motion.div
          className="flex items-end leading-none gap-0.5"
          key={Math.round(percent)}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-5xl font-black tabular-nums tracking-tighter" style={{ color: c.text }}>
            {Math.round(animatedPercent)}
          </span>
          <span className="text-2xl font-bold mb-1.5 opacity-70" style={{ color: c.text }}>%</span>
        </motion.div>

        {/* Status label (Good / Charging / Low etc.) */}
        <motion.span
          className="text-[11px] font-bold mt-1 tracking-widest uppercase"
          style={{ color: c.text }}
          animate={isCharging || percent < 20 ? { opacity: [1, 0.45, 1] } : {}}
          transition={isCharging || percent < 20 ? { duration: 1.1, repeat: Infinity } : {}}
        >
          {isCharging ? '⚡ Charging' : c.label}
        </motion.span>

        {/* Temperature */}
        <div className="mt-2 px-3 py-0.5 rounded-full bg-background/60 border border-border/40 backdrop-blur-sm">
          <span className="text-[11px] font-mono text-muted-foreground">{temperature.toFixed(1)}°C</span>
        </div>
      </div>
    </div>
  );
}

function BatteryFallback() {
  return (
    <div className="w-full max-w-[280px] mx-auto flex items-center justify-center" style={{ height: 260 }}>
      <div className="w-[260px] h-[260px] rounded-full border-[20px] border-muted/25 animate-pulse relative flex items-center justify-center">
        <div className="w-20 h-6 rounded-full bg-muted/20 animate-pulse" />
      </div>
    </div>
  );
}


// Memoized metric card with animations
const MetricCard = memo(function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  trend,
  color,
  delay = 0,
}: {
  title: string;
  value: number | string;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  delay?: number;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const displayValue = typeof value === 'number' ? value.toFixed(2) : value;

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card className="group relative h-full flex flex-col overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl md:rounded-3xl transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
        <div
          className="absolute top-0 left-0 right-0 h-[3px] transition-opacity duration-300 opacity-0 group-hover:opacity-100"
          style={{ background: color ? `linear-gradient(90deg, ${color}, transparent)` : undefined }}
        />

        <CardContent className="p-4 md:p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              {title}
            </span>
            <div
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm"
              style={{ backgroundColor: color ? `${color}15` : undefined }}
            >
              <span style={{ color }}>{icon}</span>
            </div>
          </div>

          <div className="space-y-1 mt-auto">
            <div className="flex items-baseline gap-1.5">
              <motion.span
                className="text-2xl md:text-3xl font-black tracking-tight tabular-nums"
                style={{ color }}
                key={displayValue}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {displayValue}
              </motion.span>
              {unit && (
                <span className="text-sm font-semibold text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 min-h-[18px]">
              {trend && (
                <span className={cn(
                  'flex items-center justify-center w-4 h-4 rounded-full',
                  trend === 'up' && 'text-red-500 bg-red-500/10',
                  trend === 'down' && 'text-green-500 bg-green-500/10',
                  trend === 'neutral' && 'text-muted-foreground bg-muted'
                )}>
                  <TrendIcon className="w-3 h-3" />
                </span>
              )}
              {subtitle ? (
                <span className="text-[11px] md:text-xs font-medium text-muted-foreground">{subtitle}</span>
              ) : (
                <span className="text-[11px] md:text-xs font-medium text-muted-foreground/0 select-none">-</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

// Animated stat card
const StatCard = memo(function StatCard({
  label,
  value,
  unit,
  icon,
  color
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      className="p-3.5 md:p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-background/60 shadow-sm" style={{ color }}>
          {icon}
        </div>
        <span className="text-[10px] md:text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{label}</span>
      </div>
      <motion.div
        className="flex items-baseline gap-1 mt-auto"
        style={{ color }}
        key={String(value)}
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
      >
        <span className="text-xl md:text-2xl font-black tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-xs font-semibold text-muted-foreground/70">{unit}</span>}
      </motion.div>
    </motion.div>
  );
});

export default function DashboardPage() {
  const { liveData, calculations, connectionStatus, lastUpdated } = useBMSData();
  const { vehicleProfile, activeAlerts } = useBMSStore(
    useShallow((state) => ({
      vehicleProfile: state.vehicleProfile,
      activeAlerts: state.activeAlerts,
    }))
  );
  const { theme, setTheme } = useTheme();
  const [timeAgo, setTimeAgo] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoading = !liveData;
  const chargeMode = liveData ? detectChargeMode(liveData.Current) : 'IDLE';
  const tempZone = liveData ? getTemperatureZone(liveData.Temperature) : null;
  const batteryColor = liveData ? getBatteryColor(liveData.BatteryPercent) : '#64748B';
  const alertCount = activeAlerts?.length ?? 0;

  // Update time ago
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdated) {
        setTimeAgo(formatTimeAgo(lastUpdated));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Data refreshed');
    }, 1000);
  }, []);

  // Toggle 3D/2D
  // const toggleView = useCallback(() => {
  //   setUse3D(prev => !prev);
  // }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SidebarNav />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Sticky Header */}
        <header className="flex-none z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between h-14 px-4">
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className={cn(
                'w-2 h-2 rounded-full transition-all duration-500',
                connectionStatus.isConnected
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                  : 'bg-gray-400'
              )} />
              <span className="text-sm font-semibold">
                Battery Monitor
              </span>
            </motion.div>

            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  {timeAgo}
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              {alertCount > 0 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {alertCount}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content with proper momentum */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-6 scroll-momentum bg-muted/5">
          <ClientOnly fallback={<div className="flex flex-1 items-center justify-center p-12"><span className="animate-pulse text-muted-foreground">Loading dashboard...</span></div>}>
            <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">

              {/* Hero Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="overflow-hidden border-border/40 rounded-3xl md:rounded-[2rem] bg-card/60 backdrop-blur-xl shadow-lg shadow-black/5">
                  <CardContent className="p-5 md:p-8">
                    <div className="flex flex-col lg:flex-row items-center gap-8">

                      {/* Battery Visualization */}
                      <div className="flex-1 w-full lg:max-w-xs">
                        {isLoading ? (
                          <BatteryFallback />
                        ) : (
                          <BatteryIllustration
                            percent={liveData.BatteryPercent}
                            temperature={liveData.Temperature}
                            isCharging={chargeMode === 'CHARGING'}
                          />
                        )}
                      </div>

                      {/* Stats Panel */}
                      <div className="flex-1 w-full space-y-4">
                        {/* Status Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs font-medium px-3 py-1.5 transition-all duration-300',
                                chargeMode === 'CHARGING' && 'border-green-500/50 text-green-400 bg-green-500/10',
                                chargeMode === 'DISCHARGING' && 'border-amber-500/50 text-amber-400 bg-amber-500/10',
                                chargeMode === 'IDLE' && 'border-muted text-muted-foreground'
                              )}
                            >
                              {chargeMode === 'CHARGING' && <Zap className="w-3 h-3 mr-1 animate-pulse" />}
                              {chargeMode === 'DISCHARGING' && <ArrowDown className="w-3 h-3 mr-1" />}
                              {chargeMode === 'IDLE' && <Minus className="w-3 h-3 mr-1" />}
                              {chargeMode}
                            </Badge>
                          </motion.div>

                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15 }}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs font-medium px-3 py-1.5 transition-all duration-300',
                                connectionStatus.isConnected
                                  ? 'border-green-500/50 text-green-400'
                                  : 'border-red-500/50 text-red-400'
                              )}
                            >
                              {connectionStatus.isConnected ? (
                                <><Wifi className="w-3 h-3 mr-1" /> Connected</>
                              ) : (
                                <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
                              )}
                            </Badge>
                          </motion.div>
                        </div>

                        {/* Key Metrics Grid */}
                        {calculations && liveData && (
                          <motion.div
                            className="grid grid-cols-2 gap-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <StatCard
                              label="Health"
                              value={calculations.healthScore}
                              unit="%"
                              icon={<Activity className="w-4 h-4" />}
                              color={calculations.healthScore >= 75 ? '#22C55E' : calculations.healthScore >= 50 ? '#F59E0B' : '#EF4444'}
                            />
                            <StatCard
                              label="Efficiency"
                              value={(calculations.efficiency * 100).toFixed(0)}
                              unit="%"
                              icon={<Zap className="w-4 h-4" />}
                              color={calculations.efficiencyLabel === 'Good' ? '#22C55E' : calculations.efficiencyLabel === 'Fair' ? '#F59E0B' : '#EF4444'}
                            />
                            <StatCard
                              label="Energy"
                              value={calculations.remainingWh.toFixed(0)}
                              unit="Wh"
                              icon={<Power className="w-4 h-4" />}
                              color="#3B82F6"
                            />
                            <StatCard
                              label="Time Left"
                              value={calculations.timeTo20Percent ? formatDuration(calculations.timeTo20Percent) : '—'}
                              icon={<Timer className="w-4 h-4" />}
                              color="#8B5CF6"
                            />
                          </motion.div>
                        )}

                        {/* Capacity Progress */}
                        {calculations && liveData && (
                          <motion.div
                            className="space-y-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Remaining Capacity</span>
                              <span className="font-medium tabular-nums">
                                {calculations.remainingCapacityAh.toFixed(1)} / {vehicleProfile.capacityAh} Ah
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: batteryColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${liveData.BatteryPercent}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              {/* Metrics Grid */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-widest pl-1">
                    Live Metrics
                  </h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
                  <MetricCard
                    title="Voltage"
                    value={liveData?.Voltage ?? 0}
                    unit="V"
                    subtitle={liveData && liveData.Voltage < 12 ? 'Sag detected' : 'Nominal'}
                    icon={<Battery className="w-4 h-4" />}
                    color="#3B82F6"
                    delay={0.05}
                    trend={liveData?.Voltage && liveData.Voltage < 12 ? 'down' : undefined}
                  />

                  <MetricCard
                    title="Current"
                    value={liveData?.Current ?? 0}
                    unit="A"
                    subtitle={chargeMode === 'CHARGING' ? 'Charging' : chargeMode === 'DISCHARGING' ? 'Drawing' : 'Idle'}
                    icon={chargeMode === 'CHARGING' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    color={chargeMode === 'CHARGING' ? '#22C55E' : '#F59E0B'}
                    delay={0.1}
                  />

                  <MetricCard
                    title="Power"
                    value={liveData?.Power ?? 0}
                    unit="W"
                    icon={<Zap className="w-4 h-4" />}
                    color="#8B5CF6"
                    delay={0.15}
                  />

                  <MetricCard
                    title="Temperature"
                    value={liveData?.Temperature ?? 0}
                    unit="°C"
                    subtitle={tempZone?.label}
                    icon={<Thermometer className="w-4 h-4" />}
                    color={tempZone?.color}
                    delay={0.2}
                  />

                  <MetricCard
                    title="Battery"
                    value={liveData?.BatteryPercent ?? 0}
                    unit="%"
                    icon={<Fuel className="w-4 h-4" />}
                    color={batteryColor}
                    delay={0.25}
                  />

                  <MetricCard
                    title="Efficiency"
                    value={calculations ? (calculations.efficiency * 100) : 0}
                    unit="%"
                    subtitle={calculations?.efficiencyLabel}
                    icon={<Activity className="w-4 h-4" />}
                    color={
                      calculations?.efficiencyLabel === 'Good' ? '#22C55E' :
                        calculations?.efficiencyLabel === 'Fair' ? '#F59E0B' : '#EF4444'
                    }
                    delay={0.3}
                  />
                </div>
              </section>

              {/* System Info */}
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-card/40 backdrop-blur-md border-border/40 rounded-2xl shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span>{vehicleProfile.nominalVoltage}V System</span>
                        <span className="opacity-50">•</span>
                        <span>{vehicleProfile.capacityAh}Ah</span>
                        <span className="opacity-50">•</span>
                        <span>{vehicleProfile.batteryType.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
                        )} />
                        <span>{connectionStatus.isConnected ? 'Device Online' : 'Device Offline'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            </div>
          </ClientOnly>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
