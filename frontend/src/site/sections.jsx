import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Clock, Compass, Copy, Eye, Heart, HandHeart,
  Mail, MapPin, Megaphone, MessageCircle, Phone, Play, Users, X, Instagram, Youtube, Facebook,
} from 'lucide-react';
import { Section, SectionHeader, EmptyNote } from './Section';
import { SiteLogo, SiteLogoMark } from './SiteHeader';
import {
  dateLongOf, dayOf, monthShortOf, weekdayOf, monthDayOf, parseValues, parseServiceTimes, toList,
  socialUrl, whatsappUrl, mapsEmbedUrl, mapsLink, externalUrl, worshipTitle, worshipSubtitle, videoThumb,
} from './siteData';

const cx = (...c) => c.filter(Boolean).join(' ');
const hhmm = (t) => (t ? String(t).slice(0, 5) : '');
const ext = (url) => (url.startsWith('#') || url.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' });

// Sem textos institucionais inventados: o que não estiver cadastrado em
// "Página Pública" simplesmente não aparece (ou aparece como aviso neutro).
const DEFAULT_TEXT = {
  presentation: 'Seja bem-vindo(a)! Em breve você encontrará aqui as informações da nossa igreja.',
};

/* ------------------------------------------------------------------ HERO */
export function Hero({ church, extras }) {
  const btnUrl = extras.heroButtonUrl || '#igreja';
  return (
    <section id="inicio" aria-labelledby="inicio-title" className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-site-ink text-white">
      <img src={extras.heroImage} alt="" className="absolute inset-0 -z-20 size-full object-cover" fetchpriority="high" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-site-ink via-site-ink/70 to-site-ink/30" />
      <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-32 md:px-8 md:pb-24">
        <div className="flex max-w-3xl animate-site-in flex-col gap-7">
          <div className="flex items-center gap-4">
            <SiteLogoMark logoUrl={extras.logoUrl} name={extras.siteName} tone="light" className="size-14" />
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/75 sm:text-sm">{extras.siteName}</p>
          </div>
          <h1 id="inicio-title" className="font-serif text-4xl font-semibold leading-[1.08] sm:text-5xl md:text-7xl">
            {extras.heroTitle}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-white/80 md:text-lg">{extras.heroMessage}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={btnUrl} {...ext(btnUrl)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-site-ink transition-colors hover:bg-white/90">
              {extras.heroButtonLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a href="#cultos" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              <CalendarDays className="size-4" aria-hidden="true" />
              Próximos cultos
            </a>
          </div>
        </div>
        {extras.verseText && (
          <figure className="mt-14 flex max-w-md flex-col gap-2 border-l-2 border-blue-400 pl-5 md:ml-auto md:mt-24">
            <blockquote className="font-serif text-lg italic leading-snug text-white/90">{`“${extras.verseText}”`}</blockquote>
            {extras.verseReference && <figcaption className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">{extras.verseReference}</figcaption>}
          </figure>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ A IGREJA */
function Pillar({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col gap-4 bg-white p-7 md:p-8">
      <span className="flex size-11 items-center justify-center rounded-full bg-site-accent text-site-accent-fg">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-serif text-xl font-semibold">{title}</h3>
      <p className="whitespace-pre-line leading-relaxed text-site-muted-fg">{text}</p>
    </div>
  );
}

export function ChurchInfo({ church, extras }) {
  const values = parseValues(church.publicValues);
  return (
    <Section id="igreja">
      <SectionHeader id="igreja" eyebrow="A Igreja" title="Uma família reunida em torno da Palavra" />
      <div className="flex flex-col gap-14 md:gap-16">
        <div className={cx('grid gap-10 lg:gap-16', extras.churchImage && 'lg:grid-cols-2')}>
          {extras.churchImage && (
            <div className="overflow-hidden rounded-2xl">
              <img src={extras.churchImage} alt="Membros da igreja reunidos em comunhão" className="aspect-[4/3] size-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex flex-col justify-center gap-8">
            <p className="whitespace-pre-line font-serif text-2xl leading-snug md:text-3xl">{church.publicDescription || DEFAULT_TEXT.presentation}</p>
            {church.publicHistory && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-site-primary">Nossa história</h3>
                <p className="whitespace-pre-line leading-relaxed text-site-muted-fg">{church.publicHistory}</p>
              </div>
            )}
          </div>
        </div>

        {(church.publicMission || church.publicVision || extras.commitment) && (
          <div className="grid gap-px overflow-hidden rounded-2xl border border-site-border bg-site-border md:grid-cols-3">
            {church.publicMission && <Pillar icon={Compass} title="Missão" text={church.publicMission} />}
            {church.publicVision && <Pillar icon={Eye} title="Visão" text={church.publicVision} />}
            {extras.commitment && <Pillar icon={BookOpen} title="Compromisso com a Palavra" text={extras.commitment} />}
          </div>
        )}

        {(values.items.length > 0 || values.paragraph) && (
          <div className="flex flex-col gap-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-site-primary">
              <Heart className="size-4" aria-hidden="true" />
              Nossos valores
            </h3>
            {values.items.length > 0 ? (
              <ul className="flex flex-wrap gap-3">
                {values.items.map((v) => (
                  <li key={v} className="rounded-full border border-site-border bg-site-secondary px-5 py-2.5 text-sm font-medium">{v}</li>
                ))}
              </ul>
            ) : (
              <p className="max-w-3xl whitespace-pre-line leading-relaxed text-site-muted-fg">{values.paragraph}</p>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- PALAVRA */
export function Videos({ videos }) {
  if (!videos.length) return null;
  return (
    <Section id="palavra">
      <SectionHeader id="palavra" eyebrow="Palavra" title="Mensagens e pregações" description="Alimente sua fé durante a semana com a Palavra ministrada em nossa igreja." />
      <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v, i) => {
          const thumb = videoThumb(v);
          const url = externalUrl(v.url);
          return (
            <li key={`${v.url}-${i}`}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-4">
                <div className="relative overflow-hidden rounded-xl bg-site-muted">
                  {thumb ? (
                    <img src={thumb} alt="" className="aspect-video size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-site-muted-fg"><BookOpen className="size-8" aria-hidden="true" /></div>
                  )}
                  <div aria-hidden="true" className="absolute inset-0 bg-site-ink/30 transition-colors group-hover:bg-site-ink/45" />
                  <span aria-hidden="true" className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-site-primary shadow-lg transition-transform group-hover:scale-110">
                    <Play className="ml-0.5 size-5 fill-current" />
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-serif text-lg font-semibold leading-snug group-hover:text-site-primary">{v.title || 'Mensagem'}</h3>
                  {(v.preacher || v.date) && <p className="text-sm text-site-muted-fg">{[v.preacher, v.date && dateLongOf(v.date)].filter(Boolean).join(' · ')}</p>}
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------- CULTOS */
export function Worships({ worships, church, extras }) {
  const weekly = parseServiceTimes(church.publicServiceTimes);
  const gallery = extras.worshipImages || [];
  return (
    <Section id="cultos" tone="ink">
      <SectionHeader id="cultos" tone="ink" eyebrow="Cultos" title="Venha adorar conosco" description="Você e sua família são bem-vindos em todos os nossos cultos." />
      {worships.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {worships.map((w) => (
            <li key={w.id} className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-blue-400/50 hover:bg-white/[0.06]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">{weekdayOf(w.date)}</span>
                  <span className="mt-1 font-serif text-5xl font-semibold tabular-nums">{hhmm(w.startTime) || '—'}</span>
                </div>
                <time dateTime={String(w.date).slice(0, 10)} className="flex flex-col items-center rounded-lg border border-white/15 px-3 py-2 text-center leading-none">
                  <span className="text-lg font-semibold tabular-nums">{dayOf(w.date)}</span>
                  <span className="mt-1 text-[0.65rem] uppercase tracking-wider text-white/60">{monthShortOf(w.date)}</span>
                </time>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="text-lg font-semibold">{worshipTitle(w)}</h3>
                {worshipSubtitle(w) && <p className="text-sm text-white/65">{worshipSubtitle(w)}</p>}
              </div>
              {(w.location || w.endTime) && (
                <div className="flex flex-col gap-1.5 border-t border-white/10 pt-4 text-sm text-white/60">
                  {w.endTime && <span className="flex items-center gap-2"><Clock className="size-4" aria-hidden="true" />Até {hhmm(w.endTime)}</span>}
                  {w.location && <span className="flex items-center gap-2"><MapPin className="size-4" aria-hidden="true" />{w.location}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : weekly.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {weekly.map((h, i) => (
            <li key={`${h.day}-${i}`} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <Clock className="size-5 text-blue-300" aria-hidden="true" />
              <span className="mt-2 font-serif text-2xl font-semibold">{h.day}</span>
              {h.time && <span className="text-white/70">{h.time}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote tone="ink">Nenhum culto agendado no momento. Acompanhe nossos canais.</EmptyNote>
      )}

      {gallery.length > 0 && (
        <ul className={cx('mt-10 grid gap-4', gallery.length === 1 ? 'grid-cols-1' : gallery.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3')}>
          {gallery.slice(0, 6).map((src, i) => (
            <li key={`${src}-${i}`} className="overflow-hidden rounded-2xl">
              <img src={src} alt="Momento de culto na igreja" className="aspect-[4/3] size-full object-cover" loading="lazy" />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------- EVENTOS */
export function Events({ events, images = {} }) {
  return (
    <Section id="eventos" tone="muted">
      <SectionHeader id="eventos" eyebrow="Eventos" title="O que vem por aí" description="Programações especiais para toda a família. Anote na sua agenda." />
      {events.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={e.id} className="group flex flex-col overflow-hidden rounded-2xl border border-site-border bg-white">
              <div className="relative overflow-hidden">
                {(images[e.id] || e.imageUrl) ? (
                  <img src={images[e.id] || e.imageUrl} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-site-accent text-site-accent-fg"><CalendarDays className="size-8" aria-hidden="true" /></div>
                )}
                <time dateTime={String(e.date).slice(0, 10)} className="absolute left-4 top-4 flex size-16 flex-col items-center justify-center rounded-xl bg-white text-site-ink shadow-md">
                  <span className="text-xl font-semibold leading-none tabular-nums">{dayOf(e.date)}</span>
                  <span className="mt-1 text-[0.65rem] font-medium uppercase tracking-wider text-site-primary">{monthShortOf(e.date)}</span>
                </time>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h3 className="font-serif text-xl font-semibold">{e.name}</h3>
                {e.description && <p className="flex-1 whitespace-pre-line text-sm leading-relaxed text-site-muted-fg">{e.description}</p>}
                <dl className="mt-2 flex flex-col gap-1.5 border-t border-site-border pt-4 text-sm text-site-muted-fg">
                  <div className="flex items-center gap-2"><dt className="sr-only">Data</dt><CalendarDays className="size-4 text-site-primary" aria-hidden="true" /><dd>{dateLongOf(e.date)}</dd></div>
                  {e.startTime && <div className="flex items-center gap-2"><dt className="sr-only">Horário</dt><Clock className="size-4 text-site-primary" aria-hidden="true" /><dd>{hhmm(e.startTime)}</dd></div>}
                  {e.location && <div className="flex items-center gap-2"><dt className="sr-only">Local</dt><MapPin className="size-4 text-site-primary" aria-hidden="true" /><dd>{e.location}</dd></div>}
                </dl>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>Em breve divulgaremos novos eventos.</EmptyNote>
      )}
    </Section>
  );
}

/* ----------------------------------------------------------- CAMPANHAS */
export function Campaigns({ campaigns, images = {} }) {
  return (
    <Section id="campanhas">
      <SectionHeader id="campanhas" eyebrow="Campanhas" title="Juntos fazemos a diferença" description="Participe das campanhas da igreja e seja parte do que Deus está fazendo." />
      {campaigns.length > 0 ? (
        <ul className="grid gap-6 lg:grid-cols-2">
          {campaigns.map((c) => (
            <li key={c.id} className="grid overflow-hidden rounded-2xl border border-site-border bg-white sm:grid-cols-[2fr_3fr]">
              {(images[c.id] || c.imageUrl) ? (
                <img src={images[c.id] || c.imageUrl} alt="" className="aspect-[4/3] size-full object-cover sm:aspect-auto" loading="lazy" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-site-accent text-site-accent-fg sm:aspect-auto"><Megaphone className="size-8" aria-hidden="true" /></div>
              )}
              <div className="flex flex-col gap-4 p-6 md:p-8">
                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Em andamento</span>
                <h3 className="font-serif text-2xl font-semibold leading-tight">{c.name}</h3>
                {c.description && <p className="whitespace-pre-line leading-relaxed text-site-muted-fg">{c.description}</p>}
                {c.items?.length > 0 && (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {c.items.map((i) => (
                      <li key={i.id} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-site-primary" aria-hidden="true" /><span><span className="font-medium">{i.name}</span>{i.description ? ` — ${i.description}` : ''}</span></li>
                    ))}
                  </ul>
                )}
                <Link to="/participar-doacoes" className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-site-primary hover:underline">
                  Entrar para participar
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>Nenhuma campanha aberta no momento.</EmptyNote>
      )}
    </Section>
  );
}

/* --------------------------------------------------------- MINISTÉRIOS */
export function Ministries({ ministries }) {
  if (!ministries.length) return null;
  return (
    <Section id="ministerios" tone="muted">
      <SectionHeader id="ministerios" eyebrow="Ministérios" title="Há um lugar para você servir" description="Conheça os ministérios da igreja e descubra onde seus dons podem florescer." />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ministries.map((m, i) => (
          <li key={`${m.name}-${i}`} className="group relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl bg-site-ink p-6 text-white">
            {m.imageUrl ? (
              <img src={m.imageUrl} alt="" className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            ) : (
              <Users className="absolute left-6 top-6 size-8 text-white/30" aria-hidden="true" />
            )}
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-site-ink via-site-ink/60 to-transparent" />
            <h3 className="font-serif text-2xl font-semibold">{m.name}</h3>
            {m.description && <p className="mt-2 text-sm leading-relaxed text-white/75">{m.description}</p>}
            {m.leader && <p className="mt-4 border-t border-white/15 pt-3 text-xs uppercase tracking-wider text-white/60">Líder: <span className="text-white">{m.leader}</span></p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* -------------------------------------------------------------- AVISOS */
// Só aparece se a API pública devolver `announcements` (ver BACKEND_PATCH.md).
export function Announcements({ announcements }) {
  const [selected, setSelected] = useState(null);
  if (!announcements.length) return null;
  return (
    <Section id="avisos">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <SectionHeader id="avisos" eyebrow="Avisos" title="Fique por dentro" description="Comunicados importantes para a igreja e visitantes." />
        <ul className="flex flex-col divide-y divide-site-border border-y border-site-border">
          {announcements.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => setSelected(a)} className="group grid min-h-11 w-full gap-2 py-6 text-left sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-6">
                <time className="text-sm text-site-muted-fg">{dateLongOf(a.publishedAt || a.date || a.createdAt)}</time>
                <span className="font-serif text-xl font-semibold group-hover:text-site-primary">{a.title}</span>
                <span className="flex items-center gap-1 text-sm font-medium text-site-primary">Ler aviso<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={selected.title}>
          <button type="button" aria-label="Fechar" onClick={() => setSelected(null)} className="absolute inset-0 bg-black/60" />
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <button type="button" onClick={() => setSelected(null)} aria-label="Fechar" className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full hover:bg-site-muted"><X className="size-5" aria-hidden="true" /></button>
            <p className="text-xs font-medium uppercase tracking-wider text-site-primary">{dateLongOf(selected.publishedAt || selected.date || selected.createdAt)}</p>
            <h3 className="mt-2 pr-8 font-serif text-2xl font-semibold">{selected.title}</h3>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-site-muted-fg">{selected.content || selected.body || selected.summary}</p>
          </div>
        </div>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------- DOAÇÕES */
function PixKey({ pixKey }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-site-primary/30 bg-site-accent/50 p-5">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-site-primary">Chave PIX</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="break-all font-mono text-lg font-semibold">{pixKey}</span>
        <button type="button" onClick={copy} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-site-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-site-primary/90">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copiada' : 'Copiar chave'}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? 'Chave PIX copiada' : ''}</span>
    </div>
  );
}

export function Donations({ church, extras, campaigns }) {
  const steps = toList(church.publicPixInstructions);
  return (
    <Section id="doacoes" tone="ink">
      <SectionHeader
        id="doacoes"
        tone="ink"
        eyebrow="Doações"
        title="Contribua com a obra"
        description="“Cada um contribua segundo propôs no seu coração; não com tristeza, ou por necessidade; porque Deus ama ao que dá com alegria.” — 2 Coríntios 9:7"
      />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-8 rounded-2xl bg-white p-6 text-site-fg md:p-10">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-site-accent text-site-accent-fg"><HandHeart className="size-6" aria-hidden="true" /></span>
            <p className="leading-relaxed text-site-muted-fg">{extras.donationsIntro}</p>
          </div>
          {church.publicPixKey ? (
            <PixKey pixKey={church.publicPixKey} />
          ) : (
            <p className="rounded-xl border border-dashed border-site-border p-5 text-sm text-site-muted-fg">Para contribuir, fale conosco pelos canais de contato abaixo.</p>
          )}
        </div>
        <div className="flex flex-col gap-6">
          {steps.length > 0 && (
            <div className="rounded-2xl border border-white/10 p-6 md:p-8">
              <h3 className="font-serif text-xl font-semibold">Como contribuir</h3>
              <ol className="mt-5 flex flex-col gap-4">
                {steps.map((step, i) => (
                  <li key={`${step}-${i}`} className="flex gap-4 text-sm leading-relaxed text-white/75">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-blue-400/50 text-xs font-semibold text-blue-300">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {campaigns.length > 0 && (
            <div className="rounded-2xl border border-white/10 p-6 md:p-8">
              <h3 className="font-serif text-xl font-semibold">Campanhas de arrecadação</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {campaigns.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1">
                    <span className="font-medium">{c.name}</span>
                    {c.description && <span className="text-sm text-white/65">{c.description}</span>}
                  </li>
                ))}
              </ul>
              <Link to="/participar-doacoes" className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue-300 hover:underline">Participar de uma campanha<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- CONTATO */
function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-site-accent text-site-accent-fg"><Icon className="size-4" aria-hidden="true" /></span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wider text-site-muted-fg">{label}</span>
        <span className="break-words text-sm leading-relaxed">{children}</span>
      </div>
    </div>
  );
}

export function Contact({ church, extras }) {
  const hours = parseServiceTimes(church.publicServiceTimes);
  const wa = whatsappUrl(church.publicWhatsapp);
  const embed = mapsEmbedUrl(church.publicAddress, extras.mapEmbedUrl);
  const socials = [
    ['Instagram', socialUrl('instagram', church.publicInstagram), Instagram],
    ['Facebook', socialUrl('facebook', church.publicFacebook), Facebook],
    ['YouTube', socialUrl('youtube', church.publicYoutube), Youtube],
  ].filter(([, url]) => url);

  return (
    <Section id="contato">
      <SectionHeader id="contato" eyebrow="Contato e Localização" title="Estamos esperando por você" description="Venha nos visitar ou fale conosco pelos canais abaixo." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-8 rounded-2xl border border-site-border bg-white p-6 md:p-8">
          <address className="flex flex-col gap-5 not-italic">
            <ContactRow icon={MapPin} label="Endereço">{church.publicAddress || 'Endereço em breve'}</ContactRow>
            {church.publicPhone && <ContactRow icon={Phone} label="Telefone"><a href={`tel:${church.publicPhone.replace(/[^\d+]/g, '')}`} className="hover:text-site-primary">{church.publicPhone}</a></ContactRow>}
            {wa && <ContactRow icon={MessageCircle} label="WhatsApp"><a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-site-primary">{/^https?:/i.test(church.publicWhatsapp) ? 'Conversar agora' : church.publicWhatsapp}</a></ContactRow>}
            {church.publicEmail && <ContactRow icon={Mail} label="E-mail"><a href={`mailto:${church.publicEmail}`} className="break-all hover:text-site-primary">{church.publicEmail}</a></ContactRow>}
          </address>

          {hours.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-site-border pt-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-site-primary"><Clock className="size-4" aria-hidden="true" />Horários dos cultos</h3>
              <ul className="flex flex-col gap-2.5">
                {hours.map((h, i) => (
                  <li key={`${h.day}-${i}`} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-medium">{h.day}</span>
                    {h.time && <span className="font-semibold tabular-nums">{h.time}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-2 border-t border-site-border pt-6">
              {socials.map(([label, url, Icon]) => (
                <li key={label}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-site-border px-4 text-sm font-medium transition-colors hover:border-site-primary/40 hover:text-site-primary">
                    <Icon className="size-4" aria-hidden="true" />{label}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-site-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-site-primary/90">
              <MessageCircle className="size-4" aria-hidden="true" />Falar no WhatsApp
            </a>
          )}
        </div>

        <div className="flex min-h-80 flex-col overflow-hidden rounded-2xl border border-site-border bg-site-muted">
          {embed ? (
            <iframe src={embed} title="Mapa com a localização da igreja" className="size-full min-h-80 flex-1 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="flex flex-1 items-center justify-center text-site-muted-fg"><MapPin className="size-8" aria-hidden="true" /></div>
          )}
          {church.publicAddress && (
            <a href={mapsLink(church.publicAddress)} target="_blank" rel="noopener noreferrer" className="border-t border-site-border bg-white px-5 py-3.5 text-sm font-medium text-site-primary hover:underline">Abrir no Google Maps</a>
          )}
        </div>
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- FOOTER */
export function Footer({ church, extras, navItems }) {
  const socials = [
    ['Instagram', socialUrl('instagram', church.publicInstagram)],
    ['Facebook', socialUrl('facebook', church.publicFacebook)],
    ['YouTube', socialUrl('youtube', church.publicYoutube)],
    ...(extras.links || []).filter((l) => l?.url).map((l) => [l.label || l.url, externalUrl(l.url)]),
  ].filter(([, url]) => url);

  return (
    <footer className="bg-site-ink text-site-ink-fg">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr] md:px-8 md:py-16">
        <div className="flex flex-col gap-5">
          <SiteLogo logoUrl={extras.logoUrl} name={extras.siteName} tone="light" />
          {extras.verseText && (
            <p className="max-w-sm font-serif italic text-white/70">
              {`“${extras.verseText}”`} {extras.verseReference && <span className="not-italic text-white/50">— {extras.verseReference}</span>}
            </p>
          )}
        </div>
        <nav aria-label="Rodapé">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Navegação</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 text-sm">
            {navItems.map((item) => (
              <li key={item.href}><a href={item.href} className="inline-block py-1.5 text-white/75 hover:text-white">{item.label}</a></li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Redes e links</h2>
          <ul className="mt-4 flex flex-col text-sm">
            {socials.length > 0 ? socials.map(([label, url]) => (
              <li key={label + url}><a href={url} target="_blank" rel="noopener noreferrer" className="inline-block py-1.5 text-white/75 hover:text-white">{label}</a></li>
            )) : <li className="text-white/50">Em breve</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-white/50 sm:flex-row sm:justify-between md:px-8">
          <p>© {new Date().getFullYear()} {extras.siteName}. Todos os direitos reservados.</p>
          <Link to="/login" className="inline-block py-1 hover:text-white">Área restrita</Link>
        </div>
      </div>
    </footer>
  );
}
