'use client';

import React, { forwardRef, useEffect, useState, useImperativeHandle, useRef } from 'react';
import { maskCurrencyInput, numberToCurrencyInputString } from '@/lib/currency-mask';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string | number;
  onChangeValue?: (numericValue: number, formatted: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Se true, quando o valor for 0 ou indefinido exibe string vazia (para mostrar o placeholder 0,00) */
  emptyAsBlank?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChangeValue,
      onChange,
      placeholder = '0,00',
      className = '',
      emptyAsBlank = true,
      onFocus,
      ...rest
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const [displayValue, setDisplayValue] = useState<string>(() => {
      if (value === undefined || value === null || value === '') {
        return '';
      }
      return numberToCurrencyInputString(value, emptyAsBlank);
    });

    // Sincroniza quando o valor externo mudar
    useEffect(() => {
      if (value === undefined || value === null || value === '') {
        setDisplayValue('');
        return;
      }

      // Se for número
      if (typeof value === 'number') {
        const masked = numberToCurrencyInputString(value, emptyAsBlank);
        setDisplayValue(masked);
        return;
      }

      // Se for string
      const { formatted } = maskCurrencyInput(value);
      setDisplayValue(formatted);
    }, [value, emptyAsBlank]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const { formatted, numericValue } = maskCurrencyInput(rawInput);

      setDisplayValue(formatted);

      if (onChangeValue) {
        onChangeValue(numericValue, formatted);
      }

      if (onChange) {
        // Dispara o onChange padrão com o valor formatado
        e.target.value = formatted;
        onChange(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Ao focar, seleciona o texto para facilitar substituição imediata em edições
      e.target.select();
      if (onFocus) {
        onFocus(e);
      }
    };

    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        className={className}
        {...rest}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
