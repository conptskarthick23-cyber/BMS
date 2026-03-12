'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Thermometer,
  AlertTriangle,
  Battery,
  Wifi,
  Lightbulb,
  CheckCircle,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AnomalyEvent } from '@/types/bms';

interface AnomalyFeedProps {
  anomalies: AnomalyEvent[];
  onDismiss: (id: string) => void;
}

const anomalyIcons: Record<string, React.ReactNode> = {
  'voltage-drop': <Zap className="w-4 h-4" />,
  'temp-spike': <Thermometer className="w-4 h-4" />,
  'high-current': <AlertTriangle className="w-4 h-4" />,
  'rapid-drain': <Battery className="w-4 h-4" />,
  'offline': <Wifi className="w-4 h-4" />,
  'efficiency-anomaly': <Lightbulb className="w-4 h-4" />,
  'all-clear': <CheckCircle className="w-4 h-4" />,
};

const anomalyColors: Record<string, string> = {
  'voltage-drop': 'text-amber-500 bg-amber-500/10',
  'temp-spike': 'text-red-500 bg-red-500/10',
  'high-current': 'text-orange-500 bg-orange-500/10',
  'rapid-drain': 'text-red-500 bg-red-500/10',
  'offline': 'text-gray-500 bg-gray-500/10',
  'efficiency-anomaly': 'text-blue-500 bg-blue-500/10',
  'all-clear': 'text-green-500 bg-green-500/10',
};

export function AnomalyFeed({ anomalies, onDismiss }: AnomalyFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Anomaly Detection Feed</CardTitle>
          <Badge variant="outline" className="text-xs">
            Last 10 events
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          {anomalies.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No anomalies detected
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.slice(0, 10).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    anomaly.dismissed
                      ? 'opacity-50'
                      : 'animate-in slide-in-from-right-2 fade-in duration-200',
                    anomalyColors[anomaly.type] || 'text-muted-foreground bg-muted/10'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-md',
                      anomalyColors[anomaly.type] || 'bg-muted'
                    )}
                  >
                    {anomalyIcons[anomaly.type] || <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{anomaly.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(anomaly.timestamp), 'HH:mm:ss')}
                    </p>
                  </div>
                  {!anomaly.dismissed && anomaly.type !== 'all-clear' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => onDismiss(anomaly.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
