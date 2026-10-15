import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

// Fotos de cadastro (URL colada do Supabase Storage). O backend baixa a imagem
// para colocá-la no PDF, então a URL é tratada como NÃO CONFIÁVEL:
//  * somente https, sem usuário/senha, porta 443;
//  * somente hosts permitidos (*.supabase.co / *.supabase.in e, opcionalmente,
//    hosts exatos em PHOTO_ALLOWED_HOSTS, separados por vírgula);
//  * o IP resolvido é validado NA CONEXÃO (bloqueia rede privada, loopback,
//    link-local, metadata de nuvem etc. — inclusive contra DNS rebinding);
//  * redirecionamentos não são seguidos; limite de tamanho e de tempo;
//  * o conteúdo é conferido pelos bytes (JPEG/PNG), não pelo que o servidor diz.

export class PhotoError extends Error {
  constructor(message, code = 'PHOTO_ERROR') { super(message); this.code = code; }
}

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8000;

function extraHosts() {
  return String(process.env.PHOTO_ALLOWED_HOSTS || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
}

export function isAllowedPhotoHost(host, extra = extraHosts()) {
  const h = String(host || '').toLowerCase();
  if (!h || net.isIP(h)) return false; // nunca IP direto
  return h.endsWith('.supabase.co') || h.endsWith('.supabase.in') || extra.includes(h);
}

// Valida a URL (sem rede). Retorna { ok:true, url } ou { ok:false, message }.
export function validatePhotoUrl(raw, { allowHosts } = {}) {
  let u;
  try { u = new URL(String(raw).trim()); } catch { return { ok: false, message: 'Link da foto inválido.' }; }
  if (String(raw).length > 2000) return { ok: false, message: 'Link da foto muito longo.' };
  if (u.protocol !== 'https:') return { ok: false, message: 'O link da foto deve começar com https://.' };
  if (u.username || u.password) return { ok: false, message: 'Link da foto inválido.' };
  if (u.port && u.port !== '443') return { ok: false, message: 'Link da foto inválido.' };
  if (!isAllowedPhotoHost(u.hostname, allowHosts)) {
    return { ok: false, message: 'Use o link público da foto hospedada no Supabase Storage (endereço terminado em .supabase.co).' };
  }
  return { ok: true, url: u };
}

function ipv4ToInt(ip) { return ip.split('.').reduce((acc, p) => (acc * 256) + Number(p), 0); }
const V4_BLOCKS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => ({ start: ipv4ToInt(base), mask: bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0 }));

// true = endereço NÃO público (deve ser bloqueado).
export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKS.some((b) => ((n & b.mask) >>> 0) === ((b.start & b.mask) >>> 0));
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) { const a = parseInt(mappedHex[1], 16); const b = parseInt(mappedHex[2], 16); return isPrivateAddress(`${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`); }
    if (lower === '::' || lower === '::1') return true;
    const first = parseInt(lower.split(':')[0] || '0', 16);
    if ((first & 0xfe00) === 0xfc00) return true;  // fc00::/7 (unique local)
    if ((first & 0xffc0) === 0xfe80) return true;  // fe80::/10 (link-local)
    if ((first & 0xff00) === 0xff00) return true;  // multicast
    if (lower.startsWith('2001:db8') || lower.startsWith('64:ff9b')) return true;
    return false;
  }
  return true; // não é IP válido
}

// lookup que só entrega endereços públicos (checado a cada conexão).
export function safeLookup(hostname, options, callback) {
  const opts = typeof options === 'function' ? {} : options || {};
  const cb = typeof options === 'function' ? options : callback;
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err);
    if (!addrs?.length || addrs.some((a) => isPrivateAddress(a.address))) return cb(new PhotoError('Endereço da foto não permitido.', 'PHOTO_BLOCKED'));
    if (opts.all) return cb(null, addrs);
    return cb(null, addrs[0].address, addrs[0].family);
  });
}

export function detectImageType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

// Baixa a foto com todas as proteções. Lança PhotoError com mensagem em português.
export function loadRemoteImage(rawUrl, { allowHosts, request = https.request, lookup = safeLookup, maxBytes = MAX_BYTES, timeoutMs = TIMEOUT_MS } = {}) {
  const check = validatePhotoUrl(rawUrl, { allowHosts });
  if (!check.ok) return Promise.reject(new PhotoError(check.message, 'PHOTO_URL_INVALID'));

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, value) => { if (!settled) { settled = true; fn(value); } };
    const req = request(check.url, { method: 'GET', lookup, headers: { Accept: 'image/jpeg,image/png', 'User-Agent': 'BrCode-Carteirinha/1.0' }, timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) { res.resume(); return done(reject, new PhotoError('A foto redireciona para outro endereço (não permitido).', 'PHOTO_REDIRECT')); }
      if (res.statusCode === 404 || res.statusCode === 400) { res.resume(); return done(reject, new PhotoError('A foto não foi encontrada (arquivo removido ou link incorreto).', 'PHOTO_NOT_FOUND')); }
      if (res.statusCode !== 200) { res.resume(); return done(reject, new PhotoError(`Não foi possível baixar a foto (código ${res.statusCode}). O arquivo é público?`, 'PHOTO_HTTP')); }
      const declared = Number(res.headers['content-length'] || 0);
      if (declared > maxBytes) { res.resume(); return done(reject, new PhotoError('A foto é grande demais (máximo de 5 MB).', 'PHOTO_TOO_LARGE')); }
      const chunks = []; let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > maxBytes) { req.destroy(); return done(reject, new PhotoError('A foto é grande demais (máximo de 5 MB).', 'PHOTO_TOO_LARGE')); }
        chunks.push(c);
        return undefined;
      });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const type = detectImageType(buffer);
        if (type === 'webp') return done(reject, new PhotoError('Formato WebP não é suportado na carteirinha. Envie a foto em JPG ou PNG.', 'PHOTO_FORMAT'));
        if (!type) return done(reject, new PhotoError('O link não aponta para uma imagem JPG ou PNG válida.', 'PHOTO_FORMAT'));
        return done(resolve, { buffer, type });
      });
      res.on('error', () => done(reject, new PhotoError('Falha ao baixar a foto.', 'PHOTO_NETWORK')));
    });
    req.on('timeout', () => { req.destroy(); done(reject, new PhotoError('A foto demorou demais para responder.', 'PHOTO_TIMEOUT')); });
    req.on('error', (err) => done(reject, err instanceof PhotoError ? err : new PhotoError('Não foi possível acessar a foto (rede indisponível ou link inválido).', 'PHOTO_NETWORK')));
    req.end();
  });
}
