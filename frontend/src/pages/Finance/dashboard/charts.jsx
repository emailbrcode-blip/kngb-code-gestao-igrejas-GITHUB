import { useEffect, useRef, useState } from 'react';
import { brl, brlShort, pctBR } from './format';

// Gráficos em SVG próprio (o projeto não possui biblioteca de gráficos e não
// adicionamos dependência). Responsivos, com tooltip (mouse e toque), rolagem
// horizontal quando há muitos pontos e tratamento de "sem dados".

export const COLORS = {
  income: '#111111', expense: '#8A8A8A', balance: '#4D4D4D', previous: '#C4C4C4',
  grid: '#E3E8EF', text: '#6B7C93',
};
const PALETTE = ['#111111', '#4D4D4D', '#8A8A8A', '#B5B5B5', '#2B2B2B', '#6E6E6E', '#000000', '#9A9A9A'];

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setW(Math.floor(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Escala "bonita": passo em 1, 2, 2,5, 5 ou 10 × 10^k; 4 a 5 divisões.
function niceScale(minV, maxV) {
  const span = Math.max(maxV - minV, 1e-9);
  const raw = span / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((x) => raw / p <= x + 1e-9) * p;
  const lo = Math.floor(minV / step) * step;
  const hi = Math.max(Math.ceil(maxV / step) * step, lo + step);
  const ticks = []; for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}

export function ChartEmpty({ children = 'Sem movimentações no período selecionado.' }) {
  return <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-ink/15 px-4 text-center text-sm text-ink/45">{children}</div>;
}

export function Legend({ items }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />{i.name}</li>
      ))}
    </ul>
  );
}

