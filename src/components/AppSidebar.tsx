import {
  Building2,
  Fuel,
  MapPin,
  GitBranch,
  ShieldCheck,
  Users,
  Tags,
  Layers3,
  FileOutput,
  Briefcase,
  // SearchCheck,
  History,
  LogOut,
  UserCog,
  ChevronDown,
  ChevronRight,
  BookOpen,
  LayoutDashboard,
  SearchCheck,
  Wrench,
} from "lucide-react";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@radix-ui/react-direction";
import { useAuth } from "@/context/AuthContext";
import {
  ROUTE_ACCESS_RULES,
  canAccessByRule,
  normalizePathKey,
} from "@/lib/accessControl";

interface NavItem {
  id: string;
  labelKey: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  isDropdown?: boolean;
  children?: NavItem[];
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

const navGroups: NavGroup[] = [
  {
    label: "Servexa",
    items: [],
  },
  {
    items: [
      { id: "dashboard", labelKey: "dashboard", path: "/dashboard", icon: LayoutDashboard },
      {
        id: "organizations",
        labelKey: "organizations.group",
        icon: Building2,
        isDropdown: true,
        children: [
          { id: "organizations-all", labelKey: "organizations.all", path: "/organizations", icon: Building2 },
          { id: "organizations-rejected", labelKey: "organizations.rejected", path: "/organizations/rejected", icon: Building2 },
        ]
      },
      {
        id: "fuelStations",
        labelKey: "fuelStations.group",
        icon: Fuel,
        isDropdown: true,
        children: [
          { id: "fuelStations-all", labelKey: "fuelStations.all", path: "/fuel-stations", icon: Fuel },
          { id: "fuelStations-pending", labelKey: "fuelStations.pending", path: "/fuel-stations/pending", icon: Fuel },
          { id: "fuelStations-rejected", labelKey: "fuelStations.rejected", path: "/fuel-stations/rejected", icon: Fuel },
        ]
      },
      {
        id: "users",
        labelKey: "users.group",
        icon: Users,
        isDropdown: true,
        children: [
          { id: "users-all", labelKey: "users.all", path: "/users", icon: Users },
          { id: "users-roles", labelKey: "users.roles", path: "/roles", icon: ShieldCheck }
        ]
      },
      { id: "onboarding", labelKey: "onboarding", path: "/onboarding", icon: BookOpen },
      { id: "profile", labelKey: "profile", path: "/profile", icon: UserCog },

      { id: "branches", labelKey: "branches", path: "/branches", icon: GitBranch },
      { id: "branchRequests", labelKey: "branchRequests", path: "/branch-requests", icon: GitBranch },
      { id: "locations", labelKey: "locations", path: "/locations", icon: MapPin },
      { id: "serviceCategories", labelKey: "serviceCategories", path: "/service-categories", icon: Tags },
      { id: "serviceOfferings", labelKey: "serviceOfferings", path: "/service-offerings", icon: Layers3 },
      { id: "operators", labelKey: "operators", path: "/operators", icon: Wrench },
      { id: "externalJobOrders", labelKey: "externalJobOrders", path: "/external-job-orders", icon: Briefcase },
      { id: "internalWorkOrders", labelKey: "internalWorkOrders", path: "/internal-work-orders", icon: Briefcase },
      { id: "externalRequests", labelKey: "externalRequests", path: "/station-requests", icon: Briefcase },
      { id: "stationJobOrders", labelKey: "stationJobOrders", path: "/station-job-orders", icon: Briefcase },
      { id: "linkedProviders", labelKey: "linkedProviders", path: "/linked-providers", icon: Briefcase },
      { id: "requestsQuote", labelKey: "requestsQuote", path: "/provider-rfqs", icon: Briefcase },
      { id: "providerJobOrders", labelKey: "providerJobOrders", path: "/provider-job-orders", icon: Briefcase },
      { id: "financialOffers", labelKey: "financialOffers", path: "/quotations", icon: FileOutput },
      { id: "jobOrdersLegacy", labelKey: "jobOrdersLegacy", path: "/job-orders", icon: Briefcase },

      { id: "inspections", labelKey: "inspections", path: "/inspections", icon: SearchCheck },
      { id: "auditLog", labelKey: "auditLog", path: "/audit-log", icon: History },
    ],
  },
];

/**
 * SUPER_ADMIN gets its own logically-grouped nav (Overview / Organizations /
 * People & Access / Operations / Administration) rather than the single flat
 * list above — deliberately limited to modules already verified to work
 * cross-organization (see Phase 2 report for what's intentionally deferred
 * to the full CRUD sweep: Roles & Permissions, Quotations, Branches, and the
 * single-org-scoped Station/Provider operational pages).
 */
const superAdminNavGroups: NavGroup[] = [
  { label: "Servexa", items: [] },
  {
    label: "groups.overview",
    items: [{ id: "dashboard", labelKey: "dashboard", path: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "groups.organizations",
    items: [
      { id: "organizations", labelKey: "organizations.all", path: "/organizations", icon: Building2 },
      { id: "fuelStations", labelKey: "fuelStations.all", path: "/fuel-stations", icon: Fuel },
      { id: "branchRequests", labelKey: "branchRequests", path: "/branch-requests", icon: GitBranch },
    ],
  },
  {
    label: "groups.peopleAccess",
    items: [
      { id: "users", labelKey: "users.all", path: "/users", icon: Users },
      { id: "roles", labelKey: "users.roles", path: "/roles", icon: ShieldCheck },
    ],
  },
  {
    label: "groups.operations",
    items: [
      { id: "externalJobOrders", labelKey: "externalJobOrders", path: "/external-job-orders", icon: Briefcase },
      { id: "jobOrdersLegacy", labelKey: "jobOrdersLegacy", path: "/job-orders", icon: Briefcase },
      { id: "inspections", labelKey: "inspections", path: "/inspections", icon: SearchCheck },
    ],
  },
  {
    label: "groups.administration",
    items: [
      { id: "locations", labelKey: "locations", path: "/locations", icon: MapPin },
      { id: "serviceCategories", labelKey: "serviceCategories", path: "/service-categories", icon: Tags },
      { id: "auditLog", labelKey: "auditLog", path: "/audit-log", icon: History },
    ],
  },
];

export default function AppSidebar() {
  const { t } = useTranslation("nav");
  const dir = useDirection();
  const location = useLocation();
  const navigate = useNavigate();

  // State to manage dropdowns, keyed by stable item id (not the translated label)
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    organizations: false,
    fuelStations: false,
    users: false,
  });

  const { logout, organization, permissions } = useAuth();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDropdown = (id: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isItemActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    }
    return false;
  };

