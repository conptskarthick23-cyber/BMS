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
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface VoltageChartProps {
  data: Array<{ timestamp: number; timeLabel: string; voltage: number }>;
  loading?: boolean;
  height?: number;
}

export const VoltageChart = memo(function VoltageChart({
  data,
  loading = false,
  height = 200,
}: VoltageChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Voltage</CardTitle>
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
              domain={[10, 15]}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toFixed(2)}V`, 'Voltage']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            {/* Reference lines */}
            <ReferenceLine
              y={14.4}
              stroke="#EF4444"
              strokeDasharray="5 5"
              label={{ value: 'Over', fontSize: 9, fill: '#EF4444' }}
            />
            <ReferenceLine
              y={12}
              stroke="#22C55E"
              strokeDasharray="3 3"
              label={{ value: 'Nominal', fontSize: 9, fill: '#22C55E' }}
            />
            <ReferenceLine
              y={11}
              stroke="#F59E0B"
              strokeDasharray="5 5"
              label={{ value: 'Low', fontSize: 9, fill: '#F59E0B' }}
            />
            <Line
              type="monotone"
              dataKey="voltage"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3B82F6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
