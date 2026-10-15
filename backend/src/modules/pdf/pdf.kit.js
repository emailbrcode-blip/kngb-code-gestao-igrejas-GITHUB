import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

// Kit ÚNICO de PDF dos relatórios (finanças, membros, obreiros…): mesmo cabeçalho com
// emblema, cartões, tabelas, gráficos e rodapé. Recebe um "modelo de relatório":
//   { churchName, title, periodLabel, filtersLabel?, generatedAt, blocks: [...] }
// Blocos: kpis | table | chart (bars/line/share) | text | heading.
// Renderiza o modelo de relatório em PDF A4.
// Cabeçalho, cartões de indicadores, tabelas com quebra de página (cabeçalho
// repetido), gráficos vetoriais (barras, linha, composição) e rodapé
// "Página x de y".

const EMBLEM = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/emblem-cross.png'));
const formatBR = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

const M = 40;                 // margem
const W = 595.28 - M * 2;     // largura útil
const BOTTOM = 842 - M - 24;  // limite inferior do conteúdo
const BLUE = '#111111';
const INK = '#111827';
const GRAY = '#6B7280';
const LINE = '#D1D5DB';

export const money = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—'
  : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' '));
const int = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR'));
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(1).replace('.', ',')}%`);

export function formatCell(value, format, rowFormat) {
  // _format (por linha) só substitui colunas numéricas de valor, nunca texto nem %.
  const f = format && format !== 'percent' && format !== 'date' && rowFormat ? rowFormat : format;
  if (f === 'money') return money(value);
  if (f === 'int') return int(value);
  if (f === 'percent') return pct(value);
  if (f === 'date') return value ? formatBR(String(value).slice(0, 10)) : '—';
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

const shortMoney = (v) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (a >= 1_000) return `${(v / 1_000).toFixed(1).replace('.', ',')} mil`;
  return String(Math.round(v));
};

// Escala "bonita": passo em 1, 2, 2,5, 5 ou 10 × 10^k.
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

function ensure(doc, h) {
  if (doc.y + h > BOTTOM) { doc.addPage(); doc.y = M; }
}

function drawHeader(doc, report) {
  doc.rect(0, 0, 595.28, 8).fill(BLUE);
  doc.save(); doc.roundedRect(M, 22, 40, 40, 6).clip(); doc.image(EMBLEM, M, 22, { width: 40, height: 40 }); doc.restore();
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(16).text(report.churchName, M + 50, 24, { width: W - 100, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BLUE).text(report.title, M + 50, doc.y + 3, { width: W - 100, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(report.periodLabel, M, Math.max(doc.y + 4, 66), { width: W, align: 'center' });
  if (report.filtersLabel) doc.fontSize(8).text(report.filtersLabel, M, doc.y + 1, { width: W, align: 'center' });
  doc.fontSize(8).text(`Gerado em ${new Date(report.generatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, M, doc.y + 2, { width: W, align: 'center' });
  doc.moveTo(M, doc.y + 8).lineTo(M + W, doc.y + 8).strokeColor(LINE).lineWidth(1).stroke();
  doc.y += 18;
}

function drawKpis(doc, items) {
  const cols = 3; const gap = 10; const w = (W - gap * (cols - 1)) / cols; const h = 52;
  let rowY = doc.y;
  items.forEach((it, i) => {
    const col = i % cols;
    if (col === 0) { ensure(doc, h + gap); rowY = doc.y; }
    const x = M + col * (w + gap); const y = rowY;
    doc.roundedRect(x, y, w, h, 4).fillAndStroke('#F3F4F6', LINE);
    doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(it.label, x + 8, y + 7, { width: w - 16, lineBreak: false });
    const color = it.tone === 'pos' ? BLUE : it.tone === 'neg' ? '#B91C1C' : INK;
    doc.fillColor(color).font('Helvetica-Bold').fontSize(13).text(it.format === 'int' ? int(it.value) : money(it.value), x + 8, y + 20, { width: w - 16, lineBreak: false });
    if (it.note) doc.fillColor(GRAY).font('Helvetica').fontSize(7).text(it.note, x + 8, y + 40, { width: w - 16, lineBreak: false });
    if (col === cols - 1 || i === items.length - 1) doc.y = rowY + h + gap;
  });
}

function drawTitle(doc, text) {
  ensure(doc, 40);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(text, M, doc.y, { width: W });
  doc.y += 4;
}

