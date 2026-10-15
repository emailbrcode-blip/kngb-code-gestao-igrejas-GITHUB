import { Card } from '../../components/ui/Card';

export function Settings() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">Configurações</h1>
      <p className="mt-1 text-sm text-ink/60">
        Configurações da igreja, categorias e permissões avançadas.
      </p>

      <Card className="mt-6">
        <p className="text-sm text-ink/50">
          Este módulo será implementado em uma fase futura do projeto, junto com os
          demais módulos administrativos.
        </p>
      </Card>
    </div>
  );
}
