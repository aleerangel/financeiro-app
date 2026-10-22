'use client';

import React, { useState, useRef, useCallback } from 'react';

export interface ChartSlide {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  desktopClassName?: string;
}

interface MobileChartCarouselProps {
  slides: ChartSlide[];
  desktopGridClassName?: string;
  accentColor?: 'emerald' | 'blue' | 'purple' | 'amber';
}

export function MobileChartCarousel({
  slides,
  desktopGridClassName = 'hidden md:grid md:grid-cols-2 gap-6',
  accentColor = 'emerald',
}: MobileChartCarouselProps) {
  const [activeTab, setActiveTab] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, clientWidth } = containerRef.current;
    if (clientWidth === 0) return;
    const nextIndex = Math.round(scrollLeft / clientWidth);
    if (nextIndex >= 0 && nextIndex < slides.length && nextIndex !== activeTab) {
      setActiveTab(nextIndex);
    }
  }, [slides.length, activeTab]);

  const selectSlide = (index: number) => {
    setActiveTab(index);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: index * containerRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const getPillActiveClass = () => {
    switch (accentColor) {
      case 'blue':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm';
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm';
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm';
      case 'emerald':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm';
    }
  };

  const getDotActiveClass = () => {
    switch (accentColor) {
      case 'blue':
        return 'w-5 bg-blue-400';
      case 'purple':
        return 'w-5 bg-purple-400';
      case 'amber':
        return 'w-5 bg-amber-400';
      case 'emerald':
      default:
        return 'w-5 bg-emerald-400';
    }
  };

  return (
    <>
      {/* Versão Desktop (>= 768px): Renderiza o grid padrão */}
      <div className={desktopGridClassName}>
        {slides.map((slide) => (
          <div key={slide.id} className={slide.desktopClassName}>
            {slide.content}
          </div>
        ))}
      </div>

      {/* Versão Mobile (< 768px): Abas touch em pílulas + Carrossel de 1 gráfico por tela com snap */}
      <div className="md:hidden space-y-3">
        {/* Barra de Pílulas / Abas Touch */}
        {slides.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {slides.map((slide, idx) => {
              const isActive = activeTab === idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => selectSlide(idx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all border ${
                    isActive
                      ? getPillActiveClass()
                      : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {slide.icon && <span className="w-3.5 h-3.5 shrink-0">{slide.icon}</span>}
                  <span>{slide.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Container Deslizável (1 gráfico 100% por tela com snap) */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="w-full shrink-0 snap-center min-w-full"
            >
              {slide.content}
            </div>
          ))}
        </div>

        {/* Indicadores de bolinhas (Dots) */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeTab === idx
                    ? getDotActiveClass()
                    : 'w-1.5 bg-zinc-700/80 hover:bg-zinc-600'
                }`}
                aria-label={`Ir para gráfico ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
