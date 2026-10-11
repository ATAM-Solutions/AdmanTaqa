import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { geoName } from "@/lib/geography";
import { useGeographyLookup } from "@/hooks/Location/useGeography";
import type { GeographyNode } from "@/types/location";

export interface GeographyComboboxProps {
  level: "region" | "city" | "district";
  /** Parent id (country → region, region → city, city → district). null = parent not chosen yet. */
  parentId: number | null;
  value: number | null;
  /** Label to show for `value` when it is not part of the currently loaded page (edit mode / long lists). */
  selectedLabel?: string;
  onSelect: (node: GeographyNode) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
}

/**
 * Searchable, server-backed picker for one geography level. Large lists (thousands of cities in one region)
 * are searched on the server instead of rendered whole. It renders four distinct states so a failure never
 * looks like "no data": parent not chosen, loading, failed (retryable), and empty — plus a no-match state
 * while searching.
 */
export default function GeographyCombobox({
  level,
  parentId,
  value,
  selectedLabel,
  onSelect,
  id,
  disabled,
  invalid,
}: GeographyComboboxProps) {
  const { t, i18n } = useTranslation("geography");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const h = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(h);
  }, [search]);

  // Probe without a search term to distinguish "no data for this parent" from "no search match".
  const probe = useGeographyLookup(level, parentId, "");
  const list = useGeographyLookup(level, parentId, debounced, open);
  const noParent = parentId == null;
  const placeholder = t(`placeholder.${level}`);

  if (noParent) {
    return (
      <Button id={id} type="button" variant="outline" disabled className="w-full justify-between font-normal text-muted-foreground">
        <span className="truncate">{selectedLabel || t(`selectParentFirst.${level}`)}</span>
        <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  if (probe.isError) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive" role="alert">
        <span>{t(`loadFailed.${level}`)}</span>
        <Button type="button" variant="outline" size="sm" disabled={probe.isFetching} onClick={() => probe.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (probe.isLoading) {
    return (
      <Button id={id} type="button" variant="outline" disabled className="w-full justify-between font-normal text-muted-foreground">
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </span>
      </Button>
    );
  }

  if ((probe.data?.meta.total ?? 0) === 0) {
    // Never blank a saved value: when nothing selectable is left (e.g. every city of the region was deactivated)
    // keep showing the stored name, read-only, with the reason.
    if (value != null && selectedLabel) {
      return (
        <div className="space-y-1">
          <Button id={id} type="button" variant="outline" disabled className="w-full justify-between font-normal">
            <span className="truncate">{selectedLabel}</span>
          </Button>
          <p className="text-xs text-muted-foreground" role="status">
            {t(`empty.${level}`)}
          </p>
        </div>
      );
    }
    return (
      <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground" role="status">
        {t(`empty.${level}`)}
      </p>
    );
  }

  const items = list.data?.data ?? [];
  const current = items.find((n) => n.id === value);
  const label = current ? geoName(current, i18n.language) : selectedLabel || (value != null ? `#${value}` : "");
  const total = list.data?.meta.total ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSearch("");
          setDebounced("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !label && "text-muted-foreground", invalid && "border-destructive")}
        >
          <span className="truncate">{label || placeholder}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder={t("searchPlaceholder")} />
          <CommandList>
            {list.isError ? (
              <div className="space-y-2 p-3 text-sm text-destructive" role="alert">
                <p>{t(`loadFailed.${level}`)}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => list.refetch()}>
                  {t("retry")}
                </Button>
              </div>
            ) : list.isFetching && items.length === 0 ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </div>
            ) : (
              <>
                <CommandEmpty>{t("noMatch")}</CommandEmpty>
                <CommandGroup>
                  {items.map((n) => (
                    <CommandItem
                      key={n.id}
                      value={String(n.id)}
                      onSelect={() => {
                        onSelect(n);
                        setOpen(false);
                        setSearch("");
                        setDebounced("");
                      }}
                    >
                      <Check className={cn("me-2 h-4 w-4", n.id === value ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{geoName(n, i18n.language)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {total > items.length ? (
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    {t("refineSearch", { shown: items.length, total })}
                  </p>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
