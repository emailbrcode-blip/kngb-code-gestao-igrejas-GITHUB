import { CHURCH_SLUG } from '../config/brand';
import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getPublicChurch, getPublicSiteSettings, updatePublicSiteSettings, updatePublicSiteExtras } from '../lib/publicSiteService';
import { DEFAULT_EXTRAS, mergeExtras } from '../site/siteData';

// Campos que já existiam no banco/API (não alterar nomes).
const blank = { publicSiteEnabled: false, publicDescription: '', publicAddress: '', publicPhone: '', publicEmail: '', publicServiceTimes: '', publicHistory: '', publicMission: '', publicVision: '', publicValues: '', publicWhatsapp: '', publicInstagram: '', publicFacebook: '', publicYoutube: '', publicPixKey: '', publicPixInstructions: '' };

const GROUPS = [
  { title: 'Apresentação e história', fields: [['publicDescription', 'Apresentação', 'textarea'], ['publicHistory', 'História', 'textarea'], ['publicMission', 'Missão', 'textarea'], ['publicVision', 'Visão', 'textarea'], ['publicValues', 'Valores (um por linha ou separados por vírgula)', 'textarea']] },
  { title: 'Contato e horários', fields: [['publicAddress', 'Endereço'], ['publicPhone', 'Telefone'], ['publicEmail', 'E-mail', 'email'], ['publicWhatsapp', 'WhatsApp (número com DDD ou link)'], ['publicServiceTimes', 'Horários dos cultos (um por linha, ex.: Domingo: 19h)', 'textarea']] },
  { title: 'Redes sociais', fields: [['publicInstagram', 'Instagram (link ou @usuário)'], ['publicFacebook', 'Facebook'], ['publicYoutube', 'YouTube']] },
  { title: 'Doações e PIX', fields: [['publicPixKey', 'Chave PIX'], ['publicPixInstructions', 'Orientação para doações PIX (um passo por linha)', 'textarea']] },
];

const inputCls = 'rounded-lg border border-ink/15 p-3 font-normal';

function Field({ label, hint, children }) {
  return <label className="grid gap-1 text-sm font-medium">{label}{children}{hint && <span className="text-xs font-normal text-ink/50">{hint}</span>}</label>;
}

function Text({ value, onChange, type = 'text', placeholder, rows }) {
  return rows
    ? <textarea rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    : <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />;
}

function ImagePreview({ src }) {
  if (!src) return null;
  return <img src={src} alt="Pré-visualização" className="mt-1 h-20 w-32 rounded-lg border border-ink/10 object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />;
}

// Lista editável de objetos (ministérios, vídeos, links, imagens).
function ListEditor({ title, items, onChange, fields, empty, addLabel, max = 20 }) {
  const update = (i, key, value) => onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, '']))]);
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{title}</h3><span className="text-xs text-ink/50">{items.length} item(ns)</span></div>
      {items.length === 0 && <p className="text-sm text-ink/50">{empty}</p>}
      {items.map((item, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-ink/10 bg-canvas p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <Text value={item[f.key]} onChange={(v) => update(i, f.key, v)} rows={f.rows} placeholder={f.placeholder} />
                {f.image && <ImagePreview src={item[f.key]} />}
              </Field>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
            <Button type="button" variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</Button>
            <Button type="button" variant="danger" onClick={() => remove(i)}>Remover</Button>
          </div>
        </div>
      ))}
      {items.length < max && <div><Button type="button" variant="ghost" onClick={add}>{addLabel}</Button></div>}
    </div>
  );
}

