import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Loading } from '../../../components/ui/Loading';
import { listFinanceCategoriesRequest } from '../../../lib/appServices';
import { getFinanceReportPreview, getFinanceReportPdf, apiErrorMessage } from '../../../lib/financeDashboardService';
import { XYChart, Legend, DonutChart } from './charts';
import { brl, fmtISO, formatCell, intBR } from './format';
import { MONTH_NAMES, currentYear, resolvePreset, yearRange } from './periods';

const TYPES = [
  ['complete', '1. Relatório financeiro completo'], ['income', '2. Relatório de receitas'], ['expense', '3. Relatório de despesas'],
  ['tithes', '4. Relatório de dízimos'], ['offerings', '5. Relatório de ofertas'], ['cashflow', '6. Relatório de fluxo de caixa'],
  ['comparative', '7. Relatório comparativo entre períodos'], ['annual', '8. Relatório anual'], ['semiannual', '9. Relatório semestral'],
  ['monthly', '10. Relatório mensal'], ['categories', '11. Relatório de categorias financeiras'],
];
const PERIOD_KINDS = [['dashboard', 'Período do dashboard'], ['week', 'Semana específica'], ['month', 'Mês específico'], ['quarter', 'Trimestre'], ['semester', 'Semestre'], ['year', 'Ano'], ['custom', 'Período personalizado']];
const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d + n)); return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`; };

// Mesmos blocos que viram o PDF, mostrados na tela para conferência.
function ReportBlocks({ report }) {
  return (
    <div className="space-y-6">
      {report.blocks.map((b, i) => {
        if (b.kind === 'kpis') return (
          <div key={i} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {b.items.map((k) => (
              <div key={k.label} className="rounded-lg border border-ink/10 bg-canvas p-3">
                <p className="text-xs text-ink/50">{k.label}</p>
                <p className={`mt-1 font-display text-base ${k.tone === 'neg' ? 'text-danger' : k.tone === 'pos' ? 'text-metal-dark' : 'text-ink'}`}>{k.format === 'int' ? intBR(k.value) : brl(k.value)}</p>
                {k.note && <p className="mt-0.5 text-[11px] text-ink/45">{k.note}</p>}
              </div>))}
          </div>);
        if (b.kind === 'text') return <p key={i} className="text-sm italic text-ink/55">{b.text}</p>;
        if (b.kind === 'chart' && b.chart === 'share') return (
          <div key={i}><h4 className="mb-2 text-sm font-semibold text-ink">{b.title}</h4><DonutChart items={b.items.map((x) => ({ label: x.label, value: x.value }))} /></div>);
        if (b.kind === 'chart') return (
          <div key={i}><h4 className="mb-2 text-sm font-semibold text-ink">{b.title}</h4><Legend items={b.series} />
            <XYChart labels={b.labels} height={220} ariaLabel={b.title}
              bars={b.chart === 'bars' ? b.series : []} lines={b.chart === 'line' ? b.series : []} /></div>);
        if (b.kind === 'table') {
          const shown = b.rows.slice(0, 100);
          return (
            <div key={i}>
              <h4 className="mb-2 text-sm font-semibold text-ink">{b.title}</h4>
              <div className="overflow-x-auto rounded-lg border border-ink/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-coal text-white"><tr>{b.columns.map((c) => <th key={c.key} className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}</tr></thead>
                  <tbody>
                    {shown.map((r, k) => (
                      <tr key={k} className="border-b border-ink/5 odd:bg-ink/[0.02]">
                        {b.columns.map((c) => <td key={c.key} className={`px-3 py-1.5 ${c.align === 'right' ? 'whitespace-nowrap text-right' : ''}`}>{formatCell(r[c.key], c.format, r._format)}</td>)}
                      </tr>))}
                    {b.footer && <tr className="bg-ink/10 font-semibold">{b.columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : ''}`}>{b.footer[c.key] === undefined ? '' : formatCell(b.footer[c.key], c.format)}</td>)}</tr>}
                  </tbody>
                </table>
              </div>
              {b.rows.length > shown.length && <p className="mt-1 text-xs text-ink/50">A prévia mostra as primeiras {shown.length} de {intBR(b.rows.length)} linhas. O PDF contém todas.</p>}
            </div>);
        }
        return null;
      })}
    </div>
  );
}

