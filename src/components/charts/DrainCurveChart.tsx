'use client';

import { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DrainCurveChartProps {
  data: Array<{ timestamp: number; timeLabel: string; batteryPercent: number }>;
  yesterdayData?: Array<{ timestamp: number; timeLabel?: string; batteryPercent: number }>;
  loading?: boolean;
  height?: number;
}

export const DrainCurveChart = memo(function DrainCurveChart({
  data,
  yesterdayData,
  loading = false,
  height = 200,
}: DrainCurveChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  const yesterdayChartData = yesterdayData?.map((entry) => ({
    ...entry,
    timeLabel: entry.timeLabel ?? '',
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Battery Drain Curve</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
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
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Battery']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            {/* Yesterday's curve in grey */}
            {yesterdayChartData && (
              <Line
                type="monotone"
                data={yesterdayChartData}
                dataKey="batteryPercent"
                stroke="#9CA3AF"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name="Yesterday"
              />
            )}
            {/* Today's curve */}
            <Line
              type="monotone"
              dataKey="batteryPercent"
              stroke="#22C55E"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22C55E' }}
              name="Today"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
