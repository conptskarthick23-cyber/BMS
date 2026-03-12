// BMS Data Types
export interface BMSLiveData {
  Voltage: number;
  Current: number;
  Power: number;
  Temperature: number;
  BatteryPercent: number;
  Status: 'CONNECTED' | 'DISCONNECTED' | 'CHARGING' | 'DISCHARGING';
  timestamp?: number;
}

export interface BMSHistoryEntry extends BMSLiveData {
  id: string;
  recordedAt: number;
  healthScore?: number;
  efficiency?: number;
}

export interface VehicleProfile {
  make: string;
  model: string;
  nominalVoltage: number;
  capacityAh: number;
  batteryType: 'lead-acid' | 'lifepo4' | 'li-ion' | 'nimh';
  fullChargeVoltage: number;
  minSafeVoltage: number;
  maxSafeTemp: number;
}

export interface AlertThreshold {
  id: string;
  name: string;
  field: keyof BMSLiveData;
  operator: 'gt' | 'lt' | 'eq' | 'neq';
  value: number | string;
  level: 'warning' | 'critical';
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  alertName: string;
  value: number | string;
  threshold: number | string;
  level: 'warning' | 'critical' | 'resolved';
  timestamp: number;
  duration?: number;
}

export interface Calculations {
  remainingWh: number;
  remainingCapacityAh: number;
  healthScore: number;
  chargeMode: 'CHARGING' | 'DISCHARGING' | 'IDLE';
  efficiency: number;
  efficiencyLabel: 'Good' | 'Fair' | 'Poor';
  timeTo20Percent: number | null;
  timeTo10Percent: number | null;
  timeToEmpty: number | null;
  estimatedChargeTime: number | null;
  tempRiseRate: number;
  minsToWarning: number | null;
}

export interface Session {
  id: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  whUsed: number;
  peakTemp: number;
  peakCurrent: number;
  avgEfficiency: number;
  startBatteryPercent: number;
  endBatteryPercent: number | null;
}

export interface AnomalyEvent {
  id: string;
  type: 'voltage-drop' | 'temp-spike' | 'high-current' | 'rapid-drain' | 'offline' | 'efficiency-anomaly' | 'all-clear';
  message: string;
  timestamp: number;
  dismissed: boolean;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastConnected: number | null;
  lastDisconnected: number | null;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  [key: string]: number;
}