export function ReportPanel({ dashFrom, dashTo, dashCompare }) {
  const now = currentYear();
  const [type, setType] = useState('complete');
  const [kind, setKind] = useState('dashboard');
  const [weekDate, setWeekDate] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(now));
  const [quarter, setQuarter] = useState('1');
  const [semester, setSemester] = useState('1');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [category, setCategory] = useState('');
  const [compare, setCompare] = useState(false);
  const [categories, setCategories] = useState([]);
  const [preview, setPreview] = useState({ loading: false, error: '', report: null });
  const [pdf, setPdf] = useState({ loading: false, error: '', blob: null, key: '' });
  const pdfUrl = useRef('');

  useEffect(() => { listFinanceCategoriesRequest().then(setCategories).catch(() => {}); }, []);

  const range = useMemo(() => {
    const y = Number(year);
    if (kind === 'dashboard') return { from: dashFrom, to: dashTo };
    if (kind === 'week') { if (!weekDate) return { from: '', to: '' }; const [yy, mm, dd] = weekDate.split('-').map(Number); const dow = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay(); const start = addDays(weekDate, -dow); return { from: start, to: addDays(start, 6) }; }
    if (kind === 'month') return resolvePreset('month_year', { month, year });
    if (kind === 'quarter') { const m0 = (Number(quarter) - 1) * 3 + 1; return { from: `${y}-${pad(m0)}-01`, to: `${y}-${pad(m0 + 2)}-${pad(lastDay(y, m0 + 2))}` }; }
    if (kind === 'semester') return Number(semester) === 1 ? { from: `${y}-01-01`, to: `${y}-06-30` } : { from: `${y}-07-01`, to: `${y}-12-31` };
    if (kind === 'year') return yearRange(y);
    return { from: customFrom, to: customTo };
  }, [kind, weekDate, month, year, quarter, semester, customFrom, customTo, dashFrom, dashTo]);

  const params = useMemo(() => ({
    type, from: range.from, to: range.to, compare: compare ? 'true' : 'false', compareMode: dashCompare,
    ...(category ? { categorySlug: category } : {}),
  }), [type, range, compare, category, dashCompare]);
  const paramsKey = JSON.stringify(params);
  const rangeError = !range.from || !range.to ? 'Informe o período do relatório.' : range.from > range.to ? 'A data inicial não pode ser maior que a final.' : '';
  const categoryDisabled = ['tithes', 'offerings'].includes(type);

  useEffect(() => { setPreview({ loading: false, error: '', report: null }); }, [paramsKey]);
  useEffect(() => () => { if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current); }, []);

  async function handlePreview() {
    if (rangeError) { setPreview({ loading: false, error: rangeError, report: null }); return; }
    setPreview({ loading: true, error: '', report: null });
    try { setPreview({ loading: false, error: '', report: await getFinanceReportPreview(params) }); }
    catch (err) { setPreview({ loading: false, error: apiErrorMessage(err, 'Não foi possível gerar a visualização.'), report: null }); }
  }

  async function ensurePdf() {
    if (pdf.blob && pdf.key === paramsKey) return pdf.blob;
    setPdf({ loading: true, error: '', blob: null, key: '' });
    try {
      const blob = await getFinanceReportPdf(params);
      if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current);
      pdfUrl.current = URL.createObjectURL(blob);
      setPdf({ loading: false, error: '', blob, key: paramsKey });
      return blob;
    } catch (err) {
      // erro vem como Blob (responseType blob): tenta ler a mensagem
      let msg = 'Não foi possível gerar o PDF.';
      try { const txt = await err.response.data.text(); msg = JSON.parse(txt).error.message || msg; } catch { /* mantém padrão */ }
      setPdf({ loading: false, error: msg, blob: null, key: '' });
      return null;
    }
  }

  async function handleGenerate() { if (rangeError) { setPdf({ loading: false, error: rangeError, blob: null, key: '' }); return; } await ensurePdf(); }
  async function handleDownload() {
    if (rangeError) { setPdf({ loading: false, error: rangeError, blob: null, key: '' }); return; }
    const blob = await ensurePdf(); if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `financeiro-${type}-${range.from}_${range.to}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  const field = 'w-full rounded-lg border border-ink/15 px-3 py-2 text-sm';
  const pdfReady = pdf.blob && pdf.key === paramsKey;

  return (
    <Card id="relatorios" className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">📄 Gerar Relatório Financeiro em PDF</h2>
        <p className="text-sm text-ink/55">Usa os mesmos filtros e cálculos do dashboard. Confira na tela antes de gerar o documento.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-xs font-medium text-ink/60">Tipo de relatório
          <select value={type} onChange={(e) => setType(e.target.value)} className={field}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-ink/60">Período
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>{PERIOD_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-ink/60">Categoria financeira (opcional)
          <select value={categoryDisabled ? '' : category} disabled={categoryDisabled} onChange={(e) => setCategory(e.target.value)} className={`${field} disabled:bg-ink/5`}>
            <option value="">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.name} ({c.type === 'income' ? 'receita' : 'despesa'})</option>)}</select></label>

        {kind === 'week' && <label className="grid gap-1 text-xs font-medium text-ink/60">Qualquer dia da semana (dom–sáb)<input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} className={field} /></label>}
        {(kind === 'month') && <>
          <label className="grid gap-1 text-xs font-medium text-ink/60">Mês<select value={month} onChange={(e) => setMonth(e.target.value)} className={field}>{MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select></label></>}
        {kind === 'quarter' && <label className="grid gap-1 text-xs font-medium text-ink/60">Trimestre<select value={quarter} onChange={(e) => setQuarter(e.target.value)} className={field}>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>{q}º trimestre</option>)}</select></label>}
        {kind === 'semester' && <label className="grid gap-1 text-xs font-medium text-ink/60">Semestre<select value={semester} onChange={(e) => setSemester(e.target.value)} className={field}><option value="1">1º semestre</option><option value="2">2º semestre</option></select></label>}
        {['month', 'quarter', 'semester', 'year'].includes(kind) && <label className="grid gap-1 text-xs font-medium text-ink/60">Ano<select value={year} onChange={(e) => setYear(e.target.value)} className={field}>{Array.from({ length: 8 }, (_, i) => now - i).map((y) => <option key={y} value={y}>{y}</option>)}</select></label>}
        {kind === 'custom' && <>
          <label className="grid gap-1 text-xs font-medium text-ink/60">Data inicial<input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={field} /></label>
          <label className="grid gap-1 text-xs font-medium text-ink/60">Data final<input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={field} /></label></>}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Incluir comparação com o período anterior equivalente</label>
      <p className="text-xs text-ink/50">{range.from && range.to ? `Período do relatório: ${fmtISO(range.from)} a ${fmtISO(range.to)}` : 'Selecione o período.'}</p>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={handlePreview} disabled={preview.loading}>Visualizar relatório</Button>
        <Button onClick={handleGenerate} disabled={pdf.loading}>{pdf.loading ? 'Gerando…' : 'Gerar PDF'}</Button>
        <Button variant="metal" onClick={handleDownload} disabled={pdf.loading}>Baixar PDF</Button>
      </div>
      {pdf.error && <p role="alert" className="text-sm text-danger">{pdf.error}</p>}
      {pdfReady && (
        <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          PDF gerado com sucesso. <a href={pdfUrl.current} target="_blank" rel="noreferrer" className="font-medium underline">Abrir em nova aba</a> ou use “Baixar PDF”.
        </p>)}

      {preview.loading && <Loading label="Montando visualização…" />}
      {preview.error && <p role="alert" className="text-sm text-danger">{preview.error}</p>}
      {preview.report && (
        <div className="space-y-4 rounded-xl border border-ink/10 p-4">
          <div className="text-center"><p className="font-display text-lg text-ink">{preview.report.churchName}</p><p className="font-semibold text-metal-dark">{preview.report.title}</p><p className="text-xs text-ink/55">{preview.report.periodLabel}</p></div>
          <ReportBlocks report={preview.report} />
        </div>)}
    </Card>
  );
}
