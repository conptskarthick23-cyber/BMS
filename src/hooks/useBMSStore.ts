import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BMSLiveData,
  BMSHistoryEntry,
  VehicleProfile,
  AlertThreshold,
  AlertEvent,
  AnomalyEvent,
  Session,
  ConnectionStatus
} from '@/types/bms';
import { DEFAULT_THRESHOLDS, DEFAULT_VEHICLE_PROFILE } from '@/constants/thresholds';

interface BMSState {
  // Live Data
  liveData: BMSLiveData | null;
  connectionStatus: ConnectionStatus;
  lastUpdated: number | null;

  // History
  history: BMSHistoryEntry[];

  // Vehicle Profile
  vehicleProfile: VehicleProfile;

  // Alerts
  thresholds: AlertThreshold[];
  activeAlerts: AlertEvent[];
  alertHistory: AlertEvent[];

  // Anomalies
  anomalies: AnomalyEvent[];

  // Sessions
  sessions: Session[];
  currentSession: Session | null;

  // Settings
  theme: 'dark' | 'light' | 'system';
  historyLogInterval: number;
  alertSoundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  temperatureUnit: 'C' | 'F';
  whatsappAlerts: {
    enabled: boolean;
    phone: string;
    apikey: string;
  };
  emailAlerts: {
    enabled: boolean;
    serviceId: string;
    templateId: string;
    publicKey: string;
    userEmail: string;
  };

  // Actions
  setLiveData: (data: BMSLiveData) => void;
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void;
  setLastUpdated: (timestamp: number) => void;
  addHistoryEntry: (entry: BMSHistoryEntry) => void;
  setHistory: (history: BMSHistoryEntry[]) => void;
  setVehicleProfile: (profile: Partial<VehicleProfile>) => void;
  setThresholds: (thresholds: AlertThreshold[]) => void;
  updateThreshold: (id: string, updates: Partial<AlertThreshold>) => void;
  addActiveAlert: (alert: AlertEvent) => void;
  removeActiveAlert: (id: string) => void;
  addAlertHistory: (alert: AlertEvent) => void;
  addAnomaly: (anomaly: AnomalyEvent) => void;
  dismissAnomaly: (id: string) => void;
  setSessions: (sessions: Session[]) => void;
  setCurrentSession: (session: Session | null) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setHistoryLogInterval: (interval: number) => void;
  setAlertSoundEnabled: (enabled: boolean) => void;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  setTemperatureUnit: (unit: 'C' | 'F') => void;
  updateWhatsappAlerts: (config: Partial<BMSState['whatsappAlerts']>) => void;
  updateEmailAlerts: (config: Partial<BMSState['emailAlerts']>) => void;
  clearHistory: () => void;
  resetThresholds: () => void;
}

export const useBMSStore = create<BMSState>()(
  persist(
    (set, get) => ({
      // Initial State
      liveData: null,
      connectionStatus: {
        isConnected: false,
        lastConnected: null,
        lastDisconnected: null,
      },
      lastUpdated: null,
      history: [],
      vehicleProfile: DEFAULT_VEHICLE_PROFILE,
      thresholds: DEFAULT_THRESHOLDS,
      activeAlerts: [],
      alertHistory: [],
      anomalies: [],
      sessions: [],
      currentSession: null,
      theme: 'system',
      historyLogInterval: 60,
      alertSoundEnabled: true,
      browserNotificationsEnabled: false,
      temperatureUnit: 'C',
      whatsappAlerts: { enabled: false, phone: '', apikey: '' },
      emailAlerts: {
        enabled: false,
        serviceId: 'service_prqnjm5',
        templateId: 'template_4tciuxb',
        publicKey: 'O-YM89443d0x8K5SO',
        userEmail: ''
      },

      // Actions
      setLiveData: (data) => set({ liveData: data }),

      setConnectionStatus: (status) => set((state) => ({
        connectionStatus: { ...state.connectionStatus, ...status },
      })),

      setLastUpdated: (timestamp) => set({ lastUpdated: timestamp }),

      addHistoryEntry: (entry) => set((state) => ({
        history: [entry, ...state.history].slice(0, 10000), // Keep last 10k entries
      })),

      setHistory: (history) => set({ history }),

      setVehicleProfile: (profile) => set((state) => ({
        vehicleProfile: { ...state.vehicleProfile, ...profile },
      })),

      setThresholds: (thresholds) => set({ thresholds }),

      updateThreshold: (id, updates) => set((state) => ({
        thresholds: state.thresholds.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),

      addActiveAlert: (alert) => set((state) => ({
        activeAlerts: [...state.activeAlerts, alert],
      })),

      removeActiveAlert: (id) => set((state) => ({
        activeAlerts: state.activeAlerts.filter((a) => a.id !== id),
      })),

      addAlertHistory: (alert) => set((state) => ({
        alertHistory: [alert, ...state.alertHistory].slice(0, 1000),
      })),

      addAnomaly: (anomaly) => set((state) => ({
        anomalies: [anomaly, ...state.anomalies].slice(0, 50),
      })),

      dismissAnomaly: (id) => set((state) => ({
        anomalies: state.anomalies.map((a) =>
          a.id === id ? { ...a, dismissed: true } : a
        ),
      })),

      setSessions: (sessions) => set({ sessions }),

      setCurrentSession: (session) => set({ currentSession: session }),

      setTheme: (theme) => set({ theme }),

      setHistoryLogInterval: (interval) => set({ historyLogInterval: interval }),

      setAlertSoundEnabled: (enabled) => set({ alertSoundEnabled: enabled }),

      setBrowserNotificationsEnabled: (enabled) => set({ browserNotificationsEnabled: enabled }),

      setTemperatureUnit: (unit) => set({ temperatureUnit: unit }),

      updateWhatsappAlerts: (config) => set((state) => ({
        whatsappAlerts: { ...state.whatsappAlerts, ...config }
      })),

      updateEmailAlerts: (config) => set((state) => ({
        emailAlerts: { ...state.emailAlerts, ...config }
      })),

      clearHistory: () => set({ history: [], alertHistory: [] }),

      resetThresholds: () => set({ thresholds: DEFAULT_THRESHOLDS }),
    }),
    {
      name: 'bms-storage',
      partialize: (state) => ({
        vehicleProfile: state.vehicleProfile,
        thresholds: state.thresholds,
        theme: state.theme,
        historyLogInterval: state.historyLogInterval,
        alertSoundEnabled: state.alertSoundEnabled,
        browserNotificationsEnabled: state.browserNotificationsEnabled,
        temperatureUnit: state.temperatureUnit,
        whatsappAlerts: state.whatsappAlerts,
        emailAlerts: state.emailAlerts,
      }),
    }
  )
);
