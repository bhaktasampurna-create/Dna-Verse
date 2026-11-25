import React, { useState } from 'react';

const CHART_PALETTE = [
  '#123B2A',
  '#21865B',
  '#16A6A1',
  '#3D9970',
  '#4FB3BF',
  '#64748B',
  '#84A98C',
  '#2A6F97',
];

export interface DonutDatum {
  name: string;
  value: number;
}

export const DonutChart: React.FC<{
  data: DonutDatum[];
  centerLabel?: string;
  centerValue?: string | number;
}> = ({ data, centerLabel = 'Total Reads', centerValue }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        No taxonomic distribution data available yet.
      </div>
    );
  }

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-44 h-44 shrink-0">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          {data.map((item, idx) => {
            const fraction = item.value / total;
            const dashLength = fraction * circumference;
            const offset = cumulative * circumference;
            cumulative += fraction;
            const isHovered = hoveredIdx === idx;
            return (
              <circle
                key={item.name}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                strokeWidth={isHovered ? 24 : 20}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-offset}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[11px] font-medium text-slate-500">
            {hoveredIdx !== null ? data[hoveredIdx].name : centerLabel}
          </span>
          <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {hoveredIdx !== null
              ? `${((data[hoveredIdx].value / total) * 100).toFixed(1)}%`
              : centerValue ?? total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {data.map((item, idx) => {
          const pct = ((item.value / total) * 100).toFixed(1);
          return (
            <div
              key={item.name}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between text-xs py-1 px-2 rounded transition-colors ${
                hoveredIdx === idx ? 'bg-slate-100' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                />
                <span className="truncate text-slate-700 font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 shrink-0 ml-2">
                <span>{item.value.toLocaleString()}</span>
                <span className="w-11 text-right text-slate-500">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface BarDatum {
  label: string;
  value: number;
  sublabel?: string;
}

export const BarComparisonChart: React.FC<{
  data: BarDatum[];
  unit?: string;
  color?: string;
  decimals?: number;
}> = ({ data, unit = '', color = '#21865B', decimals = 2 }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-slate-500">
        No quantitative comparison data available yet.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 0.0001);

  return (
    <div className="space-y-3">
      <div className="h-52 flex items-end gap-3 pt-6 pb-2 border-b border-slate-200">
        {data.map((item, idx) => {
          const heightPct = Math.max(4, (item.value / maxVal) * 100);
          return (
            <div
              key={`${item.label}-${idx}`}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              className="flex-1 h-full flex flex-col justify-end items-center group relative min-w-0"
            >
              <div className="mb-1.5 font-mono text-[11px] font-medium text-slate-700 tabular-nums">
                {Number.isInteger(item.value) && decimals === 0
                  ? item.value
                  : item.value.toFixed(decimals)}
                {unit ? ` ${unit}` : ''}
              </div>
              <div
                className="w-full max-w-[44px] rounded-t-md transition-opacity duration-150"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: hoverIdx === idx ? '#123B2A' : color,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3">
        {data.map((item, idx) => (
          <div key={`${item.label}-lbl-${idx}`} className="flex-1 text-center min-w-0">
            <div className="text-xs font-medium text-slate-700 truncate" title={item.label}>
              {item.label}
            </div>
            {item.sublabel && (
              <div className="text-[11px] text-slate-500 truncate">{item.sublabel}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export interface LineSeriesPoint {
  label: string;
  shannon: number;
  simpson: number;
}

export const BiodiversityLineChart: React.FC<{ data: LineSeriesPoint[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-500">
        Run or inspect analyses to view diversity index trends.
      </div>
    );
  }

  const width = 560;
  const height = 180;
  const padX = 36;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const maxY = Math.max(
    1,
    ...data.map((d) => Math.max(d.shannon, d.simpson))
  );

  const getX = (i: number) =>
    data.length === 1 ? padX + innerW / 2 : padX + (i / (data.length - 1)) * innerW;
  const getY = (val: number) => padY + innerH - (val / maxY) * innerH;

  const shannonPoints = data.map((d, i) => `${getX(i)},${getY(d.shannon)}`).join(' ');
  const simpsonPoints = data.map((d, i) => `${getX(i)},${getY(d.simpson)}`).join(' ');

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-5 mb-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#123B2A] inline-block" />
          Shannon H&apos;
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#16A6A1] inline-block" />
          Simpson (1 - D)
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padY + innerH - tick * innerH;
          return (
            <g key={tick}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text
                x={padX - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {(tick * maxY).toFixed(1)}
              </text>
            </g>
          );
        })}

        {data.length > 1 && (
          <>
            <polyline fill="none" stroke="#123B2A" strokeWidth="2.2" points={shannonPoints} />
            <polyline
              fill="none"
              stroke="#16A6A1"
              strokeWidth="2.2"
              strokeDasharray="5 3"
              points={simpsonPoints}
            />
          </>
        )}

        {data.map((d, i) => {
          const x = getX(i);
          return (
            <g key={`${d.label}-${i}`}>
              <circle cx={x} cy={getY(d.shannon)} r="4" fill="#123B2A" />
              <circle cx={x} cy={getY(d.simpson)} r="4" fill="#16A6A1" />
              <text
                x={x}
                y={height - 2}
                textAnchor="middle"
                className="fill-slate-500 text-[10px]"
              >
                {d.label.length > 12 ? `${d.label.slice(0, 12)}…` : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const RelativeAbundanceBars: React.FC<{
  taxa: Array<{ taxonName: string; relativeAbundance: number; readCount: number }>;
}> = ({ taxa }) => {
  const top = [...taxa].sort((a, b) => b.relativeAbundance - a.relativeAbundance).slice(0, 8);
  if (top.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {top.map((item, idx) => {
        const pct = Math.min(100, item.relativeAbundance * 100);
        return (
          <div key={`${item.taxonName}-${idx}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium italic text-slate-800 truncate pr-3">{item.taxonName}</span>
              <span className="font-mono tabular-nums text-slate-600 shrink-0">
                {pct.toFixed(2)}% ({item.readCount.toLocaleString()} reads)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
