import { describe, it, expect } from 'vitest';
import {
  normalizeSearchTerm,
  filterClientsBySearch,
  findExactClientMatch,
} from './client-search-utils';
import { SimpleClient } from './actions/clients';

const mockClients: SimpleClient[] = [
  { id: '1', name: 'José da Silva', phone: '(11) 98765-4321' },
  { id: '2', name: 'João Pereira', phone: '11912345678' },
  { id: '3', name: 'Carlos Eduardo', phone: '(21) 99999-8888' },
  { id: '4', name: 'Cláudio César', phone: null },
  { id: '5', name: 'Alexandre Rangel', phone: '(31) 97777-6666' },
];

describe('client-search-utils', () => {
  it('normalizes search terms removing accents and extra whitespace', () => {
    expect(normalizeSearchTerm('  JOSÉ   da   Sílva  ')).toBe('jose da silva');
    expect(normalizeSearchTerm('ÁÉÍÓÚ çãõ')).toBe('aeiou cao');
  });

  it('finds clients ignoring accents when searching full or partial name', () => {
    // Busca por "jose" deve encontrar "José da Silva"
    const resultsJose = filterClientsBySearch(mockClients, 'jose');
    expect(resultsJose.map((c) => c.name)).toContain('José da Silva');

    // Busca por "joao" deve encontrar "João Pereira"
    const resultsJoao = filterClientsBySearch(mockClients, 'joao');
    expect(resultsJoao.map((c) => c.name)).toContain('João Pereira');

    // Busca por "claudio cesar" deve encontrar "Cláudio César"
    const resultsClaudio = filterClientsBySearch(mockClients, 'claudio cesar');
    expect(resultsClaudio.map((c) => c.name)).toContain('Cláudio César');
  });

  it('finds client when user types full exact name without accents', () => {
    const results = filterClientsBySearch(mockClients, 'Jose da Silva');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('José da Silva');
  });

  it('matches multi-terms in any order', () => {
    // "Silva Jose" encontra "José da Silva"
    const results = filterClientsBySearch(mockClients, 'silva jose');
    expect(results.map((c) => c.name)).toContain('José da Silva');
  });

  it('matches clients by phone number digits', () => {
    const results = filterClientsBySearch(mockClients, '98765');
    expect(results.map((c) => c.name)).toContain('José da Silva');

    const resultsDdd = filterClientsBySearch(mockClients, '3197777');
    expect(resultsDdd.map((c) => c.name)).toContain('Alexandre Rangel');
  });

  it('prioritizes clients starting with search term', () => {
    const clients: SimpleClient[] = [
      { id: 'a', name: 'Pedro Alexandre', phone: null },
      { id: 'b', name: 'Alexandre Rangel', phone: null },
    ];
    const results = filterClientsBySearch(clients, 'alexandre');
    expect(results[0].name).toBe('Alexandre Rangel');
    expect(results[1].name).toBe('Pedro Alexandre');
  });

  it('findExactClientMatch finds exact match ignoring case, accents and whitespace', () => {
    const match = findExactClientMatch(mockClients, '  jose da silva  ');
    expect(match).toBeDefined();
    expect(match?.id).toBe('1');

    const noMatch = findExactClientMatch(mockClients, 'Jose Silva');
    expect(noMatch).toBeUndefined();
  });
});

