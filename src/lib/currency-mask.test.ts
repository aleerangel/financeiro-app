import { describe, it, expect } from 'vitest';
import {
  maskCurrencyInput,
  centsToCurrencyString,
  numberToCurrencyInputString,
  parseCurrencyInputToNumber,
} from './currency-mask';

describe('currency-mask', () => {
  it('converte centavos corretamente para string', () => {
    expect(centsToCurrencyString(5)).toBe('0,05');
    expect(centsToCurrencyString(50)).toBe('0,50');
    expect(centsToCurrencyString(500)).toBe('5,00');
    expect(centsToCurrencyString(5000)).toBe('50,00');
    expect(centsToCurrencyString(500000)).toBe('5.000,00');
  });

  it('formata entrada de digitação estilo banking (sem precisar inserir vírgula)', () => {
    // Digitando 50 centavos: usuário digita 5, depois 0
    expect(maskCurrencyInput('5').formatted).toBe('0,05');
    expect(maskCurrencyInput('5').numericValue).toBe(0.05);

    expect(maskCurrencyInput('50').formatted).toBe('0,50');
    expect(maskCurrencyInput('50').numericValue).toBe(0.5);

    // Digitando 50 reais: usuário digita 5, 0, 0, 0 (5000)
    expect(maskCurrencyInput('500').formatted).toBe('5,00');
    expect(maskCurrencyInput('500').numericValue).toBe(5);

    expect(maskCurrencyInput('5000').formatted).toBe('50,00');
    expect(maskCurrencyInput('5000').numericValue).toBe(50);

    // Valores maiores com separador de milhar
    expect(maskCurrencyInput('500000').formatted).toBe('5.000,00');
    expect(maskCurrencyInput('500000').numericValue).toBe(5000);
  });

  it('suporta fluxo de digitação contínua e backspace', () => {
    // Digitando 50 reais passo a passo
    let val = '';
    val = maskCurrencyInput(val + '5').formatted;
    expect(val).toBe('0,05');

    val = maskCurrencyInput(val + '0').formatted;
    expect(val).toBe('0,50');

    val = maskCurrencyInput(val + '0').formatted;
    expect(val).toBe('5,00');

    val = maskCurrencyInput(val + '0').formatted;
    expect(val).toBe('50,00');

    // Apagando com Backspace (remove último caractere da string formatada)
    val = maskCurrencyInput(val.slice(0, -1)).formatted; // "50,0"
    expect(val).toBe('5,00');

    val = maskCurrencyInput(val.slice(0, -1)).formatted; // "5,0"
    expect(val).toBe('0,50');

    val = maskCurrencyInput(val.slice(0, -1)).formatted; // "0,5"
    expect(val).toBe('0,05');

    val = maskCurrencyInput(val.slice(0, -1)).formatted; // "0,"
    expect(val).toBe('');
  });

  it('lida com limpeza de campo (vazio) e entradas inválidas', () => {
    expect(maskCurrencyInput('').formatted).toBe('');
    expect(maskCurrencyInput('').numericValue).toBe(0);

    expect(maskCurrencyInput(null).formatted).toBe('');
    expect(maskCurrencyInput(undefined).formatted).toBe('');
    expect(maskCurrencyInput('abc').formatted).toBe('');
  });

  it('preserva formatação ao colar textos com R$, pontos e vírgulas', () => {
    expect(maskCurrencyInput('R$ 1.250,50').formatted).toBe('1.250,50');
    expect(maskCurrencyInput('R$ 1.250,50').numericValue).toBe(1250.5);

    expect(maskCurrencyInput('50,00').formatted).toBe('50,00');
    expect(maskCurrencyInput('50,00').numericValue).toBe(50);
  });

  it('converte números existentes para string formatada de input', () => {
    expect(numberToCurrencyInputString(50)).toBe('50,00');
    expect(numberToCurrencyInputString(0.5)).toBe('0,50');
    expect(numberToCurrencyInputString(0.05)).toBe('0,05');
    expect(numberToCurrencyInputString(0, true)).toBe('');
    expect(numberToCurrencyInputString(0, false)).toBe('0,00');
  });

  it('converte string formatada de volta para float de banco', () => {
    expect(parseCurrencyInputToNumber('50,00')).toBe(50);
    expect(parseCurrencyInputToNumber('1.250,50')).toBe(1250.5);
    expect(parseCurrencyInputToNumber('0,50')).toBe(0.5);
    expect(parseCurrencyInputToNumber('0,05')).toBe(0.05);
    expect(parseCurrencyInputToNumber('')).toBe(0);
  });
});
