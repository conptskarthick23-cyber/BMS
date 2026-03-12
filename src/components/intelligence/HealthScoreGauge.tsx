'use client';

import { cn } from '@/lib/utils';
import { getHealthLabel } from '@/utils/calculations';

interface HealthScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function HealthScoreGauge({ score, size = 'lg' }: HealthScoreGaugeProps) {
  const { label, color } = getHealthLabel(score);
  
  const sizes = {
    sm: { width: 100, height: 100, stroke: 8, fontSize: '1.25rem' },
    md: { width: 140, height: 140, stroke: 10, fontSize: '1.75rem' },
    lg: { width: 200, height: 200, stroke: 12, fontSize: '2.5rem' },
  };
  
  const { width, height, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  // Determine color based on score
  const getArcColor = () => {
    if (score >= 75) return '#22C55E';
    if (score >= 55) return '#F59E0B';
    if (score >= 35) return '#F97316';
    return '#EF4444';
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
          stroke={getArcColor()}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          className="drop-shadow-lg"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold text-foreground"
          style={{ fontSize, lineHeight: 1 }}
        >
          {Math.round(score)}
        </span>
        <span
          className="text-sm font-medium mt-1"
          style={{ color: getArcColor() }}
        >
          {label}
        </span>
      </div>
      
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-15 blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${getArcColor()}50 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}

interface HealthScoreCardProps {
  score: number;
  voltageScore?: number;
  tempScore?: number;
  efficiencyScore?: number;
}

export function HealthScoreCard({
  score,
  voltageScore = 80,
  tempScore = 85,
  efficiencyScore = 90,
}: HealthScoreCardProps) {
  const { label, color } = getHealthLabel(score);
  
  const factors = [
    { name: 'Voltage', score: voltageScore, weight: 40 },
    { name: 'Temperature', score: tempScore, weight: 30 },
    { name: 'Efficiency', score: efficiencyScore, weight: 30 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <HealthScoreGauge score={score} size="lg" />
      </div>
      
      <p className="text-center text-sm text-muted-foreground">
        {score >= 75
          ? 'Battery is in excellent condition'
          : score >= 55
          ? 'Battery performance is acceptable'
          : score >= 35
          ? 'Battery health is declining'
          : 'Battery needs attention'}
      </p>
      
      <div className="space-y-2">
        {factors.map((factor) => (
          <div key={factor.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {factor.name} ({factor.weight}%)
              </span>
              <span className="font-medium">{Math.round(factor.score)}%</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${factor.score}%`,
                  backgroundColor:
                    factor.score >= 75
                      ? '#22C55E'
                      : factor.score >= 55
                      ? '#F59E0B'
                      : '#EF4444',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