function colWidths(columns) {
  const weight = (c) => (c.w ? c.w : c.key === 'description' ? 2.6 : c.key === 'label' || c.key === 'name' || c.key === 'category' ? 1.8 : c.format === 'date' ? 0.95 : c.format === 'int' ? 0.7 : c.key === 'typeLabel' ? 0.9 : 1.15);
  const ws = columns.map(weight); const total = ws.reduce((a, b) => a + b, 0);
  return ws.map((x) => (x / total) * W);
}

function drawTable(doc, { title, columns, rows, footer, fontSize: tableFont }) {
  const rowFont = tableFont || 8;
  if (title) drawTitle(doc, title);
  const widths = colWidths(columns);
  const pad = 4;
  const header = () => {
    ensure(doc, 40);
    const y = doc.y;
    doc.rect(M, y, W, 18).fill(BLUE);
    let x = M;
    columns.forEach((c, i) => { doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8).text(c.label, x + pad, y + 5, { width: widths[i] - pad * 2, align: c.align || 'left', lineBreak: false }); x += widths[i]; });
    doc.y = y + 18;
  };
  const drawRow = (row, i, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(rowFont);
    const texts = columns.map((c) => formatCell(row[c.key], c.format, row._format));
    const h = Math.max(...texts.map((t, k) => doc.heightOfString(t, { width: widths[k] - pad * 2 })), 9) + 8;
    if (doc.y + h > BOTTOM) { doc.addPage(); doc.y = M; header(); }
    const y = doc.y;
    if (bold) doc.rect(M, y, W, h).fill('#E5E7EB'); else if (i % 2 === 1) doc.rect(M, y, W, h).fill('#F9FAFB');
    let x = M;
    texts.forEach((t, k) => {
      const c = columns[k];
      const neg = c.format === 'money' && typeof row[c.key] === 'number' && row[c.key] < 0;
      doc.fillColor(neg ? '#B91C1C' : (row._tone === 'muted' ? GRAY : INK)).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(rowFont).text(t, x + pad, y + 4, { width: widths[k] - pad * 2, align: c.align || 'left' });
      x += widths[k];
    });
    doc.y = y + h;
  };
  header();
  rows.forEach((r, i) => drawRow(r, i, false));
  if (footer) drawRow(footer, 0, true);
  doc.moveTo(M, doc.y).lineTo(M + W, doc.y).strokeColor(LINE).lineWidth(0.5).stroke();
  doc.y += 14;
}

function drawLegend(doc, series, x, y) {
  let cx = x;
  series.forEach((s) => {
    doc.rect(cx, y + 1, 8, 8).fill(s.color);
    doc.fillColor(INK).font('Helvetica').fontSize(8).text(s.name, cx + 12, y + 1, { lineBreak: false });
    cx += 24 + doc.widthOfString(s.name);
  });
}

function drawBars(doc, { title, labels, series }) {
  const h = 150; ensure(doc, h + 56); drawTitle(doc, title);
  drawLegend(doc, series, M, doc.y); doc.y += 14;
  const top = doc.y; const left = M + 46; const plotW = W - 46; const plotH = h - 22;
  const allV = series.flatMap((s) => s.values.map((v) => v || 0));
  const { lo, hi: max, ticks } = niceScale(Math.min(...allV, 0), Math.max(...allV, 0));
  const range = max - lo; const yOf = (v) => top + plotH - ((v - lo) / range) * plotH;
  for (const v of ticks) {
    const gy = yOf(v);
    doc.moveTo(left, gy).lineTo(left + plotW, gy).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(7).text(shortMoney(v), M, gy - 3, { width: 42, align: 'right', lineBreak: false });
  }
  const n = labels.length; const slot = plotW / n; const bw = Math.min(26, (slot * 0.7) / series.length);
  const every = Math.ceil(n / 14);
  labels.forEach((lab, i) => {
    const gx = left + slot * i + (slot - bw * series.length) / 2;
    series.forEach((s, k) => {
      const v = s.values[i] || 0; const y0 = yOf(0); const y1 = yOf(v);
      doc.rect(gx + k * bw, Math.min(y0, y1), bw - 1, Math.max(Math.abs(y1 - y0), v ? 0.6 : 0)).fill(s.color);
    });
    if (i % every === 0) doc.fillColor(GRAY).font('Helvetica').fontSize(7).text(lab, left + slot * i - 4, top + plotH + 4, { width: slot + 8, align: 'center', lineBreak: false });
  });
  doc.y = top + h + 4;
}

