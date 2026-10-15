import { api } from './api';

export async function getPublicChurch(slug) { return (await api.get(`/public/church/${encodeURIComponent(slug)}`)).data; }
export async function getPublicSiteSettings() { return (await api.get('/public/settings')).data.church; }
export async function updatePublicSiteSettings(payload) { return (await api.patch('/public/church', payload)).data.church; }
export async function participateInCampaign(payload) { return (await api.post('/donations/participate', payload)).data.donation; }

// Conteúdo extra do site (imagens, vídeos, ministérios, textos do topo…),
// guardado como JSON em church.publicExtras. Enviado em requisição separada
// para que os campos já existentes continuem salvando mesmo que o backend
// ainda não tenha o campo (ver BACKEND_PATCH.md).
export async function updatePublicSiteExtras(extras) {
  return (await api.patch('/public/church', { extras })).data.church;
}
