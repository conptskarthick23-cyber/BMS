'use client';

import { cn } from '@/lib/utils';
import { getBatteryColor } from '@/utils/calculations';

interface BatteryGaugeProps {
  percent: number;
  charging?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function BatteryGauge({
  percent,
  charging = false,
  size = 'lg',
  showLabel = true,
}: BatteryGaugeProps) {
  const color = getBatteryColor(percent);
  const sizes = {
    sm: { width: 80, height: 80, stroke: 6, fontSize: '1rem' },
    md: { width: 120, height: 120, stroke: 8, fontSize: '1.5rem' },
    lg: { width: 180, height: 180, stroke: 10, fontSize: '2.5rem' },
  };
  
  const { width, height, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  
  // Animation
  const transitionStyle = {
    transition: 'stroke-dashoffset 0.5s ease-in-out',
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/20"
        />
        
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={transitionStyle}
          className="drop-shadow-lg"
        />
      </svg>
      
      {/* Center content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: size === 'lg' ? '0.5rem' : 0 }}
      >
        <span
          className="font-bold text-foreground"
          style={{ fontSize, lineHeight: 1 }}
        >
          {Math.round(percent)}
          <span className="text-lg font-normal text-muted-foreground">%</span>
        </span>
        
        {showLabel && charging && (
          <span className="text-xs text-green-500 font-medium mt-1 animate-pulse">
            CHARGING
          </span>
        )}
      </div>
      
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

interface MiniGaugeProps {
  value: number;
  max: number;
  color: string;
  label: string;
  unit?: string;
}

export function MiniGauge({ value, max, color, label, unit }: MiniGaugeProps) {
  const percent = Math.min((value / max) * 100, 100);
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12">
        <svg
          width={48}
          height={48}
          viewBox="0 0 48 48"
          className="transform -rotate-90"
        >
          <circle
            cx={24}
            cy={24}
            r={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            className="text-muted/20"
          />
          <circle
            cx={24}
            cy={24}
            r={20}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeDasharray={2 * Math.PI * 20}
            strokeDashoffset={2 * Math.PI * 20 * (1 - percent / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-foreground">
            {Math.round(value)}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">
          {value.toFixed(1)}{unit && ` ${unit}`}
        </span>
      </div>
    </div>
  );
}
