import { useAuthStore } from '../../store/authStore';
import { roleLabel } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';

export function Profile() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-medium text-ink">Meu Perfil</h1>

      <Card className="mt-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-ink/50">Nome</dt><dd className="font-medium text-ink">{user?.name}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/50">E-mail</dt><dd>{user?.email}</dd></div>
          <div className="flex justify-between"><dt className="text-ink/50">Função</dt><dd>{roleLabel(user?.role)}</dd></div>
        </dl>
        <p className="mt-5 text-xs text-ink/35">Edição de dados pessoais estará disponível em uma próxima atualização.</p>
      </Card>
    </div>
  );
}