function drawLine(doc, { title, labels, series }) {
  const h = 150; ensure(doc, h + 56); drawTitle(doc, title);
  drawLegend(doc, series, M, doc.y); doc.y += 14;
  const top = doc.y; const left = M + 46; const plotW = W - 46; const plotH = h - 22;
  const vals = series.flatMap((s) => s.values.map((v) => v || 0));
  const { lo, hi: max, ticks } = niceScale(Math.min(...vals, 0), Math.max(...vals, 0));
  const range = (max - lo) || 1;
  const yOf = (v) => top + plotH - ((v - lo) / range) * plotH;
  for (const v of ticks) {
    const gy = yOf(v);
    doc.moveTo(left, gy).lineTo(left + plotW, gy).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(7).text(shortMoney(v), M, gy - 3, { width: 42, align: 'right', lineBreak: false });
  }
  const n = labels.length; const xOf = (i) => (n === 1 ? left + plotW / 2 : left + (plotW * i) / (n - 1)); const every = Math.ceil(n / 12);
  series.forEach((s) => {
    doc.strokeColor(s.color).lineWidth(1.6);
    s.values.forEach((v, i) => (i === 0 ? doc.moveTo(xOf(i), yOf(v || 0)) : doc.lineTo(xOf(i), yOf(v || 0))));
    doc.stroke();
    s.values.forEach((v, i) => doc.circle(xOf(i), yOf(v || 0), 2).fill(s.color));
  });
  labels.forEach((lab, i) => { if (i % every === 0) doc.fillColor(GRAY).font('Helvetica').fontSize(7).text(lab, xOf(i) - 25, top + plotH + 4, { width: 50, align: 'center', lineBreak: false }); });
  doc.y = top + h + 4;
}

function drawShare(doc, { title, items }) {
  ensure(doc, 30 + Math.min(items.length, 4) * 16); drawTitle(doc, title);
  const palette = ['#111111', '#4B5563', '#6B7280', '#9CA3AF', '#374151', '#D1D5DB', '#1F2937', '#E5E7EB'];
  const barMax = 190;
  items.forEach((it, i) => {
    ensure(doc, 16);
    const y = doc.y;
    doc.fillColor(INK).font('Helvetica').fontSize(8).text(it.label, M, y + 2, { width: 150, lineBreak: false });
    doc.rect(M + 156, y + 2, Math.max((it.share / 100) * barMax, 1), 8).fill(palette[i % palette.length]);
    doc.fillColor(INK).text(`${money(it.value)}  (${pct(it.share)})`, M + 156 + barMax + 8, y + 2, { width: W - 156 - barMax - 8, lineBreak: false });
    doc.y = y + 15;
  });
  doc.y += 8;
}

export function renderReportPdf(report, res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: report.title, Author: report.churchName } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  drawHeader(doc, report);
  for (const block of report.blocks) {
    if (block.kind === 'kpis') drawKpis(doc, block.items);
    else if (block.kind === 'table') drawTable(doc, block);
    else if (block.kind === 'chart') {
      if (block.chart === 'bars') drawBars(doc, block);
      else if (block.chart === 'line') drawLine(doc, block);
      else drawShare(doc, block);
    } else if (block.kind === 'heading') {
      ensure(doc, 44);
      doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(11.5).text(block.text, M, doc.y + 4, { width: W });
      if (block.sub) doc.fillColor(GRAY).font('Helvetica').fontSize(8.5).text(block.sub, M, doc.y + 1, { width: W });
      doc.moveTo(M, doc.y + 3).lineTo(M + W, doc.y + 3).strokeColor(BLUE).lineWidth(0.8).stroke();
      doc.y += 9;
    } else if (block.kind === 'text') {
      ensure(doc, 30);
      doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(9).text(block.text, M, doc.y, { width: W });
      doc.y += 10;
    }
  }

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // permite escrever no rodapé sem gerar página nova
    doc.moveTo(M, 812).lineTo(M + W, 812).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font('Helvetica').fontSize(8)
      .text(`${report.churchName} — Confidencial`, M, 818, { width: W / 2 + 40, lineBreak: false })
      .text(`Página ${i + 1} de ${range.count}`, M + W / 2 + 40, 818, { width: W / 2 - 40, align: 'right', lineBreak: false });
  }
  doc.end();
}
