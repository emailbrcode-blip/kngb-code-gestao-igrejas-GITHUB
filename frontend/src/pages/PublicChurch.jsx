import { useEffect, useMemo, useState } from 'react';
import { getPublicChurch } from '../lib/publicSiteService';
import { SiteHeader } from '../site/SiteHeader';
import {
  Hero, ChurchInfo, Videos, Worships, Events, Campaigns, Ministries, Announcements, Donations, Contact, Footer,
} from '../site/sections';
import { mergeExtras, NAV_ITEMS } from '../site/siteData';
import { CHURCH_SLUG } from '../config/brand';

// Site público (/igreja). Visual novo; dados continuam vindo de
// getPublicChurch(VITE_CHURCH_SLUG) → { church, events, worships, campaigns }.
export function PublicChurch() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!CHURCH_SLUG) { setError('Site público ainda não configurado. Defina VITE_CHURCH_SLUG no frontend.'); return; }
    getPublicChurch(CHURCH_SLUG).then(setData).catch(() => setError('A página pública ainda não está disponível.'));
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('site-smooth');
    return () => document.documentElement.classList.remove('site-smooth');
  }, []);

  const church = data?.church;
  const extras = useMemo(() => {
    const merged = mergeExtras(church?.publicExtras);
    return { ...merged, siteName: merged.siteName || church?.name || '' };
  }, [church]);

  useEffect(() => {
    if (!church) return;
    document.title = `${extras.siteName} — Site oficial`;
  }, [church, extras.siteName]);

  if (error) {
    return <main className="mx-auto max-w-4xl p-10 text-center text-site-muted-fg">{error}</main>;
  }
  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-site-ink text-white/70" aria-busy="true">
        <p role="status">Carregando…</p>
      </main>
    );
  }

  const events = data.events || [];
  const worships = data.worships || [];
  const campaigns = data.campaigns || [];
  const announcements = data.announcements || [];
  const has = { videos: extras.videos.length > 0, announcements: announcements.length > 0 };
  const navItems = NAV_ITEMS.filter((i) => !i.when || has[i.when]);

  return (
    <div className="min-h-screen bg-site-bg font-sans text-site-fg">
      <SiteHeader extras={extras} navItems={navItems} />
      <main id="conteudo">
        <Hero church={church} extras={extras} />
        <ChurchInfo church={church} extras={extras} />
        <Videos videos={extras.videos} />
        <Worships worships={worships} church={church} extras={extras} />
        <Events events={events} images={extras.eventImages} />
        <Campaigns campaigns={campaigns} images={extras.campaignImages} />
        <Ministries ministries={extras.ministries} />
        <Announcements announcements={announcements} />
        <Donations church={church} extras={extras} campaigns={campaigns} />
        <Contact church={church} extras={extras} />
      </main>
      <Footer church={church} extras={extras} navItems={navItems} />
    </div>
  );
}
