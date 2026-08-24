import { useTranslation } from "react-i18next";
import { CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

type BranchesTableHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
};

export default function BranchesTableHeader({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: BranchesTableHeaderProps) {
  const { t } = useTranslation("branches");

  return (
    <CardHeader className="pb-3 px-6 pt-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("list.searchPlaceholder")}
            className="ps-10 bg-background/50 border-muted-foreground/10 focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
            <Filter className="h-4 w-4" />
            {t("list.status")}
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[150px] bg-background/50 border-muted-foreground/10">
              <SelectValue placeholder={t("list.allStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("list.allStatus")}</SelectItem>
              <SelectItem value="ACTIVE">{t("list.active")}</SelectItem>
              <SelectItem value="INACTIVE">{t("list.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardHeader>
  );
}
