'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, RefreshCw } from 'lucide-react';

interface MobilePullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  className?: string;
  threshold?: number;
  maxPull?: number;
}

export function MobilePullToRefresh({
  children,
  onRefresh,
  className = '',
  threshold = 64,
  maxPull = 88,
}: MobilePullToRefreshProps) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isEligibleRef = useRef(false);
  const hasVibratedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const executeRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(threshold);

    try {
      if (onRefresh) {
        await Promise.all([
          onRefresh(),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ]);
      } else {
        await Promise.all([
          router.refresh(),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ]);
      }

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.([12]);
        } catch {
          // Ignora caso restrito por permissão do navegador
        }
      }
    } catch {
      // Falha silenciosa para não travar a UI
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [onRefresh, router, threshold]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;

    // Só permite puxar se o scroll do documento ou do container estiver no topo absoluto
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY > 1) {
      isEligibleRef.current = false;
      return;
    }

    isEligibleRef.current = true;
    hasVibratedRef.current = false;
    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isEligibleRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;

    const diffY = currentY - startYRef.current;
    const diffX = Math.abs(currentX - startXRef.current);

    // Se o usuário estiver deslizando horizontalmente, cancela o pull-to-refresh
    if (diffX > diffY) {
      isEligibleRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollY > 1) {
      isEligibleRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    if (diffY > 0) {
      setIsPulling(true);
      // Aplica resistência elástica logarítmica
      const calculatedPull = Math.min(maxPull, Math.pow(diffY, 0.82));
      setPullDistance(calculatedPull);

      // Vibração tátil no ponto de ativação
      if (calculatedPull >= threshold && !hasVibratedRef.current) {
        hasVibratedRef.current = true;
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate?.([8]);
          } catch {
            // Ignora
          }
        }
      } else if (calculatedPull < threshold) {
        hasVibratedRef.current = false;
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  const handleTouchEnd = () => {
    if (!isEligibleRef.current || isRefreshing) return;
    isEligibleRef.current = false;

    if (pullDistance >= threshold) {
      void executeRefresh();
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  // Garante limpeza de estado se a tela sofrer blur ou cancelamento
  useEffect(() => {
    const handleTouchCancel = () => {
      if (!isRefreshing) {
        setPullDistance(0);
        setIsPulling(false);
        isEligibleRef.current = false;
      }
    };

    window.addEventListener('touchcancel', handleTouchCancel);
    return () => {
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isRefreshing]);

  const isTriggerReady = pullDistance >= threshold;
  const rotationDegrees = Math.min(180, (pullDistance / threshold) * 180);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative min-h-full ${className}`}
    >
      {/* Indicador Flutuante no Mobile */}
      <div
        className={`md:hidden fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform ${
          isPulling || isRefreshing ? 'duration-75' : 'duration-300 ease-out'
        }`}
        style={{
          top: '64px',
          transform: `translate(-50%, ${pullDistance > 0 || isRefreshing ? pullDistance - 44 : -60}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
        }}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md border transition-all duration-200 ${
            isTriggerReady || isRefreshing
              ? 'bg-zinc-900/95 border-emerald-500/40 text-emerald-400 scale-105 shadow-emerald-500/10'
              : 'bg-zinc-900/95 border-zinc-700/60 text-zinc-300 scale-100'
          }`}
        >
          {isRefreshing ? (
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <ArrowDown
              className="w-4 h-4 transition-transform duration-75"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Conteúdo com deslocamento suave para baixo ao puxar */}
      <div
        className={`w-full transition-transform ${
          isPulling ? 'duration-75' : 'duration-300 ease-out'
        }`}
        style={{
          transform: `translate3d(0, ${Math.round(pullDistance * 0.45)}px, 0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
