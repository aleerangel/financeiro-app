import React from 'react';

interface CanaryLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function CanaryIcon({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const pixelSizes = {
    sm: 22,
    md: 28,
    lg: 36,
    xl: 44,
  };

  const px = pixelSizes[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-sm ${className}`}
      aria-label="Símbolo Canário PRO"
    >
      <defs>
        {/* Gradiente Asa Superior (Luz Solar) */}
        <linearGradient id="canary-wing-gradient" x1="10" y1="4" x2="28" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
        {/* Gradiente Corpo Principal (Ouro Canário) */}
        <linearGradient id="canary-body-gradient" x1="4" y1="12" x2="22" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        {/* Faceta Inferior de Profundidade (Sombra Dourada Quente) */}
        <linearGradient id="canary-facet-gradient" x1="8" y1="16" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* Asa Superior em Voo Ascendente (45 graus) */}
      <polygon points="14,4 28,11 16,16 11,11" fill="url(#canary-wing-gradient)" />
      
      {/* Corpo Dinâmico em Ascensão */}
      <polygon points="4,19 16,16 28,11 18,23 9,26" fill="url(#canary-body-gradient)" />
      
      {/* Faceta Inferior de Equilíbrio */}
      <polygon points="9,26 18,23 13,28 6,27" fill="url(#canary-facet-gradient)" />
    </svg>
  );
}

export function CanaryLogo({ size = 'md', showText = true, className = '' }: CanaryLogoProps) {
  const containerPadding = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  };

  const textClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Box do Ícone com Brilho Sutil */}
      <div
        className={`rounded-xl bg-[#0F1524] border border-[#1E293B] flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/5 ${containerPadding[size]}`}
      >
        <CanaryIcon size={size} />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight text-[#F8FAFC] leading-none ${textClasses[size]}`}
            >
              Canário
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30 tracking-wider">
              PRO
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#94A3B8] tracking-tight truncate mt-0.5">
            Gestão & Finanças
          </span>
        </div>
      )}
    </div>
  );
}
