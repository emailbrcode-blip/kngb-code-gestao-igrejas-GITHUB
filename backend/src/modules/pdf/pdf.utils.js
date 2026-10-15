import PDFDocument from 'pdfkit';

// Gera um PDF padronizado: nome da igreja, título, período, data de
// geração, conteúdo (via callback) e rodapé com paginação — usado por
// todos os relatórios em PDF, pra nunca ter dois formatos diferentes.
export function buildPdfReport({ churchName, title, periodLabel, renderContent }, res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Cabeçalho
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#17181A').text(churchName, { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(13).text(title, { align: 'center' });
  if (periodLabel) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor('#555').text(periodLabel, { align: 'center' });
  }
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(8).fillColor('#888')
    .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
  doc.moveDown(1);
  doc.strokeColor('#B09E88').lineWidth(1).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
  doc.moveDown(0.8);
  doc.fillColor('#17181A');

  renderContent(doc);

  // Rodapé com paginação em todas as páginas geradas
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.font('Helvetica').fontSize(8).fillColor('#999')
      .text(`Página ${i + 1} de ${range.count} — ${churchName}`, 48, 800, { align: 'center', width: 499 });
  }

  doc.end();
}

// Tabela simples (cabeçalho + linhas) — o suficiente para relatórios
// administrativos, sem exagerar em estilização.
export function drawTable(doc, { columns, rows }) {
  const startX = 48;
  let y = doc.y;
  const colWidth = 499 / columns.length;

  doc.font('Helvetica-Bold').fontSize(9);
  columns.forEach((col, i) => doc.text(col, startX + i * colWidth, y, { width: colWidth }));
  y += 16;
  doc.moveTo(startX, y).lineTo(startX + 499, y).strokeColor('#ddd').stroke();
  y += 6;

  doc.font('Helvetica').fontSize(9);
  rows.forEach((row) => {
    if (y > 760) { doc.addPage(); y = 48; }
    row.forEach((cell, i) => doc.text(String(cell ?? '—'), startX + i * colWidth, y, { width: colWidth }));
    y += 16;
  });

  doc.y = y + 10;
}
