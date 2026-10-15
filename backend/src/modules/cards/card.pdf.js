import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// Carteirinha de membro — formato ID-1 (85,60 × 53,98 mm), horizontal, frente e verso
// em duas páginas. Tudo é desenhado com elementos vetoriais + campos dinâmicos
// (nada de imagem achatada com os dados). Cores: preto, cinza, branco e
// detalhes metálicos (prata). O nome da igreja vem do cadastro (subject.churchName).

const MM = 72 / 25.4;
export const CARD_W = 85.6 * MM;   // ≈ 242,65 pt
export const CARD_H = 53.98 * MM;  // ≈ 153,02 pt

const here = path.dirname(fileURLToPath(import.meta.url));
const EMBLEM = fs.readFileSync(path.join(here, '../../assets/emblem-cross.png'));

const C = {
  black: '#050505', navy: '#111111', blue: '#2B2B2B', metal: '#6B6B6B', sky: '#D0D0D0',
  silver1: '#F5F5F5', silver2: '#A0A0A0', silver3: '#707070', white: '#FFFFFF', ink: '#111111', gray: '#6B7280', light: '#F2F2F2',
};

const fmtDate = (d) => {
  if (!d) return '—';
  const s = new Date(d).toISOString().slice(0, 10); // datas de calendário em UTC
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
};
const fmtDateTime = (d) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' });

function metalGradient(doc, x1, y1, x2, y2) {
  return doc.linearGradient(x1, y1, x2, y2).stop(0, C.silver1).stop(0.35, C.silver2).stop(0.55, C.silver1).stop(1, C.silver3);
}

// Ajusta o tamanho da fonte para o texto caber em `maxLines` linhas.
function fitText(doc, text, font, startSize, minSize, width, maxLines) {
  let size = startSize;
  doc.font(font);
  while (size > minSize) {
    doc.fontSize(size);
    const lines = Math.ceil(doc.widthOfString(text) / width);
    if (lines <= maxLines && doc.heightOfString(text, { width }) <= size * 1.25 * maxLines) break;
    size -= 0.4;
  }
  return size;
}

function drawQr(doc, text, x, y, size) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size; const quiet = 2; const unit = size / (n + quiet * 2);
  doc.roundedRect(x, y, size, size, 3).fill(C.white);
  doc.fillColor(C.black);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) doc.rect(x + (c + quiet) * unit, y + (r + quiet) * unit, unit + 0.15, unit + 0.15).fill();
}

function placeholderSilhouette(doc, x, y, w, h, label) {
  doc.roundedRect(x, y, w, h, 3).fill('#2A2A2A');
  doc.fillColor('#444444');
  doc.circle(x + w / 2, y + h * 0.36, w * 0.2).fill();
  doc.save(); doc.roundedRect(x, y, w, h, 3).clip();
  doc.ellipse(x + w / 2, y + h * 0.95, w * 0.42, h * 0.3).fill('#444444'); doc.restore();
  doc.save().opacity(0.85).rect(x, y + h - 17, w, 11).fill(C.black).restore();
  doc.fillColor(C.silver1).font('Helvetica-Bold').fontSize(4.6).text(label, x + 1, y + h - 13.6, { width: w - 2, align: 'center', lineBreak: false });
}

