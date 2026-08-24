import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, Trash2, ImageIcon, Loader2, Eye } from "lucide-react";
import type { OnboardingItem } from "@/types/onboarding";

type OnboardingTableProps = {
  items: OnboardingItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onView: (item: OnboardingItem) => void;
  onEdit: (item: OnboardingItem) => void;
  onDelete: (item: OnboardingItem) => void;
  /** Optional pagination footer (e.g. TablePagination) */
  pagination?: React.ReactNode;
};

export default function OnboardingTable({
  items,
  loading,
  searchQuery,
  onSearchChange,
  onView,
  onEdit,
  onDelete,
  pagination,
}: OnboardingTableProps) {
  const { t } = useTranslation("onboarding");
  return (
    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3 px-6 pt-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("table.searchPlaceholder")}
            className="ps-10 bg-background/50 border-muted-foreground/20"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold">{t("table.title")}</TableHead>
                  <TableHead className="font-bold">{t("table.description")}</TableHead>
                  <TableHead className="font-bold w-[80px]">{t("table.order")}</TableHead>
                  <TableHead className="font-bold w-[90px]">{t("table.status")}</TableHead>
                  <TableHead className="font-bold w-[80px]">{t("table.image")}</TableHead>
                  <TableHead className="text-end font-bold px-6">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t("table.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {item.description || "—"}
                      </TableCell>
                      <TableCell>{item.order}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? t("table.active") : t("table.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-12 w-12 rounded object-cover border"
                            title={item.imageUrl}
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            <ImageIcon className="h-4 w-4 inline" /> —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end px-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(item)}
                          className="h-8 w-8"
                          title={t("table.viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(item)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(item)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {pagination}
      </CardContent>
    </Card>
  );
}
