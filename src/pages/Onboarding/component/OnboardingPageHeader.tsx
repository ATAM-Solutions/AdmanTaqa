import { useTranslation } from "react-i18next";

type OnboardingPageHeaderProps = {
  children: React.ReactNode;
};

export default function OnboardingPageHeader({ children }: OnboardingPageHeaderProps) {
  const { t } = useTranslation("onboarding");
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
        <p className="text-muted-foreground">
          {t("page.subtitle")}
        </p>
      </div>
      {children}
    </div>
  );
}
