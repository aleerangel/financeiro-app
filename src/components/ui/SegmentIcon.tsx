import React from 'react';
import {
  Scissors,
  Sparkles,
  Wrench,
  Stethoscope,
  Dumbbell,
  ShoppingBag,
  Briefcase,
  LucideIcon,
} from 'lucide-react';
import { BusinessSegment } from '@/types/database';

/**
 * Retorna o ícone Lucide representativo do segmento de negócio.
 * Barbearia: Scissors
 * Beleza & Estética: Sparkles
 * Serviços & Manutenção (Oficinas, Técnicos): Wrench
 * Saúde & Consultórios: Stethoscope
 * Aulas & Treinamento: Dumbbell
 * Comércio Geral: ShoppingBag
 * Outro / Geral: Briefcase
 */
const SEGMENT_ICON_MAP: Record<string, LucideIcon> = {
  barbearia: Scissors,
  beleza_estetica: Sparkles,
  servicos_manutencao: Wrench,
  saude_consultorio: Stethoscope,
  aulas_treinamento: Dumbbell,
  comercio_geral: ShoppingBag,
  outro: Briefcase,
};

export function getSegmentIcon(segment?: BusinessSegment | string | null): LucideIcon {
  if (segment && segment in SEGMENT_ICON_MAP) {
    return SEGMENT_ICON_MAP[segment];
  }
  return Briefcase;
}

/**
 * Retorna o emoji correspondente ao segmento de negócio.
 */
export function getSegmentEmoji(segment?: BusinessSegment | string | null): string {
  switch (segment) {
    case 'barbearia':
      return '💈';
    case 'beleza_estetica':
      return '✨';
    case 'servicos_manutencao':
      return '🔧';
    case 'saude_consultorio':
      return '🩺';
    case 'aulas_treinamento':
      return '💪';
    case 'comercio_geral':
      return '🛍️';
    case 'outro':
    default:
      return '💼';
  }
}

export interface SegmentIconProps {
  segment?: BusinessSegment | string | null;
  className?: string;
  strokeWidth?: number;
}

export function SegmentIcon({ segment, className, strokeWidth }: SegmentIconProps) {
  switch (segment) {
    case 'barbearia':
      return <Scissors className={className} strokeWidth={strokeWidth} />;
    case 'beleza_estetica':
      return <Sparkles className={className} strokeWidth={strokeWidth} />;
    case 'servicos_manutencao':
      return <Wrench className={className} strokeWidth={strokeWidth} />;
    case 'saude_consultorio':
      return <Stethoscope className={className} strokeWidth={strokeWidth} />;
    case 'aulas_treinamento':
      return <Dumbbell className={className} strokeWidth={strokeWidth} />;
    case 'comercio_geral':
      return <ShoppingBag className={className} strokeWidth={strokeWidth} />;
    case 'outro':
    default:
      return <Briefcase className={className} strokeWidth={strokeWidth} />;
  }
}

