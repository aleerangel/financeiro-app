'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ExportFormat } from '@/lib/export-utils';

export interface ExportOption {
  format: ExportFormat;
  label: string;
  sublabel: string;
  icon: typeof FileText;
  iconColor: string;
  bgColor: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'pdf',
    label: 'Documento PDF (.pdf)',
    sublabel: 'Formatado com cabeçalho, cores e totais',
    icon: FileText,
    iconColor: 'text-red-400',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
  },
  {
    format: 'xlsx',
    label: 'Planilha Excel (.xlsx)',
    sublabel: 'Planilha pronta com colunas e linhas de resumo',
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    format: 'csv',
    label: 'Arquivo CSV (.csv)',
    sublabel: 'Dados brutos separados por ponto e vírgula',
    icon: FileCode,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
  },
];

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  buttonLabel?: string;
  title?: string;
  align?: 'left' | 'right';
}

export function ExportDropdown({
  onExport,
  disabled = false,
  buttonLabel = 'Exportar',
  title = 'Exportar relatório',
  align = 'right',
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (format: ExportFormat) => {
    try {
      setLoadingFormat(format);
      await onExport(format);
      toast.success(
        `Relatório exportado em ${format.toUpperCase()} com sucesso!`
      );
      setIsOpen(false);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      toast.error('Erro ao gerar exportação. Tente novamente.');
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled || loadingFormat !== null}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700/80 text-zinc-200 hover:text-white rounded-xl border border-zinc-700/80 text-sm font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={title}
      >
        {loadingFormat ? (
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        ) : (
          <Download className="w-4 h-4 text-zinc-300" />
        )}
        <span>{buttonLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 p-2 shadow-2xl backdrop-blur-md ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-[11px] text-zinc-500">
              Escolha o formato do arquivo para download
            </p>
          </div>

          <div className="space-y-1">
            {EXPORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isItemLoading = loadingFormat === opt.format;

              return (
                <button
                  key={opt.format}
                  type="button"
                  onClick={() => handleSelect(opt.format)}
                  disabled={loadingFormat !== null}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-800/80 transition text-left group disabled:opacity-50"
                >
                  <div
                    className={`p-2 rounded-lg ${opt.bgColor} transition flex-shrink-0 mt-0.5`}
                  >
                    {isItemLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                    ) : (
                      <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 group-hover:text-white transition">
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      {opt.sublabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

