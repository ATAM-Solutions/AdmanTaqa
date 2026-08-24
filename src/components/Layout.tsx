import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/sonner';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import ErrorBoundary from './ErrorBoundary';
import LanguageSwitcher from './LanguageSwitcher';
import DarkModeToggle from './DarkModeToggle';
import logo from '@/assets/logo.jpeg';

export default function Layout() {
  const { t } = useTranslation('nav');

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-6">
            <SidebarTrigger className="-ms-1" />
            <div className="h-4 w-[1px] bg-border mx-2 hidden md:block" />
            <div className="flex items-center gap-2">
              <img src={logo} alt="Servexa" className="h-8 w-8 rounded-lg object-cover shadow-lg shadow-primary/20" />
              <div className="flex flex-col">
                <span className="font-bold text-base leading-none tracking-tight text-foreground">Servexa Admin</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{t('controlCenter')}</span>
              </div>
            </div>
            <div className="ms-auto flex items-center gap-1">
              <LanguageSwitcher />
              <DarkModeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto w-full max-w-[1600px] mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </SidebarInset>
      </div>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