// Barras agrupadas e/ou linhas (valores null = sem dado, a linha é interrompida).
export function XYChart({ labels, bars = [], lines = [], height = 260, minSlot = 30, valueFormat = brl, percentAxis = false, ariaLabel }) {
  const [ref, cw] = useWidth();
  const [hover, setHover] = useState(null);
  const all = [...bars, ...lines];
  const values = all.flatMap((s) => s.values).filter((v) => v !== null && v !== undefined);
  if (labels.length === 0 || values.length === 0) return <ChartEmpty />;

  const L = 54; const R = 12; const T = 12; const B = 30;
  const W = Math.max(cw || 320, labels.length * minSlot + L + R);
  const plotW = W - L - R; const plotH = height - T - B;
  const { lo, hi: max, ticks } = niceScale(Math.min(...values, 0), Math.max(...values, 0));
  const range = (max - lo) || 1;
  const y = (v) => T + plotH - ((v - lo) / range) * plotH;
  const slot = plotW / labels.length;
  const bw = Math.min(30, (slot * 0.72) / Math.max(bars.length, 1));
  const cx = (i) => L + slot * i + slot / 2;
  const every = Math.ceil(labels.length / Math.max(Math.floor(plotW / 54), 1));
  const fmtTick = (v) => (percentAxis ? `${Math.round(v)}%` : brlShort(v));

  const pathFor = (s) => {
    let d = ''; let pen = false;
    s.values.forEach((v, i) => {
      if (v === null || v === undefined) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${cx(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true;
    });
    return d;
  };

  return (
    <div ref={ref} className="relative w-full overflow-x-auto">
      <div className="relative" style={{ width: W }}>
        <svg width={W} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={L + plotW} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeWidth="1" />
              <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={COLORS.text}>{fmtTick(t)}</text>
            </g>
          ))}
          {lo < 0 && <line x1={L} x2={L + plotW} y1={y(0)} y2={y(0)} stroke="#9AA7B8" strokeWidth="1" />}
          {labels.map((lab, i) => (
            <g key={`${lab}-${i}`}>
              {hover === i && <rect x={L + slot * i} y={T} width={slot} height={plotH} fill="#4D4D4D" opacity="0.07" />}
              {bars.map((s, k) => {
                const v = s.values[i];
                if (v === null || v === undefined) return null;
                const x0 = cx(i) - (bw * bars.length) / 2 + k * bw;
                return <rect key={s.name} x={x0} y={Math.min(y(0), y(v))} width={Math.max(bw - 1, 1)} height={Math.max(Math.abs(y(v) - y(0)), v ? 1 : 0)} rx="2" fill={s.color} />;
              })}
              {i % every === 0 && <text x={cx(i)} y={T + plotH + 16} textAnchor="middle" fontSize="10" fill={COLORS.text}>{lab}</text>}
            </g>
          ))}
          {lines.map((s) => (
            <g key={s.name}>
              <path d={pathFor(s)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (v === null || v === undefined ? null : <circle key={i} cx={cx(i)} cy={y(v)} r={hover === i ? 4 : 2.6} fill={s.color} />))}
            </g>
          ))}
          {labels.map((lab, i) => (
            <rect key={`h-${i}`} x={L + slot * i} y={T} width={slot} height={plotH} fill="transparent"
              onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} onClick={() => setHover(i)} />
          ))}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute z-10 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(cx(hover) - 80, 4), W - 172), top: 4, width: 168 }}>
            <p className="mb-1 font-semibold text-ink">{labels[hover]}</p>
            {all.map((s) => (
              <p key={s.name} className="flex items-center justify-between gap-2 text-ink/75">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.name}</span>
                <span className="font-medium text-ink">{s.values[hover] === null || s.values[hover] === undefined ? '—' : percentAxis ? pctBR(s.values[hover]) : valueFormat(s.values[hover])}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Rosca com legenda (participação por categoria).
export function DonutChart({ items, totalLabel = 'Total' }) {
  const [active, setActive] = useState(null);
  const data = items.filter((i) => i.value > 0);
  if (data.length === 0) return <ChartEmpty />;
  const total = data.reduce((s, i) => s + i.value, 0);
  const r = 62; const c = 2 * Math.PI * r; let acc = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="Gráfico de rosca" className="shrink-0">
        <g transform="rotate(-90 85 85)">
          {data.map((d, i) => {
            const len = (d.value / total) * c; const off = -acc; acc += len;
            return <circle key={d.label} cx="85" cy="85" r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={active === i ? 28 : 24}
              strokeDasharray={`${Math.max(len - 1.5, 0)} ${c - Math.max(len - 1.5, 0)}`} strokeDashoffset={off}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />;
          })}
        </g>
        <text x="85" y="80" textAnchor="middle" fontSize="10" fill={COLORS.text}>{active !== null ? data[active].label : totalLabel}</text>
        <text x="85" y="98" textAnchor="middle" fontSize="13" fontWeight="600" fill="#263445">{brl(active !== null ? data[active].value : total)}</text>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <span className="flex min-w-0 items-center gap-2"><span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} /><span className="truncate text-ink/80">{d.label}</span></span>
            <span className="shrink-0 text-ink"><span className="font-medium">{brl(d.value)}</span> <span className="text-ink/45">({pctBR((d.value / total) * 100)})</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Barras horizontais em HTML (rótulos longos ficam legíveis no celular);
// `previous` opcional para comparar com o período anterior.
export function HBars({ items, color = COLORS.income, showPrevious = false }) {
  const data = items.filter((i) => i.value > 0 || (showPrevious && i.previous > 0));
  if (data.length === 0) return <ChartEmpty />;
  const max = Math.max(...data.flatMap((i) => [i.value, showPrevious ? i.previous || 0 : 0]), 1);
  return (
    <ul className="space-y-3">
      {data.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink/80">{i.label}</span>
            <span className="shrink-0 font-medium text-ink">{brl(i.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/5"><div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: color }} /></div>
          {showPrevious && (
            <>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/5"><div className="h-full rounded-full" style={{ width: `${((i.previous || 0) / max) * 100}%`, background: COLORS.previous }} /></div>
              <p className="mt-0.5 text-right text-[11px] text-ink/45">Período anterior: {brl(i.previous || 0)}</p>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
