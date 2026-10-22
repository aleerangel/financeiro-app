import { getZonedTimeParts, getZonedYMD } from './date-utils';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const ymd = getZonedYMD(dateString);
  const [year, month, day] = ymd.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const { year, month, day, hour, minute } = getZonedTimeParts(d);
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  return `${dd}/${mm}/${year}, ${hh}:${min}`;
}

