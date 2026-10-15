// Datas de calendário (nascimento, entrada, evento, escala, lançamento
// financeiro) são armazenadas como meia-noite UTC do dia escolhido —
// ex: usuário escolhe 13/09/2026, o backend guarda "2026-09-13T00:00:00.000Z".
//
// O BUG que isso corrige: `new Date(iso).toLocaleDateString('pt-BR')`
// converte para o fuso LOCAL do navegador antes de extrair dia/mês/ano.
// No Brasil (UTC-3), meia-noite UTC vira 21h do dia ANTERIOR — então
// 13/09 era exibido como 12/09. A correção é sempre formatar essas
// datas de calendário forçando timeZone: 'UTC', nunca o fuso local.
//
// Isso NÃO se aplica a timestamps reais (createdAt, publishedAt,
// notificação) — esses representam um instante de verdade e devem
// continuar no fuso local de quem está vendo.

export function formatDateBR(dateInput, options = {}) {
  if (!dateInput) return '—';
  return new Date(dateInput).toLocaleDateString('pt-BR', { timeZone: 'UTC', ...options });
}

export function formatDateLongBR(dateInput, options = {}) {
  if (!dateInput) return '—';
  return new Date(dateInput).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    ...options,
  });
}

export function formatDateShortBR(dateInput) {
  if (!dateInput) return '—';
  return new Date(dateInput).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short' });
}

// Data de HOJE no calendário LOCAL do usuário, como "YYYY-MM-DD" — usada
// como valor padrão em campos <input type="date">. Nunca usar
// `new Date().toISOString().slice(0,10)` para isso: perto da meia-noite
// em fusos como o do Brasil (UTC-3), isso pode devolver o dia seguinte
// ou anterior ao dia local real.
export function todayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
