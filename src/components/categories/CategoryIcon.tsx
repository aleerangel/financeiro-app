'use client';

import {
  Utensils,
  Home,
  Car,
  Film,
  Activity,
  BookOpen,
  Briefcase,
  TrendingUp,
  PlusCircle,
  Tag,
  ShoppingBag,
  Scissors,
  Coffee,
  Gift,
  Phone,
  Wifi,
  Zap,
  Heart,
  Shield,
  MoreHorizontal,
  DollarSign,
  LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS_LIST: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'utensils', label: 'Alimentação', icon: Utensils },
  { name: 'home', label: 'Moradia', icon: Home },
  { name: 'car', label: 'Transporte', icon: Car },
  { name: 'film', label: 'Lazer', icon: Film },
  { name: 'activity', label: 'Saúde', icon: Activity },
  { name: 'book-open', label: 'Educação', icon: BookOpen },
  { name: 'briefcase', label: 'Trabalho / Salário', icon: Briefcase },
  { name: 'trending-up', label: 'Investimentos', icon: TrendingUp },
  { name: 'shopping-bag', label: 'Compras', icon: ShoppingBag },
  { name: 'scissors', label: 'Beleza / Barbearia', icon: Scissors },
  { name: 'coffee', label: 'Café / Restaurante', icon: Coffee },
  { name: 'gift', label: 'Presentes', icon: Gift },
  { name: 'phone', label: 'Telefone', icon: Phone },
  { name: 'wifi', label: 'Internet', icon: Wifi },
  { name: 'zap', label: 'Utilidades', icon: Zap },
  { name: 'heart', label: 'Cuidados', icon: Heart },
  { name: 'shield', label: 'Seguros', icon: Shield },
  { name: 'dollar-sign', label: 'Dinheiro', icon: DollarSign },
  { name: 'plus-circle', label: 'Receita', icon: PlusCircle },
  { name: 'more-horizontal', label: 'Outros', icon: MoreHorizontal },
  { name: 'tag', label: 'Geral', icon: Tag },
];

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  home: Home,
  car: Car,
  film: Film,
  activity: Activity,
  'book-open': BookOpen,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
  'shopping-bag': ShoppingBag,
  scissors: Scissors,
  coffee: Coffee,
  gift: Gift,
  phone: Phone,
  wifi: Wifi,
  zap: Zap,
  heart: Heart,
  shield: Shield,
  'dollar-sign': DollarSign,
  'plus-circle': PlusCircle,
  'more-horizontal': MoreHorizontal,
  tag: Tag,
};

interface CategoryIconProps {
  name?: string | null;
  className?: string;
}

export function CategoryIcon({ name, className = 'w-4 h-4' }: CategoryIconProps) {
  const IconComponent = (name && ICON_MAP[name]) ? ICON_MAP[name] : Tag;
  return <IconComponent className={className} />;
}
