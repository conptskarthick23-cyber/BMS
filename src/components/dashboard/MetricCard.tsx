'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  trend,
  trendValue,
  color,
  loading = false,
  className,
  onClick,
}: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </span>
              {icon && (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: color ? `${color}20` : undefined }}
                >
                  <span style={{ color }}>{icon}</span>
                </div>
              )}
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1">
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ color }}
              >
                {typeof value === 'number' ? value.toFixed(2) : value}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground font-medium">
                  {unit}
                </span>
              )}
            </div>

            {/* Subtitle / Trend */}
            <div className="flex items-center gap-2">
              {trend && (
                <div
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    trend === 'up' && 'text-red-500',
                    trend === 'down' && 'text-green-500',
                    trend === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  <TrendIcon className="w-3 h-3" />
                  {trendValue}
                </div>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DerivedCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description: string;
  status: 'good' | 'warning' | 'critical';
  loading?: boolean;
}

export function DerivedCard({
  title,
  value,
  unit,
  description,
  status,
  loading = false,
}: DerivedCardProps) {
  const statusColors = {
    good: 'text-green-500',
    warning: 'text-amber-500',
    critical: 'text-red-500',
  };

  return (
    <Card className="transition-all duration-200">
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-xl font-bold', statusColors[status])}>
                {typeof value === 'number' ? value.toFixed(1) : value}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
