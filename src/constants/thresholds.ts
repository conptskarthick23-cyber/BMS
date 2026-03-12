import type { AlertThreshold } from '@/types/bms';

export const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    id: 'low-battery',
    name: 'Low Battery',
    field: 'BatteryPercent',
    operator: 'lt',
    value: 20,
    level: 'warning',
    enabled: true,
  },
  {
    id: 'critical-battery',
    name: 'Critical Battery',
    field: 'BatteryPercent',
    operator: 'lt',
    value: 10,
    level: 'critical',
    enabled: true,
  },
  {
    id: 'overvoltage',
    name: 'Overvoltage',
    field: 'Voltage',
    operator: 'gt',
    value: 14.4,
    level: 'critical',
    enabled: true,
  },
  {
    id: 'high-voltage',
    name: 'High Voltage',
    field: 'Voltage',
    operator: 'gt',
    value: 13.8,
    level: 'warning',
    enabled: true,
  },
  {
    id: 'undervoltage',
    name: 'Undervoltage',
    field: 'Voltage',
    operator: 'lt',
    value: 11.0,
    level: 'warning',
    enabled: true,
  },
  {
    id: 'critical-undervoltage',
    name: 'Critical Undervoltage',
    field: 'Voltage',
    operator: 'lt',
    value: 10.5,
    level: 'critical',
    enabled: true,
  },
  {
    id: 'overtemperature',
    name: 'Overtemperature',
    field: 'Temperature',
    operator: 'gt',
    value: 50,
    level: 'critical',
    enabled: true,
  },
  {
    id: 'high-temperature',
    name: 'High Temperature',
    field: 'Temperature',
    operator: 'gt',
    value: 45,
    level: 'warning',
    enabled: true,
  },
  {
    id: 'overcurrent',
    name: 'Overcurrent',
    field: 'Current',
    operator: 'gt',
    value: 10,
    level: 'critical',
    enabled: true,
  },
  {
    id: 'device-offline',
    name: 'Device Offline',
    field: 'Status',
    operator: 'neq',
    value: 'CONNECTED' as unknown as number, // Status string comparison
    level: 'warning',
    enabled: true,
  },
];

export const DEFAULT_VEHICLE_PROFILE = {
  make: 'Electric',
  model: 'Vehicle',
  nominalVoltage: 12,
  capacityAh: 7,
  batteryType: 'lifepo4' as const,
  fullChargeVoltage: 14.4,
  minSafeVoltage: 11.0,
  maxSafeTemp: 50,
};

export const BATTERY_COLOR_THRESHOLDS = {
  good: 60, // > 60% = green
  warning: 20, // 20-60% = amber
  critical: 20, // < 20% = red
};

export const TEMPERATURE_ZONES = {
  cool: { max: 20, label: 'Cool', color: '#3B82F6' },
  normal: { max: 40, label: 'Normal', color: '#22C55E' },
  warm: { max: 45, label: 'Warm', color: '#F59E0B' },
  hot: { max: 50, label: 'Hot', color: '#F97316' },
  danger: { max: Infinity, label: 'Danger', color: '#EF4444' },
};

export const HISTORY_LOG_INTERVALS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
];

export const TIME_RANGE_SECONDS: Record<string, number> = {
  '1h': 3600,
  '6h': 21600,
  '24h': 86400,
  '7d': 604800,
  '30d': 2592000,
};
