import type { BMSLiveData, Calculations, VehicleProfile, Session } from '@/types/bms';
import { DEFAULT_VEHICLE_PROFILE, TEMPERATURE_ZONES } from '@/constants/thresholds';

/**
 * Calculate remaining energy in Watt-hours
 * Formula: (BatteryPercent/100) × CapacityAh × Voltage
 */
export function calculateRemainingWh(
  batteryPercent: number,
  capacityAh: number,
  voltage: number
): number {
  return (batteryPercent / 100) * capacityAh * voltage;
}

/**
 * Calculate remaining capacity in Amp-hours
 * Formula: (BatteryPercent/100) × CapacityAh
 */
export function calculateRemainingCapacityAh(
  batteryPercent: number,
  capacityAh: number
): number {
  return (batteryPercent / 100) * capacityAh;
}

/**
 * Calculate time to reach a specific battery threshold in minutes
 * Formula: ((BatteryPercent - threshold)/100 × CapacityAh) / |Current| × 60
 */
export function calculateTimeToThreshold(
  batteryPercent: number,
  threshold: number,
  capacityAh: number,
  current: number
): number | null {
  if (Math.abs(current) < 0.01) return null;

  const remainingToThreshold = ((batteryPercent - threshold) / 100) * capacityAh;
  if (remainingToThreshold <= 0) return 0;

  // For discharging, current is positive; for charging, current is negative
  const effectiveCurrent = current > 0 ? current : Math.abs(current);
  const timeMinutes = (remainingToThreshold / effectiveCurrent) * 60;

  return Math.max(0, timeMinutes);
}

/**
 * Calculate estimated charge time in minutes
 * Formula: ((100 - BatteryPercent)/100 × CapacityAh) / chargeCurrent × 60
 */
export function calculateChargeTime(
  batteryPercent: number,
  capacityAh: number
): number {
  const chargeCurrent = capacityAh * 0.5; // 0.5C charge rate
  const remainingToCharge = ((100 - batteryPercent) / 100) * capacityAh;
  return (remainingToCharge / chargeCurrent) * 60;
}

/**
 * Detect charge mode based on current
 * Current < -0.1 → CHARGING
 * Current > 0.1 → DISCHARGING
 * else → IDLE
 */
export function detectChargeMode(current: number): 'CHARGING' | 'DISCHARGING' | 'IDLE' {
  if (current < -0.1) return 'CHARGING';
  if (current > 0.1) return 'DISCHARGING';
  return 'IDLE';
}

/**
 * Calculate efficiency ratio
 * Formula: (Voltage × Current) / Power
 * > 0.95 → Good | > 0.85 → Fair | else → Poor
 */
export function calculateEfficiency(
  voltage: number,
  current: number,
  power: number
): { ratio: number; label: 'Good' | 'Fair' | 'Poor' } {
  if (power <= 0) return { ratio: 0, label: 'Poor' };

  const calculatedPower = voltage * Math.abs(current);
  const ratio = calculatedPower / power;

  let label: 'Good' | 'Fair' | 'Poor';
  if (ratio > 0.95) label = 'Good';
  else if (ratio > 0.85) label = 'Fair';
  else label = 'Poor';

  return { ratio: Math.min(ratio, 1), label };
}

/**
 * Calculate battery health score (0-100) purely from real-time metrics
 * Formula: (batteryScore × 0.2) + (tempScore × 0.4) + (efficiencyScore × 0.4)
 */
export function calculateHealthScore(
  batteryPercent: number,
  temperature: number,
  efficiency: number
): number {
  // Battery percentage score (20% weight)
  // Mild penalty at extreme ends (<20% or >80%)
  let batteryScore = 100;
  if (batteryPercent < 20) batteryScore = 70 + (batteryPercent * 1.5);
  else if (batteryPercent > 80) batteryScore = 100 - ((batteryPercent - 80) * 1.5);

  // Temperature score (40% weight)
  let tempScore: number;
  if (temperature > 50) tempScore = 30;
  else if (temperature > 45) tempScore = 55;
  else if (temperature > 40) tempScore = 75;
  else if (temperature < 15) tempScore = 65;
  else tempScore = 100;

  // Efficiency score (40% weight)
  const efficiencyScore = Math.min(100, efficiency * 100);

  // Weighted average
  const healthScore = (batteryScore * 0.2) + (tempScore * 0.4) + (efficiencyScore * 0.4);

  return Math.round(Math.min(100, Math.max(0, healthScore)));
}

