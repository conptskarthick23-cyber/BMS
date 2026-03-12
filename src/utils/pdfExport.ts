import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BMSHistoryEntry } from '@/types/bms';

/**
 * Generate a professional PDF report from BMS history data
 */
export function exportToPDF(data: BMSHistoryEntry[], vehicleProfile: any): void {
    if (data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Calculate aggregations (no need to dump 500+ raw rows)
    const durationMinutes = (data[data.length - 1].recordedAt - data[0].recordedAt) / 60000;

    const peakTemp = data.reduce((max, h) => h.Temperature > max ? h.Temperature : max, -Infinity);
    const avgTemp = data.reduce((sum, h) => sum + h.Temperature, 0) / data.length;

    const peakCurrent = data.reduce((max, h) => h.Current > max ? h.Current : max, -Infinity);
    const maxVoltage = data.reduce((max, h) => h.Voltage > max ? h.Voltage : max, -Infinity);
    const minVoltage = data.reduce((min, h) => h.Voltage < min ? h.Voltage : min, Infinity);
    const avgVoltage = data.reduce((sum, h) => sum + h.Voltage, 0) / data.length;

    const totalWh = data.reduce((sum, h) => sum + h.Power, 0) / 3600;

    // Initialize PDF
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(34, 197, 94); // Green
    doc.text('BMS Diagnostic Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${dateStr} at ${timeStr}`, 14, 30);

    // Profile Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('System Profile', 14, 45);

    autoTable(doc, {
        startY: 50,
        theme: 'plain',
        head: [],
        body: [
            ['Vehicle:', `${vehicleProfile.make || 'Unknown'} ${vehicleProfile.model || ''}`],
            ['System Capacity:', `${vehicleProfile.capacityAh} Ah`],
            ['Nominal Voltage:', `${vehicleProfile.nominalVoltage} V`],
        ],
        styles: { cellPadding: 2, fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    // Report Summary
    doc.setFontSize(14);
    doc.text('Performance Summary', 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        theme: 'grid',
        headStyles: { fillColor: [248, 250, 252], textColor: 0 },
        head: [['Metric', 'Peak / Max', 'Average', 'Min / Total']],
        body: [
            [
                'Voltage',
                `${maxVoltage.toFixed(2)} V`,
                `${avgVoltage.toFixed(2)} V`,
                `${minVoltage.toFixed(2)} V`
            ],
            [
                'Temperature',
                `${peakTemp.toFixed(1)} °C`,
                `${avgTemp.toFixed(1)} °C`,
                '-'
            ],
            [
                'Power Draw',
                `${peakCurrent.toFixed(2)} A`,
                '-',
                `${totalWh.toFixed(2)} Wh (Total)`
            ],
            [
                'Battery Level',
                `${data[0].BatteryPercent.toFixed(1)}% (Start)`,
                '-',
                `${data[data.length - 1].BatteryPercent.toFixed(1)}% (End)`
            ]
        ],
        styles: { fontSize: 10 },
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
        `Report covers a period of ${Math.round(durationMinutes)} minutes (${data.length} data points aggregated).`,
        14,
        280
    );

    // Save PDF
    doc.save(`BMS-Report-${dateStr.replace(/\//g, '-')}.pdf`);
}
