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
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PowerCurrentChartProps {
  data: Array<{ timestamp: number; timeLabel: string; power: number; current: number }>;
  loading?: boolean;
  height?: number;
}

export const PowerCurrentChart = memo(function PowerCurrentChart({
  data,
  loading = false,
  height = 200,
}: PowerCurrentChartProps) {
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Power & Current</CardTitle>
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
              yAxisId="left"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}W`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}A`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                name === 'power' ? `${value.toFixed(1)}W` : `${value.toFixed(2)}A`,
                name === 'power' ? 'Power' : 'Current',
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="power"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Power"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="current"
              stroke="#22C55E"
              strokeWidth={2}
              dot={false}
              name="Current"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
