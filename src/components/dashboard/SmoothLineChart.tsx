'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  values: number[];
  formatValue?: (val: number) => string;
}

export interface SmoothLineChartProps {
  title: string;
  subtitle?: string;
  series: ChartSeries[];
  labels?: string[];
  months?: string[];
  tooltipLabels?: string[];
  height?: number;
  rightAction?: React.ReactNode;
  dynamicYScale?: boolean;
  compactLayout?: boolean;
}

const DEFAULT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function SmoothLineChart({
  title,
  subtitle,
  series,
  labels,
  months,
  tooltipLabels,
  height = 260,
  rightAction,
  dynamicYScale = false,
  compactLayout = false,
}: SmoothLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const effectiveLabels = labels || months || DEFAULT_MONTHS;

  const { minVal, maxVal, yTicks } = useMemo(() => {
    let dataMin = Infinity;
    let dataMax = -Infinity;

    for (const s of series) {
      for (const v of s.values) {
        if (v < dataMin) dataMin = v;
        if (v > dataMax) dataMax = v;
      }
    }

    if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
      dataMin = 0;
      dataMax = 100;
    }

    const tickCount = 5;

    if (dynamicYScale) {
      const spread = dataMax - dataMin;
      // Quando todos os valores são iguais ou variação é mínima, aplica margem proporcional
      const effectiveSpread =
        spread > 0
          ? spread
          : Math.max(Math.abs(dataMax) * 0.08, 40);

      const pad = effectiveSpread * 0.25;
      const rawMin = dataMin >= 0 ? Math.max(0, dataMin - pad) : dataMin - pad;
      const rawMax = dataMax + pad;
      const rawRange = Math.max(rawMax - rawMin, 4);

      // Calcula passo limpo entre as 4 divisões (5 ticks)
      const rawStep = rawRange / (tickCount - 1);
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
      const normalized = rawStep / magnitude;
      const niceMultiplier =
        normalized <= 1
          ? 1
          : normalized <= 2
          ? 2
          : normalized <= 2.5
          ? 2.5
          : normalized <= 5
          ? 5
          : 10;
      const tickStep = Math.max(1, niceMultiplier * magnitude);

      const niceMin = Math.floor(rawMin / tickStep) * tickStep;
      const niceMax = Math.max(
        niceMin + tickStep * (tickCount - 1),
        Math.ceil(rawMax / tickStep) * tickStep
      );
      const finalTickStep = (niceMax - niceMin) / (tickCount - 1);

      const ticks: number[] = [];
      for (let i = 0; i < tickCount; i++) {
        ticks.push(niceMin + i * finalTickStep);
      }

      return {
        minVal: niceMin,
        maxVal: niceMax,
        yTicks: ticks,
      };
    }

    const min = Math.min(0, dataMin);
    const max = Math.max(100, dataMax);

    // Arredonda max para cima para criar divisões limpas
    const range = max - min;
    const magnitude = Math.pow(10, Math.floor(Math.log10(range || 1)));
    const step = Math.max(10, Math.ceil(range / (5 * magnitude)) * magnitude);
    const niceMax = Math.ceil(max / step) * step;
    const niceMin = min < 0 ? Math.floor(min / step) * step : 0;

    const tickStep = (niceMax - niceMin) / (tickCount - 1);
    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      ticks.push(niceMin + i * tickStep);
    }

    return {
      minVal: niceMin,
      maxVal: niceMax || 100,
      yTicks: ticks,
    };
  }, [series, dynamicYScale]);

  // Dimensões SVG internas
  const svgWidth = compactLayout ? 460 : 650;
  const svgHeight = height;
  const padLeft = compactLayout ? 58 : 85;
  const padRight = compactLayout ? 12 : 25;
  const padTop = compactLayout ? 16 : 25;
  const padBottom = compactLayout ? 28 : 35;

  const formatTickLabel = (tick: number) => {
    if (compactLayout) {
      if (Math.abs(tick) >= 1000) {
        const kVal = tick / 1000;
        return `R$ ${kVal % 1 === 0 ? kVal.toFixed(0) : kVal.toFixed(1)}k`;
      }
      return `R$ ${Math.round(tick)}`;
    }
    return formatCurrency(tick);
  };

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const count = effectiveLabels.length;
  const totalPoints = count > 1 ? count - 1 : 1;

  const getX = (idx: number) => padLeft + (idx / totalPoints) * chartW;
  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    return padTop + chartH - ratio * chartH;
  };

  // Calcula caminhos suaves com Catmull-Rom Spline
  const paths = useMemo(() => {
    return series.map((s) => {
      const points = s.values.map((v, i) => ({
        x: getX(i),
        y: getY(v),
      }));

      if (points.length < 2) return { path: '', area: '', points };

      let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || points[i + 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = Math.max(padTop, Math.min(padTop + chartH, p1.y + (p2.y - p0.y) / 6));
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = Math.max(padTop, Math.min(padTop + chartH, p2.y - (p3.y - p1.y) / 6));

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }

      // Área sombreada ancorada no piso visível (zero ou minVal quando escala dinâmica > 0)
      const baseVal = Math.max(minVal, Math.min(0, maxVal));
      const baseY = getY(baseVal);
      const lastX = points[points.length - 1].x;
      const firstX = points[0].x;
      const areaD = `${d} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${firstX.toFixed(1)} ${baseY.toFixed(1)} Z`;

      return { path: d, area: areaD, points };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, minVal, maxVal, chartW, chartH, totalPoints]);

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
        <div>
          <h3 className="font-bold text-zinc-100 text-base">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>

      {/* SVG do Gráfico */}
      <div className="w-full overflow-hidden relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                key={`grad-${s.id}`}
                id={`grad-${s.id}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
              </linearGradient>
            ))}
          </defs>

          {/* Linhas de Grade Horizontais */}
          {yTicks.map((tick, i) => {
            const yPos = getY(tick);
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={svgWidth - padRight}
                  y2={yPos}
                  stroke="#27272a"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize={compactLayout ? '11' : '11'}
                  fontWeight="600"
                >
                  {formatTickLabel(tick)}
                </text>
              </g>
            );
          })}

          {/* Rótulos do Eixo X */}
          {effectiveLabels.map((m, idx) => {
            const xPos = getX(idx);
            const isHovered = hoveredIndex === idx;
            return (
              <text
                key={`label-${idx}`}
                x={xPos}
                y={svgHeight - (compactLayout ? 6 : 10)}
                textAnchor="middle"
                fill={isHovered ? '#f4f4f5' : '#a1a1aa'}
                fontSize={compactLayout ? '11' : '11'}
                fontWeight={isHovered ? '700' : '600'}
                className="transition-colors"
              >
                {m}
              </text>
            );
          })}

          {/* Áreas Preenchidas */}
          {paths.map((p, i) => (
            <path
              key={`area-${series[i].id}`}
              d={p.area}
              fill={`url(#grad-${series[i].id})`}
              className="pointer-events-none"
            />
          ))}

          {/* Linhas Curvas */}
          {paths.map((p, i) => (
            <path
              key={`line-${series[i].id}`}
              d={p.path}
              fill="none"
              stroke={series[i].color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          ))}

          {/* Linha vertical e pontos de foco no hover */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              y1={padTop}
              x2={getX(hoveredIndex)}
              y2={padTop + chartH}
              stroke="#52525b"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              className="pointer-events-none"
            />
          )}

          {/* Pontos em cada mês */}
          {paths.map((p, sIdx) => {
            const s = series[sIdx];
            return (
              <g key={`points-${s.id}`}>
                {p.points.map((pt, mIdx) => {
                  const isHovered = hoveredIndex === mIdx;
                  return (
                    <circle
                      key={`pt-${mIdx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#09090b"
                      stroke={s.color}
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150 pointer-events-none"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Zonas de interação transparente para hover em cada ponto */}
          {effectiveLabels.map((_, idx) => {
            const xPos = getX(idx);
            const w = chartW / totalPoints;
            return (
              <rect
                key={`hit-${idx}`}
                x={xPos - w / 2}
                y={padTop}
                width={w}
                height={chartH + padBottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Tooltip flutuante */}
        {hoveredIndex !== null && (
          <div
            className="absolute z-20 pointer-events-none bg-zinc-950/95 border border-zinc-700/80 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md text-xs transition-transform duration-75"
            style={{
              left: `${Math.min(80, Math.max(15, (getX(hoveredIndex) / svgWidth) * 100))}%`,
              top: '12%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold text-zinc-200 border-b border-zinc-800 pb-1 mb-1.5 flex items-center justify-between gap-3">
              <span>{tooltipLabels && tooltipLabels[hoveredIndex] ? tooltipLabels[hoveredIndex] : effectiveLabels[hoveredIndex]}</span>
            </div>
            <div className="space-y-1">
              {series.map((s) => {
                const val = s.values[hoveredIndex];
                const prevVal = hoveredIndex > 0 ? s.values[hoveredIndex - 1] : null;
                const diff = prevVal !== null ? val - prevVal : 0;
                const formatted = s.formatValue ? s.formatValue(val) : formatCurrency(val);
                return (
                  <div key={s.id} className="space-y-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}:
                      </span>
                      <span className="font-semibold text-zinc-100">{formatted}</span>
                    </div>
                    {dynamicYScale && prevVal !== null && diff !== 0 && (
                      <div className="flex items-center justify-end text-[10px]">
                        <span
                          className={`font-semibold ${
                            diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {diff > 0 ? '+' : '-'} {formatCurrency(Math.abs(diff))} vs anterior
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legenda inferior */}
      <div className="flex flex-wrap items-center justify-center gap-5 mt-3 pt-3 border-t border-zinc-800/80">
        {series.map((s) => (
          <div key={`legend-${s.id}`} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-zinc-300 font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

