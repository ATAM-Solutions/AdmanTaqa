import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/patterns/PageHeader";
import { AsyncBoundary } from "@/components/patterns/AsyncBoundary";
import { Search, Pencil, Trash2, User, Link2Off } from "lucide-react";
import useGetOperators from "@/hooks/Operators/useGetOperators";
import CreateOperatorDialog from "./Component/CreateOperatorDialog";
import EditOperatorDialog from "./Component/EditOperatorDialog";
import DeleteOperatorDialog from "./Component/DeleteOperatorDialog";
import type { OperatorItem } from "@/types/operator";

export default function Operators() {
  const { t } = useTranslation("operators");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<OperatorItem | null>(null);
  const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(null);

  const { data, isLoading, error } = useGetOperators();
  const operators = useMemo(() => data?.data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter(
      (op) =>
        op.name.toLowerCase().includes(q) ||
        op.LinkedUser?.email?.toLowerCase().includes(q) ||
        op.LinkedUser?.fullName?.toLowerCase().includes(q)
    );
  }, [operators, searchQuery]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={<CreateOperatorDialog />}
      />

      <Card className="border-none shadow-xl bg-card/70 backdrop-blur-md">
        <CardContent className="pt-6 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="ps-10"
            />
          </div>

          <AsyncBoundary
            isLoading={isLoading}
            error={error}
            isEmpty={filtered.length === 0}
            loadingFallback={<div className="py-12 text-center text-muted-foreground">{t("loading")}</div>}
            emptyFallback={<div className="py-12 text-center text-muted-foreground">{t("empty")}</div>}
          >
            <div className="space-y-3">
              {filtered.map((operator) => (
                <div
                  key={operator.id}
                  className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{operator.name}</p>
                      {operator.LinkedUser ? (
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {operator.LinkedUser.email}
                          {!operator.LinkedUser.isActive && (
                            <Badge variant="secondary" className="ms-2 text-[10px]">
                              {t("linkedUserInactive")}
                            </Badge>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Link2Off className="h-3 w-3" />
                          {t("noLinkedUser")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(operator)}>
                      <Pencil className="h-4 w-4 me-1" /> {t("edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleting({ id: operator.id, name: operator.name })}
                    >
                      <Trash2 className="h-4 w-4 me-1" /> {t("delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </AsyncBoundary>
        </CardContent>
      </Card>

      <EditOperatorDialog
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        operator={editing}
      />
      <DeleteOperatorDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        operator={deleting}
      />
    </div>
  );
}
