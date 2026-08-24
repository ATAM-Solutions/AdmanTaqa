import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DetailPageBreadcrumbItem {
  label: ReactNode;
  href?: string;
}

interface DetailPageTab {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

interface DetailPageLayoutProps {
  breadcrumbs?: DetailPageBreadcrumbItem[];
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  /** Sectioned content rendered as tabs. Omit and use `children` for a single-section page. */
  tabs?: DetailPageTab[];
  defaultTab?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Standardizes long stacked-Card detail pages (see StationJobOrderDetail /
 * StationRequestDetail) behind a breadcrumb + title/status header and,
 * optionally, sectioned Tabs instead of one long scroll.
 */
export function DetailPageLayout({
  breadcrumbs,
  title,
  description,
  status,
  actions,
  tabs,
  defaultTab,
  children,
  className,
}: DetailPageLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={index} className="flex items-center gap-1.5">
                  <BreadcrumbItem>
                    {crumb.href && !isLast ? (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!isLast ? <BreadcrumbSeparator /> : null}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description ? <p className="text-muted-foreground">{description}</p> : null}
          </div>
          {status}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <Tabs defaultValue={defaultTab ?? tabs[0].value}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        children
      )}
    </div>
  );
}
