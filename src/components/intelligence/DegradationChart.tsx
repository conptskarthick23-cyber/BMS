'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { linearRegression } from '@/utils/calculations';

interface DegradationChartProps {
  historyData: Array<{ timestamp: number; healthScore: number }>;
  daysTo70?: number | null;
}

export function DegradationChart({ historyData, daysTo70 }: DegradationChartProps) {
  const hasEnoughData = historyData.length >= 3;
  
  // Group by day and get average health score per day
  const dailyData = historyData.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = { total: 0, count: 0, timestamp: entry.timestamp };
    }
    acc[date].total += entry.healthScore;
    acc[date].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number; timestamp: number }>);
  
  const chartData = Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      timestamp: data.timestamp,
      healthScore: data.total / data.count,
      dayNumber: 0, // Will be set below
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((d, i) => ({ ...d, dayNumber: i }));
  
  // Calculate forecast
  const points = chartData.map((d) => ({ x: d.dayNumber, y: d.healthScore }));
  const { slope, intercept } = linearRegression(points);
  
  // Generate forecast data (extend 14 days into future)
  const forecastData: Array<{
    dayNumber: number;
    healthScore: number;
    isForecast: boolean;
  }> = [];
  const lastDay = chartData.length > 0 ? chartData[chartData.length - 1].dayNumber : 0;
  
  for (let i = 0; i <= 14; i++) {
    const predictedScore = intercept + slope * (lastDay + i);
    forecastData.push({
      dayNumber: lastDay + i,
      healthScore: Math.min(100, Math.max(0, predictedScore)),
      isForecast: i > 0,
    });
  }
  
  // Combine actual and forecast
  const combinedData = [
    ...chartData.map((d) => ({ ...d, isForecast: false })),
    ...forecastData,
  ];

  if (!hasEnoughData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Degradation Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Collecting data — check back in 3 days for degradation forecast.
              Currently have {historyData.length} days of data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Degradation Forecast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning message */}
        {daysTo70 && daysTo70 > 0 && daysTo70 < 180 && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              At this rate, reaching 70% health in ~{Math.round(daysTo70 / 7)} weeks
            </AlertDescription>
          </Alert>
        )}
        
        {/* Chart */}
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={combinedData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis
              dataKey="dayNumber"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `Day ${v}`}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Health']}
              labelFormatter={(label) => `Day ${label}`}
            />
            <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="5 5" />
            
            {/* Actual data line */}
            <Line
              type="monotone"
              dataKey={(entry) => (entry.isForecast ? null : entry.healthScore)}
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3B82F6' }}
            />

            {/* Forecast line (dashed) */}
            <Line
              type="monotone"
              dataKey={(entry) => (entry.isForecast ? entry.healthScore : null)}
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