  const canSeePath = (path?: string) => {
    if (!path) return true;
    const pathKey = normalizePathKey(path);
    return canAccessByRule(
      ROUTE_ACCESS_RULES[pathKey],
      organization?.type,
      permissions
    );
  };

  const canSeeItem = (item: NavItem): boolean => {
    if (item.isDropdown && item.children) {
      return item.children.some((child) => canSeeItem(child));
    }
    return canSeePath(item.path);
  };

  const activeNavGroups = organization?.type === "SUPER_ADMIN" ? superAdminNavGroups : navGroups;

  const visibleGroups = activeNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeItem(item)),
    }))
    .filter((group) => group.items.length > 0 || !group.label || group.label === "Servexa");

  const renderItem = (item: NavItem) => {
    if (item.isDropdown) {
      const isOpen = openDropdowns[item.id];
      const visibleChildren = item.children?.filter((child) => canSeeItem(child)) ?? [];
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            className="px-4 py-6 hover:bg-primary/5 transition-all group/btn w-full justify-between"
            onClick={() => toggleDropdown(item.id)}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">{t(item.labelKey)}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
            )}
          </SidebarMenuButton>
          {isOpen && visibleChildren.length > 0 && (
            <SidebarMenuSub>
              {visibleChildren.map((child) => (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton asChild isActive={isItemActive(child)}>
                    <Link to={child.path!} className="flex items-center gap-3">
                      <child.icon
                        className={`h-4 w-4 transition-colors ${isItemActive(child) ? "text-primary" : "text-muted-foreground group-hover/btn:text-primary"}`}
                      />
                      <span className="font-medium text-sm">{t(child.labelKey)}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      );
    } else {
      // Only render items with paths
      if (!item.path) return null;

      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            className="px-4 py-6 hover:bg-primary/5 transition-all group/btn"
            asChild
            isActive={isItemActive(item)}
          >
            <Link to={item.path} className="flex items-center gap-3">
              <item.icon className={`h-4 w-4 transition-colors ${isItemActive(item) ? 'text-primary' : 'text-muted-foreground group-hover/btn:text-primary'}`} />
              <span className="font-semibold text-sm">{t(item.labelKey)}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
  };

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"}>
      <SidebarContent>
        {visibleGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label ?? `nav-group-${groupIndex}`}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest opacity-60 px-4 mt-2">
              {group.label === "Servexa" ? group.label : group.label ? t(group.label) : null}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => renderItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              <span>{t('logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
