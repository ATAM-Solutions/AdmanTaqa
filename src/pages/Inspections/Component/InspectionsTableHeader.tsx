import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Search } from "lucide-react";

type InspectionsTableHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  recordCount: number;
};

export default function InspectionsTableHeader({
  searchQuery,
  onSearchChange,
  recordCount,
}: InspectionsTableHeaderProps) {
  const { t } = useTranslation("inspections");

  return (
    <CardHeader className="bg-muted/50 border-b">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <CardTitle className="text-lg">{t("table.header")}</CardTitle>
          <Badge variant="secondary" className="ms-2">
            {t("table.records", { count: recordCount })}
          </Badge>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("table.searchPlaceholder")}
            className="ps-10 h-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </CardHeader>
  );
}
