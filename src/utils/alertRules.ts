import type { BMSLiveData, AlertThreshold, AlertEvent, AnomalyEvent } from '@/types/bms';

/**
 * Check if a threshold is breached
 */
export function checkThreshold(
  data: BMSLiveData,
  threshold: AlertThreshold
): { breached: boolean; value: number | string } {
  const value = data[threshold.field] as number | string;
  const thresholdValue = threshold.value as number | string;
  
  let breached = false;
  switch (threshold.operator) {
    case 'gt':
      breached = (value as number) > (thresholdValue as number);
      break;
    case 'lt':
      breached = (value as number) < (thresholdValue as number);
      break;
    case 'eq':
      breached = value === thresholdValue;
      break;
    case 'neq':
      breached = value !== thresholdValue;
      break;
  }
  
  return { breached, value };
}

/**
 * Check all thresholds and return active alerts
 */
export function checkAllThresholds(
  data: BMSLiveData,
  thresholds: AlertThreshold[]
): AlertEvent[] {
  const alerts: AlertEvent[] = [];
  
  for (const threshold of thresholds) {
    if (!threshold.enabled) continue;
    
    const { breached, value } = checkThreshold(data, threshold);
    
    if (breached) {
      alerts.push({
        id: `${threshold.id}-${Date.now()}`,
        alertId: threshold.id,
        alertName: threshold.name,
        value,
        threshold: threshold.value,
        level: threshold.level,
        timestamp: Date.now(),
      });
    }
  }
  
  return alerts;
}

/**
 * Detect anomalies from data changes
 */
export function detectAnomalies(
  currentData: BMSLiveData,
  previousData: BMSLiveData | null,
  rollingAverages: { current: number; efficiency: number } | null
): AnomalyEvent[] {
  const anomalies: AnomalyEvent[] = [];
  const now = Date.now();
  
  if (!previousData) {
    anomalies.push({
      id: `all-clear-${now}`,
      type: 'all-clear',
      message: 'All systems normal',
      timestamp: now,
      dismissed: false,
    });
    return anomalies;
  }
  
  const timeDiff = (now - (previousData.timestamp || now)) / 1000; // seconds
  
  // Voltage drop > 0.5V in < 2 min
  const voltageDrop = previousData.Voltage - currentData.Voltage;
  if (voltageDrop > 0.5 && timeDiff < 120) {
    anomalies.push({
      id: `voltage-drop-${now}`,
      type: 'voltage-drop',
      message: `Sudden voltage drop of ${voltageDrop.toFixed(2)}V detected`,
      timestamp: now,
      dismissed: false,
    });
  }
  
  // Temperature spike > 5°C in < 5 min
  const tempSpike = currentData.Temperature - previousData.Temperature;
  if (tempSpike > 5 && timeDiff < 300) {
    anomalies.push({
      id: `temp-spike-${now}`,
      type: 'temp-spike',
      message: `Temperature spike of ${tempSpike.toFixed(1)}°C detected`,
      timestamp: now,
      dismissed: false,
    });
  }
  
  // Current > 2× rolling average
  if (rollingAverages && currentData.Current > rollingAverages.current * 2) {
    anomalies.push({
      id: `high-current-${now}`,
      type: 'high-current',
      message: `High current draw: ${currentData.Current.toFixed(2)}A (${(currentData.Current / rollingAverages.current).toFixed(1)}× average)`,
      timestamp: now,
      dismissed: false,
    });
  }
  
  // BatteryPercent drops > 5% in < 2 min
  const batteryDrop = previousData.BatteryPercent - currentData.BatteryPercent;
  if (batteryDrop > 5 && timeDiff < 120) {
    anomalies.push({
      id: `rapid-drain-${now}`,
      type: 'rapid-drain',
      message: `Rapid battery drain: ${batteryDrop.toFixed(1)}% in ${Math.round(timeDiff)}s`,
      timestamp: now,
      dismissed: false,
    });
  }
  
  // Device offline
  if (currentData.Status === 'DISCONNECTED' && previousData.Status !== 'DISCONNECTED') {
    anomalies.push({
      id: `offline-${now}`,
      type: 'offline',
      message: 'Device went offline',
      timestamp: now,
      dismissed: false,
    });
  }
  
  // Efficiency anomaly (V×I vs Power deviation > 10%)
  if (currentData.Power > 0) {
    const calculatedPower = currentData.Voltage * Math.abs(currentData.Current);
    const deviation = Math.abs(calculatedPower - currentData.Power) / currentData.Power;
    if (deviation > 0.1) {
      anomalies.push({
        id: `efficiency-anomaly-${now}`,
        type: 'efficiency-anomaly',
        message: `Efficiency anomaly: ${(deviation * 100).toFixed(1)}% deviation detected`,
        timestamp: now,
        dismissed: false,
      });
    }
  }
  
  // If no anomalies, add all-clear
  if (anomalies.length === 0) {
    anomalies.push({
      id: `all-clear-${now}`,
      type: 'all-clear',
      message: 'All systems normal',
      timestamp: now,
      dismissed: false,
    });
  }
  
  return anomalies;
}

/**
 * Get charge recommendation
 */
export function getChargeRecommendation(
  batteryPercent: number,
  temperature: number,
  healthScore: number,
  chargeMode: 'CHARGING' | 'DISCHARGING' | 'IDLE'
): { message: string; type: 'good' | 'warning' | 'critical' | 'charging' } {
  if (chargeMode === 'CHARGING') {
    return {
      message: 'Currently charging',
      type: 'charging',
    };
  }
  
  if (temperature > 45) {
    const waitTime = Math.ceil((temperature - 40) * 2);
    return {
      message: `Avoid charging now — ${temperature}°C is too hot, wait ${waitTime} min to cool`,
      type: 'warning',
    };
  }
  
  if (batteryPercent < 20) {
    return {
      message: 'Charge soon — battery below 20%',
      type: 'critical',
    };
  }
  
  if (batteryPercent < 40 && healthScore < 70) {
    return {
      message: 'Consider charging — battery health is declining',
      type: 'warning',
    };
  }
  
  if (batteryPercent > 80 && temperature < 35) {
    return {
      message: 'Battery is in good condition — no need to charge now',
      type: 'good',
    };
  }
  
  return {
    message: 'Good time to charge if needed — battery is cool and healthy',
    type: 'good',
  };
}
