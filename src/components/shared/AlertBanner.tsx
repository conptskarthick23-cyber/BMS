'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, XCircle, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface AlertBannerProps {
  variant: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  message?: string;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AlertBanner({
  variant,
  title,
  message,
  icon,
  dismissible = true,
  onDismiss,
  action,
}: AlertBannerProps) {
  const variants = {
    critical: {
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-500',
      icon: <XCircle className="w-5 h-5" />,
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-500',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    success: {
      bg: 'bg-green-500/10 border-green-500/30',
      text: 'text-green-500',
      icon: <CheckCircle className="w-5 h-5" />,
    },
    info: {
      bg: 'bg-blue-500/10 border-blue-500/30',
      text: 'text-blue-500',
      icon: <AlertCircle className="w-5 h-5" />,
    },
  };

  const config = variants[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        'animate-in slide-in-from-top-2 fade-in duration-200',
        config.bg
      )}
    >
      <span className={cn('shrink-0 mt-0.5', config.text)}>
        {icon || config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', config.text)}>{title}</p>
        {message && (
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        )}
        {action && (
          <Button
            variant="link"
            size="sm"
            className={cn('h-auto p-0 mt-1', config.text)}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onDismiss}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

interface StatusBannerProps {
  isConnected: boolean;
  lastConnected?: number | null;
  onRetry?: () => void;
}

export function StatusBanner({
  isConnected,
  lastConnected,
  onRetry,
}: StatusBannerProps) {
  if (isConnected) return null;

  const timeSinceDisconnect = lastConnected
    ? Math.floor((Date.now() - lastConnected) / 1000)
    : 0;

  let timeAgo = '';
  if (timeSinceDisconnect < 60) {
    timeAgo = `${timeSinceDisconnect}s`;
  } else if (timeSinceDisconnect < 3600) {
    timeAgo = `${Math.floor(timeSinceDisconnect / 60)}m`;
  } else {
    timeAgo = `${Math.floor(timeSinceDisconnect / 3600)}h`;
  }

  return (
    <AlertBanner
      variant="critical"
      title="Device Disconnected"
      message={`Last seen ${timeAgo} ago. Check your device connection.`}
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  );
}

interface ReconnectionBannerProps {
  lastDisconnected: number | null;
}

export function ReconnectionBanner({ lastDisconnected }: ReconnectionBannerProps) {
  if (!lastDisconnected) return null;

  const timeSinceDisconnect = Math.floor((Date.now() - lastDisconnected) / 1000);
  let timeAgo = '';
  if (timeSinceDisconnect < 60) {
    timeAgo = `${timeSinceDisconnect}s`;
  } else if (timeSinceDisconnect < 3600) {
    timeAgo = `${Math.floor(timeSinceDisconnect / 60)}m`;
  } else {
    timeAgo = `${Math.floor(timeSinceDisconnect / 3600)}h`;
  }

  return (
    <AlertBanner
      variant="success"
      title="Reconnected"
      message={`Back online after ${timeAgo} offline`}
      dismissible
    />
  );
}
