'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
}

const SWIPE_THRESHOLD = 50;
const SWIPE_TIMEOUT = 300;

export function useSwipe(handlers: SwipeHandlers) {
  const touchState = useRef<TouchState | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return;

    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = touchState.current;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const deltaTime = Date.now() - startTime;

    touchState.current = null;

    if (deltaTime > SWIPE_TIMEOUT) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY && absX > SWIPE_THRESHOLD) {
      if (deltaX > 0) handlers.onSwipeRight?.();
      else handlers.onSwipeLeft?.();
    } else if (absY > absX && absY > SWIPE_THRESHOLD) {
      if (deltaY > 0) handlers.onSwipeDown?.();
      else handlers.onSwipeUp?.();
    }
  }, [handlers]);

  return { onTouchStart, onTouchEnd };
}

// Haptic feedback
export function useHaptic() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const light = useCallback(() => {
    if (isSupported) navigator.vibrate(10);
  }, [isSupported]);

  const success = useCallback(() => {
    if (isSupported) navigator.vibrate([10, 50, 10]);
  }, [isSupported]);

  const error = useCallback(() => {
    if (isSupported) navigator.vibrate([50, 50, 50]);
  }, [isSupported]);

  return { isSupported, light, success, error };
}

// Network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return { isOnline };
}

// Debounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Media query
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatches = () => setMatches(media.matches);
    updateMatches();
    
    media.addEventListener('change', updateMatches);
    return () => media.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

// Device detection
export function useDeviceDetection() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return { isMobile, isTablet, isDesktop, prefersReducedMotion };
}
