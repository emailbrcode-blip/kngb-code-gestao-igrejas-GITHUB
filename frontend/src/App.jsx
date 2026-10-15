import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Users } from './pages/Users/Users';
import { Settings } from './pages/Settings/Settings';
import { Members } from './pages/Members/Members';
import { MemberDetail } from './pages/Members/MemberDetail';
import { Workers } from './pages/Workers/Workers';
import { WorkerDetail } from './pages/Workers/WorkerDetail';
import { MyAvailability } from './pages/Availability/MyAvailability';
import { Schedules } from './pages/Schedules/Schedules';
import { Notifications } from './pages/Notifications/Notifications';
import { Events } from './pages/Events/Events';
import { Announcements } from './pages/Announcements/Announcements';
import { Finance } from './pages/Finance/Finance';
import { FinanceDashboard } from './pages/Finance/FinanceDashboard';
import { Profile } from './pages/Profile/Profile';
import { Agenda } from './pages/Agenda/Agenda';
import { Reports } from './pages/Reports/Reports';
import { Worships } from './pages/Worships/Worships';
import { WorshipDetail } from './pages/Worships/WorshipDetail';
import { Sermons } from './pages/Worships/Sermons';
import { TeamByFunction } from './pages/Worships/TeamByFunction';
import { Donations } from './pages/Donations/Donations';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { UpdatePrompt } from './pwa/UpdatePrompt';
import { PublicChurch } from './pages/PublicChurch';
import { PublicSiteSettings } from './pages/PublicSiteSettings';
import { DonationParticipation } from './pages/DonationParticipation';
import { Visitors } from './pages/Visitors/Visitors';

export default function App() {
  return (
    <BrowserRouter>
      {/* Montado fora das rotas — registra o Service Worker assim que o
          app carrega, mesmo antes do login, pra ficar instalável o mais
          cedo possível. */}
      <UpdatePrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/igreja" element={<PublicChurch />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/membros" element={<Members />} />
            <Route path="/membros/:id" element={<MemberDetail />} />
            <Route path="/obreiros" element={<Workers />} />
            <Route path="/obreiros/:id" element={<WorkerDetail />} />
            <Route path="/minha-disponibilidade" element={<MyAvailability />} />
            <Route path="/escalas" element={<Schedules />} />
            <Route path="/visitantes" element={<Visitors />} />
            <Route path="/visitantes/eventos/:eventId" element={<Visitors />} />
            <Route path="/visitantes/:scheduleId" element={<Visitors />} />
            <Route path="/cultos" element={<Worships />} />
            <Route path="/cultos/:id" element={<WorshipDetail />} />
            <Route path="/palavra" element={<Sermons />} />
            <Route path="/equipe/:slug" element={<TeamByFunction />} />
            <Route path="/doacoes" element={<Donations />} />
            <Route path="/participar-doacoes" element={<DonationParticipation />} />
            <Route path="/configuracoes/pagina-publica" element={<PublicSiteSettings />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/eventos" element={<Events />} />
            <Route path="/avisos" element={<Announcements />} />
            <Route path="/notificacoes" element={<Notifications />} />
            <Route path="/financeiro" element={<Finance />} />
            <Route path="/financeiro/dashboard" element={<FinanceDashboard />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/usuarios" element={<Users />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/perfil" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
