'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { limitToLast, onValue, orderByKey, query, ref, set } from 'firebase/database';
import { useShallow } from 'zustand/react/shallow';
import { database } from '@/lib/firebase';
import { useBMSStore } from './useBMSStore';
import { calculateAll, detectChargeMode } from '@/utils/calculations';
import { checkAllThresholds, detectAnomalies } from '@/utils/alertRules';
import type { BMSHistoryEntry, BMSLiveData } from '@/types/bms';

const LEADER_KEY = 'bms-leader';
const LEADER_TIMEOUT = 10000;
const STALE_THRESHOLD_MS = 15000;
const HISTORY_SYNC_LIMIT = 500;

function getTabId(): string {
  if (typeof window === 'undefined') return '';

  let tabId = sessionStorage.getItem('tab-id');
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem('tab-id', tabId);
  }
  return tabId;
}

function electLeader(): boolean {
  if (typeof window === 'undefined') return false;

  const tabId = getTabId();
  const rawLeaderData = localStorage.getItem(LEADER_KEY);

  if (rawLeaderData) {
    try {
      const leaderData = JSON.parse(rawLeaderData) as { id?: string; timestamp?: number };
      if (
        leaderData.id &&
        leaderData.timestamp &&
        Date.now() - leaderData.timestamp < LEADER_TIMEOUT &&
        leaderData.id !== tabId
      ) {
        return false;
      }
    } catch {
      // Ignore malformed localStorage and overwrite below.
    }
  }

  localStorage.setItem(
    LEADER_KEY,
    JSON.stringify({
      id: tabId,
      timestamp: Date.now(),
    })
  );

  return true;
}

function normalizeStatus(rawStatus: unknown, current: number): BMSLiveData['Status'] {
  if (
    rawStatus === 'CONNECTED' ||
    rawStatus === 'DISCONNECTED' ||
    rawStatus === 'CHARGING' ||
    rawStatus === 'DISCHARGING'
  ) {
    return rawStatus;
  }

  const mode = detectChargeMode(current);
  if (mode === 'CHARGING') return 'CHARGING';
  if (mode === 'DISCHARGING') return 'DISCHARGING';
  return 'CONNECTED';
}

function parseHistorySnapshot(
  rawHistory: Record<string, Partial<BMSHistoryEntry>> | null,
  profile: ReturnType<typeof useBMSStore.getState>['vehicleProfile']
): BMSHistoryEntry[] {
  if (!rawHistory) return [];

  return Object.entries(rawHistory)
    .map(([key, raw]) => {
      const recordedAt = Number(raw.recordedAt ?? key ?? Date.now());
      // Support both ESP32 snake_case and legacy PascalCase field names
      const voltage = Number((raw as any).voltage_V ?? raw.Voltage ?? 0);
      const current = Number((raw as any).current_A ?? raw.Current ?? 0);
      const power = Number((raw as any).power_W ?? raw.Power ?? 0);
      const temperature = Number((raw as any).batt_temp_C ?? raw.Temperature ?? 0);
      const batteryPercent = Number((raw as any).batt_pct ?? raw.BatteryPercent ?? 0);
      const status = normalizeStatus(raw.Status ?? (raw as any).volt_condition, current);

      const normalizedLiveData: BMSLiveData = {
        Voltage: voltage,
        Current: current,
        Power: power,
        Temperature: temperature,
        BatteryPercent: batteryPercent,
        Status: status,
        timestamp: recordedAt,
        kmLeft: Number((raw as any).km_left ?? 0),
        energyLeftWh: Number((raw as any).energy_left_Wh ?? 0),
        uptimeSeconds: Number((raw as any).uptime_s ?? 0),
      };

      const hasHealthScore = typeof raw.healthScore === 'number';
      const hasEfficiency = typeof raw.efficiency === 'number';
      const derived =
        hasHealthScore && hasEfficiency ? null : calculateAll(normalizedLiveData, profile);

      return {
        id: String(key),
        recordedAt,
        ...normalizedLiveData,
        healthScore: hasHealthScore ? raw.healthScore : derived?.healthScore ?? 0,
        efficiency: hasEfficiency ? raw.efficiency : derived?.efficiency ?? 0,
      } satisfies BMSHistoryEntry;
    })
    .sort((a, b) => b.recordedAt - a.recordedAt);
}

