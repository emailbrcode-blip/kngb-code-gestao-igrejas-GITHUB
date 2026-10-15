// Formatação pt-BR compartilhada pelo dashboard (tela e pré-visualização).
export const brl = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—'
  : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
export const intBR = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR'));
export const pctBR = (v) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(1).replace('.', ',')}%`);
export function brlShort(v) {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (a >= 1_000) return `${(v / 1_000).toFixed(1).replace('.', ',')} mil`;
  return String(Math.round(v));
}
// "YYYY-MM-DD" → "DD/MM/YYYY" sem passar por Date (sem deslocamento de fuso).
export const fmtISO = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—');

// Mesma regra do PDF: _format (por linha) só vale para colunas numéricas.
export function formatCell(value, format, rowFormat) {
  const f = format && format !== 'percent' && format !== 'date' && rowFormat ? rowFormat : format;
  if (f === 'money') return brl(value);
  if (f === 'int') return intBR(value);
  if (f === 'percent') return pctBR(value);
  if (f === 'date') return fmtISO(String(value || '').slice(0, 10));
  return value === null || value === undefined || value === '' ? '—' : String(value);
}
