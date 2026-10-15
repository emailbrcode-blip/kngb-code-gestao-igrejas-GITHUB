import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { getFinanceDashboard, getFinanceTrend, apiErrorMessage } from '../../lib/financeDashboardService';
import { XYChart, Legend, DonutChart, HBars, ChartEmpty, COLORS } from './dashboard/charts';
import { MovementsTable } from './dashboard/MovementsTable';
import { ReportPanel } from './dashboard/ReportPanel';
import { brl, intBR, pctBR, fmtISO } from './dashboard/format';
import { PRESETS, MONTH_NAMES, resolvePreset, last12Months, yearRange, currentYear, yearOfISO } from './dashboard/periods';

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const GRAN = [['auto', 'Automático'], ['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês'], ['semester', 'Semestre'], ['year', 'Ano']];
const GRAN_NAME = { day: 'dia', week: 'semana', month: 'mês', semester: 'semestre', year: 'ano' };

function ChartCard({ title, subtitle, actions, state, children, className = '' }) {
  return (
    <Card className={`min-w-0 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="font-display text-base text-ink">{title}</h3>{subtitle && <p className="text-xs text-ink/50">{subtitle}</p>}</div>
        {actions}
      </div>
      {state?.loading ? <Loading /> : state?.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : children}
    </Card>
  );
}

function Toggle({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg bg-ink/5 p-0.5 text-xs" role="group">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`rounded-md px-2.5 py-1.5 font-medium ${value === v ? 'bg-white text-coal shadow-sm' : 'text-ink/55'}`}>{l}</button>))}
    </div>
  );
}

function Delta({ change, inverse = false, partial = false }) {
  if (!change) return null;
  if (!change.hasBase) return <p className="mt-1 text-[11px] text-ink/45">Sem base de comparação</p>;
  if (change.trend === 'stable') return <p className="mt-1 text-[11px] font-medium text-ink/55">▬ Estável ({pctBR(change.percent)})</p>;
  const up = change.trend === 'up';
  const good = inverse ? !up : up;
  return (
    <p className={`mt-1 text-[11px] font-medium ${good ? 'text-success' : 'text-danger'}`}>
      {up ? '▲' : '▼'} {pctBR(Math.abs(change.percent))} <span className="font-normal text-ink/45">vs. anterior{partial ? ' (base parcial)' : ''}</span>
    </p>
  );
}

function Kpi({ label, value, change, inverse, partial, tone, hint }) {
  return (
    <Card className="!p-4">
      <p className="text-xs text-ink/50" title={hint}>{label}</p>
      <p className={`mt-1 font-display text-lg sm:text-xl ${tone === 'neg' ? 'text-danger' : tone === 'pos' ? 'text-success' : 'text-ink'}`}>{value}</p>
      <Delta change={change} inverse={inverse} partial={partial} />
    </Card>
  );
}

// Busca com proteção contra respostas fora de ordem (só a última vale).
function useRemote(fetcher, deps) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const id = useRef(0);
  useEffect(() => {
    const mine = ++id.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fetcher().then((data) => { if (mine === id.current) setState({ loading: false, error: '', data }); })
      .catch((err) => { if (mine === id.current) setState({ loading: false, error: apiErrorMessage(err), data: null }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function FinanceDashboard() {
  const { hasPermission } = useAuthStore();
  const canView = hasPermission('finance.view');

  const [preset, setPreset] = useState('this_month');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear()));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [compare, setCompare] = useState('previous');
  const [granularity, setGranularity] = useState('auto');
  const [refreshKey, setRefreshKey] = useState(0);
  const [trendMode, setTrendMode] = useState('12m');
  const [barView, setBarView] = useState('month');
  const [yoyMetric, setYoyMetric] = useState('income');

  const range = useMemo(() => resolvePreset(preset, { month, year, customFrom, customTo }), [preset, month, year, customFrom, customTo]);
  const rangeError = !range.from || !range.to ? 'Informe a data inicial e a final.' : range.from > range.to ? 'A data inicial não pode ser maior que a final.' : '';
  const validRange = !rangeError;

  // Atualiza ao voltar para a aba (ex.: depois de lançar algo no Financeiro).
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setRefreshKey((k) => k + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const dash = useRemote(() => (validRange && canView ? getFinanceDashboard({ from: range.from, to: range.to, compare, granularity }) : Promise.resolve(null)),
    [range.from, range.to, compare, granularity, refreshKey, canView]);
  const trendRange = trendMode === '12m' ? last12Months() : { from: range.from, to: range.to };
  const trend = useRemote(() => (canView && (trendMode === '12m' || validRange) ? getFinanceTrend(trendRange) : Promise.resolve(null)),
    [trendMode, range.from, range.to, refreshKey, canView]);
  const yoyYear = validRange ? yearOfISO(range.to) : currentYear();
  const yoyA = useRemote(() => (canView ? getFinanceTrend(yearRange(yoyYear)) : Promise.resolve(null)), [yoyYear, refreshKey, canView]);
  const yoyB = useRemote(() => (canView ? getFinanceTrend(yearRange(yoyYear - 1)) : Promise.resolve(null)), [yoyYear, refreshKey, canView]);

  const clear = useCallback(() => { setPreset('this_month'); setCustomFrom(''); setCustomTo(''); setCompare('previous'); setGranularity('auto'); setMonth(String(new Date().getMonth() + 1)); setYear(String(currentYear())); }, []);

  if (!canView) return <Card><p className="text-sm text-ink/60">Você não tem permissão para visualizar o Dashboard Financeiro.</p></Card>;

  const d = dash.data;
  const k = d?.kpis;
  const partial = Boolean(d?.previousPeriod?.partial);
  const points = trend.data?.points || [];
  const field = 'rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm';
  const empty = d && !d.hasData;

  // B — agrupa os meses em semestre/ano
  const barData = (() => {
    if (barView === 'month') return points.map((p) => ({ label: p.label, income: p.income, expense: p.expense }));
    const map = new Map();
    for (const p of points) {
      const [y, m] = p.key.split('-').map(Number);
      const key = barView === 'year' ? String(y) : `${y}-S${m <= 6 ? 1 : 2}`;
      const cur = map.get(key) || { label: barView === 'year' ? String(y) : `${m <= 6 ? 1 : 2}º sem/${y}`, income: 0, expense: 0 };
      cur.income += p.income; cur.expense += p.expense; map.set(key, cur);
    }
    return [...map.values()].map((x) => ({ ...x, income: Math.round(x.income * 100) / 100, expense: Math.round(x.expense * 100) / 100 }));
  })();

  // H — comparativo anual mês a mês
  const monthsOf = (t, yr) => MONTH_SHORT.map((_, i) => {
    const p = t?.points?.[i];
    if (!p) return null;
    if (yr === currentYear() && i + 1 > new Date().getMonth() + 1) return null; // meses futuros: sem dado
    return p[yoyMetric];
  });
  const yoyLoading = yoyA.loading || yoyB.loading;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/financeiro" className="text-xs text-ink/50 hover:text-coal">← Voltar ao Financeiro</Link>
          <h1 className="font-display text-2xl font-medium text-ink">📊 Dashboard Financeiro</h1>
          <p className="mt-1 text-sm text-ink/60">Receitas e despesas efetivadas, com comparação entre períodos.</p>
        </div>
        <div className="flex gap-2">
          <a href="#relatorios" className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/5">📄 Relatórios PDF</a>
          <Button variant="ghost" onClick={() => setRefreshKey((x) => x + 1)}>Atualizar</Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="space-y-3">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Período">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPreset(p.id)} aria-pressed={preset === p.id}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${preset === p.id ? 'bg-coal text-white' : 'bg-ink/5 text-ink/65 hover:bg-ink/10'}`}>{p.label}</button>))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {preset === 'month_year' && <>
            <label className="grid gap-1 text-xs text-ink/55">Mês<select value={month} onChange={(e) => setMonth(e.target.value)} className={field}>{MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></label>
            <label className="grid gap-1 text-xs text-ink/55">Ano<select value={year} onChange={(e) => setYear(e.target.value)} className={field}>{Array.from({ length: 10 }, (_, i) => currentYear() - i).map((y) => <option key={y} value={y}>{y}</option>)}</select></label></>}
          {preset === 'custom' && <>
            <label className="grid gap-1 text-xs text-ink/55">Data inicial<input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={field} /></label>
            <label className="grid gap-1 text-xs text-ink/55">Data final<input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={field} /></label></>}
          <label className="grid gap-1 text-xs text-ink/55">Comparar com
            <select value={compare} onChange={(e) => setCompare(e.target.value)} className={field}><option value="previous">Período anterior equivalente</option><option value="year">Mesmo período do ano anterior</option></select></label>
          <label className="grid gap-1 text-xs text-ink/55">Agrupar fluxo por
            <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className={field}>{GRAN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <Button variant="ghost" onClick={clear}>Limpar filtros</Button>
        </div>
        {rangeError ? <p role="alert" className="text-sm text-danger">{rangeError}</p> : (
          <p className="text-xs text-ink/55">Período: <strong>{fmtISO(range.from)}</strong> a <strong>{fmtISO(range.to)}</strong>{d && <> • Comparando com {fmtISO(d.previousPeriod.from)} a {fmtISO(d.previousPeriod.to)}</>}</p>)}
        {partial && <p className="text-xs text-amber-700">Atenção: o histórico do sistema começa depois do início do período de comparação; as variações % usam uma base parcial.</p>}
      </Card>

      {dash.error && <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{dash.error}</p>}
      {dash.loading && !d ? <Loading /> : d && (
        <>
          {empty && <Card><p className="text-center text-sm text-ink/55">Não há receitas nem despesas efetivadas neste período. Os saldos acumulados continuam exibidos.</p></Card>}

          {/* Indicadores */}
          <div className={`grid grid-cols-2 gap-3 lg:grid-cols-4 ${dash.loading ? 'opacity-60' : ''}`}>
            <Kpi label="Receitas recebidas" value={brl(k.current.income)} change={k.changes.income} partial={partial} tone="pos" />
            <Kpi label="Despesas pagas" value={brl(k.current.expense)} change={k.changes.expense} partial={partial} inverse />
            <Kpi label="Saldo do período" value={brl(k.current.balance)} change={k.changes.balance} partial={partial} tone={k.current.balance < 0 ? 'neg' : undefined} />
            <Kpi label="Saldo acumulado" value={brl(d.balances.accumulated)} hint="Receitas − despesas efetivadas de todo o histórico até a data final. O sistema não possui saldo inicial cadastrado." />
            <Kpi label="Dízimos" value={brl(k.current.tithes)} change={k.changes.tithes} partial={partial} />
            <Kpi label="Ofertas" value={brl(k.current.offerings)} change={k.changes.offerings} partial={partial} />
            <Kpi label="Doações financeiras" value={brl(k.current.donations)} change={k.changes.donations} partial={partial} />
            <Kpi label="Outras receitas" value={brl(k.current.otherIncome)} change={k.changes.otherIncome} partial={partial} />
            <Kpi label="Contribuições registradas" value={intBR(k.current.contributionsCount)} change={k.changes.contributionsCount} partial={partial} hint="Dízimos + ofertas + doações financeiras efetivadas." />
            <Kpi label="Ticket médio" value={k.current.averageTicket === null ? '—' : brl(k.current.averageTicket)} change={k.changes.averageTicket} partial={partial} hint="Valor médio por contribuição (dízimos, ofertas e doações)." />
            <Kpi label="Crescimento das receitas" value={k.changes.income.hasBase ? pctBR(k.changes.income.percent) : '—'} change={k.changes.income} partial={partial} />
            <Kpi label="Crescimento das despesas" value={k.changes.expense.hasBase ? pctBR(k.changes.expense.percent) : '—'} change={k.changes.expense} partial={partial} inverse />
          </div>
          {(d.pending.income.count > 0 || d.pending.expense.count > 0) && (
            <p className="text-xs text-ink/55">Não contam nos totais (pendentes no período): {d.pending.income.count} receita(s) • {brl(d.pending.income.amount)} e {d.pending.expense.count} despesa(s) • {brl(d.pending.expense.amount)}.</p>)}

          {/* Destaques */}
          {d.hasData && (
            <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[['Maior receita', d.highlights.highestIncome], ['Menor receita', d.highlights.lowestIncome], ['Melhor saldo', d.highlights.bestBalance]].map(([t, h]) => (
                <div key={t}><p className="text-xs text-ink/50">{t} ({GRAN_NAME[d.period.granularity]})</p><p className="font-medium text-ink">{h ? `${h.label} — ${brl(h.value)}` : '—'}</p></div>))}
              <div><p className="text-xs text-ink/50">Maior aumento de despesa</p><p className="font-medium text-ink">{d.highlights.biggestExpenseIncrease ? `${d.highlights.biggestExpenseIncrease.label} — +${brl(d.highlights.biggestExpenseIncrease.delta)}` : 'Sem aumento no período'}</p></div>
            </Card>)}

          {/* A — evolução */}
          <ChartCard title="Evolução financeira" subtitle="Receitas, despesas e saldo por mês (efetivados)" state={trend}
            actions={<Toggle value={trendMode} onChange={setTrendMode} options={[['12m', 'Últimos 12 meses'], ['filter', 'Período filtrado']]} />}>
            <Legend items={[{ name: 'Receitas', color: COLORS.income }, { name: 'Despesas', color: COLORS.expense }, { name: 'Saldo', color: COLORS.balance }]} />
            <XYChart labels={points.map((p) => p.label)} ariaLabel="Evolução financeira mensal"
              lines={[{ name: 'Receitas', color: COLORS.income, values: points.map((p) => p.income) }, { name: 'Despesas', color: COLORS.expense, values: points.map((p) => p.expense) }, { name: 'Saldo', color: COLORS.balance, values: points.map((p) => p.balance) }]} />
            {trend.data?.highlights?.highestIncome && (
              <p className="mt-2 text-xs text-ink/60">Maior receita: <strong>{trend.data.highlights.highestIncome.label}</strong> ({brl(trend.data.highlights.highestIncome.value)}) • Menor receita: <strong>{trend.data.highlights.lowestIncome.label}</strong> ({brl(trend.data.highlights.lowestIncome.value)}). O mês corrente é parcial.</p>)}
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* B */}
            <ChartCard title="Receitas × despesas" subtitle="Barras agrupadas (mesmo intervalo do gráfico de evolução)" state={trend}
              actions={<Toggle value={barView} onChange={setBarView} options={[['month', 'Mês'], ['semester', 'Semestre'], ['year', 'Ano']]} />}>
              <Legend items={[{ name: 'Receitas', color: COLORS.income }, { name: 'Despesas', color: COLORS.expense }]} />
              <XYChart labels={barData.map((b) => b.label)} ariaLabel="Receitas e despesas"
                bars={[{ name: 'Receitas', color: COLORS.income, values: barData.map((b) => b.income) }, { name: 'Despesas', color: COLORS.expense, values: barData.map((b) => b.expense) }]} />
            </ChartCard>
            {/* C */}
            <ChartCard title="Composição das receitas" subtitle="Participação de cada categoria no período">
              <DonutChart totalLabel="Receitas" items={d.categories.income.map((c) => ({ label: c.name, value: c.total }))} />
            </ChartCard>
            {/* D */}
            <ChartCard title="Evolução dos dízimos" subtitle="Total mensal de dízimos" state={trend}>
              <XYChart labels={points.map((p) => p.label)} ariaLabel="Evolução dos dízimos" bars={[{ name: 'Dízimos', color: COLORS.balance, values: points.map((p) => p.tithes) }]} />
              <p className="mt-2 text-xs text-ink/60">No período filtrado: <strong>{brl(k.current.tithes)}</strong>{k.changes.tithes.hasBase ? ` (${k.changes.tithes.percent > 0 ? '+' : ''}${pctBR(k.changes.tithes.percent)} vs. anterior)` : ' (sem base de comparação)'}.{trend.data?.highlights?.highestTithes?.value > 0 && <> Maior arrecadação: <strong>{trend.data.highlights.highestTithes.label}</strong>.</>}</p>
            </ChartCard>
            {/* E */}
            <ChartCard title="Evolução das ofertas" subtitle="Total mensal de ofertas" state={trend}>
              <XYChart labels={points.map((p) => p.label)} ariaLabel="Evolução das ofertas" bars={[{ name: 'Ofertas', color: COLORS.income, values: points.map((p) => p.offerings) }]} />
              <p className="mt-2 text-xs text-ink/60">No período filtrado: <strong>{brl(k.current.offerings)}</strong>{k.changes.offerings.hasBase ? ` (${k.changes.offerings.percent > 0 ? '+' : ''}${pctBR(k.changes.offerings.percent)} vs. anterior)` : ' (sem base de comparação)'}.{trend.data?.highlights?.highestOfferings?.value > 0 && <> Maior arrecadação: <strong>{trend.data.highlights.highestOfferings.label}</strong>.</>}</p>
            </ChartCard>
            {/* F */}
            <ChartCard title="Despesas por categoria" subtitle="Período atual × período anterior">
              <HBars color={COLORS.balance} showPrevious items={d.categories.expense.map((c) => ({ label: c.name, value: c.total, previous: c.previousTotal }))} />
            </ChartCard>
            {/* J */}
            <ChartCard title="Distribuição das contribuições" subtitle="Lançamentos e valores por categoria de receita">
              {d.categories.income.filter((c) => c.total > 0).length === 0 ? <ChartEmpty /> : (
                <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                  <thead className="text-xs text-ink/50"><tr><th className="py-2 font-medium">Categoria</th><th className="py-2 text-right font-medium">Lanç.</th><th className="py-2 text-right font-medium">Total</th><th className="py-2 text-right font-medium">Média</th></tr></thead>
                  <tbody>{d.categories.income.filter((c) => c.total > 0).map((c) => (
                    <tr key={c.name} className="border-t border-ink/5"><td className="py-2 text-ink/80">{c.name}</td><td className="py-2 text-right">{intBR(c.count)}</td><td className="py-2 text-right font-medium">{brl(c.total)}</td><td className="py-2 text-right text-ink/70">{brl(c.average)}</td></tr>))}</tbody></table></div>)}
            </ChartCard>
          </div>

          {/* G — fluxo de caixa */}
          <ChartCard title="Fluxo de caixa" subtitle={`Entradas, saídas e saldo final por ${GRAN_NAME[d.period.granularity]} • saldo inicial do período: ${brl(d.balances.opening)}`}>
            {d.hasData ? (
              <div className="space-y-5">
                <div>
                  <Legend items={[{ name: 'Entradas', color: COLORS.income }, { name: 'Saídas', color: COLORS.expense }]} />
                  <XYChart labels={d.series.map((s) => s.label)} ariaLabel="Entradas e saídas" minSlot={d.series.length > 40 ? 18 : 30} height={220}
                    bars={[{ name: 'Entradas', color: COLORS.income, values: d.series.map((s) => s.income) }, { name: 'Saídas', color: COLORS.expense, values: d.series.map((s) => s.expense) }]} />
                </div>
                <div>
                  <Legend items={[{ name: 'Saldo final (acumulado)', color: COLORS.balance }]} />
                  <XYChart labels={d.series.map((s) => s.label)} ariaLabel="Saldo final" minSlot={d.series.length > 40 ? 18 : 30} height={200}
                    lines={[{ name: 'Saldo final (acumulado)', color: COLORS.balance, values: d.series.map((s) => s.closing) }]} />
                </div>
              </div>) : <ChartEmpty />}
          </ChartCard>

          {/* H — comparativo anual */}
          <ChartCard title={`Comparativo anual — ${yoyYear} × ${yoyYear - 1}`} subtitle="Mês a mês (meses futuros ficam em branco)" state={yoyLoading ? { loading: true } : (yoyA.error || yoyB.error ? { error: yoyA.error || yoyB.error } : null)}
            actions={<Toggle value={yoyMetric} onChange={setYoyMetric} options={[['income', 'Receitas'], ['expense', 'Despesas'], ['balance', 'Saldo']]} />}>
            <Legend items={[{ name: String(yoyYear), color: COLORS.income }, { name: String(yoyYear - 1), color: COLORS.previous }]} />
            <XYChart labels={MONTH_SHORT} ariaLabel="Comparativo anual" minSlot={42}
              bars={[{ name: String(yoyYear), color: COLORS.income, values: monthsOf(yoyA.data, yoyYear) }, { name: String(yoyYear - 1), color: COLORS.previous, values: monthsOf(yoyB.data, yoyYear - 1) }]} />
          </ChartCard>

          {/* I — crescimento */}
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Crescimento das receitas" subtitle="Variação % sobre o mês anterior" state={trend}>
              <XYChart percentAxis labels={points.map((p) => p.label)} ariaLabel="Crescimento das receitas" lines={[{ name: 'Receitas', color: COLORS.income, values: points.map((p) => p.incomeGrowth ?? null) }]} />
            </ChartCard>
            <ChartCard title="Crescimento das despesas" subtitle="Variação % sobre o mês anterior" state={trend}>
              <XYChart percentAxis labels={points.map((p) => p.label)} ariaLabel="Crescimento das despesas" lines={[{ name: 'Despesas', color: COLORS.expense, values: points.map((p) => p.expenseGrowth ?? null) }]} />
            </ChartCard>
          </div>
          <p className="text-xs text-ink/45">Meses sem base de comparação (mês anterior sem movimento) não têm percentual e aparecem como lacuna.</p>
        </>
      )}

      <div id="relatorios"><ReportPanel dashFrom={validRange ? range.from : ''} dashTo={validRange ? range.to : ''} dashCompare={compare} /></div>
      {validRange && <MovementsTable from={range.from} to={range.to} refreshKey={refreshKey} />}
    </div>
  );
}