function drawFront(doc, d) {
  const W = CARD_W; const H = CARD_H;
  // fundo escuro com gradiente diagonal
  doc.rect(0, 0, W, H).fill(doc.linearGradient(0, 0, W, H).stop(0, C.black).stop(0.55, C.navy).stop(1, C.blue));
  // marca d'água: arcos concêntricos (remete ao emblema)
  doc.save().opacity(0.16).lineWidth(1.2).strokeColor(C.metal);
  doc.ellipse(W * 0.78, H * 0.62, 95, 52).stroke(); doc.ellipse(W * 0.78, H * 0.62, 78, 42).stroke(); doc.ellipse(W * 0.78, H * 0.62, 61, 32).stroke(); doc.restore();
  // faixa metálica lateral e filetes
  doc.rect(0, 0, 8, H).fill(metalGradient(doc, 0, 0, 8, H));
  doc.rect(8, 0, 1.2, H).fill(C.metal);
  doc.rect(0, H - 6, W, 6).fill(doc.linearGradient(0, 0, W, 0).stop(0, C.metal).stop(0.5, C.silver2).stop(1, C.blue));

  // emblema + cabeçalho
  doc.save(); doc.roundedRect(17, 9, 33, 33, 4).clip(); doc.image(EMBLEM, 17, 9, { width: 33, height: 33 }); doc.restore();
  doc.roundedRect(17, 9, 33, 33, 4).lineWidth(0.6).stroke(C.silver2);
  const churchLabel = String(d.churchName || '').toUpperCase();
  const churchSize = fitText(doc, churchLabel, 'Helvetica-Bold', 9.5, 5.4, W - 66, 3);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(churchSize).text(churchLabel, 57, 13, { width: W - 66, height: 30, lineGap: 0.5, ellipsis: true });
  doc.fillColor(C.silver2).font('Helvetica').fontSize(4.6).text('CARTEIRA DE IDENTIFICAÇÃO ECLESIÁSTICA', 17, 47, { characterSpacing: 0.8, lineBreak: false });

  // categoria
  const cat = d.category.toUpperCase();
  doc.font('Helvetica-Bold').fontSize(7.4);
  const catW = Math.min(doc.widthOfString(cat, { characterSpacing: 1 }) + 16, 130);
  doc.roundedRect(17, 57, catW, 13, 6.5).fill(doc.linearGradient(17, 57, 17 + catW, 70).stop(0, C.metal).stop(1, C.blue));
  doc.fillColor(C.white).fontSize(7.4).text(cat, 17, 60.6, { width: catW, align: 'center', characterSpacing: 1, lineBreak: false });

  // nome
  const nameW = 140;
  const size = fitText(doc, d.name, 'Helvetica-Bold', 12, 7.4, nameW, 2);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(size).text(d.name, 17, 75, { width: nameW, lineGap: 0 });
  const afterName = doc.y;

  // dados
  let y = Math.max(afterName + 3, 92);
  const row = (label, value) => {
    if (!value) return;
    doc.fillColor(C.silver2).font('Helvetica').fontSize(4.7).text(label.toUpperCase(), 17, y, { characterSpacing: 0.6, lineBreak: false });
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(6.4).text(String(value), 17, y + 5.2, { width: 138, lineBreak: false, ellipsis: true });
    y += 14;
  };
  row(d.kind === 'worker' ? 'Função' : 'Cargo', d.roles.join(' • '));
  if (y < H - 24) row('Ministério', d.ministry);

  // RMA
  doc.fillColor(C.silver2).font('Helvetica').fontSize(4.6).text('REGISTRO', 17, H - 25, { characterSpacing: 0.8, lineBreak: false });
  doc.fillColor(C.sky).font('Helvetica-Bold').fontSize(11.5).text(d.rma, 17, H - 19.5, { characterSpacing: 0.8, lineBreak: false });

  // foto 3x4 com moldura metálica
  const px = 165; const py = 36; const pw = 63; const ph = 84;
  doc.roundedRect(px - 2.2, py - 2.2, pw + 4.4, ph + 4.4, 4.5).fill(metalGradient(doc, px, py, px + pw, py + ph));
  if (d.photo?.image) {
    doc.save(); doc.roundedRect(px, py, pw, ph, 3).clip();
    doc.image(d.photo.image.buffer, px, py, { cover: [pw, ph], align: 'center', valign: 'center' }); doc.restore();
  } else {
    placeholderSilhouette(doc, px, py, pw, ph, d.photo?.status === 'error' ? 'FOTO INDISPONÍVEL' : 'FOTO NÃO CADASTRADA');
  }
  doc.fillColor(C.silver1).font('Helvetica-Bold').fontSize(5.2).text(d.statusLabel.toUpperCase(), px - 4, py + ph + 6, { width: pw + 8, align: 'center', characterSpacing: 1, lineBreak: false });
}

