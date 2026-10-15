import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AppFooter } from './AppFooter';
import { InstallBanner } from '../../pwa/InstallBanner';

export function AppLayout() {
  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="flex-1"><Outlet /></div>
          <AppFooter />
        </main>
      </div>
      <InstallBanner />
    </div>
  );
}
