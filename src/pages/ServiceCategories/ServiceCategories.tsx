import { useTranslation } from "react-i18next";
import useGetOrganization from "@/hooks/Organization/useGetOrganization";
import ProfileServiceCategoriesCard from "@/pages/Profile/components/ProfileServiceCategoriesCard";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ServiceCategories() {
  const { t } = useTranslation("serviceCategories");
  const { data: organizationResponse, isLoading, error } = useGetOrganization();
  const organization = organizationResponse?.data;

  return (
    <div className="px-8 py-8 space-y-6">
      <AsyncBoundary
        isLoading={isLoading}
        error={error ?? (!organization?.id ? new Error(t("loadFailed")) : undefined)}
      >
        {organization && organization.type !== "SERVICE_PROVIDER" && organization.type !== "AUTHORITY" ? (
          <Alert>
            <AlertDescription>{t("notAvailable")}</AlertDescription>
          </Alert>
        ) : organization ? (
          <>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
              <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            <ProfileServiceCategoriesCard
              organizationId={organization.id}
              organizationType={organization.type}
            />
          </>
        ) : null}
      </AsyncBoundary>
    </div>
  );
}
