// Baixa o PDF da carteirinha e devolve o aviso sobre a foto (o PDF sai mesmo sem foto).
export async function downloadCardPdf(fetchPdf, id, filenameBase) {
  const response = await fetchPdf(id);
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${filenameBase}.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const status = response.headers?.['x-photo-status'] || 'ok';
  let message = '';
  try { message = decodeURIComponent(response.headers?.['x-photo-message'] || ''); } catch { message = ''; }
  return { photoStatus: status, photoMessage: message };
}
export const formatRma = (n) => (n || n === 0 ? `RMA-${String(n).padStart(6, '0')}` : '—');
