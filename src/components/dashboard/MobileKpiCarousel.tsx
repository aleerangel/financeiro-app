'use client';

import React, { useRef, useState, useCallback } from 'react';

interface MobileKpiCarouselProps {
  children: React.ReactNode;
  desktopGridClassName?: string;
  accentColor?: 'emerald' | 'blue' | 'purple' | 'amber';
}

export function MobileKpiCarousel({
  children,
  desktopGridClassName = 'hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4',
  accentColor = 'emerald',
}: MobileKpiCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = React.Children.toArray(children);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;
    // O primeiro item tem largura aproximada do card + gap
    const cardWidth = clientWidth * 0.8 + 12; // 80vw + 12px gap aprox
    const nextIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));
  }, [items.length]);

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const child = scrollRef.current.children[index] as HTMLElement;
    if (child) {
      child.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      setActiveIndex(index);
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
      {/* Versão Desktop (telas >= md: 768px) */}
      <div className={desktopGridClassName}>
        {items}
      </div>

      {/* Versão Mobile (telas < md: 768px): Carrossel horizontal deslizável com snap */}
      <div className="md:hidden space-y-2.5">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              className="snap-center shrink-0 w-[82vw] max-w-[310px] flex flex-col"
            >
              {item}
            </div>
          ))}
        </div>

        {/* Indicadores de Paginação (Dots touch-friendly) */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx
                    ? getDotActiveClass()
                    : 'w-1.5 bg-zinc-700/80 hover:bg-zinc-600'
                }`}
                aria-label={`Ir para card de indicador ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