function drawBack(doc, d) {
  const W = CARD_W; const H = CARD_H;
  doc.addPage({ size: [W, H], margin: 0 });
  doc.rect(0, 0, W, H).fill(doc.linearGradient(0, 0, W, H).stop(0, C.white).stop(1, C.light));
  // marca d'água do emblema
  doc.save().opacity(0.07).lineWidth(1.4).strokeColor(C.metal);
  doc.ellipse(W * 0.72, H * 0.62, 100, 56).stroke(); doc.ellipse(W * 0.72, H * 0.62, 82, 45).stroke(); doc.ellipse(W * 0.72, H * 0.62, 64, 34).stroke(); doc.restore();
  // faixa superior
  doc.rect(0, 0, W, 24).fill(doc.linearGradient(0, 0, W, 0).stop(0, C.black).stop(0.6, C.navy).stop(1, C.blue));
  doc.rect(0, 24, W, 1.6).fill(metalGradient(doc, 0, 24, W, 25.6));
  doc.save(); doc.roundedRect(9, 4, 16, 16, 2.5).clip(); doc.image(EMBLEM, 9, 4, { width: 16, height: 16 }); doc.restore();
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(fitText(doc, String(d.churchName || '').toUpperCase(), 'Helvetica-Bold', 7.6, 4.8, W - 40, 1)).text(String(d.churchName || '').toUpperCase(), 31, 6.5, { width: W - 40, lineBreak: false, ellipsis: true });
  doc.fillColor(C.sky).font('Helvetica').fontSize(4.7).text('CARTEIRA DE IDENTIFICAÇÃO', 31, 15.5, { characterSpacing: 0.6, lineBreak: false });

  // QR Code
  const qs = 62;
  drawQr(doc, d.verifyUrl, 12, 36, qs);
  doc.roundedRect(12, 36, qs, qs, 3).lineWidth(0.6).stroke(C.silver2);
  doc.fillColor(C.gray).font('Helvetica').fontSize(4.6).text('Escaneie para validar', 8, 36 + qs + 3, { width: qs + 8, align: 'center', lineBreak: false });
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(5).text(d.rma, 8, 36 + qs + 10, { width: qs + 8, align: 'center', lineBreak: false, characterSpacing: 0.6 });

  // dados do titular
  const x = 90; let y = 33;
  const item = (label, value) => {
    doc.fillColor(C.gray).font('Helvetica').fontSize(4.5).text(label.toUpperCase(), x, y, { characterSpacing: 0.5, lineBreak: false });
    const text = String(value ?? '—'); const wMax = W - x - 10;
    const fs2 = fitText(doc, text, 'Helvetica-Bold', 6.3, 4.4, wMax, 1);
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(fs2).text(text, x, y + 5, { width: wMax, lineBreak: false, ellipsis: true });
    y += 13.2;
  };
  item('Titular', d.name);
  item('Categoria', d.category);
  item(d.kind === 'worker' ? 'Função' : 'Cargo / função', d.roles.join(' • ') || d.category);
  if (d.ministry) item('Ministério', d.ministry);
  item('Entrada na igreja', fmtDate(d.joinDate));
  item('Situação', d.statusLabel);
  // Emissão + código em uma linha
  doc.fillColor(C.gray).font('Helvetica').fontSize(4.5).text('EMISSÃO', x, y, { characterSpacing: 0.5, lineBreak: false });
  doc.text('CÓDIGO', x + 55, y, { characterSpacing: 0.5, lineBreak: false });
  doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(6.3).text(fmtDateTime(d.issuedAt), x, y + 5, { lineBreak: false });
  doc.text(d.shortCode, x + 55, y + 5, { lineBreak: false });

  // rodapé
  doc.rect(0, H - 13, W, 13).fill(doc.linearGradient(0, 0, W, 0).stop(0, C.black).stop(1, C.blue));
  doc.fillColor(C.silver1).font('Helvetica').fontSize(4.3).text('Documento de identificação eclesiástica. Válido somente com a confirmação pelo QR Code.', 6, H - 9, { width: W - 12, align: 'center', lineBreak: false });
}

// Gera o PDF (2 páginas: frente e verso) e envia na resposta.
export function renderCardPdf({ subject, card, photo, verifyUrl }, res, filename) {
  const doc = new PDFDocument({ size: [CARD_W, CARD_H], margin: 0, info: { Title: `Carteirinha ${subject.rma}`, Author: subject.churchName || 'BrCode' } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  const data = { ...subject, photo, verifyUrl, issuedAt: card.lastIssuedAt, shortCode: card.code.replace(/-/g, '').slice(0, 10).toUpperCase() };
  drawFront(doc, data);
  drawBack(doc, data);
  doc.end();
}
