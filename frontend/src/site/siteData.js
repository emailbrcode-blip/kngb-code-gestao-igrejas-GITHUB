// Camada de dados do site público (/igreja).
//
// Fonte única: a resposta de getPublicChurch(VITE_CHURCH_SLUG) —
// { church, events, worships, campaigns } — mais, opcionalmente,
// church.publicExtras (JSON com imagens, vídeos, ministérios e textos
// extras editados em "Página Pública"). Tudo que não estiver cadastrado
// cai em conteúdo genérico inicial (DEFAULT_EXTRAS), que o administrador
// pode substituir sem mexer em código.

import { formatDateBR } from '../lib/dateUtils';

export const DEFAULT_EXTRAS = {
  siteName: '', // vazio: usa o nome da igreja cadastrada (church.name)
  logoUrl: '',
  heroTitle: 'Uma casa para adorar, aprender e pertencer.',
  heroMessage: '',
  heroImage: '/site/hero-worship.jpg',
  heroButtonLabel: 'Conheça nossa igreja',
  heroButtonUrl: '#igreja',
  verseText: 'Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.',
  verseReference: 'Salmos 119:105',
  churchImage: '/site/church-community.jpg',
  commitment:
    'Cremos que a Bíblia é a Palavra inspirada de Deus, regra de fé e prática. Tudo o que ensinamos e vivemos parte das Escrituras.',
  worshipImages: ['/site/ministry-worship.jpg', '/site/bible-study.jpg', '/site/church-community.jpg'],
  videos: [],
  ministries: [
    { name: 'Louvor e Adoração', description: 'Conduz a igreja à presença de Deus por meio da música.', leader: '', imageUrl: '/site/ministry-worship.jpg' },
    { name: 'Ministério Infantil', description: 'Ensina a Palavra às crianças com amor e criatividade.', leader: '', imageUrl: '/site/ministry-kids.jpg' },
    { name: 'Jovens', description: 'Discipulado, comunhão e propósito para a juventude.', leader: '', imageUrl: '/site/church-community.jpg' },
    { name: 'Ação Social', description: 'Serve a comunidade com assistência e cuidado.', leader: '', imageUrl: '/site/campaign-food.jpg' },
  ],
  donationsIntro:
    'Sua contribuição sustenta a obra de Deus, a manutenção da igreja e os projetos sociais. Contribua com alegria e gratidão.',
  mapEmbedUrl: '',
  links: [],
  // Fotos por id do evento / campanha: { [id]: 'link da imagem' }
  eventImages: {},
  campaignImages: {},
};

// Mescla o JSON salvo com os padrões. Listas vazias/ausentes mantêm o
// padrão só para imagens do culto e ministérios (conteúdo inicial);
// vídeos e links começam vazios e as seções ficam ocultas até existirem.
export function mergeExtras(raw) {
  let saved = raw;
  if (typeof saved === 'string') {
    try { saved = JSON.parse(saved); } catch { saved = {}; }
  }
  if (!saved || typeof saved !== 'object') saved = {};
  const out = { ...DEFAULT_EXTRAS };
  for (const key of Object.keys(DEFAULT_EXTRAS)) {
    const value = saved[key];
    if (Array.isArray(DEFAULT_EXTRAS[key])) {
      if (Array.isArray(value) && (value.length > 0 || key === 'videos' || key === 'links')) out[key] = value;
    } else if (key === 'eventImages' || key === 'campaignImages') {
      if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = value;
    } else if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

export function toList(text) {
  if (!text) return [];
  return String(text).split(/\r?\n|;/).map((s) => s.trim()).filter(Boolean);
}

// "Valores" pode ser uma lista (uma por linha / separada por vírgula ou
// ponto e vírgula) ou um texto corrido. Devolve { items, paragraph }.
export function parseValues(text) {
  if (!text) return { items: [], paragraph: '' };
  const items = String(text).split(/\r?\n|;|,/).map((s) => s.trim()).filter(Boolean);
  if (items.length && items.every((i) => i.length <= 40)) return { items, paragraph: '' };
  return { items: [], paragraph: String(text).trim() };
}

// "Domingo: 19h", "Domingo - 19h" → { day, time }; sem separador → só label.
export function parseServiceTimes(text) {
  return toList(text).map((line) => {
    const m = line.match(/^(.+?)(?:\s[-–—]\s|:\s)(.+)$/);
    return m ? { day: m[1].trim(), time: m[2].trim() } : { day: line, time: '' };
  });
}

export function externalUrl(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
}

export function socialUrl(kind, value) {
  if (!value) return '';
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v) || v.includes('.')) return externalUrl(v);
  const handle = v.replace(/^@/, '');
  if (kind === 'instagram') return `https://instagram.com/${handle}`;
  if (kind === 'facebook') return `https://facebook.com/${handle}`;
  if (kind === 'youtube') return `https://youtube.com/@${handle}`;
  return externalUrl(v);
}

export function whatsappUrl(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v) || v.includes('wa.me') || v.includes('whatsapp.com')) return externalUrl(v);
  const digits = v.replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

export function mapsEmbedUrl(address, custom) {
  if (custom) return custom;
  if (!address) return '';
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}
export function mapsLink(address) {
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';
}

// Datas de calendário vêm do backend como meia-noite UTC: sempre formatar
// com timeZone UTC (mesmo cuidado de lib/dateUtils.js).
export const dayOf = (d) => formatDateBR(d, { day: '2-digit' });
export const monthShortOf = (d) => formatDateBR(d, { month: 'short' }).replace('.', '');
export const weekdayOf = (d) => formatDateBR(d, { weekday: 'long' });
export const dateLongOf = (d) => formatDateBR(d, { day: 'numeric', month: 'long', year: 'numeric' });
export const monthDayOf = (d) => formatDateBR(d, { day: 'numeric', month: 'long' });

export const WORSHIP_TYPE_LABELS = {
  culto_domingo: 'Culto de Domingo',
  culto_oracao: 'Culto de Oração',
  culto_ensino: 'Culto de Ensino',
  especial: 'Culto Especial',
  reuniao: 'Reunião',
  outro: 'Culto',
};
export function worshipTitle(w) {
  const label = WORSHIP_TYPE_LABELS[w.type] || w.type || 'Culto';
  return w.theme ? w.theme : label;
}
export function worshipSubtitle(w) {
  const label = WORSHIP_TYPE_LABELS[w.type] || '';
  return w.theme && label ? label : '';
}

// Miniatura automática de links do YouTube.
export function youtubeId(url) {
  if (!url) return '';
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : '';
}
export function videoThumb(video) {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  const id = youtubeId(video.url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

export const NAV_ITEMS = [
  { label: 'Início', href: '#inicio' },
  { label: 'A Igreja', href: '#igreja' },
  { label: 'Palavra', href: '#palavra', when: 'videos' },
  { label: 'Cultos', href: '#cultos' },
  { label: 'Eventos', href: '#eventos' },
  { label: 'Campanhas', href: '#campanhas' },
  { label: 'Ministérios', href: '#ministerios' },
  { label: 'Avisos', href: '#avisos', when: 'announcements' },
  { label: 'Doações', href: '#doacoes' },
  { label: 'Contato', href: '#contato' },
];
