import { useEffect, useState } from 'react';
import { CHURCH_SLUG } from '../config/brand';
import { getPublicChurch } from '../lib/publicSiteService';

// Nome institucional da igreja desta instalação, lido uma única vez do
// endpoint público já existente (/public/church/:slug). Se o slug não estiver
// configurado ou a página pública estiver desativada, devolve '' e a interface
// mostra apenas a marca do software (estado vazio, sem nome inventado).
let cached = null;
let pending = null;

export function useChurchName() {
  const [name, setName] = useState(cached ?? '');
  useEffect(() => {
    if (cached !== null || !CHURCH_SLUG) return undefined;
    let alive = true;
    pending = pending || getPublicChurch(CHURCH_SLUG).then((d) => d?.church?.name || '').catch(() => '');
    pending.then((n) => { cached = n; if (alive) setName(n); });
    return () => { alive = false; };
  }, []);
  return name;
}
