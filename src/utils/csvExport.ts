import type { BMSHistoryEntry } from '@/types/bms';

/**
 * Export history data to CSV
 */
export function exportToCSV(data: BMSHistoryEntry[], filename: string = 'bms-history'): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }
  
  const headers = [
    'Timestamp',
    'Date',
    'Time',
    'Voltage (V)',
    'Current (A)',
    'Power (W)',
    'Temperature (°C)',
    'Battery (%)',
    'Status',
    'Health Score',
    'Efficiency',
  ];
  
  const rows = data.map(entry => {
    const date = new Date(entry.recordedAt);
    return [
      entry.recordedAt,
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      entry.Voltage.toFixed(2),
      entry.Current.toFixed(2),
      entry.Power.toFixed(2),
      entry.Temperature.toFixed(1),
      entry.BatteryPercent.toFixed(1),
      entry.Status,
      entry.healthScore?.toFixed(1) || '',
      entry.efficiency?.toFixed(3) || '',
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export session data to CSV
 */
export function exportSessionsToCSV(
  sessions: Array<{
    id: string;
    startTime: number;
    endTime: number | null;
    duration: number;
    whUsed: number;
    peakTemp: number;
    peakCurrent: number;
    avgEfficiency: number;
  }>,
  filename: string = 'bms-sessions'
): void {
  if (sessions.length === 0) {
    console.warn('No sessions to export');
    return;
  }
  
  const headers = [
    'Session ID',
    'Start Time',
    'End Time',
    'Duration (min)',
    'Energy Used (Wh)',
    'Peak Temp (°C)',
    'Peak Current (A)',
    'Avg Efficiency',
  ];
  
  const rows = sessions.map(session => [
    session.id,
    new Date(session.startTime).toLocaleString(),
    session.endTime ? new Date(session.endTime).toLocaleString() : 'Ongoing',
    (session.duration / 60).toFixed(1),
    session.whUsed.toFixed(2),
    session.peakTemp.toFixed(1),
    session.peakCurrent.toFixed(2),
    session.avgEfficiency.toFixed(3),
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
