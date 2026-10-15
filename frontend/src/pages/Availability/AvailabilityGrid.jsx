import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { setMyAvailabilityRequest, setWorkerAvailabilityRequest } from '../../lib/availabilityService';

const DAYS = [
  { key: 'sunday', label: 'Domingo' },
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
];

// Períodos simplificados — manhã/tarde/noite, conforme pedido. Cada
// célula é um toggle disponível/indisponível; "parcial" (com horário
// específico) fica disponível via edição futura, aqui simplificamos
// para o protótipo.
const PERIODS = [
  { key: 'morning', label: 'Manhã', startTime: '06:00', endTime: '12:00' },
  { key: 'afternoon', label: 'Tarde', startTime: '12:00', endTime: '18:00' },
  { key: 'evening', label: 'Noite', startTime: '18:00', endTime: '23:00' },
];

function entriesToGrid(entries) {
  const grid = {};
  for (const day of DAYS) {
    grid[day.key] = {};
    for (const period of PERIODS) grid[day.key][period.key] = false;
  }
  for (const entry of entries) {
    if (entry.status !== 'available' && entry.status !== 'partial') continue;
    const period = PERIODS.find((p) => p.startTime === entry.startTime) || PERIODS[0];
    if (grid[entry.dayOfWeek]) grid[entry.dayOfWeek][period.key] = true;
  }
  return grid;
}

export function AvailabilityGrid({ workerId, initialEntries, admin = false, onSaved }) {
  const [grid, setGrid] = useState(() => entriesToGrid(initialEntries || []));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(dayKey, periodKey) {
    setSaved(false);
    setGrid((g) => ({ ...g, [dayKey]: { ...g[dayKey], [periodKey]: !g[dayKey][periodKey] } }));
  }

  async function handleSave() {
    setSaving(true);
    const entries = [];
    for (const day of DAYS) {
      for (const period of PERIODS) {
        entries.push({
          dayOfWeek: day.key,
          status: grid[day.key][period.key] ? 'available' : 'unavailable',
          startTime: period.startTime,
          endTime: period.endTime,
        });
      }
    }
    try {
      if (admin) await setWorkerAvailabilityRequest(workerId, entries);
      else await setMyAvailabilityRequest(entries);
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-ink/50">Dia</th>
              {PERIODS.map((p) => (
                <th key={p.key} className="p-2 text-xs font-medium text-ink/50">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day.key} className="border-t border-ink/5">
                <td className="p-2 text-left text-sm text-ink/70">{day.label}</td>
                {PERIODS.map((period) => {
                  const active = grid[day.key][period.key];
                  return (
                    <td key={period.key} className="p-2">
                      <button
                        type="button"
                        onClick={() => toggle(day.key, period.key)}
                        className={`h-8 w-16 rounded-md text-xs font-medium transition-colors ${
                          active ? 'bg-success/15 text-success' : 'bg-ink/5 text-ink/30 hover:bg-ink/10'
                        }`}
                      >
                        {active ? 'Disponível' : 'Indisponível'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar disponibilidade'}</Button>
        {saved && <span className="text-sm text-success">Salvo!</span>}
      </div>
    </div>
  );
}
