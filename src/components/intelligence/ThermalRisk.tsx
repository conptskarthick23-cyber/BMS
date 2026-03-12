'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Thermometer, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThermalRiskProps {
  avgTemp: number;
  maxSafeTemp?: number;
}

export function ThermalRisk({ avgTemp, maxSafeTemp = 40 }: ThermalRiskProps) {
  const isHighTemp = avgTemp > maxSafeTemp;
  const stressLevel = Math.min(100, Math.max(0, ((avgTemp - 30) / 20) * 100));
  const lifeReduction = avgTemp > 40 ? (avgTemp - 40) * 2 : 0;
  
  const getStressColor = () => {
    if (stressLevel < 30) return '#22C55E';
    if (stressLevel < 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Thermometer className="w-4 h-4" />
          Thermal Stress Indicator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Average temperature display */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold" style={{ color: getStressColor() }}>
            {avgTemp.toFixed(1)}°C
          </span>
          <span className="text-xs text-muted-foreground">
            7-day average
          </span>
        </div>
        
        {/* Stress level bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Thermal Stress Level</span>
            <span className="font-medium">{Math.round(stressLevel)}%</span>
          </div>
          <Progress
            value={stressLevel}
            className="h-2"
            style={
              {
                '--progress-background': getStressColor(),
              } as React.CSSProperties
            }
          />
        </div>
        
        {/* Warning message */}
        {isHighTemp && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="text-red-600 dark:text-red-400 font-medium">
                High heat is reducing battery lifespan
              </p>
              <p className="text-muted-foreground">
                Estimated life reduction: {lifeReduction.toFixed(0)}% per month
              </p>
            </div>
          </div>
        )}
        
        {!isHighTemp && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs text-green-600 dark:text-green-400">
              Temperature is within safe operating range
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RangeTrendProps {
  currentEnergy: number;
  avgEnergy: number;
  sparklineData?: number[];
}

export function RangeTrend({ currentEnergy, avgEnergy, sparklineData }: RangeTrendProps) {
  const percentDiff = avgEnergy === 0 ? 0 : ((currentEnergy - avgEnergy) / avgEnergy) * 100;
  const isBetter = percentDiff > 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Energy Trend vs 7-Day Avg</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">
              {isBetter ? '+' : ''}
              {percentDiff.toFixed(0)}%
            </p>
            <p
              className={cn(
                'text-xs font-medium',
                isBetter ? 'text-green-500' : 'text-red-500'
              )}
            >
              {isBetter ? 'Better than usual' : 'Lower than usual'}
            </p>
          </div>
          
          {/* Simple sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="flex items-end gap-0.5 h-12">
              {sparklineData.map((value, i) => {
                const height = (value / Math.max(...sparklineData)) * 100;
                return (
                  <div
                    key={i}
                    className="w-1 bg-primary/30 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
