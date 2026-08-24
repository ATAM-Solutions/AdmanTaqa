import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = i18n.language.startsWith("ar") ? "ar" : "en";
  const next = current === "en" ? "ar" : "en";

  return (
    <Button
      id="language-switcher-toggle"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={t("actions.toggleLanguage")}
    >
      <Languages className="h-4 w-4" />
      {next === "ar" ? "العربية" : "English"}
    </Button>
  );
}