/**
 * Get health score label
 */
export function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: '#22C55E' };
  if (score >= 75) return { label: 'Good', color: '#22C55E' };
  if (score >= 55) return { label: 'Fair', color: '#F59E0B' };
  if (score >= 35) return { label: 'Poor', color: '#F97316' };
  return { label: 'Critical', color: '#EF4444' };
}

/**
 * Calculate temperature trend (°C/min) from historical data
 */
export function calculateTempTrend(
  currentTemp: number,
  historicalTemps: Array<{ temp: number; timestamp: number }>
): { ratePerMin: number; minsToWarning: number | null } {
  if (historicalTemps.length < 2) {
    return { ratePerMin: 0, minsToWarning: null };
  }

  // Get temperature from 5 minutes ago
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;
  const oldReading = historicalTemps.find(h => h.timestamp <= fiveMinAgo);

  if (!oldReading) {
    return { ratePerMin: 0, minsToWarning: null };
  }

  const timeDiffMin = (now - oldReading.timestamp) / 60000;
  const tempDiff = currentTemp - oldReading.temp;
  const ratePerMin = tempDiff / timeDiffMin;

  // Calculate time to reach warning zone (45°C)
  let minsToWarning: number | null = null;
  if (ratePerMin > 0 && currentTemp < 45) {
    minsToWarning = (45 - currentTemp) / ratePerMin;
  }

  return { ratePerMin, minsToWarning };
}

/**
 * Get temperature zone info
 */
export function getTemperatureZone(temp: number): { label: string; color: string } {
  if (temp < TEMPERATURE_ZONES.cool.max) {
    return { label: TEMPERATURE_ZONES.cool.label, color: TEMPERATURE_ZONES.cool.color };
  }
  if (temp < TEMPERATURE_ZONES.normal.max) {
    return { label: TEMPERATURE_ZONES.normal.label, color: TEMPERATURE_ZONES.normal.color };
  }
  if (temp < TEMPERATURE_ZONES.warm.max) {
    return { label: TEMPERATURE_ZONES.warm.label, color: TEMPERATURE_ZONES.warm.color };
  }
  if (temp < TEMPERATURE_ZONES.hot.max) {
    return { label: TEMPERATURE_ZONES.hot.label, color: TEMPERATURE_ZONES.hot.color };
  }
  return { label: TEMPERATURE_ZONES.danger.label, color: TEMPERATURE_ZONES.danger.color };
}

/**
 * Get battery color based on percentage
 */
export function getBatteryColor(percent: number): string {
  if (percent > 60) return '#22C55E';
  if (percent > 20) return '#F59E0B';
  return '#EF4444';
}

/**
 * Calculate all derived values from BMS data
 */
