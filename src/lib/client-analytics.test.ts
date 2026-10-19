import { describe, it, expect } from 'vitest';
import {
  analyzeClientSales,
  computeWeightedCycleDays,
  computePreferredWeekdays,
  computeVipClientIds,
} from './client-analytics';

describe('computeWeightedCycleDays', () => {
  it('retorna null quando não há visitas e 21 para 1ª visita', () => {
    expect(computeWeightedCycleDays([])).toBeNull();
    expect(computeWeightedCycleDays(['2026-10-01'])).toBe(21);
  });

  it('calcula o ciclo exato para visitas regulares a cada 15 dias', () => {
    const dates = ['2026-08-01', '2026-08-16', '2026-08-31', '2026-09-15'];
    expect(computeWeightedCycleDays(dates)).toBe(15);
  });

  it('dá peso maior ao hábito mais recente quando o cliente muda de frequência', () => {
    // Antes vinha a cada 30 dias, depois passou a vir a cada 14 dias
    const dates = ['2026-07-01', '2026-07-31', '2026-08-14', '2026-08-28', '2026-09-11'];
    const cycle = computeWeightedCycleDays(dates);
    expect(cycle).toBe(16); // (30*1 + 14*2 + 14*3 + 14*4) / 10 = 15.6 -> 16
  });
});

describe('computePreferredWeekdays', () => {
  it('identifica sexta e sábado como os dias mais prováveis', () => {
    // 2026-10-02 (Sex), 2026-10-03 (Sáb), 2026-10-09 (Sex), 2026-10-17 (Sáb)
    const result = computePreferredWeekdays([
      '2026-10-02',
      '2026-10-03',
      '2026-10-09',
      '2026-10-17',
    ]);
    expect(result.short).toEqual(['Sex', 'Sáb']);
    expect(result.full).toEqual(['Sexta', 'Sábado']);
  });
});

describe('analyzeClientSales', () => {
  const now = new Date('2026-10-19T15:00:00Z'); // Hoje = 19/10/2026

  it('classifica cliente sem vendas como Novo', () => {
    const res = analyzeClientSales([], now);
    expect(res.status).toBe('new');
    expect(res.cycleDays).toBeNull();
  });

  it('classifica cliente dentro da janela prevista como Na Janela (in_window)', () => {
    // Ciclo de 15 dias (margem ±2d -> 13 a 17 dias). Última visita há 14 dias (05/10)
    const sales = [
      { id: '1', total_amount: 40, sale_date: '2026-09-05T14:00:00Z' },
      { id: '2', total_amount: 40, sale_date: '2026-09-20T14:00:00Z' },
      { id: '3', total_amount: 40, sale_date: '2026-10-05T14:00:00Z' },
    ];
    const res = analyzeClientSales(sales, now);
    expect(res.cycleDays).toBe(15);
    expect(res.daysSinceLastVisit).toBe(14);
    expect(res.status).toBe('in_window');
    expect(res.expectedNextDate).toBe('2026-10-20');
  });

  it('classifica como Atrasado quando passou da janela mas não dobrou o ciclo/40d', () => {
    // Ciclo de 15 dias, última visita há 22 dias (27/09)
    const sales = [
      { id: '1', total_amount: 40, sale_date: '2026-08-28T14:00:00Z' },
      { id: '2', total_amount: 40, sale_date: '2026-09-12T14:00:00Z' },
      { id: '3', total_amount: 40, sale_date: '2026-09-27T14:00:00Z' },
    ];
    const res = analyzeClientSales(sales, now);
    expect(res.cycleDays).toBe(15);
    expect(res.daysSinceLastVisit).toBe(22);
    expect(res.status).toBe('overdue');
  });

  it('classifica como Sumido quando ultrapassa 40 dias ou 2x o ciclo', () => {
    // Última visita em 25/08 (55 dias atrás)
    const sales = [
      { id: '1', total_amount: 40, sale_date: '2026-08-10T14:00:00Z' },
      { id: '2', total_amount: 40, sale_date: '2026-08-25T14:00:00Z' },
    ];
    const res = analyzeClientSales(sales, now);
    expect(res.status).toBe('missing');
  });

  it('agrega os serviços favoritos corretamente', () => {
    const sales = [
      {
        id: '1',
        total_amount: 60,
        sale_date: '2026-10-01T14:00:00Z',
        items: [
          { product_name: 'Corte', quantity: 1, unit_price: 35, total_price: 35 },
          { product_name: 'Barba', quantity: 1, unit_price: 25, total_price: 25 },
        ],
      },
      {
        id: '2',
        total_amount: 35,
        sale_date: '2026-10-15T14:00:00Z',
        items: [{ product_name: 'Corte', quantity: 1, unit_price: 35, total_price: 35 }],
      },
    ];
    const res = analyzeClientSales(sales, now);
    expect(res.favoriteItems[0]).toEqual({ name: 'Corte', count: 2, totalSpent: 70 });
    expect(res.favoriteItems[1]).toEqual({ name: 'Barba', count: 1, totalSpent: 25 });
  });
});

describe('computeVipClientIds', () => {
  it('marca clientes com >= 5 visitas ou top 20% de gasto como VIP', () => {
    const list = [
      { id: 'a', totalSalesCount: 5, totalSpent: 150 },
      { id: 'b', totalSalesCount: 2, totalSpent: 500 },
      { id: 'c', totalSalesCount: 2, totalSpent: 80 },
      { id: 'd', totalSalesCount: 1, totalSpent: 40 },
      { id: 'e', totalSalesCount: 2, totalSpent: 90 },
    ];
    const vips = computeVipClientIds(list);
    expect(vips.has('a')).toBe(true); // >= 5 visitas
    expect(vips.has('b')).toBe(true); // maior gasto
    expect(vips.has('c')).toBe(false);
  });
});

