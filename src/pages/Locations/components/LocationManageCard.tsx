import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

export interface LocationItem {
  id: number;
  name: string;
  code: string;
}

type LocationManageCardProps = {
  title: string;
  description?: string;
  items: LocationItem[];
  onAdd: () => void;
  onEdit: (item: LocationItem) => void;
  onDelete: (item: LocationItem) => void;
  addLabel: string;
  emptyMessage?: string;
  /** When set, shown instead of list when items are empty; Add button is disabled */
  disabledMessage?: string;
  addDisabled?: boolean;
};

export default function LocationManageCard({
  title,
  description,
  items,
  onAdd,
  onEdit,
  onDelete,
  addLabel,
  emptyMessage,
  disabledMessage,
  addDisabled = false,
}: LocationManageCardProps) {
  const { t } = useTranslation("locations");
  const resolvedEmptyMessage = emptyMessage ?? t("manageCard.emptyDefault");
  const showDisabled = !!disabledMessage && items.length === 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button size="sm" onClick={onAdd} className="gap-1" disabled={addDisabled || showDisabled} >
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </CardHeader>
      <CardContent>
        {showDisabled ? (
          <p className="text-sm text-muted-foreground py-4">{disabledMessage}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{resolvedEmptyMessage}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {item.name}
                  {item.code ? <span className="text-muted-foreground ms-2">({item.code})</span> : null}
                </span>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