export function calculateAll(
  data: BMSLiveData,
  profile: VehicleProfile = DEFAULT_VEHICLE_PROFILE,
  historicalTemps?: Array<{ temp: number; timestamp: number }>
): Calculations {
  const efficiency = calculateEfficiency(data.Voltage, data.Current, data.Power);
  const chargeMode = detectChargeMode(data.Current);

  const remainingWh = calculateRemainingWh(
    data.BatteryPercent,
    profile.capacityAh,
    data.Voltage
  );

  const remainingCapacityAh = calculateRemainingCapacityAh(
    data.BatteryPercent,
    profile.capacityAh
  );

  const healthScore = calculateHealthScore(
    data.BatteryPercent,
    data.Temperature,
    efficiency.ratio
  );

  // Time calculations (only when discharging)
  const timeTo20Percent = chargeMode === 'DISCHARGING'
    ? calculateTimeToThreshold(data.BatteryPercent, 20, profile.capacityAh, data.Current)
    : null;

  const timeTo10Percent = chargeMode === 'DISCHARGING'
    ? calculateTimeToThreshold(data.BatteryPercent, 10, profile.capacityAh, data.Current)
    : null;

  const timeToEmpty = chargeMode === 'DISCHARGING'
    ? calculateTimeToThreshold(data.BatteryPercent, 0, profile.capacityAh, data.Current)
    : null;

  const estimatedChargeTime = chargeMode === 'CHARGING'
    ? calculateChargeTime(data.BatteryPercent, profile.capacityAh)
    : null;

  // Temperature trend
  const tempTrend = historicalTemps
    ? calculateTempTrend(data.Temperature, historicalTemps)
    : { ratePerMin: 0, minsToWarning: null };

  return {
    remainingWh,
    remainingCapacityAh,
    healthScore,
    chargeMode,
    efficiency: efficiency.ratio,
    efficiencyLabel: efficiency.label,
    timeTo20Percent,
    timeTo10Percent,
    timeToEmpty,
    estimatedChargeTime,
    tempRiseRate: tempTrend.ratePerMin,
    minsToWarning: tempTrend.minsToWarning,
  };
}

/**
 * Detect sessions from history data
 * Session starts when Current > 0.5A sustained for 30s
 * Session ends when Status = DISCONNECTED or Current ≈ 0
 */
export function detectSessions(history: Array<BMSLiveData & { timestamp: number }>): Session[] {
  const sessions: Session[] = [];
  let currentSession: Partial<Session> | null = null;
  let sustainedCurrentStart: number | null = null;

  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedHistory.length; i++) {
    const entry = sortedHistory[i];
    const prevEntry = sortedHistory[i - 1];

    // Check for session start (Current > 0.5A sustained for 30s)
    if (!currentSession && entry.Current > 0.5) {
      if (!sustainedCurrentStart) {
        sustainedCurrentStart = entry.timestamp;
      } else if (entry.timestamp - sustainedCurrentStart >= 30000) {
        // Start a new session
        currentSession = {
          id: `session-${sustainedCurrentStart}`,
          startTime: sustainedCurrentStart,
          startBatteryPercent: entry.BatteryPercent,
          peakTemp: entry.Temperature,
          peakCurrent: entry.Current,
          whUsed: 0,
        };
        sustainedCurrentStart = null;
      }
    } else {
      sustainedCurrentStart = null;
    }

    // Update session stats
    if (currentSession) {
      currentSession.peakTemp = Math.max(currentSession.peakTemp || 0, entry.Temperature);
      currentSession.peakCurrent = Math.max(currentSession.peakCurrent || 0, entry.Current);

      // Add energy consumption
      if (prevEntry) {
        const timeDiffHours = (entry.timestamp - prevEntry.timestamp) / 3600000;
        currentSession.whUsed = (currentSession.whUsed || 0) + (entry.Power * timeDiffHours);
      }

      // Check for session end
      if (entry.Status === 'DISCONNECTED' || Math.abs(entry.Current) < 0.1) {
        currentSession.endTime = entry.timestamp;
        currentSession.endBatteryPercent = entry.BatteryPercent;
        currentSession.duration = (currentSession.endTime - (currentSession.startTime || 0)) / 1000;

        sessions.push(currentSession as Session);
        currentSession = null;
      }
    }
  }

  // Add ongoing session if exists
  if (currentSession) {
    currentSession.endTime = null;
    currentSession.endBatteryPercent = null;
    currentSession.duration = (Date.now() - (currentSession.startTime || 0)) / 1000;
    sessions.push(currentSession as Session);
  }

  return sessions;
}

/**
 * Linear regression for degradation forecast
 */
export function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  if (points.length < 2) return { slope: 0, intercept: 0 };

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Format time ago
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
