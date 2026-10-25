import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SparePartWarehouse } from "@/api/services/taskDetailService";
import type { PartSelection } from "@/lib/spareParts";

interface Props {
  warehouses: SparePartWarehouse[];
  value: PartSelection;
  onChange: (next: PartSelection) => void;
  warehouseId: number | null;
  onWarehouseChange: (id: number) => void;
}

/**
 * Multi-select of the warehouse catalogue with a quantity per chosen part. A request is served by one warehouse, so when the
 * station has more than one the technician chooses it first (changing it clears the selection).
 */
export default function SparePartsPicker({ warehouses, value, onChange, warehouseId, onWarehouseChange }: Props) {
  const { t } = useTranslation("tasks");
  const [open, setOpen] = useState(false);
  const warehouse = warehouses.find((w) => w.id === warehouseId) ?? warehouses[0];
  const byId = useMemo(() => new Map((warehouse?.items ?? []).map((i) => [i.id, i])), [warehouse]);
  const chosen = Object.keys(value).map(Number);

  const toggle = (id: number) => {
    const next = { ...value };
    if (id in next) delete next[id];
    else next[id] = "1";
    onChange(next);
  };

  return (
    <div className="space-y-3" data-testid="parts-picker">
      {warehouses.length > 1 ? (
        <div className="space-y-1">
          <Label htmlFor="parts-warehouse">{t("partsPicker.warehouse")}</Label>
          <select
            id="parts-warehouse"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={warehouse?.id ?? ""}
            onChange={(e) => { onWarehouseChange(Number(e.target.value)); onChange({}); }}
            data-testid="parts-warehouse"
          >
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      ) : null}

      <div className="space-y-1">
        <Label>{t("partsPicker.label")}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" data-testid="parts-trigger">
              <span className="truncate">{chosen.length ? t("partsPicker.selected", { count: chosen.length }) : t("partsPicker.placeholder")}</span>
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("partsPicker.search")} data-testid="parts-search" />
              <CommandList>
                <CommandEmpty>{t("partsPicker.none")}</CommandEmpty>
                <CommandGroup>
                  {(warehouse?.items ?? []).map((i) => (
                    <CommandItem key={i.id} value={`${i.name} ${i.code ?? ""} ${i.category ?? ""}`} onSelect={() => toggle(i.id)} data-testid="parts-option">
                      <Check className={`me-2 h-4 w-4 ${i.id in value ? "opacity-100" : "opacity-0"}`} />
                      <span className="min-w-0 flex-1 truncate" dir="auto">{i.name}</span>
                      {i.code ? <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{i.code}</span> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {chosen.length > 0 ? (
        <ul className="space-y-2" data-testid="parts-chosen">
          {chosen.map((id) => {
            const part = byId.get(id);
            const q = value[id];
            const bad = !(Math.floor(Number(q)) >= 1);
            return (
              <li key={id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2" data-testid="parts-chosen-row">
                <span className="min-w-0 flex-1 text-sm" dir="auto">{part?.name ?? `#${id}`}{part?.unit ? <span className="text-xs text-muted-foreground"> · {part.unit}</span> : null}</span>
                <Input
                  type="number" min={1} step={1} inputMode="numeric" className="w-24" aria-label={t("partsPicker.quantity")} data-testid="parts-qty"
                  value={q} aria-invalid={bad} onChange={(e) => onChange({ ...value, [id]: e.target.value })}
                />
                <Button type="button" size="icon" variant="ghost" aria-label={t("partsPicker.remove")} onClick={() => toggle(id)} data-testid="parts-remove"><X className="h-4 w-4" /></Button>
                {bad ? <span className="w-full text-xs text-destructive" role="alert">{t("partsPicker.quantityInvalid")}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
