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
export function getSegmentIcon(segment?: BusinessSegment | string | null): LucideIcon {
  switch (segment) {
    case 'barbearia':
      return Scissors;
    case 'beleza_estetica':
      return Sparkles;
    case 'servicos_manutencao':
      return Wrench;
    case 'saude_consultorio':
      return Stethoscope;
    case 'aulas_treinamento':
      return Dumbbell;
    case 'comercio_geral':
      return ShoppingBag;
    case 'outro':
    default:
      return Briefcase;
  }
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
  const Icon = getSegmentIcon(segment);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