export function useBMSData() {
  const liveData = useBMSStore((state) => state.liveData);
  const connectionStatus = useBMSStore((state) => state.connectionStatus);
  const lastUpdated = useBMSStore((state) => state.lastUpdated);
  const vehicleProfile = useBMSStore((state) => state.vehicleProfile);
  const setLiveData = useBMSStore((state) => state.setLiveData);
  const setConnectionStatus = useBMSStore((state) => state.setConnectionStatus);
  const setLastUpdated = useBMSStore((state) => state.setLastUpdated);
  const setHistory = useBMSStore((state) => state.setHistory);
  const addActiveAlert = useBMSStore((state) => state.addActiveAlert);
  const removeActiveAlert = useBMSStore((state) => state.removeActiveAlert);
  const addAlertHistory = useBMSStore((state) => state.addAlertHistory);
  const addAnomaly = useBMSStore((state) => state.addAnomaly);

  const lastHistoryWrite = useRef<number>(0);
  const previousData = useRef<BMSLiveData | null>(null);
  const rollingAverage = useRef({ current: 0, efficiency: 0, count: 0 });
  const leaderCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const isLeaderRef = useRef(false);
  const [isLeader, setIsLeader] = useState(false);

  const checkAlerts = useCallback(
    (data: BMSLiveData) => {
      const { thresholds, activeAlerts } = useBMSStore.getState();
      const newAlerts = checkAllThresholds(data, thresholds);

      for (const alert of newAlerts) {
        const existingAlert = activeAlerts.find((active) => active.alertId === alert.alertId);
        if (!existingAlert) {
          addActiveAlert(alert);
          addAlertHistory(alert);

          // --- Trigger External Notifications ---
          const { whatsappAlerts, emailAlerts, alertSoundEnabled, browserNotificationsEnabled } = useBMSStore.getState();
          const title = `🚨 BMS Alert: ${alert.alertId}`;
          const message = `Threshold exceeded: ${alert.alertName} is ${alert.value} (Limit: ${alert.threshold})`;

          // WhatsApp (CallMeBot)
          if (whatsappAlerts?.enabled && whatsappAlerts.phone && whatsappAlerts.apikey) {
            import('@/utils/notifications').then(({ sendWhatsAppAlert }) => {
              sendWhatsAppAlert(whatsappAlerts.phone, whatsappAlerts.apikey, `${title}\n${message}`)
                .catch(() => { /* background notification — silently ignore */ });
            });
          }

          // Email (EmailJS)
          if (emailAlerts?.enabled && emailAlerts.serviceId && emailAlerts.templateId && emailAlerts.publicKey && emailAlerts.userEmail) {
            import('@/utils/notifications').then(({ sendEmailAlert }) => {
              sendEmailAlert(
                emailAlerts.serviceId,
                emailAlerts.templateId,
                emailAlerts.publicKey,
                emailAlerts.userEmail,
                title,
                message
              ).catch(() => { /* background notification — silently ignore */ });
            }).catch(() => { /* silently ignore import errors */ });
          }

          // Alert Sound (Web Audio API — no sound file needed)
          if (alertSoundEnabled && typeof window !== 'undefined') {
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              // Resume suspended context (browsers require user interaction first)
              if (ctx.state === 'suspended') {
                ctx.resume();
              }
              const beepCount = alert.level === 'critical' ? 3 : 2;
              const freq = alert.level === 'critical' ? 880 : 660;
              const totalDuration = (beepCount - 1) * 0.3 + 0.2;

              for (let i = 0; i < beepCount; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';

                const start = ctx.currentTime + i * 0.3;
                // Smooth envelope to avoid audio clicks
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
                gain.gain.setValueAtTime(0.4, start + 0.15);
                gain.gain.linearRampToValueAtTime(0, start + 0.2);

                osc.start(start);
                osc.stop(start + 0.2);
              }

              // Close context after playback to free resources
              setTimeout(() => { ctx.close().catch(() => {}); }, (totalDuration + 0.5) * 1000);
            } catch { /* audio not available */ }
          }

          // Browser Desktop Notification
          if (browserNotificationsEnabled && typeof window !== 'undefined') {
            import('@/utils/notifications').then(({ sendBrowserNotification }) => {
              sendBrowserNotification(title, message);
            }).catch(() => { /* silently ignore */ });
          }
          // ------------------------------------
        }
      }

      for (const activeAlert of activeAlerts) {
        const stillActive = newAlerts.find((alert) => alert.alertId === activeAlert.alertId);
        if (!stillActive) {
          removeActiveAlert(activeAlert.id);
          addAlertHistory({
            ...activeAlert,
            level: 'resolved',
            duration: Date.now() - activeAlert.timestamp,
          });
        }
      }
    },
    [addActiveAlert, addAlertHistory, removeActiveAlert]
  );

  const writeToHistory = useCallback((data: BMSLiveData) => {
    if (!isLeaderRef.current) return;

    const { historyLogInterval, vehicleProfile: profile } = useBMSStore.getState();
    const now = Date.now();

    if (now - lastHistoryWrite.current < historyLogInterval * 1000) return;
    lastHistoryWrite.current = now;

    const calculations = calculateAll(data, profile);
    const historyRef = ref(database, `scooter/history/${now}`);

    set(historyRef, {
      ...data,
      recordedAt: now,
      healthScore: calculations.healthScore,
      efficiency: calculations.efficiency,
    }).catch(console.error);
  }, []);

  const checkAnomalies = useCallback(
    (data: BMSLiveData) => {
      const newAnomalies = detectAnomalies(
        data,
        previousData.current,
        rollingAverage.current.count > 5 ? rollingAverage.current : null
      );

      const { anomalies } = useBMSStore.getState();
      for (const anomaly of newAnomalies) {
        if (anomaly.type === 'all-clear') {
          const lastAnomaly = anomalies[0];
          if (lastAnomaly?.type === 'all-clear') continue;
        }
        addAnomaly(anomaly);
      }

      const count = rollingAverage.current.count + 1;
      const alpha = 0.1;
      rollingAverage.current = {
        current: rollingAverage.current.current * (1 - alpha) + data.Current * alpha,
        efficiency:
          rollingAverage.current.efficiency * (1 - alpha) +
          (data.Power > 0 ? (data.Voltage * Math.abs(data.Current)) / data.Power : 0) * alpha,
        count,
      };

      previousData.current = data;
    },
    [addAnomaly]
  );

  useEffect(() => {
    const liveDataRef = ref(database, 'scooter/live');
    const connectedRef = ref(database, '.info/connected');
    const historyQuery = query(
      ref(database, 'scooter/history'),
      orderByKey(),
      limitToLast(HISTORY_SYNC_LIMIT)
    );

    const connectedUnsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = Boolean(snapshot.val());
      const now = Date.now();

      if (connected) {
        setConnectionStatus({ isConnected: true, lastConnected: now });
      } else {
        setConnectionStatus({ isConnected: false, lastDisconnected: now });
      }
    });

    const liveDataUnsubscribe = onValue(liveDataRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const now = Date.now();
      // Map ESP32 snake_case fields to dashboard PascalCase fields
      const current = Number(data.current_A ?? data.Current ?? 0);
      const voltCondition = data.volt_condition ?? data.Status ?? '';
      const bmsData: BMSLiveData = {
        Voltage: Number(data.voltage_V ?? data.Voltage ?? 0),
        Current: current,
        Power: Number(data.power_W ?? data.Power ?? 0),
        Temperature: Number(data.batt_temp_C ?? data.Temperature ?? 0),
        BatteryPercent: Number(data.batt_pct ?? data.BatteryPercent ?? 0),
        Status: normalizeStatus(voltCondition, current),
        timestamp: now,
        kmLeft: Number(data.km_left ?? 0),
        energyLeftWh: Number(data.energy_left_Wh ?? 0),
        uptimeSeconds: Number(data.uptime_s ?? 0),
        voltCondition: data.volt_condition as BMSLiveData['voltCondition'],
        lowVoltage: Boolean(data.low_voltage ?? false),
      };

      // ── Sync real IoT device profile fields from Firebase into vehicleProfile ──
      // Firebase BMS_12V contains: CapacityAh, NominalVoltage, VehicleMake, VehicleModel,
      // ConsumptionWhKm — use them so ALL calculations are based on real data only.
      const profileUpdates: Partial<ReturnType<typeof useBMSStore.getState>['vehicleProfile']> = {};
      if (typeof data.CapacityAh === 'number' && data.CapacityAh > 0) {
        profileUpdates.capacityAh = data.CapacityAh;
      }
      if (typeof data.NominalVoltage === 'number' && data.NominalVoltage > 0) {
        profileUpdates.nominalVoltage = data.NominalVoltage;
        // Derive safe voltage limits from nominal (standard lead-acid / LiFePO4 ranges)
        profileUpdates.fullChargeVoltage = +(data.NominalVoltage * 1.15).toFixed(2); // e.g. 12V → 13.8V
        profileUpdates.minSafeVoltage = +(data.NominalVoltage * 0.875).toFixed(2);   // e.g. 12V → 10.5V
      }
      if (typeof data.VehicleMake === 'string' && data.VehicleMake) {
        profileUpdates.make = data.VehicleMake;
      }
      if (typeof data.VehicleModel === 'string' && data.VehicleModel) {
        profileUpdates.model = data.VehicleModel;
      }
      if (Object.keys(profileUpdates).length > 0) {
        useBMSStore.getState().setVehicleProfile(profileUpdates);
      }

      setLiveData(bmsData);
      setLastUpdated(now);
      setConnectionStatus({ isConnected: true, lastConnected: now });

      checkAlerts(bmsData);
      checkAnomalies(bmsData);
      writeToHistory(bmsData);
    });

    const historyUnsubscribe = onValue(historyQuery, (snapshot) => {
      const parsedHistory = parseHistorySnapshot(
        snapshot.val() as Record<string, Partial<BMSHistoryEntry>> | null,
        useBMSStore.getState().vehicleProfile
      );
      setHistory(parsedHistory);
    });

    const deviceCheckInterval = setInterval(() => {
      const { lastUpdated: updatedAt } = useBMSStore.getState();
      if (updatedAt && Date.now() - updatedAt > STALE_THRESHOLD_MS) {
        setConnectionStatus({
          isConnected: false,
          lastDisconnected: Date.now(),
        });
      }
    }, 5000);

    const syncLeader = () => {
      const leader = electLeader();
      isLeaderRef.current = leader;
      setIsLeader(leader);
    };

    syncLeader();
    leaderCheckInterval.current = setInterval(() => {
      syncLeader();
    }, 5000);

    return () => {
      connectedUnsubscribe();
      liveDataUnsubscribe();
      historyUnsubscribe();
      clearInterval(deviceCheckInterval);
      if (leaderCheckInterval.current) {
        clearInterval(leaderCheckInterval.current);
      }
    };
  }, [checkAlerts, checkAnomalies, setConnectionStatus, setHistory, setLastUpdated, setLiveData, writeToHistory]);

  const calculations = useMemo(
    () => (liveData ? calculateAll(liveData, vehicleProfile) : null),
    [liveData, vehicleProfile]
  );

  return {
    liveData,
    calculations,
    connectionStatus,
    lastUpdated,
    isLeader,
  };
}
