import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import ErrorBoundary from './ErrorBoundary';
import LanguageSwitcher from './LanguageSwitcher';
import DarkModeToggle from './DarkModeToggle';
import NotificationBell from './NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { CompanyAvatar } from '@/components/company/CompanyAvatar';
import { getOrganizationDisplayName, hasCompanyAdminRole, isCompanyOrganization } from '@/lib/company';
import logo from '@/assets/logo.jpeg';

export default function Layout() {
  const { t, i18n } = useTranslation('nav');
  const { organization, roles } = useAuth();

  const isCompany = isCompanyOrganization(organization?.type);
  const displayName = getOrganizationDisplayName(organization, i18n.language);
  const roleLabel = hasCompanyAdminRole(roles, organization) ? t('companyAdminBadge') : roles[0]?.name;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
            <SidebarTrigger className="-ms-1" />
            <div className="h-4 w-[1px] bg-border mx-2 hidden md:block" />
            {isCompany && organization ? (
              // Company tenants see THEIR identity here — never the platform's.
              <div className="flex items-center gap-3 min-w-0">
                <CompanyAvatar logoUrl={organization.logoUrl} name={displayName} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-base leading-none tracking-tight text-foreground truncate" dir="auto">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 truncate">
                    {t(`orgType.${organization.type}`, { defaultValue: organization.type })}
                    <span className="hidden sm:inline"> · {t('poweredBy')}</span>
                  </span>
                </div>
                {roleLabel ? (
                  <Badge variant="outline" className="ms-2 hidden sm:inline-flex border-primary/30 bg-primary/5 text-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                    {roleLabel}
                  </Badge>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <img src={logo} alt="Servexa" className="h-8 w-8 rounded-lg object-cover shadow-lg shadow-primary/20" />
                <div className="flex flex-col">
                  <span className="font-bold text-base leading-none tracking-tight text-foreground">Servexa Admin</span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{t('controlCenter')}</span>
                </div>
                {organization?.type === 'SUPER_ADMIN' ? (
                  <Badge className="ms-2 bg-primary text-primary-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                    {t('superAdminBadge')}
                  </Badge>
                ) : null}
              </div>
            )}
            <div className="ms-auto flex items-center gap-1">
              <NotificationBell />
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