export function PublicSiteSettings() {
  const [form, setForm] = useState(blank);
  const [extras, setExtras] = useState(() => mergeExtras({}));
  const [events, setEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    getPublicSiteSettings()
      .then((c) => { setForm({ ...blank, ...c }); setExtras(mergeExtras(c.publicExtras)); })
      .catch(() => { setIsError(true); setMessage('Não foi possível carregar as configurações.'); })
      .finally(() => setLoading(false));
  }, []);

  // Eventos/campanhas que o site público exibe (vêm do cadastro do sistema).
  useEffect(() => {
    getPublicChurch(CHURCH_SLUG).then((d) => { setEvents(d.events || []); setCampaigns(d.campaigns || []); }).catch(() => {});
  }, []);

  const setImage = (group, id, url) => setExtras((cur) => ({ ...cur, [group]: { ...(cur[group] || {}), [id]: url } }));

  const set = (key, value) => setForm((cur) => ({ ...cur, [key]: value }));
  const setX = (key, value) => setExtras((cur) => ({ ...cur, [key]: value }));
  const x = (key, label, props = {}) => (
    <Field label={label} hint={props.hint}>
      <Text value={extras[key]} onChange={(v) => setX(key, v)} rows={props.rows} placeholder={props.placeholder ?? DEFAULT_EXTRAS[key]} />
      {props.image && <ImagePreview src={extras[key]} />}
    </Field>
  );

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setMessage(''); setIsError(false);
    let coreSaved = false;
    try {
      const payload = { enabled: form.publicSiteEnabled, description: form.publicDescription || null, address: form.publicAddress || null, phone: form.publicPhone || null, email: form.publicEmail || null, serviceTimes: form.publicServiceTimes || null };
      for (const field of ['history', 'mission', 'vision', 'values', 'whatsapp', 'instagram', 'facebook', 'youtube', 'pixKey', 'pixInstructions']) payload[field] = form[`public${field[0].toUpperCase()}${field.slice(1)}`] || null;
      const c = await updatePublicSiteSettings(payload);
      coreSaved = true;
      setForm({ ...blank, ...c });

      const clean = {
        ...extras,
        worshipImages: (extras.worshipImages || []).map((i) => (typeof i === 'string' ? i : i.url)).filter(Boolean),
        eventImages: Object.fromEntries(Object.entries(extras.eventImages || {}).filter(([, v]) => v)),
        campaignImages: Object.fromEntries(Object.entries(extras.campaignImages || {}).filter(([, v]) => v)),
        videos: extras.videos.filter((v) => v.url),
        links: extras.links.filter((l) => l.url),
        ministries: extras.ministries.filter((m) => m.name),
      };
      const saved = await updatePublicSiteExtras(clean);
      setExtras(mergeExtras(saved?.publicExtras ?? clean));
      setMessage('Conteúdo salvo. O site /igreja já reflete as alterações.');
    } catch (err) {
      setIsError(true);
      setMessage(coreSaved
        ? 'Textos e contatos foram salvos, mas imagens, vídeos e demais itens extras não: o servidor ainda não aceita o campo "extras" (veja BACKEND_PATCH.md).'
        : err.response?.data?.error?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-ink/50">Carregando…</p>;

  const worshipImages = (extras.worshipImages || []).map((i) => (typeof i === 'string' ? { url: i } : i));

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-medium">Página pública</h1>
      <p className="mt-1 text-sm text-ink/60">Edite o conteúdo exibido no site público da igreja (<a href="/igreja" target="_blank" rel="noreferrer" className="underline">/igreja</a>). Eventos, cultos e campanhas aparecem automaticamente a partir dos cadastros do sistema.</p>
      <form onSubmit={submit} className="mt-5 grid gap-5">
        <Card><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.publicSiteEnabled} onChange={(e) => set('publicSiteEnabled', e.target.checked)} /> Publicar página</label></Card>

        <Card className="grid gap-4">
          <h2 className="font-display text-lg">Topo do site</h2>
          {x('siteName', 'Nome da igreja')}
          {x('heroTitle', 'Título principal')}
          {x('heroMessage', 'Mensagem de boas-vindas', { rows: 3, placeholder: 'Somos uma família que vive a Palavra de Deus…' })}
          {x('heroImage', 'Imagem principal (link)', { image: true, hint: 'Cole o link de uma imagem. Imagens da pasta public do projeto também funcionam (ex.: /site/hero-worship.jpg).' })}
          {x('logoUrl', 'Logo (link)', { image: true, placeholder: 'Vazio = ícone padrão' })}
          <div className="grid gap-4 sm:grid-cols-2">
            {x('heroButtonLabel', 'Botão principal — texto')}
            {x('heroButtonUrl', 'Botão principal — link', { hint: 'Use #igreja para rolar a página ou um link completo.' })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {x('verseText', 'Versículo em destaque', { rows: 2 })}
            {x('verseReference', 'Referência do versículo')}
          </div>
        </Card>

        {GROUPS.map((g) => (
          <Card key={g.title} className="grid gap-4">
            <h2 className="font-display text-lg">{g.title}</h2>
            {g.fields.map(([key, label, type]) => (
              <Field key={key} label={label}><Text value={form[key]} onChange={(v) => set(key, v)} type={type === 'email' ? 'email' : 'text'} rows={type === 'textarea' ? 3 : undefined} /></Field>
            ))}
          </Card>
        ))}

        <Card className="grid gap-4">
          <h2 className="font-display text-lg">Imagens e textos complementares</h2>
          {x('churchImage', 'Imagem da seção "A Igreja" (link)', { image: true })}
          {x('commitment', 'Compromisso com a Palavra', { rows: 3 })}
          {x('donationsIntro', 'Texto de abertura de Doações', { rows: 3 })}
          {x('mapEmbedUrl', 'Mapa (link de incorporação)', { placeholder: 'Vazio = mapa gerado a partir do endereço' })}
          <ListEditor title="Imagens dos cultos" items={worshipImages} onChange={(v) => setX('worshipImages', v)} fields={[{ key: 'url', label: 'Link da imagem', image: true }]} empty="Nenhuma imagem." addLabel="+ Adicionar imagem" max={6} />
        </Card>

        <Card className="grid gap-4">
          <h2 className="font-display text-lg">Fotos dos eventos e campanhas</h2>
          <p className="text-sm text-ink/60">Cole o link da imagem de cada evento ou campanha cadastrado. Sem link, o site mostra um ícone no lugar.</p>
          {events.length === 0 && campaigns.length === 0 && <p className="text-sm text-ink/50">Nenhum evento ou campanha ativo para exibir.</p>}
          {events.map((ev) => (
            <Field key={`e${ev.id}`} label={`Evento: ${ev.name}`}>
              <Text value={extras.eventImages?.[ev.id]} onChange={(v) => setImage('eventImages', ev.id, v)} placeholder="https://..." />
              <ImagePreview src={extras.eventImages?.[ev.id]} />
            </Field>
          ))}
          {campaigns.map((c) => (
            <Field key={`c${c.id}`} label={`Campanha: ${c.name}`}>
              <Text value={extras.campaignImages?.[c.id]} onChange={(v) => setImage('campaignImages', c.id, v)} placeholder="https://..." />
              <ImagePreview src={extras.campaignImages?.[c.id]} />
            </Field>
          ))}
        </Card>

        <Card><ListEditor title="Vídeos e mensagens (Palavra)" items={extras.videos} onChange={(v) => setX('videos', v)} fields={[{ key: 'title', label: 'Título' }, { key: 'url', label: 'Link do vídeo (YouTube etc.)' }, { key: 'preacher', label: 'Pregador' }, { key: 'date', label: 'Data (AAAA-MM-DD)' }]} empty="Sem vídeos — a seção Palavra fica oculta até você adicionar o primeiro." addLabel="+ Adicionar vídeo" /></Card>

        <Card><ListEditor title="Ministérios" items={extras.ministries} onChange={(v) => setX('ministries', v)} fields={[{ key: 'name', label: 'Nome' }, { key: 'leader', label: 'Líder' }, { key: 'description', label: 'Descrição', rows: 2 }, { key: 'imageUrl', label: 'Imagem (link)', image: true }]} empty="Sem ministérios — a seção fica oculta." addLabel="+ Adicionar ministério" /></Card>

        <Card><ListEditor title="Botões e links extras (rodapé)" items={extras.links} onChange={(v) => setX('links', v)} fields={[{ key: 'label', label: 'Texto' }, { key: 'url', label: 'Link' }]} empty="Nenhum link extra." addLabel="+ Adicionar link" max={8} /></Card>

        {message && <p role="status" className={`text-sm ${isError ? 'text-danger' : 'text-ink/70'}`}>{message}</p>}
        <div className="sticky bottom-0 -mx-1 flex justify-end bg-canvas/90 p-3 backdrop-blur"><Button disabled={saving}>{saving ? 'Salvando…' : 'Salvar página'}</Button></div>
      </form>
    </div>
  );
}
